import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Auth } from '../services/auth';
import { catchError, map, of } from 'rxjs';

// Bloque l'accès si aucun utilisateur n'est connecté (peu importe le rôle)
export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const router = inject(Router);
  const auth = inject(Auth);

  try {
    if (!auth.getToken()) {
      return router.createUrlTree(['/connexion'], {
        queryParams: { redirect: state.url },
      });
    }

    if (auth.getCurrentUser()) {
      return true;
    }
  } catch {
    auth.logout();
    return router.createUrlTree(['/connexion'], {
      queryParams: { redirect: state.url },
    });
  }

  return auth.me().pipe(
    map(() => true),
    catchError(() => {
      auth.logout();
      return of(router.createUrlTree(['/connexion'], {
        queryParams: { redirect: state.url },
      }));
    })
  );
};

// Bloque l'accès à l'espace admin sans session administrateur.
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(Auth);

  try {
    const utilisateur = auth.getCurrentUser();

    if (auth.getToken() && utilisateur?.role === 'admin') {
      return true;
    }
  } catch {
    auth.logout();
  }

  return router.createUrlTree(['/connexion-admin']);
};
