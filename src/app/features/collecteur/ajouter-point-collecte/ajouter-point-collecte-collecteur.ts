import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PointCollecteService } from '../../../core/services/point-collecte';
import {
  PointCollecteCreation,
  TypeDechetPoint,
} from '../../../shared/models/point-collecte.model';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-ajouter-point-collecte-collecteur',
  styleUrl: './ajouter-point-collecte-collecteur.css',
  templateUrl: '../../admin/ajouter-point-collecte/ajouter-point-collecte.html',
})
export class AjouterPointCollecteCollecteur implements OnInit {

  private readonly formBuilder         = inject(FormBuilder);
  private readonly router              = inject(Router);
  private readonly route               = inject(ActivatedRoute);
  private readonly pointCollecteService = inject(PointCollecteService);

  // ─── Mode édition ou création ─────────────────────────────────
  // L'id est passé en queryParam si on modifie un point existant.
  idPointExistant = signal<number | null>(null);
  estModification = signal(false);

  // ─── Données ──────────────────────────────────────────────────
  typesDechets         = signal<TypeDechetPoint[]>([]);
  dechetsSelectionnes  = signal<number[]>([]);
  chargementDechets    = signal(true);
  enregistrementEnCours = signal(false);

  // ─── Messages ─────────────────────────────────────────────────
  erreur              = signal<string | null>(null);
  erreurGeolocalisation = signal<string | null>(null);

  // ─── Formulaire ───────────────────────────────────────────────
  formulaire = this.formBuilder.nonNullable.group({
    nom:            ['', [Validators.required, Validators.maxLength(150)]],
    ville:          ['', [Validators.required, Validators.maxLength(100)]],
    latitude:       [0,  [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude:      [0,  [Validators.required, Validators.min(-180), Validators.max(180)]],
    statut:         ['actif' as 'actif' | 'inactif', Validators.required],
    heureOuverture: ['08:00', Validators.required],
    heureFermeture: ['18:00', Validators.required],
  });

  ngOnInit(): void {
    // Vérifie si on est en mode modification (queryParam id).
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      const idPoint = Number(idParam);
      if (Number.isInteger(idPoint) && idPoint > 0) {
        this.idPointExistant.set(idPoint);
        this.estModification.set(true);
        this.chargerPointExistant(idPoint);
      } else {
        this.erreur.set('Identifiant de point de collecte invalide.');
      }
    }
    this.chargerTypesDechets();
  }

  // Charge les types de déchets depuis l'API.
  private chargerTypesDechets(): void {
    this.chargementDechets.set(true);

    this.pointCollecteService.listerTypesDechets().subscribe({
      next: (types) => {
        this.typesDechets.set(types);
        this.chargementDechets.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger le référentiel des déchets.');
        this.chargementDechets.set(false);
      }
    });
  }

  // Charge les données d'un point existant pour pré-remplir le formulaire.
  private chargerPointExistant(id: number): void {
    this.pointCollecteService.obtenirPoint(id).subscribe({
      next: (point) => {
        // Pré-remplit le formulaire avec les valeurs existantes.
        this.formulaire.patchValue({
          nom:            point.nom,
          ville:          point.ville,
          latitude:       point.latitude,
          longitude:      point.longitude,
          statut:         point.statut,
          heureOuverture: point.heureOuverture,
          heureFermeture: point.heureFermeture,
        });
        // Pré-sélectionne les types de déchets acceptés.
        this.dechetsSelectionnes.set(
          point.dechetsAcceptes.map(d => d.idTypeDechet)
        );
      },
      error: () => {
        this.erreur.set('Impossible de charger les données du point à modifier.');
      }
    });
  }

  // Vérifie si un type de déchet est sélectionné.
  estDechetSelectionne(id: number): boolean {
    return this.dechetsSelectionnes().includes(id);
  }

  // Sélectionne ou désélectionne un type de déchet.
  basculerDechet(id: number): void {
    const selection = this.dechetsSelectionnes();
    if (selection.includes(id)) {
      this.dechetsSelectionnes.set(selection.filter(i => i !== id));
    } else {
      this.dechetsSelectionnes.set([...selection, id]);
    }
  }

  // Sélectionne tous les types de déchets.
  toutSelectionner(): void {
    this.dechetsSelectionnes.set(
      this.typesDechets().map(t => t.idTypeDechet)
    );
  }

  // Utilise la géolocalisation du navigateur.
  utiliserPositionActuelle(): void {
    this.erreurGeolocalisation.set(null);

    if (!navigator.geolocation) {
      this.erreurGeolocalisation.set('La géolocalisation n\'est pas disponible.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.formulaire.patchValue({
          latitude:  Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => {
        this.erreurGeolocalisation.set('Impossible de récupérer votre position.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Enregistre le point de collecte (création ou modification).
  enregistrer(): void {
    this.erreur.set(null);

    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.erreur.set('Veuillez compléter tous les champs obligatoires.');
      return;
    }

    if (this.dechetsSelectionnes().length === 0) {
      this.erreur.set('Sélectionnez au moins un type de déchet accepté.');
      return;
    }

    this.enregistrementEnCours.set(true);

    const valeurs = this.formulaire.getRawValue();
    const donnees: PointCollecteCreation = {
      nom:            valeurs.nom.trim(),
      ville:          valeurs.ville.trim(),
      latitude:       Number(valeurs.latitude),
      longitude:      Number(valeurs.longitude),
      statut:         valeurs.statut,
      heureOuverture: valeurs.heureOuverture,
      heureFermeture: valeurs.heureFermeture,
      dechetsAcceptes: this.dechetsSelectionnes(),
    };

    const idPoint = this.idPointExistant();
    const requete = idPoint
      ? this.pointCollecteService.modifierPointCollecte(idPoint, donnees)
      : this.pointCollecteService.creerPointCollecte(donnees);

    requete.subscribe({
      next: () => {
        this.enregistrementEnCours.set(false);
        this.retour();
      },
      error: (err) => {
        this.enregistrementEnCours.set(false);
        if (err.status === 401) {
          this.erreur.set('Session expirée. Veuillez vous reconnecter.');
        } else if (err.status === 403) {
          this.erreur.set('Vous n\'avez pas les droits pour effectuer cette action.');
        } else {
          this.erreur.set('Impossible d\'enregistrer le point. Vérifiez le serveur.');
        }
      }
    });
  }

  // Annule et retourne à la liste.
  annuler(): void {
    this.retour();
  }

  // Retourne à la liste des points.
  retour(): void {
    this.router.navigate(['/collecteur/points-collecte']);
  }

  retourPointsCollecte(): void {
    this.retour();
  }
}
