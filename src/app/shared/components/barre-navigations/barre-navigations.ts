import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-barre-navigations',
  styleUrl: './barre-navigations.css',
  templateUrl: './barre-navigations.html',
})


export class BarreNavigations {

  // Permet de naviguer vers les différentes pages de l'application.
  private router = inject(Router);

  /**
   * Vérifie simplement si un token de connexion existe.
   *
   * Le token est enregistré dans localStorage après une connexion réussie.
   */
  get utilisateurConnecte(): boolean {
    return !!localStorage.getItem('dechetscan_token');
  }

  /**
   * Gestion du bouton Accueil.
   *
   * - Utilisateur connecté → accueil citoyen
   * - Utilisateur non connecté → accueil public
   */
  allerAccueil(): void {
    if (this.utilisateurConnecte) {
      this.router.navigate(['/home-citoyen']);
    } else {
      this.router.navigate(['/']);
    }
  }

  /**
   * Le scanner reste accessible aux utilisateurs connectés
   * comme aux utilisateurs non connectés.
   */
  allerScanner(): void {
    this.router.navigate(['/scan']);
  }

  /**
   * Les utilisateurs non connectés doivent se connecter
   * avant d'accéder à leur historique.
   */
  allerHistorique(): void {
    if (this.utilisateurConnecte) {
      this.router.navigate(['/historique']);
    } else {
      this.router.navigate(['/connexion']);
    }
  }

  /**
   * Les points de collecte sont accessibles à tout le monde.
   */
  allerPoints(): void {
    this.router.navigate(['/points-collecte']);
  }

  /**
   * Le profil nécessite une connexion.
   */
  allerProfil(): void {
    if (this.utilisateurConnecte) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/connexion']);
    }
  }
}
