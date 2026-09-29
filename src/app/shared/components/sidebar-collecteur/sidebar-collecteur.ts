import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar-collecteur',
  styleUrl: './sidebar-collecteur.css',
  templateUrl: './sidebar-collecteur.html',
})
export class SidebarCollecteur {

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Déconnecte le collecteur et redirige vers la page de connexion.
  deconnecter(): void {
    this.auth.logout();
    this.router.navigate(['/connexion']);
  }
}
