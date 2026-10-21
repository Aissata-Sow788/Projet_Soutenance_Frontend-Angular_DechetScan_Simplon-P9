
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { CollecteurService } from '../../core/services/collecteur';
import { VenteDechetService } from '../../core/services/vente-dechet';
import { PrixDechetService } from '../../core/services/prix-dechet';
import { ScanService, PanierDechetApi } from '../../core/services/scan';
import { Collecteur } from '../../shared/models/collecteur.model';
import { PrixDechet } from '../../shared/models/prix-dechet.model';
import { VenteDechetCreation } from '../../shared/models/vente-dechet.model';

/** Étapes du parcours de vente : sélection, collecteur, puis confirmation. */
type Etape = 'choisir-dechet' | 'choisir-collecteur' | 'confirmer';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-vendre-dechets',
  styleUrl: './vendre-dechets.css',
  templateUrl: './vendre-dechets.html',
})
export class VendreDechets implements OnInit {
  private readonly router = inject(Router);
  private readonly collecteurService = inject(CollecteurService);
  private readonly venteService = inject(VenteDechetService);
  private readonly prixService = inject(PrixDechetService);
  private readonly scanService = inject(ScanService);

  etape = signal<Etape>('choisir-dechet');
  paniers = signal<PanierDechetApi[]>([]);
  tarifs = signal<PrixDechet[]>([]);
  chargementTypes = signal(true);
  selection = signal<Set<number>>(new Set());
  nombresObjets = signal<Record<number, number>>({});
  poidsMesuresKg = signal<Record<number, number | null>>({});
  rechercheZone = signal('');
  collecteurs = signal<Collecteur[]>([]);
  chargementCollecteurs = signal(false);
  chargementTarifCollecteur = signal(false);
  collecteurChoisi = signal<Collecteur | null>(null);
  methodePaiement = signal<string>('Wave');
  enEnvoi = signal(false);
  erreur = signal<string | null>(null);
  venteCreee = signal(false);

  readonly methodesPaiement = ['Wave', 'Orange Money'];

  paniersDisponibles = computed(() =>
    this.paniers().filter((panier) => panier.nombreDisponible > 0)
  );

  nombreObjetsDansPanier = computed(() =>
    this.paniers().reduce(
      (total, panier) => total + panier.nombreDisponible,
      0,
    )
  );

  paniersChoisis = computed(() =>
    this.paniersDisponibles().filter(
      (panier) => this.selection().has(panier.idPanier),
    )
  );

  nombreObjetsSelectionnes = computed(() =>
    this.paniersChoisis().reduce(
      (total, panier) => total + this.nombrePourPanier(panier),
      0,
    )
  );

  poidsTotalKg = computed(() =>
    this.paniersChoisis().reduce(
      (total, panier) => total + (this.poidsPourPanier(panier) ?? 0),
      0,
    )
  );

  montantTotal = computed(() =>
    this.paniersChoisis().reduce((total, panier) => {
      const tarif = this.tarifPourPanier(panier);
      const poids = this.poidsPourPanier(panier) ?? 0;
      return total + poids * (tarif?.prixParKg ?? 0);
    }, 0)
  );

  /** Valide les objets sélectionnés et leur poids mesuré. */
  etape1Valide = computed(() =>
    !this.chargementTypes()
    && this.paniersChoisis().length > 0
    && this.paniersChoisis().every((panier) =>
      this.nombrePourPanier(panier) > 0
      && (this.poidsPourPanier(panier) ?? 0) > 0,
    )
  );

  etape2Valide = computed(() => this.collecteurChoisi() !== null);

  etape3Valide = computed(() =>
    this.methodePaiement().trim().length > 0 && this.montantTotal() > 0
  );

  ngOnInit(): void {
    this.chargerPaniersEtTarifs();
  }

