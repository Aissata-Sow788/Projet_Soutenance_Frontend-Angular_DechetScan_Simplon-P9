
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PrixDechetService } from '../../../core/services/prix-dechet';
import { ReferentielService } from '../../../core/services/referentiel-dechets';
import {
  PrixDechet,
  PrixDechetCreation,
} from '../../../shared/models/prix-dechet.model';
import { TypeDechet } from '../../../shared/models/type-dechet.model';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-formulaire-tarif-collecteur',
  styleUrl: './formulaire-tarif-collecteur.css',
  templateUrl: './formulaire-tarif-collecteur.html',
})
export class FormulaireTarifCollecteur implements OnInit {
  private readonly prixService = inject(PrixDechetService);
  private readonly referentielService = inject(ReferentielService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  typesDechets = signal<TypeDechet[]>([]);
  chargement = signal(true);
  enregistrement = signal(false);
  enregistre = signal(false);
  erreur = signal<string | null>(null);
  idPrix = signal<number | null>(null);

  idTypeDechet: number | null = null;
  prixParKg: number | null = null;
  dateDebut = this.aujourdhui();
  dateFin = '';
  dateMinimumFin = this.demain();

  get estModification(): boolean {
    return this.idPrix() !== null;
  }

  ngOnInit(): void {
    this.chargement.set(true);

    this.referentielService.listerTypes().subscribe({
      next: (types) => {
        this.typesDechets.set(
          types.filter(
            (type) => type.nom.toLocaleLowerCase('fr') !== 'inconnu',
          ),
        );

        this.chargement.set(false);
        this.chargerTarifExistant();
      },
      error: () => {
        this.erreur.set(
          'Impossible de charger les types de déchets. Réessayez.',
        );
        this.chargement.set(false);
      },
    });
  }

  enregistrer(): void {
    if (this.enregistrement() || !this.formulaireValide()) return;

    const donnees: PrixDechetCreation = {
      idTypeDechet: this.idTypeDechet!,
      prixParKg: this.prixParKg!,
      commission: 0,
      dateDebut: this.dateDebut,
      dateFin: this.dateFin || null,
    };

    this.enregistrement.set(true);
    this.erreur.set(null);

    const requete = this.idPrix()
      ? this.prixService.modifierPrix(this.idPrix()!, donnees)
      : this.prixService.creerPrix(donnees);

    requete.subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.enregistre.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.enregistrement.set(false);

        this.erreur.set(
          error.status === 403
            ? 'Votre compte collecteur n’est pas autorisé à gérer les tarifs.'
            : this.messageErreur(error),
        );
      },
    });
  }

  formulaireValide(): boolean {
    return this.idTypeDechet !== null
      && Number.isFinite(this.prixParKg)
      && (this.prixParKg ?? 0) > 0
      && Boolean(this.dateDebut)
      && (!this.dateFin
        || (
          this.dateFin >= this.dateMinimumFin
          && this.dateFin >= this.dateDebut
        ));
  }

  retourListe(): void {
    void this.router.navigate(['/collecteur/tarifs']);
  }

  private chargerTarifExistant(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) return;

    this.chargement.set(true);
    this.idPrix.set(id);

    this.prixService.obtenirPrix(id).subscribe({
      next: (tarif: PrixDechet) => {
        this.idTypeDechet = tarif.idTypeDechet;
        this.prixParKg = tarif.prixParKg;
        this.dateDebut = tarif.dateDebut;
        this.dateFin = tarif.dateFin ?? '';
        this.chargement.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.erreur.set(
          error.status === 404
            ? 'Ce tarif n’existe pas ou ne vous appartient pas.'
            : 'Impossible de charger ce tarif. Réessayez.',
        );

        this.chargement.set(false);
      },
    });
  }

  private messageErreur(error: HttpErrorResponse): string {
    const detail = error.error?.dateFin;

    if (Array.isArray(detail) && typeof detail[0] === 'string') {
      return detail[0];
    }

    const prixErreur = error.error?.prixParKg;

    if (Array.isArray(prixErreur) && typeof prixErreur[0] === 'string') {
      return prixErreur[0];
    }

    return 'Le tarif n’a pas pu être enregistré. Vérifiez les informations puis réessayez.';
  }

  private aujourdhui(): string {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private demain(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
