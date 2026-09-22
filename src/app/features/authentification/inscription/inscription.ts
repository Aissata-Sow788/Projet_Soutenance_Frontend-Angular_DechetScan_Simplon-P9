import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { RegisterPayload } from '../../../shared/models/utilisateur.model';


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
        // Accepte un numéro sénégalais à 9 chiffres,
        // avec le préfixe +221 facultatif.
        Validators.pattern(/^(?:\+221)?[0-9]{9}$/)
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
        this.router.navigate(['/accueil']);
      },

      // Erreur lors de l'inscription
      error: (err) => {
        this.chargement = false;
        this.erreurServeur =
          err.message ?? 'Une erreur est survenue.';
      }
    });
  }
}
