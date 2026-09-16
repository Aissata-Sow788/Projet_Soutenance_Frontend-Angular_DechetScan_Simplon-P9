// Importe le type d'intercepteur fonctionnel Angular.
import { HttpInterceptorFn } from '@angular/common/http';

// Intercepteur chargé d'ajouter le JWT aux requêtes protégées.
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  // Liste des routes qui ne nécessitent pas de JWT.
  const routesPubliques = [
    '/api/auth/register/',
    '/api/auth/login/',
    '/api/types/',
    '/api/conseils/'
  ];

  // Vérifie si l'URL actuelle correspond à une route publique.
  const estRoutePublique = routesPubliques.some(
    (route) => req.url.includes(route)
  );

  // Si la route est publique, on envoie la requête sans Authorization.
  if (estRoutePublique) {
    return next(req);
  }

  // Récupère le token JWT enregistré dans le localStorage.
  const token = localStorage.getItem('dechetscan_token');

  // S'il n'existe aucun token, on envoie simplement la requête.
  if (!token) {
    return next(req);
  }

  // Clone la requête et ajoute le token JWT.
  const requeteAvecToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  // Envoie la requête modifiée au serveur Django.
  return next(requeteAvecToken);
};