  private chargerPaniersEtTarifs(): void {
    this.chargementTypes.set(true);
    this.erreur.set(null);

    this.scanService.getPaniers().subscribe({
      next: (paniers) => {
        this.paniers.set(paniers);
        this.chargementTypes.set(false);
      },
      error: (erreur: unknown) => {
        console.error(
          'Erreur lors du chargement des déchets à vendre :',
          erreur,
        );
        this.erreur.set(
          'Impossible de charger vos paniers. Vérifiez votre connexion puis réessayez.',
        );
        this.chargementTypes.set(false);
      },
    });
  }

  panierEstSelectionne(panier: PanierDechetApi): boolean {
    return this.selection().has(panier.idPanier);
  }

  changerSelection(panier: PanierDechetApi, choisi: boolean): void {
    this.selection.update((selection) => {
      const nouvelleSelection = new Set(selection);

      if (choisi) {
        nouvelleSelection.add(panier.idPanier);
        this.nombresObjets.update((nombres) => ({
          ...nombres,
          [panier.idPanier]:
            nombres[panier.idPanier] ?? panier.nombreDisponible,
        }));
      } else {
        nouvelleSelection.delete(panier.idPanier);
      }

      return nouvelleSelection;
    });
  }

  nombrePourPanier(panier: PanierDechetApi): number {
    return this.nombresObjets()[panier.idPanier] ?? 0;
  }

  modifierNombreObjets(
    panier: PanierDechetApi,
    valeur: number,
  ): void {
    const nombre = Number.isFinite(valeur)
      ? Math.max(
          1,
          Math.min(panier.nombreDisponible, Math.floor(valeur)),
        )
      : 1;

    this.nombresObjets.update((nombres) => ({
      ...nombres,
      [panier.idPanier]: nombre,
    }));
  }

  poidsPourPanier(panier: PanierDechetApi): number | null {
    return this.poidsMesuresKg()[panier.idPanier] ?? null;
  }

  modifierPoids(
    panier: PanierDechetApi,
    poids: number | null,
  ): void {
    this.poidsMesuresKg.update((poidsActuels) => ({
      ...poidsActuels,
      [panier.idPanier]:
        poids !== null && Number.isFinite(poids) && poids > 0
          ? poids
          : null,
    }));
  }

  tarifPourPanier(panier: PanierDechetApi): PrixDechet | null {
    return this.tarifs().find(
      (tarif) =>
        Number(tarif.idTypeDechet) === Number(panier.idTypeDechet),
    ) ?? null;
  }

  private chargerCollecteurs(): void {
    this.chargementCollecteurs.set(true);

    this.collecteurService.listerDisponibles(this.rechercheZone()).subscribe({
      next: (liste) => {
        this.collecteurs.set(liste);
        this.chargementCollecteurs.set(false);
      },
      error: (erreur: unknown) => {
        console.error(
          'Erreur lors du chargement des collecteurs disponibles :',
          erreur,
        );
        this.erreur.set(
          'Impossible de charger les collecteurs. Réessayez.',
        );
        this.chargementCollecteurs.set(false);
      },
    });
  }

  allerEtape2(): void {
    if (!this.etape1Valide()) return;

    this.erreur.set(null);
    this.etape.set('choisir-collecteur');
    this.chargerCollecteurs();
  }

  allerEtape3(): void {
    if (!this.etape2Valide()) return;
    this.etape.set('confirmer');
  }

  retourEtape1(): void {
    this.etape.set('choisir-dechet');
  }

  retourEtape2(): void {
    this.etape.set('choisir-collecteur');
  }

