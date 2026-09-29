import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { CollecteurService } from '../../../core/services/collecteur';
import {
  ProfilCollecteur,
  ProfilCollecteurModification,
} from '../../../shared/models/collecteur.model';

@Component({
  selector: 'app-profil-collecteur-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profil-collecteur.html',
})
export class ProfilCollecteurPage implements OnInit {
  // Services utilisés pour gérer le formulaire, le profil et l'authentification.
  private readonly formBuilder = inject(FormBuilder);
  private readonly collecteurService = inject(CollecteurService);
  private readonly auth = inject(Auth);

  // États de la page et messages affichés à l'utilisateur.
  readonly profil = signal<ProfilCollecteur | null>(null);
  readonly chargement = signal(true);
  readonly enregistrement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly messageSucces = signal<string | null>(null);

  // États liés au changement de mot de passe.
  readonly changementMotDePasseOuvert = signal(false);
  readonly enregistrementMotDePasse = signal(false);
  readonly erreurMotDePasse = signal<string | null>(null);
  readonly succesMotDePasse = signal<string | null>(null);

  // Formulaire principal du profil collecteur.
  readonly formulaire = this.formBuilder.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(150)]],
    last_name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    telephone: [''],
    ville: ['', [Validators.maxLength(100)]],
    nomEntreprise: ['', [Validators.maxLength(150)]],
    telephoneProfessionnel: ['', [Validators.maxLength(20)]],
  });

  // Formulaire utilisé uniquement pour modifier le mot de passe.
  readonly formulaireMotDePasse = this.formBuilder.nonNullable.group({
    ancienMotDePasse: ['', Validators.required],
    nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
    confirmationMotDePasse: ['', Validators.required],
  });

  ngOnInit(): void {
    // Charge les informations du collecteur au démarrage de la page.
    this.chargerProfil();
  }

  chargerProfil(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    // Récupère le profil connecté depuis l'API.
    this.collecteurService.obtenirMonProfil().subscribe({
      next: profil => {
        this.profil.set(profil);

        // Met également à jour les informations stockées par Auth.
        this.auth.mettreAJourUtilisateur({
          first_name: profil.first_name,
          last_name: profil.last_name,
          email: profil.email,
          telephone: profil.telephone,
          ville: profil.ville,
        });

        // Préremplit le formulaire avec les données reçues.
        this.formulaire.patchValue({
          first_name: profil.first_name,
          last_name: profil.last_name,
          email: profil.email,
          telephone: profil.telephone ?? '',
          ville: profil.ville,
          nomEntreprise: profil.nomEntreprise,
          telephoneProfessionnel: profil.telephoneProfessionnel,
        });

        this.chargement.set(false);
      },
      error: error => {
        // Affiche une erreur si le profil n'a pas pu être récupéré.
        this.erreur.set(
          this.messageErreur(error, 'Impossible de charger votre profil.')
        );
        this.chargement.set(false);
      },
    });
  }

  enregistrerProfil(): void {
    // Réinitialise les anciens messages avant la sauvegarde.
    this.messageSucces.set(null);
    this.erreur.set(null);
    this.formulaire.markAllAsTouched();

    // Bloque l'envoi si le formulaire est invalide ou déjà en cours.
    if (this.formulaire.invalid || this.enregistrement()) {
      return;
    }

    this.enregistrement.set(true);

    // Récupère les valeurs du formulaire et nettoie les champs texte.
    const valeur = this.formulaire.getRawValue();
    const donnees: ProfilCollecteurModification = {
      ...valeur,
      first_name: valeur.first_name.trim(),
      last_name: valeur.last_name.trim(),
      email: valeur.email.trim(),
      telephone: valeur.telephone.trim() || null,
      ville: valeur.ville.trim(),
      nomEntreprise: valeur.nomEntreprise.trim(),
      telephoneProfessionnel: valeur.telephoneProfessionnel.trim(),
    };

    // Envoie les modifications au backend.
    this.collecteurService.modifierMonProfil(donnees).subscribe({
      next: profil => {
        this.profil.set(profil);

        // Actualise le téléphone affiché après la réponse de l'API.
        this.formulaire.patchValue({
          telephone: profil.telephone ?? '',
        });

        this.messageSucces.set(
          'Vos modifications ont bien été enregistrées.'
        );
        this.enregistrement.set(false);
      },
      error: error => {
        this.erreur.set(
          this.messageErreur(
            error,
            'Impossible d’enregistrer les modifications.'
          )
        );
        this.enregistrement.set(false);
      },
    });
  }

  basculerChangementMotDePasse(): void {
    // Ouvre ou ferme la section de changement de mot de passe.
    this.changementMotDePasseOuvert.update(ouvert => !ouvert);

    // Nettoie les anciens messages et les champs du formulaire.
    this.erreurMotDePasse.set(null);
    this.succesMotDePasse.set(null);
    this.formulaireMotDePasse.reset();
  }

  changerMotDePasse(): void {
    // Réinitialise les messages avant la validation.
    this.erreurMotDePasse.set(null);
    this.succesMotDePasse.set(null);
    this.formulaireMotDePasse.markAllAsTouched();

    // Vérifie que le formulaire est valide et qu'aucune modification n'est en cours.
    if (this.formulaireMotDePasse.invalid || this.enregistrementMotDePasse()) {
      return;
    }

    const donnees = this.formulaireMotDePasse.getRawValue();

    // Vérifie que le nouveau mot de passe et sa confirmation correspondent.
    if (donnees.nouveauMotDePasse !== donnees.confirmationMotDePasse) {
      this.erreurMotDePasse.set(
        'Les nouveaux mots de passe ne correspondent pas.'
      );
      return;
    }

    this.enregistrementMotDePasse.set(true);

    // Envoie la demande de changement de mot de passe à l'API.
    this.auth.changerMotDePasse(donnees).subscribe({
      next: response => {
        this.succesMotDePasse.set(response.detail);

        // Vide le formulaire après une modification réussie.
        this.formulaireMotDePasse.reset();
        this.enregistrementMotDePasse.set(false);
      },
      error: error => {
        this.erreurMotDePasse.set(
          this.messageErreur(
            error,
            'Impossible de modifier le mot de passe.'
          )
        );
        this.enregistrementMotDePasse.set(false);
      },
    });
  }

  initiales(): string {
    const profil = this.profil();

    // Retourne une chaîne vide si le profil n'est pas encore chargé.
    if (!profil) {
      return '';
    }

    // Construit les initiales à partir du prénom et du nom.
    return `${profil.first_name.charAt(0)}${profil.last_name.charAt(0)}`.toUpperCase();
  }

  private messageErreur(error: unknown, fallback: string): string {
    // Utilise le message par défaut si l'erreur n'est pas une erreur HTTP.
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    // Message spécifique lorsque la session JWT a expiré.
    if (error.status === 401) {
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    }

    // Récupère le détail envoyé directement par le backend.
    const detail: unknown = error.error?.detail;
    if (typeof detail === 'string') {
      return detail;
    }

    // Cherche un message dans les erreurs de validation Django.
    if (error.status === 400 && error.error && typeof error.error === 'object') {
      for (const value of Object.values(error.error as Record<string, unknown>)) {
        if (typeof value === 'string') {
          return value;
        }

        if (Array.isArray(value) && typeof value[0] === 'string') {
          return value[0];
        }
      }
    }

    // Utilise le message générique si aucun détail n'a été trouvé.
    return fallback;
  }
}
