import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Bloque l'accès si aucun utilisateur n'est connecté (peu importe le rôle)
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  const utilisateurBrut = localStorage.getItem('dechetscan_user');

  if (!utilisateurBrut) {
    router.navigate(['/connexion']);
    return false;
  }

  return true;
};

// Bloque l'accès si l'utilisateur n'est pas connecté avec le rôle admin
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  const utilisateurBrut = localStorage.getItem('dechetscan_user');

  if (!utilisateurBrut) {
    router.navigate(['/connexion-admin']);
    return false;
  }

  const utilisateur = JSON.parse(utilisateurBrut);

  if (utilisateur.role !== 'admin') {
    router.navigate(['/scan']);
    return false;
  }

  return true;
};
