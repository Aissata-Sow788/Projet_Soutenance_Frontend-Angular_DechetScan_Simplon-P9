import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  imports: [RouterLink],
  selector: 'app-header-collecteur',
  styleUrl: './header-collecteur.css',
  templateUrl: './header-collecteur.html',
})
export class HeaderCollecteur {

  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  nomAffiche(): string {
    const utilisateur = this.auth.getCurrentUser();
    return utilisateur
      ? `${utilisateur.first_name} ${utilisateur.last_name}`.trim() || utilisateur.email
      : 'Collecteur';
  }

  initiales(): string {
    const utilisateur = this.auth.getCurrentUser();
    if (!utilisateur) {
      return 'CO';
    }
    return `${utilisateur.first_name.charAt(0)}${utilisateur.last_name.charAt(0)}`.toUpperCase();
  }

  // Navigue vers la page des notifications.
  ouvrirNotifications(): void {
    this.router.navigate(['/notification']);
  }
}
