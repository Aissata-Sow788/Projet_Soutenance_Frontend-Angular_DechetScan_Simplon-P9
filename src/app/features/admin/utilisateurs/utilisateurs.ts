// Importe les fonctionnalités Angular nécessaires pour créer le composant.
import { Component, signal, computed } from '@angular/core';

// Importe CommonModule pour utiliser les directives Angular dans le template.
import { CommonModule } from '@angular/common';

// Importe FormsModule pour gérer la recherche et les champs de formulaire.
import { FormsModule } from '@angular/forms';

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
