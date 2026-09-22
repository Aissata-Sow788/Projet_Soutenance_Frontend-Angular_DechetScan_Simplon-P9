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

  // Formulaire de connexion.
  loginForm: FormGroup;

  // Contrôle l'affichage ou le masquage du mot de passe.
  afficherMotDePasse = signal(false);

  // Indique qu'une connexion est actuellement en cours.
  chargement = signal(false);

  // Contient l'erreur retournée par le backend.
  erreurServeur = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router
  ) {

    // Création du formulaire avec les validations.
    this.loginForm = this.fb.group({

      // L'utilisateur peut saisir un e-mail ou un numéro de téléphone.
      // Le champ est obligatoire.
      identifiant: [
        '',
        [
          Validators.required,

          // Autorise :
          // - une adresse e-mail classique
          // - un numéro sénégalais commençant par 70, 75, 76, 77 ou 78
          Validators.pattern(
            /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+221\s?)?(?:70|75|76|77|78)(?:[\s.-]?\d{2}){3})$/
          )
        ]
      ],

      // Le mot de passe est obligatoire et doit contenir
      // au minimum 8 caractères.
      motDePasse: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128)
        ]
      ]
    });
  }


  // Affiche ou masque le mot de passe.
  toggleMotDePasse(): void {
    this.afficherMotDePasse.update(valeur => !valeur);
  }


  // Vérifie si un champ est valide après avoir été touché.
  champValide(nomChamp: string): boolean {
    const champ = this.loginForm.get(nomChamp);

    return !!champ && champ.valid && champ.touched;
  }


  // Vérifie si un champ est invalide après interaction.
  champInvalide(nomChamp: string): boolean {
    const champ = this.loginForm.get(nomChamp);

    return !!champ && champ.invalid && champ.touched;
  }


  // Soumet le formulaire de connexion.
  onSubmit(): void {

    // Affiche les informations dans la console
    // pendant les tests du formulaire.
    console.log('BOUTON CLIQUÉ');
    console.log('Formulaire :', this.loginForm.value);
    console.log('Valide :', this.loginForm.valid);

    // Si le formulaire est invalide,
    // on affiche toutes les erreurs.
    if (this.loginForm.invalid) {

      // Marque tous les champs comme touchés
      // afin de faire apparaître leurs messages d'erreur.
      this.loginForm.markAllAsTouched();

      return;
    }

    // Active l'indicateur de chargement.
    this.chargement.set(true);

    // Supprime une ancienne erreur serveur.
    this.erreurServeur.set(null);

    // Récupère les valeurs saisies.
    const identifiant = this.loginForm.value.identifiant?.trim();
    const motDePasse = this.loginForm.value.motDePasse;

    // Construit le payload attendu par Django.
    const payload = {
      identifiant: identifiant,
      password: motDePasse
    };

    // Envoie les identifiants au backend.
    this.authService.login(payload).subscribe({

      // Exécuté lorsque Django accepte la connexion.
      next: (response) => {

        console.log('Connexion réussie :', response);

        // Désactive le chargement.
        this.chargement.set(false);

        // Redirige l'utilisateur connecté
        // vers l'accueil citoyen connecté.
        this.router.navigate(['/home-citoyen']);
      },

      // Exécuté lorsque Django refuse la connexion.
      error: (err) => {

        console.error('Status HTTP :', err.status);
       // Affiche précisément le contenu retourné par Django.
        console.error(
          'Réponse Django :',
          JSON.stringify(err.error, null, 2)
        );

        // Désactive le chargement.
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
