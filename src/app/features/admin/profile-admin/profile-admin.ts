import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { Utilisateur, Role } from '../../../shared/models/utilisateur.model';
import { ChangementMotDePasse } from '../../../shared/models/collecteur.model';

/** Coordonnées modifiables depuis le profil administrateur. */
type ProfilAdministrateur = Pick<
  Utilisateur,
  'first_name' | 'last_name' | 'email' | 'telephone' | 'ville'
>;

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-profile-admin',
  styleUrl: './profile-admin.css',
  templateUrl: './profile-admin.html',
})
export class ProfileAdmin {

  // Service d'authentification utilisé pour récupérer
  // les informations de l'administrateur connecté.
  private readonly auth = inject(Auth);

  // Permet de naviguer vers les autres pages.
  private readonly router = inject(Router);


  // ============================================================
  // DONNÉES DU PROFIL
  // ============================================================

  // Contient les informations de l'administrateur connecté.
  utilisateur = signal<Utilisateur | null>(null);

  // Permet d'afficher un indicateur pendant le chargement.
  chargement = signal(true);

  // Contient le message d'erreur éventuel.
  erreur = signal<string | null>(null);

  // Copie éditable des coordonnées, séparée des données réellement enregistrées.
  formulaireProfil: ProfilAdministrateur = {
    first_name: '',
    last_name: '',
    email: '',
    telephone: '',
    ville: '',
  };

  modificationActive = signal(false);
  enregistrementProfil = signal(false);
  erreurProfil = signal<string | null>(null);
  succesProfil = signal<string | null>(null);

  // État et champs du formulaire sécurisé de changement de mot de passe.
  formulaireMotDePasse: ChangementMotDePasse = {
    ancienMotDePasse: '',
    nouveauMotDePasse: '',
    confirmationMotDePasse: '',
  };
  formulaireMotDePasseOuvert = signal(false);
  enregistrementMotDePasse = signal(false);
  erreurMotDePasse = signal<string | null>(null);
  succesMotDePasse = signal<string | null>(null);


  // ============================================================
  // INITIALISATION
  // ============================================================

  constructor() {

    // Récupère les informations réelles depuis Django.
    this.chargerProfil();
  }


  // ============================================================
  // RÉCUPÉRATION DU PROFIL
  // ============================================================

  chargerProfil(): void {

    // Active le chargement.
    this.chargement.set(true);

    // Supprime une ancienne erreur.
    this.erreur.set(null);


    // Appelle l'endpoint Django /api/auth/me/.
    this.auth.me().subscribe({

      // Si Django renvoie correctement l'utilisateur.
      next: (utilisateur) => {

        // Enregistre l'utilisateur dans le signal.
        this.utilisateur.set(utilisateur);
        this.formulaireProfil = this.copierProfil(utilisateur);

        // Termine le chargement.
        this.chargement.set(false);
      },


      // Si la récupération échoue.
      error: (erreur) => {

        // Affiche l'erreur dans la console pour faciliter le débogage.
        console.error(
          '[PROFILE ADMIN] Impossible de récupérer le profil :',
          erreur
        );

        // Affiche un message dans l'interface.
        this.erreur.set(
          'Impossible de récupérer les informations du profil.'
        );

        // Termine le chargement.
        this.chargement.set(false);
      }
    });
  }

  /** Prépare les champs modifiables à partir de la réponse Django. */
  private copierProfil(utilisateur: Utilisateur): ProfilAdministrateur {
    return {
      first_name: utilisateur.first_name,
      last_name: utilisateur.last_name,
      email: utilisateur.email,
      telephone: utilisateur.telephone ?? '',
      ville: utilisateur.ville,
    };
  }

  /** Active l'édition et repart des dernières données enregistrées. */
  activerModification(): void {
    const utilisateur = this.utilisateur();
    if (!utilisateur) return;
    this.formulaireProfil = this.copierProfil(utilisateur);
    this.erreurProfil.set(null);
    this.succesProfil.set(null);
    this.modificationActive.set(true);
  }

  /** Annule les changements non enregistrés du formulaire de profil. */
  annulerModification(): void {
    const utilisateur = this.utilisateur();
    if (utilisateur) this.formulaireProfil = this.copierProfil(utilisateur);
    this.erreurProfil.set(null);
    this.modificationActive.set(false);
  }

