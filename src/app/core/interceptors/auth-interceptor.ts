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
// INTERCEPTEUR JWT — Renouvellement automatique des tokens
// =============================================================
// Rôle :
//   1. Ajoute le token JWT à chaque requête protégée
//   2. Si le serveur répond 401 (token expiré), lance un refresh
//      silencieux SANS demander à l'utilisateur de se reconnecter
//   3. Rejoue la requête originale avec le nouveau token
//   4. Si le refresh échoue (refresh token aussi expiré),
//      déconnecte et redirige vers la page de connexion
// =============================================================

// -------------------------------------------------------------
// Variable partagée pour éviter plusieurs refresh simultanés.
// Si 3 requêtes reçoivent un 401 en même temps, une seule
// tentative de refresh est lancée et les 3 attendent le résultat.
// -------------------------------------------------------------
let refreshEnCours$: Observable<{
  access: string;
  refresh: string;
}> | null = null;


export const authInterceptor: HttpInterceptorFn = (req, next) => {

  // -----------------------------------------------------------
  // ROUTES PUBLIQUES — pas besoin de token JWT
  // -----------------------------------------------------------
  // Ces routes ne nécessitent aucune authentification.
  // On les laisse passer directement sans modifier la requête.
  // -----------------------------------------------------------
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

  // Les lectures du référentiel (types de déchets, conseils) sont publiques.
  const estLectureReferentielPublique =
    req.method === 'GET' &&
    (
      req.url.includes('/api/types/') ||
      req.url.includes('/api/conseils/')
    );

  // Les scans anonymes (POST sans token) sont autorisés.
  const estScanPublic =
    req.method === 'POST' &&
    req.url.includes('/api/scans/') &&
    !req.url.includes('/api/scans/admin/') &&
    !req.url.includes('/api/scans/historique/');

  const estRoutePublique =
    estRouteAuthentificationPublique ||
    estLectureReferentielPublique;

  // -----------------------------------------------------------
  // Si c'est une route publique → on laisse passer sans token
  // -----------------------------------------------------------
  if (estRoutePublique) {
    return next(req);
  }

  // -----------------------------------------------------------
  // Injection des services
  // -----------------------------------------------------------
  const authService = inject(Auth);
  const router     = inject(Router);
  const token      = authService.getToken();

  // -----------------------------------------------------------
  // Si pas de token → on envoie la requête sans Authorization.
  // Django retournera 401 si la route est protégée.
  // Le cas du scan anonyme (AllowAny) passera sans problème.
  // -----------------------------------------------------------
  if (!token) {
    return next(req);
  }

  // -----------------------------------------------------------
  // Ajoute le token JWT à la requête
  // -----------------------------------------------------------
  const requeteAvecToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(requeteAvecToken).pipe(

    catchError((erreur: HttpErrorResponse) => {

      // ---------------------------------------------------------
      // Seul un 401 déclenche le renouvellement automatique.
      // Les autres erreurs (403, 404, 500…) sont propagées
      // normalement vers le composant qui a fait la requête.
      // ---------------------------------------------------------
      if (erreur.status !== 401) {
        return throwError(() => erreur);
      }

      // ---------------------------------------------------------
      // Vérifie qu'un refresh token existe en localStorage.
      // S'il n'existe pas, la session est terminée → déconnexion.
      // ---------------------------------------------------------
      const refreshToken = localStorage.getItem('dechetscan_refresh');

      if (!refreshToken) {
        // Nettoie le storage et redirige vers la connexion.
        authService.logout();
        void router.navigate(['/connexion']);
        return throwError(() => erreur);
      }

      // ---------------------------------------------------------
      // Lance le refresh UNE SEULE FOIS même si plusieurs
      // requêtes ont reçu un 401 simultanément.
      // shareReplay(1) diffuse le résultat à tous les abonnés.
      // finalize() remet refreshEnCours$ à null après la fin.
      // ---------------------------------------------------------
      if (!refreshEnCours$) {
        refreshEnCours$ = authService.refreshToken().pipe(
          shareReplay(1),
          finalize(() => {
            refreshEnCours$ = null;
          })
        );
      }

      return refreshEnCours$.pipe(

        // -------------------------------------------------------
        // Refresh réussi → rejoue la requête originale
        // avec le nouveau token. L'utilisateur ne voit rien.
        // -------------------------------------------------------
        switchMap((nouveauxTokens) => {
          const requeteRetry = req.clone({
            setHeaders: {
              Authorization: `Bearer ${nouveauxTokens.access}`,
            },
          });
          return next(requeteRetry);
        }),

        // -------------------------------------------------------
        // Refresh échoué → le refresh token est aussi expiré.
        // On déconnecte et on redirige vers la connexion.
        // L'URL actuelle est sauvegardée en queryParam pour
        // rediriger l'utilisateur après reconnexion.
        // -------------------------------------------------------
        catchError((erreurRefresh) => {
          authService.logout();

          // Récupère l'URL courante pour rediriger après login.
          const urlActuelle = router.url;

          void router.navigate(['/connexion'], {
            queryParams: urlActuelle && urlActuelle !== '/connexion'
              ? { redirect: urlActuelle }
              : {},
          });

          return throwError(() => erreurRefresh);
        })
      );
    })
  );
};
