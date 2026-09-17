import { Admin } from './../../../core/services/admin';
import { Utilisateur } from './../../../shared/models/utilisateur.model';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { Role } from './../../../shared/models/utilisateur.model';


@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-connexion-admin',
  styleUrl: './connexion-admin.css',
  templateUrl: './connexion-admin.html',
})


export class ConnexionAdmin {

  // Injection du service d'authentification existant.
  // Aucun nouveau service Auth n'est nécessaire.
  private auth = inject(Auth);

  // Permet de naviguer vers les différentes pages de l'application.
  private router = inject(Router);

  // Email saisi dans le formulaire.
  email = '';

  // Mot de passe saisi dans le formulaire.
  motDePasse = '';

  // Permet d'afficher ou de masquer le mot de passe.
  afficherMotDePasse = signal(false);

  // Permet de savoir si une connexion est en cours.
  chargement = signal(false);

  // Message d'erreur affiché sous le formulaire.
  erreur = signal<string | null>(null);

  // Inverse l'affichage du mot de passe.
  basculerMotDePasse(): void {
    this.afficherMotDePasse.update(
      valeur => !valeur
    );
  }

// Lance la connexion avec le service Auth existant.
seConnecter(): void {

  // Supprime l'ancien message d'erreur.
  this.erreur.set(null);

  // Vérifie que les champs obligatoires sont remplis.
  if (!this.email.trim() || !this.motDePasse.trim()) {

    // Affiche un message si un champ est vide.
    this.erreur.set(
      'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
    );

    // Arrête la connexion.
    return;
  }

  // Active l'état de chargement.
  this.chargement.set(true);

  // Prépare les informations envoyées à Django.
  const payload = {

    // Identifiant utilisé pour la connexion.
    identifiant: this.email.trim(),

    // Mot de passe saisi.
    password: this.motDePasse
  };


  // Première étape : connexion auprès de Django.
  this.auth.login(payload).subscribe({

    // Si le login est réussi.
    next: () => {

      // Deuxième étape : récupère les informations
      // de l'utilisateur connecté avec /api/auth/me/.
      this.auth.me().subscribe({

        // Si /me/ fonctionne.
        next: (utilisateur) => {

          // Vérifie le rôle renvoyé par Django.
          if (utilisateur.role === Role.ADMINISTRATEUR) {

            // Désactive le chargement avant la redirection.
            this.chargement.set(false);

            // Redirige vers le tableau de bord admin.
            this.router.navigate(['/admin']);

          } else {

            // Déconnecte l'utilisateur qui n'est pas admin.
            this.auth.logout();

            // Affiche le message d'accès refusé.
            this.erreur.set(
              'Ce compte ne possède pas les droits administrateur.'
            );

            // Désactive le chargement.
            this.chargement.set(false);
          }
        },

        // Si la récupération de /me/ échoue.
        error: () => {

          // Supprime les tokens enregistrés.
          this.auth.logout();

          // Affiche l'erreur.
          this.erreur.set(
            'Impossible de récupérer les informations du compte.'
          );

          // Désactive le chargement.
          this.chargement.set(false);
        }
      });
    },

    // Si le login Django échoue.
    error: (error) => {

      // Affiche le message renvoyé par Django
      // ou un message par défaut.
      this.erreur.set(
        error?.error?.detail ||
        error?.error?.non_field_errors?.[0] ||
        'Adresse e-mail ou mot de passe incorrect.'
      );

      // Désactive le chargement.
      this.chargement.set(false);
    }
  });
}


// Redirige vers la page de récupération du mot de passe.
motDePasseOublie(): void {

  // Navigue vers la page correspondante.
  this.router.navigate(['/mot-de-passe-oublie']);
}
}
