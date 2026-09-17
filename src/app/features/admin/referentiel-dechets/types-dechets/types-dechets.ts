// Importe les fonctionnalités Angular nécessaires.
import {Component, OnInit, inject, signal} from '@angular/core';

// CommonModule pour les directives Angular.
import { CommonModule } from '@angular/common';

// FormsModule pour la recherche.
import { FormsModule } from '@angular/forms';
import { TypeDechet } from '../../../../shared/models/type-dechet.model';
import { ReferentielDechetsService } from '../../../../core/services/referentiel-dechets';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-types-dechets',
  styleUrl: './types-dechets.css',
  templateUrl: './types-dechets.html',
})
export class TypesDechets implements OnInit {

 // Injecte le service du référentiel.
  private readonly referentielService = inject(ReferentielDechetsService);


  // Stocke les types de déchets récupérés depuis Django.
  // Le signal permet de mettre automatiquement l'interface à jour.
  typesDechets = signal<TypeDechet[]>([]);


  // Stocke le texte saisi dans la barre de recherche.
  recherche = signal('');


  // Indique si les données sont en cours de chargement.
  chargement = signal(false);


  // Stocke le message d'erreur éventuel.
  erreur = signal<string | null>(null);


  // Configuration visuelle des différents types.
  private readonly presentation: Record<
    string,
    {
      badge: string;
      badgeClass: string;
      iconClass: string;
      icon: string;
    }
  > = {

    // Présentation du plastique.
    Plastique: {
      badge: 'Recyclable Sec',
      badgeClass: 'bg-[#b8f3eb] text-[#087f79]',
      iconClass: 'bg-[#c8f6f0] text-[#008b86]',
      icon: 'box'
    },

    // Présentation du papier.
    Papier: {
      badge: 'Papeterie',
      badgeClass: 'bg-[#e3e7f8] text-[#4d5875]',
      iconClass: 'bg-[#edf0ff] text-[#465270]',
      icon: 'document'
    },

    // Présentation du carton.
    Carton: {
      badge: 'Emballage Lourd',
      badgeClass: 'bg-[#d6e6f8] text-[#20354c]',
      iconClass: 'bg-[#dceafb] text-[#526b8d]',
      icon: 'archive'
    },

    // Présentation du verre.
    Verre: {
      badge: 'Recyclable Infini',
      badgeClass: 'bg-[#b8f3eb] text-[#087f79]',
      iconClass: 'bg-[#c8f6f0] text-[#008b86]',
      icon: 'glass'
    },

    // Présentation du métal.
    Métal: {
      badge: 'Aluminium & Fer',
      badgeClass: 'bg-[#d9e7f5] text-[#415469]',
      iconClass: 'bg-[#d6e5f9] text-[#415d80]',
      icon: 'metal'
    },

    // Présentation des déchets organiques.
    'Déchets organiques': {
      badge: 'Compostable',
      badgeClass: 'bg-[#b8f3eb] text-[#087f79]',
      iconClass: 'bg-[#c8f6f0] text-[#008b86]',
      icon: 'leaf'
    }
  };


  // Initialise le composant.
  ngOnInit(): void {

    // Charge les types depuis Django.
    this.chargerTypes();
  }


// Charge les types de déchets depuis l'API Django.
chargerTypes(): void {

  // Active l'état de chargement.
  this.chargement.set(true);

  // Réinitialise l'ancien message d'erreur.
  this.erreur.set(null);

  // Appelle l'API Django pour récupérer les types.
  this.referentielService.listerTypes().subscribe({

    // Exécuté lorsque Django répond correctement.
    next: (types) => {

      // Affiche la réponse exacte reçue depuis Django.
      console.log('TYPES REÇUS DE DJANGO :', types);

      // Affiche le nombre de types reçus.
      console.log('NOMBRE DE TYPES :', types.length);

      // Enregistre les données dans le signal.
      this.typesDechets.set(types);

      // Désactive le chargement.
      this.chargement.set(false);
    },

    // Exécuté lorsqu'une erreur HTTP se produit.
    error: (error) => {

      // Affiche l'erreur complète.
      console.error('ERREUR API TYPES :', error);

      // Affiche le statut HTTP.
      console.error('STATUT HTTP :', error.status);

      // Affiche le corps de la réponse.
      console.error('RÉPONSE DJANGO :', error.error);

      // Désactive le chargement.
      this.chargement.set(false);

      // Affiche un message dans l'interface.
      this.erreur.set(
        'Impossible de charger le référentiel des déchets.'
      );
    }
  });
}

  // Retourne les types correspondant à la recherche.
  get typesFiltres(): TypeDechet[] {

    // Récupère la recherche depuis le signal.
    const recherche = this.recherche()
      .trim()
      .toLowerCase();


    // Récupère les types depuis le signal.
    const types = this.typesDechets();


    // Si aucune recherche n'est saisie,
    // retourne directement tous les types.
    if (!recherche) {
      return types;
    }


    // Filtre les types.
    return types.filter((type) => {

      // Récupère la consigne si elle existe.
      const consigne = type.conseil?.consigne ?? '';


      // Regroupe les informations recherchables.
      const contenu = [
        type.nom,
        type.description,
        consigne
      ]
        .join(' ')
        .toLowerCase();


      // Vérifie si la recherche existe dans le contenu.
      return contenu.includes(recherche);
    });
  }


  // Retourne la présentation visuelle d'un type.
  getPresentation(type: TypeDechet) {

    // Cherche la présentation correspondant au nom.
    return this.presentation[type.nom] ?? {

      // Badge par défaut.
      badge: 'Type de déchet',

      // Classe du badge par défaut.
      badgeClass: 'bg-[#e8eef5] text-[#405064]',

      // Classe de l'icône par défaut.
      iconClass: 'bg-[#e8eef5] text-[#405064]',

      // Icône par défaut.
      icon: 'box'
    };
  }


  // Supprime un type de déchet.
  supprimer(type: TypeDechet): void {

    // Demande une confirmation.
    const confirmation = confirm(
      `Voulez-vous supprimer « ${type.nom} » ?`
    );


    // Arrête l'action si l'utilisateur annule.
    if (!confirmation) {
      return;
    }


    // Utilise bien idTypeDechet,
    // car c'est le nom du champ dans Django.
    this.referentielService
      .supprimerType(type.idTypeDechet)
      .subscribe({

        // Si la suppression réussit.
        next: () => {

          // Recharge les données depuis Django.
          this.chargerTypes();
        },


        // Si la suppression échoue.
        error: (error) => {

          // Affiche l'erreur dans la console.
          console.error(
            'Erreur lors de la suppression :',
            error
          );

          // Affiche le message dans l'interface.
          this.erreur.set(
            'Impossible de supprimer ce type de déchet.'
          );
        }
      });
  }


  // Prépare la modification d'un type.
  modifier(type: TypeDechet): void {

    // Utilise l'identifiant réel venant de Django.
    console.log(
      'Modifier le type :',
      type.idTypeDechet
    );
  }


  // Prépare l'ajout d'un type.
  ajouterType(): void {

    // Cette action sera remplacée plus tard
    // par la navigation vers le formulaire.
    console.log('Ajouter un type de déchet');
  }
}
