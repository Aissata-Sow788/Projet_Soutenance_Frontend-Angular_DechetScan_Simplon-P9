import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CollecteurService } from '../../core/services/collecteur';
import { VenteDechetService } from '../../core/services/vente-dechet';
import { PointCollecteService } from '../../core/services/point-collecte';
import { Collecteur } from '../../shared/models/collecteur.model';
import { TypeDechet } from '../../shared/models/type-dechet.model';
import { VenteDechetCreation } from '../../shared/models/vente-dechet.model';

/**
 * Étapes du tunnel de vente :
 * 1. choisir-dechet  → le citoyen sélectionne le type de déchet
 * 2. choisir-collecteur → liste des collecteurs disponibles
 * 3. confirmer       → résumé + méthode de paiement avant envoi
 */
type Etape = 'choisir-dechet' | 'choisir-collecteur' | 'confirmer';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-vendre-dechets',
  styleUrl: './vendre-dechets.css',
  templateUrl: './vendre-dechets.html',
})
export class VendreDechets implements OnInit {

  private readonly router           = inject(Router);
  private readonly collecteurService = inject(CollecteurService);
  private readonly venteService      = inject(VenteDechetService);
  private readonly pointService      = inject(PointCollecteService);

  // ─── Navigation dans le tunnel ───────────────────────────────
  etape = signal<Etape>('choisir-dechet');

  // ─── Étape 1 : choisir le déchet ─────────────────────────────
  typesDechets        = signal<TypeDechet[]>([]);
  chargementTypes     = signal(true);
  idTypeSelectionne   = signal<number | null>(null);
  quantite            = signal<number | null>(null);
  rechercheZone       = signal('');

  typeSelectionne = computed(() =>
    this.typesDechets().find(t => t.idTypeDechet === this.idTypeSelectionne()) ?? null
  );

  // ─── Étape 2 : choisir le collecteur ─────────────────────────
  collecteurs          = signal<Collecteur[]>([]);
  chargementCollecteurs = signal(false);
  collecteurChoisi     = signal<Collecteur | null>(null);

  // ─── Étape 3 : confirmer la vente ────────────────────────────
  methodePaiement  = signal<string>('Wave');
  prixParKg        = signal<number | null>(null);
  enEnvoi          = signal(false);
  erreur           = signal<string | null>(null);
  venteCreee       = signal(false);

  // ─── Montant estimé ──────────────────────────────────────────
  montantTotal = computed(() => {
    const q = this.quantite();
    const p = this.prixParKg();
    if (!q || !p || q <= 0 || p <= 0) return null;
    return Math.round(q * p);
  });

  // ─── Validation de chaque étape ──────────────────────────────
  etape1Valide = computed(() =>
    this.idTypeSelectionne() !== null && (this.quantite() ?? 0) > 0
  );

  etape2Valide = computed(() =>
    this.collecteurChoisi() !== null
  );

  etape3Valide = computed(() =>
    this.methodePaiement().trim().length > 0 &&
    (this.prixParKg() ?? 0) > 0
  );

  // ─── Méthodes de paiement disponibles ────────────────────────
  readonly methodesPaiement = ['Wave', 'Orange Money', 'Free Money', 'Espèces'];

  ngOnInit(): void {
    this.chargerTypesDechets();
  }

  // ─── Chargement types de déchets ─────────────────────────────
  private chargerTypesDechets(): void {
    this.chargementTypes.set(true);
    this.pointService.listerTypesDechets().subscribe({
      next:  (types) => { this.typesDechets.set(types); this.chargementTypes.set(false); },
      error: ()      => { this.chargementTypes.set(false); }
    });
  }

  // ─── Chargement des collecteurs disponibles ──────────────────
  private chargerCollecteurs(): void {
    this.chargementCollecteurs.set(true);
    this.collecteurService.listerDisponibles(this.rechercheZone()).subscribe({
      next:  (liste) => { this.collecteurs.set(liste); this.chargementCollecteurs.set(false); },
      error: ()      => { this.chargementCollecteurs.set(false); }
    });
  }

  // ─── Navigation entre étapes ─────────────────────────────────

  /** Étape 1 → 2 : valide le choix du déchet et charge les collecteurs. */
  allerEtape2(): void {
    if (!this.etape1Valide()) return;
    this.etape.set('choisir-collecteur');
    this.chargerCollecteurs();
  }

  /** Étape 2 → 3 : valide le collecteur choisi. */
  allerEtape3(): void {
    if (!this.etape2Valide()) return;
    this.etape.set('confirmer');
  }

  /** Revenir à l'étape précédente. */
  retourEtape1(): void { this.etape.set('choisir-dechet'); }
  retourEtape2(): void { this.etape.set('choisir-collecteur'); }

  /** Sélectionne un collecteur et passe à l'étape suivante. */
  choisirCollecteur(collecteur: Collecteur): void {
    this.collecteurChoisi.set(collecteur);
    this.allerEtape3();
  }

  // ─── Filtrer les collecteurs par zone ─────────────────────────
  filtrerCollecteurs(): void {
    this.chargerCollecteurs();
  }

  // ─── Soumission finale ────────────────────────────────────────
  confirmerVente(): void {
    if (!this.etape3Valide() || this.enEnvoi()) return;

    const collecteur = this.collecteurChoisi();
    const type       = this.typeSelectionne();
    if (!collecteur || !type) return;

    this.enEnvoi.set(true);
    this.erreur.set(null);

    const donnees: VenteDechetCreation = {
      idCollecteur:      collecteur.idCollecteur,
      idTypeDechet:      type.idTypeDechet,
      quantite:          this.quantite()!,
      prixPaye:          this.montantTotal()!,
      methodePaiement:   this.methodePaiement(),
      // La vente est créée en attente de confirmation du collecteur.
      statutPaiement:    'en_attente',
      referencePaiement: '',
    };

    this.venteService.creerVente(donnees).subscribe({
      next: () => {
        this.enEnvoi.set(false);
        this.venteCreee.set(true);
      },
      error: (err) => {
        this.enEnvoi.set(false);
        this.erreur.set(
          err?.error?.detail ?? 'Une erreur est survenue. Veuillez réessayer.'
        );
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────

  /** Initiales pour l'avatar du collecteur. */
  initiales(collecteur: Collecteur): string {
    const nom = collecteur.nomEntreprise || collecteur.emailUtilisateur;
    return nom.slice(0, 2).toUpperCase();
  }

  /** Retour au home citoyen. */
  retour(): void {
    this.router.navigate(['/home-citoyen']);
  }

  /** Après la vente : retour au home. */
  allerAccueil(): void {
    this.router.navigate(['/home-citoyen']);
  }
}
