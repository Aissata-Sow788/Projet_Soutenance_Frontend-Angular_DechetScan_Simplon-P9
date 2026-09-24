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

  private router = inject(Router);

  get utilisateurConnecte(): boolean {
    return !!localStorage.getItem('dechetscan_token');
  }

  /**
   * Vérifie si une route est actuellement active.
   */
  estActif(route: string): boolean {
    return this.router.url === route;
  }

  /**
   * Accueil est actif pour les deux interfaces citoyen :
   * - accueil public
   * - accueil citoyen connecté
   */
  estAccueilActif(): boolean {
    return this.router.url === '/accueil' ||
           this.router.url === '/home-citoyen';
  }

  /**
   * Accueil dynamique selon la connexion.
   */
  allerAccueil(): void {
    if (this.utilisateurConnecte) {
      this.router.navigate(['/home-citoyen']);
    } else {
      this.router.navigate(['/accueil']);
    }
  }

  /**
   * Scanner accessible à tous.
   */
  allerScanner(): void {
    this.router.navigate(['/scan']);
  }

  /**
   * Historique réservé aux utilisateurs connectés.
   */
  allerHistorique(): void {
    if (this.utilisateurConnecte) {
      this.router.navigate(['/historique']);
    } else {
      this.router.navigate(['/connexion']);
    }
  }

  /**
   * Points de collecte accessibles à tous.
   */
  allerPoints(): void {
    this.router.navigate(['/points-collecte']);
  }

  /**
   * Profil réservé aux utilisateurs connectés.
   */
  allerProfil(): void {
    if (this.utilisateurConnecte) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/connexion']);
    }
  }
}
