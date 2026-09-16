import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-connexion',
  imports: [CommonModule, ReactiveFormsModule],
  styleUrl: './connexion.css',
  templateUrl: './connexion.html',
})
export class Connexion {

  // Formulaire de connexion
  loginForm: FormGroup;

  // Afficher ou cacher le mot de passe
  afficherMotDePasse = signal(false);

  // État de chargement
  chargement = signal(false);

  // Message d'erreur
  erreurServeur = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {

    // Création du formulaire et de ses validations
    this.loginForm = this.fb.group({
      identifiant: ['', [Validators.required]],
      motDePasse: ['', [Validators.required]]
    });
  }

  // Afficher ou cacher le mot de passe
  toggleMotDePasse(): void {
    this.afficherMotDePasse.update(v => !v);
  }

  // Vérifie si un champ est valide et a été touché
  champValide(nomChamp: string): boolean {
    const champ = this.loginForm.get(nomChamp);
    return !!champ && champ.valid && champ.touched;
  }

// Soumission du formulaire de connexion.
onSubmit(): void {

  // Affiche les informations dans la console pour le débogage.
  console.log('BOUTON CLIQUÉ');
  console.log('Formulaire:', this.loginForm.value);
  console.log('Valide:', this.loginForm.valid);

  // Vérifie si le formulaire est invalide.
  if (this.loginForm.invalid) {

    // Affiche les erreurs de validation des champs.
    this.loginForm.markAllAsTouched();

    // Arrête la méthode.
    return;
  }

  // Active l'indicateur de chargement.
  this.chargement.set(true);

  // Supprime l'ancien message d'erreur.
  this.erreurServeur.set(null);
// Récupère les valeurs saisies dans le formulaire.
const { identifiant, motDePasse } = this.loginForm.value;

// Construit le payload attendu par le serializer Django.
const payload = {
  identifiant: identifiant,
  password: motDePasse
};

// Envoie les identifiants au backend.
this.authService.login(payload).subscribe({

  // Exécuté lorsque la connexion est réussie.
  next: (response) => {

    // Affiche la réponse JWT dans la console pour vérifier.
    console.log('Connexion réussie :', response);

    // Arrête l'indicateur de chargement.
    this.chargement.set(false);

    // Redirige vers la page d'accueil.
    this.router.navigate(['/']);
  },

  // Exécuté lorsque Django retourne une erreur.
  error: (err) => {

    // Affiche le statut HTTP.
    console.error('Status HTTP :', err.status);

    // Affiche exactement la réponse envoyée par Django.
    console.error('Réponse Django :', err.error);

    // Arrête l'indicateur de chargement.
    this.chargement.set(false);

    // Affiche le message retourné par Django.
    this.erreurServeur.set(
      err.error?.detail ||
      err.error?.non_field_errors?.[0] ||
      'Identifiant ou mot de passe incorrect.'
    );
  }
});
}
}
