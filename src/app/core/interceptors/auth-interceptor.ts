import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  catchError,
  finalize,
  Observable,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { Auth } from '../services/auth';

// =============================================================
// INTERCEPTEUR JWT — Gestion de l'authentification
// =============================================================
// 1. Ajoute le token JWT si le citoyen est connecté.
// 2. Autorise les requêtes publiques sans token.
// 3. Renouvelle automatiquement un token expiré.
// 4. Rejoue la requête après renouvellement.
// 5. Déconnecte le citoyen si le renouvellement échoue.
// =============================================================

// Partage une seule opération de renouvellement entre
// les requêtes qui reçoivent simultanément une erreur 401.
let refreshEnCours$: Observable<{
  access: string;
  refresh: string;
}> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  // -----------------------------------------------------------
  // ROUTES PUBLIQUES
  // -----------------------------------------------------------
  // Ces routes ne nécessitent pas de token JWT.
  const routesPubliques = [
    '/api/auth/register/',
    '/api/auth/login/',
    '/api/auth/token/refresh/',
    '/api/stats/accueil/',
    '/api/paydunya/ipn/',
    '/api/ventes/paiement/ipn/',
  ];

  const estRouteAuthentificationPublique = routesPubliques.some(
    (route) => req.url.includes(route)
  );

  // Les types de déchets et les conseils sont publics en lecture.
  const estLectureReferentielPublique =
    req.method === 'GET' &&
    (
      req.url.includes('/api/types/') ||
      req.url.includes('/api/conseils/')
    );

  const estRoutePublique =
    estRouteAuthentificationPublique ||
    estLectureReferentielPublique;

  // Les routes publiques passent sans modification.
  if (estRoutePublique) {
    return next(req);
  }

  // -----------------------------------------------------------
  // SERVICES D'AUTHENTIFICATION
  // -----------------------------------------------------------
  const authService = inject(Auth);
  const router = inject(Router);
  const token = authService.getToken();

  // -----------------------------------------------------------
  // AUCUN TOKEN
  // -----------------------------------------------------------
  // Un visiteur anonyme peut envoyer une image au scanner.
  // Django doit autoriser cette requête et ne pas enregistrer
  // le scan si aucun utilisateur n'est authentifié.
  if (!token) {
    return next(req);
  }

  // -----------------------------------------------------------
  // TOKEN DISPONIBLE : AJOUT DU JWT
  // -----------------------------------------------------------
  // Important : les accents graves sont nécessaires ici.
  const requeteAvecToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(requeteAvecToken).pipe(
    catchError((erreur: HttpErrorResponse) => {

      // Seule une erreur 401 déclenche le renouvellement.
      if (erreur.status !== 401) {
        return throwError(() => erreur);
      }

      const refreshToken = authService.getRefreshToken();

      // Sans refresh token, la session ne peut pas être renouvelée.
      if (!refreshToken) {
        authService.logout();
        void router.navigate(['/connexion']);

        return throwError(() => erreur);
      }

      // Une seule demande de renouvellement est partagée.
      if (!refreshEnCours$) {
        refreshEnCours$ = authService.refreshToken().pipe(
          shareReplay(1),
          finalize(() => {
            refreshEnCours$ = null;
          })
        );
      }

      return refreshEnCours$.pipe(

        // Le renouvellement a réussi : rejouer la requête
        // avec le nouvel access token.
        switchMap((nouveauxTokens) => {
          const requeteRetry = req.clone({
            setHeaders: {
              Authorization: `Bearer ${nouveauxTokens.access}`,
            },
          });

          return next(requeteRetry);
        }),

        // Le renouvellement a échoué : terminer la session.
        catchError((erreurRefresh) => {
          authService.logout();

          const urlActuelle = router.url;

          void router.navigate(['/connexion'], {
            queryParams:
              urlActuelle && urlActuelle !== '/connexion'
                ? { redirect: urlActuelle }
                : {},
          });

          return throwError(() => erreurRefresh);
        })
      );
    })
  );
};
