import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateursService } from '../../../core/services/utilisateurs';
import { Utilisateur } from '../../../shared/models/utilisateur.model';
import Swal from 'sweetalert2';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-utilisateurs',
  styleUrl: './utilisateurs.css',
  templateUrl: './utilisateurs.html',
})
export class Utilisateurs {

  // ============================================================
  // DONNÉES
  // ============================================================

  // Utilisateur actuellement sélectionné pour afficher son profil.
  // null signifie qu'aucun profil n'est ouvert.
  utilisateurSelectionne = signal<Utilisateur | null>(null);

  // Permet de savoir si la popup du profil est ouverte.
  popupProfilOuverte = signal(false);

   // Permet d'utiliser Math dans le fichier HTML.
  readonly Math = Math;

  // Liste complète des utilisateurs récupérés depuis Django.
  utilisateurs = signal<Utilisateur[]>([]);

  // Indique si les données sont encore en cours de chargement.
  chargement = signal(true);

  // Contient le message d'erreur éventuel.
  erreur = signal('');

  // Onglet actuellement sélectionné.
  ongletActif = signal<'connectes' | 'anonymes'>('connectes');

  // Texte saisi dans la recherche.
  recherche = signal('');

  // Rôle sélectionné dans le filtre.
  filtreRole = signal('Tous les rôles');

  // Statut sélectionné dans le filtre.
  filtreStatut = signal('Tous les statuts');

  // Page actuellement affichée.
  pageActuelle = signal(1);

  // Nombre d'utilisateurs affichés par page.
  taillePage = 5;

  // Injecte le service utilisateurs.
  private readonly utilisateursService = inject(UtilisateursService);


  // ============================================================
  // INITIALISATION
  // ============================================================

  // Cette méthode est exécutée automatiquement au chargement.
  ngOnInit(): void {
    this.chargerUtilisateurs();
  }


  // ============================================================
  // RÉCUPÉRATION DES UTILISATEURS
  // ============================================================

  // Récupère les utilisateurs depuis l'API Django.
  chargerUtilisateurs(): void {

    // Active l'indicateur de chargement.
    this.chargement.set(true);

    // Supprime l'ancien message d'erreur.
    this.erreur.set('');

    // Appelle le backend.
    this.utilisateursService.getUtilisateurs().subscribe({

      // Si Django répond correctement.
      next: (data) => {

        // Enregistre les utilisateurs dans le signal.
        this.utilisateurs.set(data);

        // Arrête le chargement.
        this.chargement.set(false);

        // Vérifie les données reçues dans la console.
        console.log('Utilisateurs récupérés :', data);
      },

      // Si l'appel API échoue.
      error: (error) => {

        // Affiche l'erreur technique dans la console.
        console.error(
          'Erreur lors de la récupération des utilisateurs :',
          error
        );

        // Affiche un message compréhensible dans l'interface.
        this.erreur.set(
          'Impossible de récupérer les utilisateurs.'
        );

        // Arrête le chargement.
        this.chargement.set(false);
      }
    });
  }


