import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { CollecteurService } from '../services/collecteur';

export const collecteurSubscriptionGuard: CanActivateChildFn = (route) => {
  const router = inject(Router);
  const collecteurService = inject(CollecteurService);

  if (route.routeConfig?.path === 'abonnement') {
    return true;
  }

  return collecteurService.obtenirStatutAbonnement().pipe(
    map(({ hasProfile, isActive }) => {
      if (!hasProfile) {
        return router.createUrlTree(['/devenir-collecteur']);
      }
      return isActive ? true : router.createUrlTree(['/collecteur/abonnement']);
    }),
    catchError((error: { status?: number }) => {
      if (error.status === 401) {
        return of(router.createUrlTree(['/connexion-collecteur']));
      }
      if (error.status === 404) {
        return of(router.createUrlTree(['/collecteur/abonnement']));
      }
      return of(router.createUrlTree(['/collecteur/abonnement']));
    })
  );
};
