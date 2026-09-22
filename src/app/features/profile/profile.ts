import { Component, OnInit, inject, signal, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Auth } from '../../core/services/auth';
import { Utilisateur } from '../../shared/models/utilisateur.model';

@Component({
  imports: [CommonModule],
  selector: 'app-profile',
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})

export class Profile implements OnInit {

  // Injecte le service d'authentification.
  private auth = inject(Auth);

  // Injecte le routeur Angular.
  private router = inject(Router);

  // Contient l'utilisateur actuellement connecté.
  utilisateur = signal<Utilisateur | null>(null);

  // Indique si la récupération du profil est en cours.
  chargement = signal(true);

  // Contient un éventuel message d'erreur.
  erreur = signal('');

  // Méthode exécutée automatiquement lors du chargement de la page.
  ngOnInit(): void {

    // Demande au backend les informations de l'utilisateur connecté.
    this.auth.me().subscribe({

      // Si Django répond correctement.
      next: (utilisateur) => {

      // Stocke l'utilisateur reçu depuis /me/ dans le signal.
      this.utilisateur.set(utilisateur);

      // Arrête le chargement.
      this.chargement.set(false);
      },

      // Si la requête /me/ échoue.
      error: (err) => {

        // Affiche l'erreur dans la console pour faciliter le débogage.
        console.error('Erreur lors de la récupération du profil :', err);

        // Affiche un message à l'utilisateur.
        this.erreur.set(
          'Impossible de récupérer les informations du profil.'
        );

        // Arrête l'indicateur de chargement.
        this.chargement.set(false);
      }
    });
  }

  // Retourne vers la page d'accueil.
  retour(): void {
    this.router.navigate(['/home-citoyen']);
  }

  // Construit les initiales de l'utilisateur.
  initiales = computed(() => {

    // Récupère l'utilisateur actuel depuis le signal.
    const user = this.utilisateur();

    // Si aucun utilisateur n'est encore disponible.
    if (!user) {
      return 'AS';
    }

    // Construit les initiales à partir du prénom et du nom.
    return `${user.first_name.charAt(0) ?? ''}${user.last_name.charAt(0) ?? ''}`
      .toUpperCase();
  });

  // Construit le nom complet de l'utilisateur.
  nomComplet = computed(() => {

    // Récupère l'utilisateur actuel.
    const user = this.utilisateur();

    // Si aucun utilisateur n'est disponible.
    if (!user) {
      return '';
    }

    // Retourne le prénom suivi du nom.
    return `${user.first_name} ${user.last_name}`;
  });

  // Ouvre la page de modification du profil.
  modifierProfil(): void {
    this.router.navigate(['/profil/modifier']);
  }

  // Déconnecte l'utilisateur.
  deconnecter(): void {

    // Supprime les informations d'authentification.
    this.auth.logout();

    // Redirige vers la page de connexion.
    this.router.navigate(['/connexion']);
  }
}
