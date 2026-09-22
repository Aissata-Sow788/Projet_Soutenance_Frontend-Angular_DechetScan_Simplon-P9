import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

// On réutilise les interfaces du service au lieu de les redéclarer,
// pour éviter tout décalage de types.
import {ReferentielService, TypeDechet} from '../../../core/services/referentiel-dechets';

@Component({
  imports: [CommonModule, FormsModule, RouterLink],
  selector: 'app-ajouter-referentiel',
  styleUrl: './ajouter-referentiel.css',
  templateUrl: './ajouter-referentiel.html',
})
export class AjouterReferentiel implements OnInit {

  // ==========================================================
  // DÉPENDANCES
  // ==========================================================

  private readonly referentielService = inject(ReferentielService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ==========================================================
  // DONNÉES DU FORMULAIRE
  // ==========================================================

  nom = '';
  description = '';
  conseil = '';

  // ==========================================================
  // DONNÉES DU BACKEND
  // ==========================================================

  typesDechets: TypeDechet[] = [];
  typeSelectionne: TypeDechet | null = null;
  chargementTypes = false;

  // ==========================================================
  // ÉTAT DE L'INTERFACE
  // ==========================================================

  chargementEnregistrement = false;
  erreur = '';
  succes = '';

  // Identifiant présent dans l'URL en mode modification.
  private idEnCours: number | null = null;

  // ==========================================================
  // INITIALISATION
  // ==========================================================

  ngOnInit(): void {

    // Récupère l'éventuel :id de l'URL (page de modification).
    const idParam = this.route.snapshot.paramMap.get('id');
    this.idEnCours = idParam ? Number(idParam) : null;

    this.chargerTypesDechets();
  }

  // ==========================================================
  // RÉCUPÉRATION DES TYPES DE DÉCHETS
  // ==========================================================

  chargerTypesDechets(): void {

    this.chargementTypes = true;

    this.referentielService.listerTypes().subscribe({

      next: (types) => {
        this.typesDechets = types;
        this.chargementTypes = false;

        // En mode modification, présélectionne le type de l'URL.
        if (this.idEnCours !== null) {
          const trouve = types.find(
            (t) => t.idTypeDechet === this.idEnCours
          );

          if (trouve) {
            this.selectionnerType(trouve);
          }
        }
      },

      error: (err) => {
        console.error('Erreur de récupération des types :', err);
        this.typesDechets = [];
        this.chargementTypes = false;
        this.erreur =
          'Impossible de récupérer les types de déchets depuis Django.';
      }
    });
  }

  // ==========================================================
  // SÉLECTION D'UN TYPE EXISTANT
  // ==========================================================

  selectionnerType(type: TypeDechet): void {
    this.typeSelectionne = type;
    this.nom = type.nom;
    this.description = type.description;
    this.conseil = type.conseil?.consigne ?? '';
  }

  // ==========================================================
  // ENREGISTREMENT
  // ==========================================================

  /**
   * Met à jour le type sélectionné (nom + description),
   * puis enregistre son conseil de tri :
   * modification si le conseil existe, création sinon.
   */
    enregistrer(): void {

      this.erreur = '';
      this.succes = '';

      if (!this.nom.trim()) {
        this.erreur = 'Le nom du type de déchet est vide.';
        return;
      }

      if (!this.conseil.trim()) {
        this.erreur = 'Le conseil de tri est vide.';
        return;
      }

      this.chargementEnregistrement = true;

      const type = this.typeSelectionne;
      const idConseil = type?.conseil?.idConseil;

      // ------------------------------------------------------------
      // Étape 1 : on obtient un type valide (existant mis à jour,
      // ou nouveau type créé).
      // ------------------------------------------------------------
      const etapeType$ = type
        ? this.referentielService.modifierTypeDechet(type.idTypeDechet, {
            nom: this.nom.trim(),
            description: this.description.trim()
          })
        : this.referentielService.creerTypeDechet({
            nom: this.nom.trim(),
            description: this.description.trim()
          });

      etapeType$
        .pipe(
          // ----------------------------------------------------------
          // Étape 2 : une fois le type prêt (créé ou modifié),
          // on crée ou modifie son conseil de tri.
          // ----------------------------------------------------------
          switchMap((typeResultat) =>
            idConseil
              ? this.referentielService.modifierConseil(
                  idConseil,
                  this.conseil.trim()
                )
              : this.referentielService.creerConseil({
                  consigne: this.conseil.trim(),
                  idTypeDechet: typeResultat.idTypeDechet
                })
          )
        )
        .subscribe({

          next: () => {
            this.chargementEnregistrement = false;
            this.succes = 'Enregistré avec succès.';
            this.router.navigate(['/admin/referentiel-dechets/types']);
          },

          error: (err) => {
            this.chargementEnregistrement = false;
            console.error('Réponse Django :', err.status, err.error);
            this.erreur =
              'Échec de l’enregistrement : ' + JSON.stringify(err.error);
          }
        });
    }

    nouveauType(): void {
  this.typeSelectionne = null;
  this.nom = '';
  this.description = '';
  this.conseil = '';
}

  // ==========================================================
  // RETOUR AU RÉFÉRENTIEL
  // ==========================================================

  retourReferentiel(): void {
    this.router.navigate(['/admin/referentiel-dechets/types']);
  }
}
