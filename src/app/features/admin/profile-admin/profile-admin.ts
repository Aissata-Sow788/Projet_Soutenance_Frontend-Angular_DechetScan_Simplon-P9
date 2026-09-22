import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { Utilisateur, Role } from '../../../shared/models/utilisateur.model';

@Component({
  imports: [CommonModule],
  selector: 'app-profile-admin',
  styleUrl: './profile-admin.css',
  templateUrl: './profile-admin.html',
})
export class ProfileAdmin {

  // Service d'authentification utilisé pour récupérer
  // les informations de l'administrateur connecté.
  private readonly auth = inject(Auth);

  // Permet de naviguer vers les autres pages.
  private readonly router = inject(Router);


  // ============================================================
  // DONNÉES DU PROFIL
  // ============================================================

  // Contient les informations de l'administrateur connecté.
  utilisateur = signal<Utilisateur | null>(null);

  // Permet d'afficher un indicateur pendant le chargement.
  chargement = signal(true);

  // Contient le message d'erreur éventuel.
  erreur = signal<string | null>(null);


  // ============================================================
  // INITIALISATION
  // ============================================================

  constructor() {

    // Récupère les informations réelles depuis Django.
    this.chargerProfil();
  }


  // ============================================================
  // RÉCUPÉRATION DU PROFIL
  // ============================================================

  chargerProfil(): void {

    // Active le chargement.
    this.chargement.set(true);

    // Supprime une ancienne erreur.
    this.erreur.set(null);


    // Appelle l'endpoint Django /api/auth/me/.
    this.auth.me().subscribe({

      // Si Django renvoie correctement l'utilisateur.
      next: (utilisateur) => {

        // Enregistre l'utilisateur dans le signal.
        this.utilisateur.set(utilisateur);

        // Termine le chargement.
        this.chargement.set(false);
      },


      // Si la récupération échoue.
      error: (erreur) => {

        // Affiche l'erreur dans la console pour faciliter le débogage.
        console.error(
          '[PROFILE ADMIN] Impossible de récupérer le profil :',
          erreur
        );

        // Affiche un message dans l'interface.
        this.erreur.set(
          'Impossible de récupérer les informations du profil.'
        );

        // Termine le chargement.
        this.chargement.set(false);
      }
    });
  }


  // ============================================================
  // NOM COMPLET
  // ============================================================

  get nomComplet(): string {

    // Récupère l'utilisateur actuellement connecté.
    const user = this.utilisateur();

    // Si aucun utilisateur n'est encore disponible,
    // affiche un texte temporaire.
    if (!user) {
      return 'Administrateur';
    }

    // Construit le nom à partir du prénom et du nom.
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
      || 'Administrateur';
  }


  // ============================================================
  // INITIALES
  // ============================================================

  get initiales(): string {

    // Récupère l'utilisateur.
    const user = this.utilisateur();

    // Si aucune donnée n'est disponible.
    if (!user) {
      return 'AD';
    }

    // Récupère la première lettre du prénom.
    const premiereLettrePrenom =
      user.first_name?.charAt(0)?.toUpperCase() ?? '';

    // Récupère la première lettre du nom.
    const premiereLettreNom =
      user.last_name?.charAt(0)?.toUpperCase() ?? '';

    // Retourne les initiales.
    return `${premiereLettrePrenom}${premiereLettreNom}` || 'AD';
  }


  // ============================================================
  // RÔLE
  // ============================================================

  get role(): string {

    // Récupère l'utilisateur connecté.
    const user = this.utilisateur();

    // Vérifie le rôle renvoyé par Django.
    if (user?.role === Role.ADMINISTRATEUR) {
      return 'Administrateur';
    }

    // Valeur de secours.
    return 'Administrateur';
  }


  // ============================================================
  // DÉCONNEXION
  // ============================================================

  seDeconnecter(): void {

    // Supprime les tokens et les informations utilisateur
    // enregistrés dans le navigateur.
    this.auth.logout();

    // Redirige vers la page de connexion administrateur.
    this.router.navigate(['/connexion-admin']);
  }


  // ============================================================
  // RETOUR AU DASHBOARD
  // ============================================================

  retourDashboard(): void {

    // Retourne au tableau de bord administrateur.
    this.router.navigate(['/admin']);
  }
}
