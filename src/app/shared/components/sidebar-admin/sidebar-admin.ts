import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar-admin',
  styleUrl: './sidebar-admin.css',
  templateUrl: './sidebar-admin.html',
})
export class SidebarAdmin {

  private readonly auth = inject(Auth)
  private readonly router = inject(Router)

    // Déconnecte l'utilisateur.
  deconnecter(): void {

    // Supprime les informations d'authentification.
    this.auth.logout();

    // Redirige vers la page de connexion.
    this.router.navigate(['/connexion-admin']);
  }
}