  // ============================================================
  // FILTRES
  // ============================================================

// Calcule automatiquement la liste après application
// des différents filtres.
utilisateursFiltres = computed(() => {

  // Récupère TOUS les utilisateurs.
  // Les utilisateurs actifs et inactifs restent dans la liste.
  let resultat = [...this.utilisateurs()];


  // ------------------------------------------------------------
  // RECHERCHE
  // ------------------------------------------------------------

  const recherche = this.recherche()
    .toLowerCase()
    .trim();

  if (recherche) {

    resultat = resultat.filter((utilisateur) => {

      // Regroupe les informations utilisées pour la recherche.
      const texteUtilisateur = [
        utilisateur.first_name,
        utilisateur.last_name,
        utilisateur.email,
        utilisateur.id
      ]
        .filter(
          valeur =>
            valeur !== null &&
            valeur !== undefined
        )
        .join(' ')
        .toLowerCase();

      return texteUtilisateur.includes(recherche);
    });
  }


  // ------------------------------------------------------------
  // FILTRE RÔLE
  // ------------------------------------------------------------

  if (this.filtreRole() !== 'Tous les rôles') {

    const roleRecherche = this.filtreRole()
      .toLowerCase()
      .trim();

    resultat = resultat.filter((utilisateur) => {

      const roleUtilisateur = String(utilisateur.role)
        .toLowerCase()
        .trim();

      return roleUtilisateur === roleRecherche;
    });
  }


  // ------------------------------------------------------------
  // FILTRE STATUT
  // ------------------------------------------------------------

  if (this.filtreStatut() !== 'Tous les statuts') {

    resultat = resultat.filter((utilisateur) => {

      // Affiche uniquement les comptes actifs.
      if (this.filtreStatut() === 'Actif') {
        return utilisateur.is_active;
      }

      // Affiche uniquement les comptes inactifs.
      if (this.filtreStatut() === 'Inactif') {
        return !utilisateur.is_active;
      }

      return true;
    });
  }


  // Retourne la liste finale.
  return resultat;
});

  // ============================================================
  // PAGINATION
  // ============================================================

  // Retourne uniquement les utilisateurs de la page actuelle.
  utilisateursAffiches = computed(() => {

    // Récupère la liste filtrée.
    const utilisateurs = this.utilisateursFiltres();

    // Calcule l'index de début.
    const debut =
      (this.pageActuelle() - 1) * this.taillePage;

    // Calcule l'index de fin.
    const fin = debut + this.taillePage;

    // Retourne uniquement les lignes de la page.
    return utilisateurs.slice(debut, fin);
  });


  // Retourne le nombre total de résultats après filtrage.
  nombreResultats(): number {
    return this.utilisateursFiltres().length;
  }


  // Retourne le nombre total de pages.
  nombrePages(): number {
    return Math.ceil(
      this.nombreResultats() / this.taillePage
    );
  }


  // Change la page actuelle.
  changerPage(page: number): void {

    // Empêche d'aller avant la première page.
    if (page < 1) {
      return;
    }

    // Empêche d'aller après la dernière page.
    if (page > this.nombrePages()) {
      return;
    }

    // Change la page.
    this.pageActuelle.set(page);
  }


  // ============================================================
  // ONGLET
  // ============================================================

  // Change l'onglet affiché.
  changerOnglet( onglet: 'connectes' | 'anonymes'): void {

    // Change l'onglet.
    this.ongletActif.set(onglet);

    // Recommence toujours à la première page.
    this.pageActuelle.set(1);
  }


  // ============================================================
  // RECHERCHE
  // ============================================================

  // Modifie la recherche.
  changerRecherche(valeur: string): void {

    // Met à jour le texte.
    this.recherche.set(valeur);

    // Revient à la première page après une nouvelle recherche.
    this.pageActuelle.set(1);
  }


  // ============================================================
  // FILTRE RÔLE
  // ============================================================

  // Modifie le filtre de rôle.
  changerRole(valeur: string): void {

    // Met à jour le rôle.
    this.filtreRole.set(valeur);

    // Revient à la première page.
    this.pageActuelle.set(1);
  }


  // ============================================================
  // FILTRE STATUT
  // ============================================================

  // Modifie le filtre de statut.
  changerStatut(valeur: string): void {

    // Met à jour le statut.
    this.filtreStatut.set(valeur);

    // Revient à la première page.
    this.pageActuelle.set(1);
  }

    /**
   * Ouvre la popup contenant les informations de l'utilisateur sélectionné.
   */
  ouvrirProfil(utilisateur: Utilisateur): void {
    this.utilisateurSelectionne.set(utilisateur);
    this.popupProfilOuverte.set(true);
  }

