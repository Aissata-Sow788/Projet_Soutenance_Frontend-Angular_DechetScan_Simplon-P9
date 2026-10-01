import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CollecteurService } from '../../core/services/collecteur';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-devenir-collecteur',
  templateUrl: './devenir-collecteur.html',
})
export class DevenirCollecteur {

  // Services injectés nécessaires au fonctionnement de la page.
  private readonly formulaireBuilder = inject(FormBuilder);
  private readonly collecteurService = inject(CollecteurService);
  private readonly router = inject(Router);

  // État de l'écran : chargement, erreur éventuelle et confirmation d'envoi.
  chargement = signal(false);
  erreur = signal<string | null>(null);
  demandeEnvoyee = signal(false);

  // Formulaire de demande pour devenir collecteur.
  formulaire = this.formulaireBuilder.nonNullable.group({

    // Nom de l'entreprise : facultatif, mais limité à 150 caractères.
    nomEntreprise: ['', [Validators.maxLength(150)]],

    // Numéro professionnel obligatoire.
    // Le pattern accepte les numéros sénégalais commençant notamment par
    // 70, 75, 76, 77 ou 78, avec ou sans l'indicatif +221.
    // Formats acceptés :
    //   +221 77 076 69 09
    //   +221 77 000 00 00
    //   77 000 00 00
    //   770000000
    telephoneProfessionnel: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?:\+?221[\s.-]?)?(?:70|75|76|77|78)[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}$/),
        Validators.maxLength(20),
      ],
    ],

    // Zone dans laquelle le collecteur souhaite intervenir.
    zoneIntervention: ['', [
      Validators.required,
      Validators.maxLength(150),
    ]],
  });

  /**
   * Valide le formulaire puis envoie la demande au backend.
   */
  soumettre(): void {
    // Réinitialise l'ancien message d'erreur avant une nouvelle tentative.
    this.erreur.set(null);

    // Force l'affichage des erreurs de validation sur tous les champs.
    this.formulaire.markAllAsTouched();

    // Empêche l'envoi si le formulaire est invalide
    // ou si une demande est déjà en cours.
    if (this.formulaire.invalid || this.chargement()) {
      return;
    }

    // Active l'indicateur de chargement pendant l'appel API.
    this.chargement.set(true);

    // Envoie les données saisies au backend via le service collecteur.
    this.collecteurService.creerProfil(this.formulaire.getRawValue()).subscribe({

      // La demande a été créée avec succès.
      next: () => {
        this.chargement.set(false);
        this.demandeEnvoyee.set(true);
      },

      // Gestion des erreurs retournées par l'API.
      error: (erreur: HttpErrorResponse) => {
        this.chargement.set(false);
        this.erreur.set(this.messageErreur(erreur));
      },
    });
  }

  /**
   * Retourne vers l'accueil citoyen sans envoyer de demande.
   */
  retour(): void {
    this.router.navigate(['/home-citoyen']);
  }

  /**
   * Ouvre le centre de notifications depuis la cloche de l'en-tête.
   */
  ouvrirNotifications(): void {
    this.router.navigate(['/notification']);
  }

  /**
   * Transforme les erreurs HTTP du backend en message compréhensible
   * pour l'utilisateur.
   */
  private messageErreur(erreur: HttpErrorResponse): string {

    // Le backend peut éventuellement retourner un détail explicite.
    const detail: unknown = erreur.error?.detail;

    // Cas particulier : session expirée ou utilisateur non authentifié.
    if (erreur.status === 401) {
      return 'Votre session a expiré. Veuillez vous reconnecter avant de continuer.';
    }

    // Si le backend fournit un message texte, on l'affiche directement.
    if (typeof detail === 'string') {
      return detail;
    }

    // Message générique pour les autres erreurs.
    return 'Impossible d’envoyer votre demande pour le moment. Veuillez réessayer.';
  }
}