  choisirCollecteur(collecteur: Collecteur): void {
    if (this.chargementTarifCollecteur()) return;

    this.chargementTarifCollecteur.set(true);
    this.erreur.set(null);

    this.prixService.listerPrix(collecteur.idCollecteur).subscribe({
      next: (tarifs) => {
        console.log('Tarifs reçus du collecteur :', tarifs);

        const paniersChoisis = this.paniersChoisis();

        console.log(
          'Déchets sélectionnés :',
          paniersChoisis.map((panier) => ({
            nom: panier.typeDechet.nom,
            idTypeDechet: panier.idTypeDechet,
          })),
        );

        const tarifsActifs = tarifs.filter(
          (tarif) => tarif.est_actif === true,
        );

        console.log('Tarifs actifs :', tarifsActifs);

        const categoriesSansTarif = paniersChoisis
          .filter(
            (panier) =>
              !tarifsActifs.some(
                (tarif) =>
                  Number(tarif.idTypeDechet) ===
                  Number(panier.idTypeDechet),
              ),
          )
          .map((panier) => panier.typeDechet.nom);

        this.chargementTarifCollecteur.set(false);

        if (categoriesSansTarif.length > 0) {
          this.erreur.set(
            `Ce collecteur n’a pas de tarif actif pour : ${categoriesSansTarif.join(', ')}. Choisissez un autre collecteur.`,
          );
          return;
        }

        this.tarifs.set(tarifsActifs);
        this.collecteurChoisi.set(collecteur);
        this.allerEtape3();
      },
      error: (erreur: unknown) => {
        console.error(
          'Erreur lors du chargement des tarifs du collecteur :',
          erreur,
        );
        this.chargementTarifCollecteur.set(false);
        this.erreur.set(
          'Impossible de charger les tarifs de ce collecteur. Réessayez.',
        );
      },
    });
  }

  filtrerCollecteurs(): void {
    this.chargerCollecteurs();
  }


confirmerVente(): void {
  if (!this.etape3Valide() || this.enEnvoi()) return;

  const collecteur = this.collecteurChoisi();
  if (!collecteur) return;

  this.enEnvoi.set(true);
  this.erreur.set(null);

  const donnees: VenteDechetCreation = {
    idCollecteur: collecteur.idCollecteur,
    methodePaiement: this.methodePaiement(),
    details: this.paniersChoisis().map((panier) => ({
      idPanier: panier.idPanier,
      nombreObjets: this.nombrePourPanier(panier),
      poidsKg: this.poidsPourPanier(panier)!,
    })),
  };

  this.venteService.creerVente(donnees).subscribe({
    next: (vente) => {
      console.log('Vente créée avec succès :', vente);
      this.erreur.set(null);
      this.enEnvoi.set(false);
      this.venteCreee.set(true);
    },
    error: (erreur: unknown) => {
      this.enEnvoi.set(false);
      this.erreur.set(this.messageErreurVente(erreur));
    },
  });
}

  private messageErreurVente(erreur: unknown): string {
    if (!(erreur instanceof HttpErrorResponse)) {
      return 'La vente n’a pas pu être créée. Vérifiez le stock et réessayez.';
    }

    return this.extraireMessage(erreur.error)
      ?? 'La vente n’a pas pu être créée. Vérifiez le stock et réessayez.';
  }

  private extraireMessage(valeur: unknown): string | null {
    if (typeof valeur === 'string' && valeur.trim()) return valeur;

    if (Array.isArray(valeur)) {
      for (const element of valeur) {
        const message = this.extraireMessage(element);
        if (message) return message;
      }
      return null;
    }

    if (typeof valeur !== 'object' || valeur === null) return null;

    const donnees = valeur as Record<string, unknown>;

    for (const cle of [
      'detail',
      'details',
      'nombreObjets',
      'poidsKg',
      'idPanier',
      'idCollecteur',
    ]) {
      const message = this.extraireMessage(donnees[cle]);
      if (message) return message;
    }

    return null;
  }

  initiales(collecteur: Collecteur): string {
    const nom = collecteur.nomEntreprise || collecteur.emailUtilisateur;
    return nom.slice(0, 2).toUpperCase();
  }

  retour(): void {
    this.router.navigate(['/home-citoyen']);
  }

  allerAccueil(): void {
    this.router.navigate(['/home-citoyen']);
  }

  ouvrirMonPanier(): void {
    this.router.navigate(['/mes-paniers']);
  }
}
