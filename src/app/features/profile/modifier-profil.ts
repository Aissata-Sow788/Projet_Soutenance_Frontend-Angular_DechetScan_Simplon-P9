import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Utilisateur } from '../../shared/models/utilisateur.model';

/** Champs personnels que le citoyen est autorisé à modifier. */
type ProfilFormulaire = Pick<
  Utilisateur,
  'first_name' | 'last_name' | 'email' | 'telephone' | 'ville'
>;

@Component({
  selector: 'app-modifier-profil',
  imports: [FormsModule],
  templateUrl: './modifier-profil.html',
})
export class ModifierProfil {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Le formulaire est prérempli avec les données récupérées auprès de Django.
  formulaire: ProfilFormulaire = {
    first_name: '',
    last_name: '',
    email: '',
    telephone: '',
    ville: '',
  };

  chargement = signal(true);
  enregistrement = signal(false);
  erreur = signal('');
  succes = signal('');

  constructor() {
    this.auth.me().subscribe({
      next: (utilisateur) => {
        this.formulaire = this.depuisUtilisateur(utilisateur);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger votre profil. Réessayez plus tard.');
        this.chargement.set(false);
      },
    });
  }

  /** Convertit la réponse API en valeurs adaptées aux champs du formulaire. */
  private depuisUtilisateur(utilisateur: Utilisateur): ProfilFormulaire {
    return {
      first_name: utilisateur.first_name,
      last_name: utilisateur.last_name,
      email: utilisateur.email,
      telephone: utilisateur.telephone ?? '',
      ville: utilisateur.ville ?? '',
    };
  }

  /** Envoie les nouvelles coordonnées à l'endpoint PATCH /api/auth/me/. */
  enregistrer(): void {
    this.erreur.set('');
    this.succes.set('');
    this.enregistrement.set(true);

    this.auth.mettreAJourProfil(this.formulaire).subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.succes.set('Votre profil a été modifié.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.erreur.set(this.messageErreur(erreur));
        this.enregistrement.set(false);
      },
    });
  }

  /** Affiche les erreurs de validation renvoyées par le sérialiseur Django. */
  private messageErreur(erreur: HttpErrorResponse): string {
    const details: unknown = erreur.error;
    if (typeof details === 'string') {
      return details;
    }
    if (typeof details === 'object' && details !== null) {
      const messages = Object.values(details).flatMap((valeur) => {
        if (typeof valeur === 'string') return [valeur];
        if (Array.isArray(valeur)) {
          return valeur.filter((message): message is string => typeof message === 'string');
        }
        return [];
      });
      if (messages.length) return messages.join(' ');
    }
    return 'La modification du profil a échoué. Vérifiez vos informations.';
  }

  /** Retourne au profil sans annuler ni envoyer de données. */
  retour(): void {
    this.router.navigate(['/profile']);
  }
}
