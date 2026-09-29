import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { CollecteurService } from '../../../core/services/collecteur';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-connexion-collecteur',
  styleUrl: './connexion-collecteur.css',
  templateUrl: './connexion-collecteur.html',
})
export class ConnexionCollecteur {

  private readonly auth             = inject(Auth);
  private readonly router           = inject(Router);
  private readonly collecteurService = inject(CollecteurService);
  private readonly fb               = inject(FormBuilder);

  // ─── États visuels ────────────────────────────────────────────
  afficherMotDePasse = signal(false);
  chargement         = signal(false);
  erreurApi          = signal<string | null>(null);

  // ─── Formulaire réactif avec validations robustes ─────────────
  formulaire = this.fb.nonNullable.group({

    // Email : obligatoire + format email valide.
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
      ],
    ],

    // Mot de passe : obligatoire + minimum 6 caractères.
    motDePasse: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(128),
      ],
    ],

    // Case "mémoriser" : optionnelle, booléen.
    memoriser: [false],
  });

  // ─── Raccourcis vers les contrôles ────────────────────────────
  get email()      { return this.formulaire.get('email')!; }
  get motDePasse() { return this.formulaire.get('motDePasse')!; }

  // ─── Messages d'erreur par champ ──────────────────────────────

  /** Retourne le message d'erreur pour le champ email. */
  erreurEmail = computed(() => {
    const ctrl = this.email;
    // N'affiche les erreurs qu'après que l'utilisateur a touché le champ.
    if (!ctrl.touched && !ctrl.dirty) return null;

    if (ctrl.hasError('required'))  return 'L\'adresse e-mail est obligatoire.';
    if (ctrl.hasError('email'))     return 'L\'adresse e-mail n\'est pas valide.';
    if (ctrl.hasError('maxlength')) return 'L\'adresse e-mail est trop longue.';
    return null;
  });

  /** Retourne le message d'erreur pour le champ mot de passe. */
  erreurMotDePasse = computed(() => {
    const ctrl = this.motDePasse;
    if (!ctrl.touched && !ctrl.dirty) return null;

    if (ctrl.hasError('required'))  return 'Le mot de passe est obligatoire.';
    if (ctrl.hasError('minlength')) return 'Le mot de passe doit contenir au moins 6 caractères.';
    if (ctrl.hasError('maxlength')) return 'Le mot de passe est trop long.';
    return null;
  });

  // ─── Force du mot de passe ───────────────────────────────────

  /**
   * Évalue la force du mot de passe (0 à 4).
   * 0 = très faible, 4 = très fort.
   */
  forceMotDePasse = computed(() => {
    const mdp = this.motDePasse.value;
    if (!mdp || mdp.length < 6) return 0;

    let score = 0;
    if (mdp.length >= 8)               score++; // Longueur suffisante
    if (/[A-Z]/.test(mdp))             score++; // Majuscule
    if (/[0-9]/.test(mdp))             score++; // Chiffre
    if (/[^A-Za-z0-9]/.test(mdp))      score++; // Caractère spécial
    return score;
  });

  /** Libellé de la force du mot de passe. */
  libelleForce = computed(() => {
    const map = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
    return map[this.forceMotDePasse()] ?? '';
  });

  /** Classe CSS de la barre de force. */
  classeForce = computed(() => {
    const map = [
      '',
      'bg-red-400',
      'bg-orange-400',
      'bg-yellow-400',
      'bg-green-500',
    ];
    return map[this.forceMotDePasse()] ?? '';
  });

  /** Largeur % de la barre de force. */
  largeurForce = computed(() => this.forceMotDePasse() * 25);

  // ─── Actions ──────────────────────────────────────────────────

  /** Bascule la visibilité du mot de passe. */
  basculerMotDePasse(): void {
    this.afficherMotDePasse.update(v => !v);
  }

  /** Soumet le formulaire de connexion. */
  seConnecter(): void {
    // Efface l'erreur API précédente.
    this.erreurApi.set(null);

    // Force l'affichage de toutes les erreurs de validation.
    this.formulaire.markAllAsTouched();

    // Bloque si le formulaire est invalide.
    if (this.formulaire.invalid) return;

    this.chargement.set(true);

    const { email, motDePasse } = this.formulaire.getRawValue();

    // Étape 1 : connexion JWT via le service Auth existant.
    this.auth.login({ identifiant: email.trim(), password: motDePasse }).subscribe({

      next: () => {

        // Étape 2 : récupère les infos de l'utilisateur connecté.
        this.auth.me().subscribe({

          next: (utilisateur) => {
            this.chargement.set(false);

            // Vérifie que l'utilisateur a bien un profil collecteur
            // en appelant l'API collecteurs.
            // On accepte tous les rôles (citoyen ou admin) tant qu'ils
            // ont créé un profil collecteur.
            // La vérification du profil se fait côté backend.
            this.router.navigate(['/collecteur/abonnement']);
          },

          error: () => {
            this.auth.logout();
            this.erreurApi.set('Impossible de récupérer les informations du compte.');
            this.chargement.set(false);
          },
        });
      },

      error: (err) => {
        // Affiche le message renvoyé par Django ou un message par défaut.
        this.erreurApi.set(
          err?.error?.detail ||
          err?.error?.non_field_errors?.[0] ||
          'Adresse e-mail ou mot de passe incorrect.'
        );
        this.chargement.set(false);
      },
    });
  }

  /** Navigue vers la page d'inscription. */
  allerInscription(): void {
    this.router.navigate(['/inscription']);
  }

  /** Navigue vers la récupération du mot de passe. */
  motDePasseOublie(): void {
    this.router.navigate(['/mot-de-passe-oublie']);
  }
}
