import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-connexion',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  styleUrl: './connexion.css',
  templateUrl: './connexion.html',
})export class Connexion {

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

  // Soumission du formulaire
  onSubmit(): void {

    // Affiche les informations dans la console
    console.log('BOUTON CLIQUÉ');
    console.log('Formulaire:', this.loginForm.value);
    console.log('Valide:', this.loginForm.valid);

    // Vérifie si le formulaire est invalide
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // Active le chargement
    this.chargement.set(true);
    this.erreurServeur.set(null);

    // Récupère les valeurs du formulaire
    const { identifiant, motDePasse } = this.loginForm.value;

    // Envoie les données au service Auth
    this.authService.login(identifiant, motDePasse).subscribe({

      // Connexion réussie
      next: () => {
        this.chargement.set(false);
        this.router.navigate(['/']);
      },

      // Erreur de connexion
      error: (err) => {
        this.chargement.set(false);
        this.erreurServeur.set(err.message ?? 'Une erreur est survenue.');
      }
    });
  }
}
