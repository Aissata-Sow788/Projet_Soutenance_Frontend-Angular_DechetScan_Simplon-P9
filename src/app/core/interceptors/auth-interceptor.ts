import { inject } from '@angular/core';
import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';

import {catchError, finalize, Observable, shareReplay, switchMap, throwError} from 'rxjs';

import { Auth } from '../services/auth';

/*
 * Évite plusieurs refresh simultanés si plusieurs requêtes
 * reçoivent un 401 en même temps.
 */
let refreshEnCours$: Observable<{
  access: string;
  refresh: string;
}> | null = null;


/*
 * Intercepteur chargé d'ajouter le JWT et de renouveler
 * automatiquement l'access token lorsqu'il expire.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  /*
   * Seules les routes d'authentification sont entièrement publiques.
   */
  const routesPubliques = [
    '/api/auth/register/',
    '/api/auth/login/',
    '/api/auth/token/refresh/'
  ];

  const estRouteAuthentificationPublique =
    routesPubliques.some(
      (route) => req.url.endsWith(route)
    );

  /*
   * Les GET du référentiel sont publics.
   * Les POST, PATCH et DELETE restent protégés.
   */
  const estLectureReferentielPublique =
    req.method === 'GET' &&
    (
      req.url.includes('/api/types/') ||
      req.url.includes('/api/conseils/')
    );

  const estRoutePublique =
    estRouteAuthentificationPublique ||
    estLectureReferentielPublique;

  console.log('[AUTH]', req.method, req.url, '| Route publique :', estRoutePublique);

  if (estRoutePublique) {
    return next(req);
  }

  const authService = inject(Auth);
  const token = authService.getToken();

  console.log('[AUTH]', req.method, req.url, '| Token présent :', !!token);

  if (!token) {
    return next(req);
  }

  /*
   * Ajoute le JWT aux requêtes protégées.
   */
  const requeteAvecToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(requeteAvecToken).pipe(

    catchError((erreur: HttpErrorResponse) => {

      /*
       * Seul un 401 déclenche le renouvellement du token.
       */
      if (erreur.status !== 401) {
        return throwError(() => erreur);
      }

      const refreshToken = localStorage.getItem(
        'dechetscan_refresh'
      );

      if (!refreshToken) {
        localStorage.removeItem('dechetscan_token');
        localStorage.removeItem('dechetscan_refresh');
        localStorage.removeItem('dechetscan_user');

        return throwError(() => erreur);
      }

      /*
       * Lance un seul refresh même si plusieurs requêtes
       * sont en attente.
       */
      if (!refreshEnCours$) {
        refreshEnCours$ = authService.refreshToken().pipe(
          shareReplay(1),

          finalize(() => {
            refreshEnCours$ = null;
          })
        );
      }

      return refreshEnCours$.pipe(

        /*
         * Rejoue la requête avec le nouveau token.
         */
        switchMap((nouveauxTokens) => {

          const requeteRetry = req.clone({
            setHeaders: {
              Authorization: `Bearer ${nouveauxTokens.access}`
            }
          });

          return next(requeteRetry);
        }),

        /*
         * Si le refresh échoue, on déconnecte la session.
         */
        catchError((erreurRefresh) => {

          localStorage.removeItem('dechetscan_token');
          localStorage.removeItem('dechetscan_refresh');
          localStorage.removeItem('dechetscan_user');

          return throwError(() => erreurRefresh);
        })
      );
    })
  );
}