  /** Enregistre les coordonnées du compte administrateur auprès de Django. */
  enregistrerProfil(): void {
    this.erreurProfil.set(null);
    this.succesProfil.set(null);
    this.enregistrementProfil.set(true);

    this.auth.mettreAJourProfil(this.formulaireProfil).subscribe({
      next: (utilisateur) => {
        this.utilisateur.set(utilisateur);
        this.formulaireProfil = this.copierProfil(utilisateur);
        this.modificationActive.set(false);
        this.enregistrementProfil.set(false);
        this.succesProfil.set('Vos informations ont été enregistrées.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.erreurProfil.set(this.lireErreurApi(erreur));
        this.enregistrementProfil.set(false);
      },
    });
  }

  /** Affiche ou masque le formulaire de changement de mot de passe. */
  basculerFormulaireMotDePasse(): void {
    this.formulaireMotDePasseOuvert.update(ouvert => !ouvert);
    this.formulaireMotDePasse = {
      ancienMotDePasse: '',
      nouveauMotDePasse: '',
      confirmationMotDePasse: '',
    };
    this.erreurMotDePasse.set(null);
    this.succesMotDePasse.set(null);
  }

  /** Valide les trois champs puis envoie le changement à l'endpoint Django protégé. */
  changerMotDePasse(): void {
    this.erreurMotDePasse.set(null);
    this.succesMotDePasse.set(null);

    if (
      !this.formulaireMotDePasse.ancienMotDePasse ||
      !this.formulaireMotDePasse.nouveauMotDePasse ||
      !this.formulaireMotDePasse.confirmationMotDePasse
    ) {
      this.erreurMotDePasse.set('Veuillez remplir les trois champs du mot de passe.');
      return;
    }

    if (
      this.formulaireMotDePasse.nouveauMotDePasse !==
      this.formulaireMotDePasse.confirmationMotDePasse
    ) {
      this.erreurMotDePasse.set('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    this.enregistrementMotDePasse.set(true);
    this.auth.changerMotDePasse(this.formulaireMotDePasse).subscribe({
      next: (reponse) => {
        this.succesMotDePasse.set(reponse.detail);
        this.formulaireMotDePasse = {
          ancienMotDePasse: '',
          nouveauMotDePasse: '',
          confirmationMotDePasse: '',
        };
        this.enregistrementMotDePasse.set(false);
      },
      error: (erreur: HttpErrorResponse) => {
        this.erreurMotDePasse.set(this.lireErreurApi(erreur));
        this.enregistrementMotDePasse.set(false);
      },
    });
  }

  /** Extrait les messages utiles fournis par Django REST Framework. */
  private lireErreurApi(erreur: HttpErrorResponse): string {
    const details: unknown = erreur.error;
    if (typeof details === 'string') return details;
    if (typeof details === 'object' && details !== null) {
      const messages = Object.values(details).flatMap(valeur => {
        if (typeof valeur === 'string') return [valeur];
        if (Array.isArray(valeur)) {
          return valeur.filter((message): message is string => typeof message === 'string');
        }
        return [];
      });
      if (messages.length) return messages.join(' ');
    }
    return 'La requête a échoué. Vérifiez les informations saisies puis réessayez.';
  }


  // ============================================================
  // NOM COMPLET
  // ============================================================

  get nomComplet(): string {

    // Récupère l'utilisateur actuellement connecté.
    const user = this.utilisateur();

    // Si aucun utilisateur n'est encore disponible,
    // affiche un texte temporaire.
    if (!user) {
      return 'Administrateur';
    }

    // Construit le nom à partir du prénom et du nom.
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
      || 'Administrateur';
  }


  // ============================================================
  // INITIALES
  // ============================================================

  get initiales(): string {

    // Récupère l'utilisateur.
    const user = this.utilisateur();

    // Si aucune donnée n'est disponible.
    if (!user) {
      return 'AD';
    }

    // Récupère la première lettre du prénom.
    const premiereLettrePrenom =
      user.first_name?.charAt(0)?.toUpperCase() ?? '';

    // Récupère la première lettre du nom.
    const premiereLettreNom =
      user.last_name?.charAt(0)?.toUpperCase() ?? '';

    // Retourne les initiales.
    return `${premiereLettrePrenom}${premiereLettreNom}` || 'AD';
  }


  // ============================================================
  // RÔLE
  // ============================================================

  get role(): string {

    // Récupère l'utilisateur connecté.
    const user = this.utilisateur();

    // Vérifie le rôle renvoyé par Django.
    if (user?.role === Role.ADMINISTRATEUR) {
      return 'Administrateur';
    }

    // Valeur de secours.
    return 'Administrateur';
  }


  // ============================================================
  // DÉCONNEXION
  // ============================================================

  seDeconnecter(): void {

    // Supprime les tokens et les informations utilisateur
    // enregistrés dans le navigateur.
    this.auth.logout();

    // Redirige vers la page de connexion administrateur.
    this.router.navigate(['/connexion-admin']);
  }


  // ============================================================
  // RETOUR AU DASHBOARD
  // ============================================================

  retourDashboard(): void {

    // En mode édition, Annuler restaure le profil au lieu de quitter la page.
    if (this.modificationActive()) {
      this.annulerModification();
      return;
    }

    this.router.navigate(['/admin']);
  }
}
