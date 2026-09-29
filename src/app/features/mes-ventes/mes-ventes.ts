import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VenteDechetService } from '../../core/services/vente-dechet';
import { VenteDechet, StatutPaiementVente } from '../../shared/models/vente-dechet.model';

/** Onglet de filtre actif. */
type Onglet = 'toutes' | 'en_attente' | 'payees';

@Component({
  imports: [CommonModule],
  selector: 'app-mes-ventes',
  styleUrl: './mes-ventes.css',
  templateUrl: './mes-ventes.html',
})
export class MesVentes implements OnInit {

  private readonly router       = inject(Router);
  private readonly venteService = inject(VenteDechetService);

  // ─── État ─────────────────────────────────────────────────────
  chargement = signal(true);
  erreur     = signal<string | null>(null);

  // ─── Données ──────────────────────────────────────────────────
  ventes = signal<VenteDechet[]>([]);

  // ─── Onglet actif ─────────────────────────────────────────────
  onglet = signal<Onglet>('toutes');

  // ─── Ventes filtrées ──────────────────────────────────────────
  ventesFiltrees = computed(() => {
    switch (this.onglet()) {
      case 'en_attente':
        return this.ventes().filter(v => v.statutPaiement === 'en_attente');
      case 'payees':
        return this.ventes().filter(v => v.statutPaiement === 'paye');
      default:
        return this.ventes();
    }
  });

  // ─── Total gagné (ventes payées uniquement) ───────────────────
  totalGagne = computed(() =>
    this.ventes()
      .filter(v => v.statutPaiement === 'paye')
      .reduce((sum, v) => sum + v.prixPaye, 0)
  );

  ngOnInit(): void {
    this.chargerVentes();
  }

  private chargerVentes(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.venteService.listerVentes().subscribe({
      next: (ventes) => {
        // Trie par date décroissante (plus récente en premier).
        this.ventes.set(
          [...ventes].sort(
            (a, b) =>
              new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime()
          )
        );
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger vos ventes.');
        this.chargement.set(false);
      },
    });
  }

  // ─── Navigation ───────────────────────────────────────────────

  /** Change l'onglet actif. */
  changerOnglet(o: Onglet): void {
    this.onglet.set(o);
  }

  /** Navigue vers le détail d'une vente. */
  voirDetail(id: number): void {
    this.router.navigate(['/mes-ventes', id]);
  }

  /** Navigue vers la page de création d'une nouvelle vente. */
  nouvelleVente(): void {
    this.router.navigate(['/vendre-dechets']);
  }

  /** Retour à l'accueil citoyen. */
  retour(): void {
    this.router.navigate(['/home-citoyen']);
  }

  // ─── Helpers affichage ────────────────────────────────────────

  /**
   * Formater une date ISO en "12 Oct 2023".
   */
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Retourne le libellé du type de déchet + quantité.
   * Ex : "Plastique - 8 kg"
   */
  labelVente(vente: VenteDechet): string {
    const type = vente.typeDechet?.nom ?? 'Déchet';
    return `${type} - ${vente.quantite} kg`;
  }

  /**
   * Classe Tailwind pour la couleur du montant selon le statut.
   * Payé = turquoise, En attente = orange, autres = gris.
   */
  classeMontant(statut: StatutPaiementVente): string {
    switch (statut) {
      case 'paye':       return 'text-[#0EA5A4]';
      case 'en_attente': return 'text-[#142337]';
      default:           return 'text-slate-400';
    }
  }

  /**
   * Classe Tailwind pour le badge de statut.
   */
  classeStatut(statut: StatutPaiementVente): string {
    switch (statut) {
      case 'paye':       return 'bg-[#E0F9F7] text-[#0EA5A4]';
      case 'en_attente': return 'bg-orange-100 text-orange-600';
      case 'echoue':     return 'bg-red-100 text-red-500';
      case 'rembourse':  return 'bg-slate-100 text-slate-500';
      default:           return 'bg-slate-100 text-slate-400';
    }
  }

  /**
   * Libellé français du statut en majuscules.
   */
  libelleStatut(statut: StatutPaiementVente): string {
    const map: Record<string, string> = {
      paye:       'PAYÉE',
      en_attente: 'EN ATTENTE',
      echoue:     'ÉCHOUÉE',
      rembourse:  'REMBOURSÉE',
    };
    return map[statut] ?? statut.toUpperCase();
  }

  /**
   * Icône SVG inline selon le type de déchet.
   * Retourne 'recyclage' | 'verre' | 'metal' pour le template.
   */
  iconeDechet(nom: string | undefined): 'recyclage' | 'verre' | 'metal' {
    const n = (nom ?? '').toLowerCase();
    if (n.includes('verre'))                        return 'verre';
    if (n.includes('métal') || n.includes('metal')) return 'metal';
    return 'recyclage';
  }
}
