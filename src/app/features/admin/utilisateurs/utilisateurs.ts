// Importe les fonctionnalités Angular nécessaires pour créer le composant.
import { Component, signal, computed, inject } from '@angular/core';

// Importe CommonModule pour utiliser les directives Angular dans le template.
import { CommonModule } from '@angular/common';

// Importe FormsModule pour gérer la recherche et les champs de formulaire.
import { FormsModule } from '@angular/forms';
import { UtilisateursService } from '../../../core/services/utilisateurs';
// Importe le modèle Utilisateur officiel du projet.
import { Utilisateur } from '../../../shared/models/utilisateur.model';

@Component({
  // Rend disponibles les modules nécessaires au template standalone.
  imports: [CommonModule, FormsModule],

  // Définit le sélecteur du composant.
  selector: 'app-utilisateurs',

  // Indique le fichier CSS associé au composant.
  styleUrl: './utilisateurs.css',

  // Indique le fichier HTML associé au composant.
  templateUrl: './utilisateurs.html',
})
export class Utilisateurs {

  // Stocke la liste des utilisateurs récupérés depuis l'API.
  utilisateurs = signal<Utilisateur[]>([]);

  // Indique si le chargement des utilisateurs est en cours.
  chargement = signal(true);

  // Stocke un éventuel message d'erreur.
  erreur = signal('');

  // Onglet actuellement sélectionné.
  ongletActif = signal<'connectes' | 'anonymes'>('connectes');

  // Texte saisi dans la barre de recherche.
  recherche = signal('');

  // Filtre permettant de sélectionner un rôle.
  filtreRole = signal('Tous les rôles');

  // Filtre permettant de sélectionner un statut.
  filtreStatut = signal('Tous les statuts');

  // Filtre permettant de sélectionner l'ordre d'activité.
  filtreActivite = signal('Plus récents');


   // Injecte le service utilisateurs.
  private readonly utilisateursService = inject(UtilisateursService)



  // Cette méthode est exécutée automatiquement au chargement du composant.
  ngOnInit(): void {

    // Lance la récupération des utilisateurs depuis l'API.
    this.chargerUtilisateurs();

  }

  // Récupère les utilisateurs depuis Django.
  chargerUtilisateurs(): void {

    // Active l'état de chargement.
    this.chargement.set(true);

    // Réinitialise l'ancien message d'erreur.
    this.erreur.set('');

    // Appelle l'API.
    this.utilisateursService.getUtilisateurs().subscribe({

      // Exécuté lorsque Django retourne correctement les utilisateurs.
      next: (data) => {

        // Enregistre les utilisateurs reçus dans le signal.
        this.utilisateurs.set(data);

        // Désactive l'état de chargement.
        this.chargement.set(false);

        // Affiche les données dans la console pour faciliter le test.
        console.log('Utilisateurs récupérés :', data);
      },

      // Exécuté si l'appel API échoue.
      error: (error) => {

        // Affiche l'erreur dans la console.
        console.error('Erreur lors de la récupération des utilisateurs :', error);

        // Affiche un message dans l'interface.
        this.erreur.set(
          'Impossible de récupérer les utilisateurs.'
        );

        // Désactive l'état de chargement.
        this.chargement.set(false);
      }

    });

  }


  // Liste affichée après application de la recherche et des filtres.
utilisateursFiltres = computed(() => {

  // Récupère les utilisateurs actuellement chargés.
  let resultat = this.utilisateurs();

  // Récupère le texte de recherche.
  const recherche = this.recherche().toLowerCase().trim();

  // Filtre par nom, prénom ou email.
  if (recherche) {
    resultat = resultat.filter((utilisateur) =>
      `${utilisateur.first_name} ${utilisateur.last_name} ${utilisateur.email}`
        .toLowerCase()
        .includes(recherche)
    );
  }

  // Filtre par rôle.
  if (this.filtreRole() !== 'Tous les rôles') {
    resultat = resultat.filter(
      (utilisateur) => utilisateur.role === this.filtreRole()
    );
  }

  // Filtre par statut.
  if (this.filtreStatut() !== 'Tous les statuts') {
    resultat = resultat.filter(
      (utilisateur) =>
        (this.filtreStatut() === 'Actif' && utilisateur.is_active) ||
        (this.filtreStatut() === 'Inactif' && !utilisateur.is_active)
    );
  }

  // Retourne la liste finale à afficher.
  return resultat;
});

  // Change l'onglet actuellement affiché.
  changerOnglet(onglet: 'connectes' | 'anonymes'): void {
    this.ongletActif.set(onglet);
  }

  // Met à jour le texte de recherche.
  changerRecherche(valeur: string): void {
    this.recherche.set(valeur);
  }

  // Met à jour le filtre de rôle.
  changerRole(valeur: string): void {
    this.filtreRole.set(valeur);
  }

  // Met à jour le filtre de statut.
  changerStatut(valeur: string): void {
    this.filtreStatut.set(valeur);
  }

  // Met à jour le filtre d'activité.
  changerActivite(valeur: string): void {
    this.filtreActivite.set(valeur);
  }
}
