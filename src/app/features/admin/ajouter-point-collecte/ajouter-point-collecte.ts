import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import { Router } from '@angular/router';

import { PointCollecteService } from '../../../core/services/point-collecte';
import { TypeDechetPoint } from '../../../shared/models/point-collecte.model';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-ajouter-point-collecte',
  styleUrl: './ajouter-point-collecte.css',
  templateUrl: './ajouter-point-collecte.html',
})

export class AjouterPointCollecte implements OnInit {

  // Permet de construire et gérer le formulaire.
  private formBuilder = inject(FormBuilder);

  // Permet de naviguer après l'enregistrement.
  private router = inject(Router);

  // Service chargé des appels API des points de collecte.
  private pointCollecteService = inject(PointCollecteService);

  // Liste réelle des types de déchets récupérés depuis Django.
  typesDechets = signal<TypeDechetPoint[]>([]);

  // IDs des types de déchets actuellement sélectionnés.
  dechetsSelectionnes = signal<number[]>([]);

  // Indique si les types de déchets sont en cours de chargement.
  chargementDechets = signal(true);

  // Indique si l'enregistrement est en cours.
  enregistrementEnCours = signal(false);

  // Message d'erreur général.
  erreur = signal<string | null>(null);

  // Message affiché après une erreur de géolocalisation.
  erreurGeolocalisation = signal<string | null>(null);

  // Formulaire correspondant aux champs du modèle Django.
  formulaire = this.formBuilder.nonNullable.group({

    // Nom du point de collecte.
    nom: ['', [Validators.required, Validators.maxLength(150)]],

    // Ville / adresse du point.
    ville: ['', [Validators.required, Validators.maxLength(100)]],

    // Latitude GPS.
    latitude: [ 0,[Validators.required, Validators.min(-90), Validators.max(90)]],

    // Longitude GPS.
    longitude: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],

    // Statut du point.
    statut: ['actif' as 'actif' | 'inactif', Validators.required],

    // Heure d'ouverture obligatoire dans Django.
    heureOuverture: ['08:00', Validators.required],

    // Heure de fermeture obligatoire dans Django.
    heureFermeture: ['19:00', Validators.required]});

  ngOnInit(): void {
    // Charge les vrais types de déchets depuis Django.
    this.chargerTypesDechets();
  }

  /**
   * Récupère les types de déchets depuis /api/types/.
   */
  private chargerTypesDechets(): void {

    this.chargementDechets.set(true);

    this.pointCollecteService.listerTypesDechets().subscribe({

      next: (types) => {

        console.log('Types de déchets récupérés :', types);

        this.typesDechets.set(types);
        this.chargementDechets.set(false);
      },

      error: (erreur) => {

        console.error('Erreur lors du chargement des types de déchets :', erreur);

        this.erreur.set('Impossible de charger le référentiel des déchets.');

        this.chargementDechets.set(false);
      }
    });
  }

  /**
   * Vérifie si un type de déchet est sélectionné.
   */
  estDechetSelectionne(idTypeDechet: number): boolean {
    return this.dechetsSelectionnes().includes(idTypeDechet);
  }

  /**
   * Sélectionne ou désélectionne un type de déchet.
   */
  basculerDechet(idTypeDechet: number): void {

    const selectionActuelle = this.dechetsSelectionnes();

    if (selectionActuelle.includes(idTypeDechet)) {

      // Retire le déchet de la sélection.
      this.dechetsSelectionnes.set(
        selectionActuelle.filter(id => id !== idTypeDechet)
      );

    } else {

      // Ajoute le déchet à la sélection.
      this.dechetsSelectionnes.set([...selectionActuelle, idTypeDechet]);
    }
  }

  /**
   * Sélectionne tous les types de déchets actuellement disponibles.
   */
  toutSelectionner(): void {

    const tousLesIds = this.typesDechets().map(type => type.idTypeDechet);

    this.dechetsSelectionnes.set(tousLesIds);
  }

  /**
   * Utilise la géolocalisation du navigateur pour remplir
   * automatiquement latitude et longitude.
   */
  utiliserPositionActuelle(): void {

    this.erreurGeolocalisation.set(null);

    if (!navigator.geolocation) {

      this.erreurGeolocalisation.set('La géolocalisation n’est pas disponible sur cet appareil.');

      return;
    }

    navigator.geolocation.getCurrentPosition(

      (position) => {

        // Récupère les coordonnées GPS fournies par le navigateur.
        this.formulaire.patchValue({latitude: Number(
            position.coords.latitude.toFixed(6)
          ),
          longitude: Number(
            position.coords.longitude.toFixed(6)
          )
        });
      },

      (erreur) => {

        console.error('Erreur de géolocalisation :',
          erreur
        );

        this.erreurGeolocalisation.set(
          'Impossible de récupérer votre position actuelle.'
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  /**
   * Retourne vers la liste des points de collecte.
   */
  retourPointsCollecte(): void {
    this.router.navigate(['/admin/points-collecte']);
  }

  /**
   * Annule la création du point.
   */
  annuler(): void {
    this.retourPointsCollecte();
  }

  /**
   * Envoie réellement le point de collecte à Django.
   */
  enregistrer(): void {

    // Réinitialise le message d'erreur précédent.
    this.erreur.set(null);

    // Vérifie les champs du formulaire.
    if (this.formulaire.invalid) {

      this.formulaire.markAllAsTouched();

      this.erreur.set(
        'Veuillez compléter correctement tous les champs obligatoires.'
      );

      return;
    }

    // Un point doit accepter au moins un type de déchet.
    if (this.dechetsSelectionnes().length === 0) {

      this.erreur.set(
        'Sélectionnez au moins un déchet accepté par ce point de collecte.'
      );

      return;
    }

    this.enregistrementEnCours.set(true);

    // Récupère les valeurs saisies.
    const valeurs = this.formulaire.getRawValue();

    // Prépare exactement la structure attendue
    // par PointCollecteEcritureSerializer.
    const donnees = {
      nom: valeurs.nom.trim(),
      ville: valeurs.ville.trim(),
      latitude: Number(valeurs.latitude),
      longitude: Number(valeurs.longitude),
      statut: valeurs.statut,
      heureOuverture: valeurs.heureOuverture,
      heureFermeture: valeurs.heureFermeture,
      dechetsAcceptes: this.dechetsSelectionnes()
    };

    console.log(
      'Données envoyées à Django :',
      donnees
    );

    // Appel POST réel vers /api/points-collecte/.
    this.pointCollecteService.creerPointCollecte(donnees).subscribe({

      next: (point) => {

        console.log(
          'Point de collecte créé :',
          point
        );

        this.enregistrementEnCours.set(false);

        // Retourne vers la liste après création.
        this.retourPointsCollecte();
      },

      error: (erreur) => {

        console.error(
          'Erreur lors de la création du point :',
          erreur
        );

        this.enregistrementEnCours.set(false);

        // Gestion des principales erreurs HTTP.
        if (erreur.status === 401) {

          this.erreur.set(
            'Votre session a expiré. Veuillez vous reconnecter.'
          );

        } else if (erreur.status === 403) {

          this.erreur.set(
            'Vous n’avez pas les droits nécessaires pour créer un point de collecte.'
          );

        } else if (erreur.status === 400) {

          this.erreur.set(
            'Les informations envoyées sont invalides. Vérifiez les champs du formulaire.'
          );

        } else {

          this.erreur.set(
            'Impossible d’enregistrer le point de collecte. Vérifiez que le serveur Django est disponible.'
          );
        }
      }
    });
  }
}
