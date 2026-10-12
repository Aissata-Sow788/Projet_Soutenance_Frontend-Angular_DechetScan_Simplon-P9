import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { RegisterPayload } from '../../../shared/models/utilisateur.model';

export function formaterErreurInscription(erreur: unknown): string {
  if (!(erreur instanceof HttpErrorResponse)) {
    return 'Une erreur inattendue est survenue. Réessayez.';
  }

  if (erreur.status === 504) {
    return 'Le serveur a mis trop de temps à répondre. Vérifiez votre connexion puis réessayez. Si le compte a peut-être été créé, essayez d’abord de vous connecter.';
  }
  if (erreur.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.';
  }

  const donnees = erreur.error;
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
    return typeof donnees === 'string' && donnees
      ? donnees
      : 'L’inscription a échoué. Vérifiez les informations saisies puis réessayez.';
  }

  const erreurs = donnees as Record<string, unknown>;
  const messages = Object.entries(erreurs).flatMap(([champ, valeur]) => {
    const valeurs = Array.isArray(valeur) ? valeur : [valeur];
    const texte = valeurs
      .filter((element): element is string => typeof element === 'string')
      .join(' ')
      .toLowerCase();

    if (champ === 'email') {
      return [texte.includes('already exists') || texte.includes('déjà')
        ? 'Cette adresse e-mail est déjà utilisée.'
        : 'Vérifiez votre adresse e-mail.'];
    }
    if (champ === 'telephone') {
      return [texte.includes('already exists') || texte.includes('déjà')
        ? 'Ce numéro de téléphone est déjà associé à un compte.'
        : 'Vérifiez votre numéro de téléphone.'];
    }
    if (champ === 'password' || champ === 'password2') {
      return [texte.includes('do not match') || texte.includes('ne correspondent')
        ? 'Les mots de passe ne correspondent pas.'
        : 'Le mot de passe ne respecte pas les conditions requises.'];
    }
    if (champ === 'first_name' || champ === 'last_name' || champ === 'ville') {
      return ['Vérifiez que tous les champs obligatoires sont remplis.'];
    }
    if (champ === 'non_field_errors' || champ === 'detail') {
      return valeurs.filter((element): element is string => typeof element === 'string');
    }

    return valeurs.filter((element): element is string => typeof element === 'string');
  });

  return messages.length > 0
    ? [...new Set(messages)].join(' ')
    : 'L’inscription a échoué. Vérifiez les informations saisies puis réessayez.';
}


@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  selector: 'app-inscription',
  styleUrl: './inscription.css',
  templateUrl: './inscription.html',
})

export class Inscription {

  // Formulaire d'inscription
  registerForm: FormGroup;

  // Afficher ou cacher les mots de passe
  afficherMotDePasse = false;
  afficherConfirmation = false;

  // État de chargement
  chargement = false;

  // Message d'erreur
  erreurServeur: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {

    // Création du formulaire et de ses validations
    this.registerForm = this.fb.group({

      // Prénom obligatoire, minimum 2 caractères
      prenom: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],

      // Nom obligatoire, minimum 2 caractères
      nom: ['', [
        Validators.required,
        Validators.minLength(2)
      ]],

      // Email obligatoire et valide
      email: ['', [
        Validators.required,
        Validators.email
      ]],

      // Téléphone obligatoire
      telephone: ['', [
        Validators.required,
        // Accepte un numéro sénégalais commençant par 70/75/76/77/78
        // avec ou sans l'indicatif +221, dans tous les formats courants :
        //   +221 77 076 69 09  |  77 000 00 00  |  770000000
        Validators.pattern(/^(?:\+?221[\s.-]?)?(?:70|75|76|77|78)[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}$/)
      ]],

      // Ville obligatoire
      ville: ['', [
        Validators.required
      ]],

      // Mot de passe obligatoire, minimum 8 caractères
      motDePasse: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],

      // Confirmation obligatoire
      confirmerMotDePasse: ['', [
        Validators.required
      ]]

    }, {
      // Vérifie que les deux mots de passe sont identiques
      validators: this.motsDePasseIdentiquesValidator
    });
  }

  // Compare les deux mots de passe
  private motsDePasseIdentiquesValidator(
    group: AbstractControl
  ): ValidationErrors | null {

    const mdp = group.get('motDePasse')?.value;
    const confirmation = group.get('confirmerMotDePasse')?.value;

    return mdp === confirmation
      ? null
      : { motsDePasseDifferents: true };
  }

  // Vérifie si un champ est valide et a été touché
  champValide(nomChamp: string): boolean {

    const champ = this.registerForm.get(nomChamp);

    return !!champ && champ.valid && champ.touched;
  }

  // Vérifie si les deux mots de passe correspondent
  get motsDePasseConcordent(): boolean {

    const mdp = this.registerForm.get('motDePasse');
    const confirmation = this.registerForm.get('confirmerMotDePasse');

    return !!mdp?.value &&
           !!confirmation?.value &&
           mdp.value === confirmation.value &&
           !this.registerForm.hasError('motsDePasseDifferents');
  }

  // Afficher ou cacher le mot de passe
  toggleMotDePasse(): void {
    this.afficherMotDePasse = !this.afficherMotDePasse;
  }

  // Afficher ou cacher la confirmation
  toggleConfirmation(): void {
    this.afficherConfirmation = !this.afficherConfirmation;
  }

  // Soumission du formulaire
  onSubmit(): void {

    // Vérifie si le formulaire est invalide
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    // Active le chargement
    this.chargement = true;
    this.erreurServeur = null;

// Prépare les données à envoyer au backend.
const payload: RegisterPayload = {
  // Convertit le champ prenom du formulaire vers first_name attendu par Django.
  first_name: this.registerForm.value.prenom,

  // Convertit le champ nom du formulaire vers last_name attendu par Django.
  last_name: this.registerForm.value.nom,

  // Envoie l'adresse email.
  email: this.registerForm.value.email,

  // Envoie le numéro de téléphone.
  telephone: this.registerForm.value.telephone,

  // Envoie la ville.
  ville: this.registerForm.value.ville,

  // Convertit motDePasse vers password attendu par Django.
  password: this.registerForm.value.motDePasse,

  // Utilise le vrai nom du champ de confirmation du formulaire.
  password2: this.registerForm.value.confirmerMotDePasse
};

    // Envoie les données au service Auth
    this.authService.register(payload).subscribe({

      // Inscription réussie
      next: () => {
        this.chargement = false;
        this.router.navigate(['/connexion']);
      },

      // Erreur lors de l'inscription
      error: (err) => {
        this.chargement = false;
        this.erreurServeur = formaterErreurInscription(err);
      }
    });
  }
}