  /**
   * Ferme la popup du profil utilisateur.
   */
  fermerProfil(): void {
    this.popupProfilOuverte.set(false);
    this.utilisateurSelectionne.set(null);
  }

/**
 * Demande confirmation avant de désactiver le compte.
 */
desactiverCompte(utilisateur: Utilisateur): void {

  console.log(
    '[UTILISATEURS] Désactivation demandée pour :',
    utilisateur.id
  );

  Swal.fire({
    title: 'Désactiver ce compte ?',
    text: `Le compte de ${utilisateur.first_name} ${utilisateur.last_name} sera désactivé.`,
    icon: 'warning',

    // Affiche les deux boutons de confirmation.
    showCancelButton: true,

    // Texte des boutons.
    confirmButtonText: 'Oui, désactiver',
    cancelButtonText: 'Annuler',

    // Place "Annuler" avant "Désactiver".
    reverseButtons: true,

    // Couleur du bouton de désactivation.
    confirmButtonColor: '#F59E0B',

    // Couleur du bouton d'annulation.
    cancelButtonColor: '#64748B'
  }).then((result) => {

    // Si l'administrateur annule, on ne fait rien.
    if (!result.isConfirmed) {
      return;
    }

    console.log(
      '[UTILISATEURS] Appel API désactivation :',
      utilisateur.id
    );

    // Appelle Django pour désactiver le compte.
    this.utilisateursService
      .desactiverUtilisateur(utilisateur.id)
      .subscribe({

        next: (response) => {

          console.log(
            '[UTILISATEURS] Réponse désactivation :',
            response
          );

          // Met à jour la liste affichée immédiatement.
          this.utilisateurs.update((liste) =>
            liste.map((u) =>
              u.id === utilisateur.id
                ? {
                    ...u,
                    is_active: false
                  }
                : u
            )
          );

          // Met à jour également l'utilisateur
          // actuellement affiché dans la popup.
          this.utilisateurSelectionne.update((u) =>
            u
              ? {
                  ...u,
                  is_active: false
                }
              : null
          );

          // Affiche la confirmation de réussite.
          Swal.fire({
            title: 'Compte désactivé',
            text: 'Le compte a été désactivé avec succès.',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0EA5A4'
          });
        },

        error: (erreur) => {

          console.error(
            '[UTILISATEURS] Erreur désactivation :',
            erreur
          );

          // Affiche l'erreur à l'administrateur.
          Swal.fire({
            title: 'Erreur',
            text: 'Impossible de désactiver le compte.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0EA5A4'
          });
        }
      });
  });
}


supprimerCompte(utilisateur: Utilisateur): void {
  console.log(
    '[UTILISATEURS] Suppression demandée pour :',
    utilisateur.id
  );

  Swal.fire({
    title: 'Supprimer ce compte ?',

    // Message d'avertissement avant la suppression définitive.
    text: `Le compte de ${utilisateur.first_name} ${utilisateur.last_name} sera définitivement supprimé.`,

    icon: 'warning',
    showCancelButton: true,

    // Boutons de confirmation.
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler',

    reverseButtons: true,

    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#64748B'
  }).then((result) => {

    // L'utilisateur a annulé : aucune action n'est effectuée.
    if (!result.isConfirmed) {
      return;
    }

    console.log(
      '[UTILISATEURS] Appel API suppression :',
      utilisateur.id
    );

    this.utilisateursService
      .supprimerUtilisateur(utilisateur.id)
      .subscribe({

        next: (response) => {
          console.log(
            '[UTILISATEURS] Réponse suppression :',
            response
          );

          // Retire immédiatement l'utilisateur de la liste affichée.
          this.utilisateurs.update((liste) =>
            liste.filter((u) => u.id !== utilisateur.id)
          );

          // Ferme le popup de profil après suppression.
          this.fermerProfil();

          // Message de confirmation.
          Swal.fire({
            title: 'Compte supprimé',
            text: 'Le compte a été supprimé définitivement.',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0EA5A4'
          });
        },

        error: (erreur) => {
          console.error(
            '[UTILISATEURS] Erreur suppression :',
            erreur
          );

          // Informe l'administrateur en cas d'échec de l'API.
          Swal.fire({
            title: 'Erreur',
            text: 'Impossible de supprimer le compte.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0EA5A4'
          });
        }
      });
  });
}
}
