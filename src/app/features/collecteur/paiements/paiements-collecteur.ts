import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, expand, switchMap, take, takeWhile, timer } from 'rxjs';

import { VenteDechetService } from '../../../core/services/vente-dechet';
import {
  VenteDechet,
  OperateurPaiementVente,
} from '../../../shared/models/vente-dechet.model';

/**
 * Option d'opérateur de paiement présentée dans le modal.
 */
interface OperateurOption {
  code: OperateurPaiementVente;
  label: string;
  description: string;
}

@Component({
  imports: [CommonModule],
  selector: 'app-paiements-collecteur',
  styleUrl: './paiements-collecteur.css',
  templateUrl: './paiements-collecteur.html',
})
export class PaiementsCollecteur implements OnInit {

  private readonly venteService = inject(VenteDechetService);
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);

  // ─── État général ─────────────────────────────────────────────
  chargement = signal(true);
  erreur     = signal<string | null>(null);
  message    = signal<string | null>(null);

  // ─── Liste des ventes ─────────────────────────────────────────
  ventes = signal<VenteDechet[]>([]);

  // ─── Filtres ──────────────────────────────────────────────────
  /** Onglet actif : 'a_payer' | 'payees' | 'tout' */
  onglet = signal<'a_payer' | 'payees' | 'tout'>('a_payer');

  // ─── Ventes filtrées par onglet ───────────────────────────────
  ventesFiltrees = computed(() => {
    switch (this.onglet()) {
      case 'a_payer':
        // N'affiche que les ventes en attente de paiement.
        return this.ventes().filter(v => v.statutPaiement === 'en_attente');
      case 'payees':
        // N'affiche que les ventes déjà payées.
        return this.ventes().filter(v => v.statutPaiement === 'paye');
      default:
        return this.ventes();
    }
  });

  // ─── Statistiques ─────────────────────────────────────────────

  /** Nombre de ventes en attente de paiement. */
  nbAPayer = computed(() =>
    this.ventes().filter(v => v.statutPaiement === 'en_attente').length
  );

  /** Montant total encore à payer (ventes en_attente). */
  montantAPayer = computed(() =>
    this.ventes()
      .filter(v => v.statutPaiement === 'en_attente')
      .reduce((sum, v) => sum + v.prixPaye, 0)
  );

  /** Montant total déjà payé (ventes paye). */
  montantPaye = computed(() =>
    this.ventes()
      .filter(v => v.statutPaiement === 'paye')
      .reduce((sum, v) => sum + v.prixPaye, 0)
  );

  // ─── Modal paiement ───────────────────────────────────────────

  /** Vente en cours de paiement (sélectionnée dans le modal). */
  venteSelectionnee       = signal<VenteDechet | null>(null);
  modalOuvert             = signal(false);
  operateurSelectionne    = signal<OperateurPaiementVente>('wave');
  chargementPaiement      = signal(false);
  erreurPaiement          = signal<string | null>(null);
  paiementEnVerification  = signal(false);

  /** Options d'opérateurs disponibles. */
  readonly operateurs: OperateurOption[] = [
    {
      code:        'wave',
      label:       'Wave',
      description: 'Paiement mobile via Wave Sénégal.',
    },
    {
      code:        'orange_money',
      label:       'Orange Money',
      description: 'Paiement mobile via Orange Money.',
    },
  ];

  ngOnInit(): void {
    this.chargerVentes();

    // Gère le retour depuis la page PayDunya.
    const reference = this.route.snapshot.queryParamMap.get('reference');
    if (reference) {
      // Retour avec une référence → le collecteur vient de payer.
      this.demarrerVerification(reference);
    } else if (this.route.snapshot.queryParamMap.get('paiement') === 'annule') {
      // Le collecteur a annulé sur la page PayDunya.
      this.message.set(
        'Le paiement a été annulé. Vous pouvez réessayer quand vous le souhaitez.'
      );
    }
  }

  // ─── Chargement ───────────────────────────────────────────────

  private chargerVentes(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.venteService.listerVentes().subscribe({
      next: (ventes) => {
        // Trie par date décroissante.
        this.ventes.set(
          [...ventes].sort(
            (a, b) =>
              new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime()
          )
        );
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les ventes.');
        this.chargement.set(false);
      },
    });
  }

  // ─── Modal ────────────────────────────────────────────────────

  /**
   * Ouvre le modal de choix d'opérateur pour payer une vente.
   */
  ouvrirPaiement(vente: VenteDechet): void {
    this.venteSelectionnee.set(vente);
    this.erreurPaiement.set(null);
    this.operateurSelectionne.set('wave');
    this.modalOuvert.set(true);
  }

  /** Ferme le modal (seulement si aucun paiement n'est en cours). */
  fermerModal(): void {
    if (!this.chargementPaiement()) {
      this.modalOuvert.set(false);
      this.venteSelectionnee.set(null);
    }
  }

  /** Change l'opérateur sélectionné dans le modal. */
  choisirOperateur(code: OperateurPaiementVente): void {
    this.operateurSelectionne.set(code);
    this.erreurPaiement.set(null);
  }

  // ─── Paiement ─────────────────────────────────────────────────

  /**
   * Initie le paiement PayDunya pour la vente sélectionnée.
   *
   * Flux :
   * 1. POST /api/ventes/paiement/initier/ → Django crée la facture PayDunya
   * 2. Angular redirige le collecteur vers urlPaiement (page PayDunya)
   * 3. Après paiement, PayDunya redirige vers
   *    /collecteur/paiements?reference=VP-xxx
   * 4. Angular poll verifierPaiement() jusqu'à confirmation
   */
  continuerVersPaiement(): void {
    const vente = this.venteSelectionnee();
    if (!vente || this.chargementPaiement()) return;

    this.chargementPaiement.set(true);
    this.erreurPaiement.set(null);

    this.venteService
      .initierPaiement(vente.idVente, this.operateurSelectionne())
      .subscribe({
        next: ({ urlPaiement }) => {
          // Redirige le collecteur vers la page de paiement PayDunya.
          globalThis.location.assign(urlPaiement);
        },
        error: (err: HttpErrorResponse) => {
          this.erreurPaiement.set(this.messageErreur(err));
          this.chargementPaiement.set(false);
        },
      });
  }

  /**
   * Lance le polling de vérification du paiement après retour PayDunya.
   * Interroge Django toutes les 2,5 secondes jusqu'à confirmation
   * ou après 12 tentatives (~30 secondes).
   */
  private demarrerVerification(reference: string): void {
    this.paiementEnVerification.set(true);
    this.message.set(
      'Vérification de votre paiement auprès de PayDunya...'
    );

    timer(0)
      .pipe(
        switchMap(() =>
          this.venteService.verifierPaiement(reference)
        ),
        expand(({ estPaye }) =>
          estPaye
            ? EMPTY
            : timer(2500).pipe(
                switchMap(() =>
                  this.venteService.verifierPaiement(reference)
                )
              )
        ),
        takeWhile(({ estPaye }) => !estPaye, true),
        take(12)
      )
      .subscribe({
        next: ({ estPaye }) => {
          if (estPaye) {
            this.paiementEnVerification.set(false);
            this.message.set(
              'Paiement confirmé ! Le citoyen a été réglé.'
            );
            // Recharge la liste pour afficher le nouveau statut.
            this.chargerVentes();
          }
        },
        error: (err: { error?: { detail?: string } }) => {
          this.paiementEnVerification.set(false);
          this.erreur.set(
            err.error?.detail ??
            'La vérification du paiement est momentanément indisponible.'
          );
        },
        complete: () => {
          if (this.paiementEnVerification()) {
            // Les 12 tentatives sont épuisées sans confirmation.
            this.paiementEnVerification.set(false);
            this.message.set(
              'Votre paiement est en cours de confirmation. ' +
              'Actualisez la page dans quelques instants.'
            );
          }
        },
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────

  /** Traduit l'erreur HTTP en message lisible. */
  private messageErreur(err: HttpErrorResponse): string {
    if (err.status === 503) {
      return (
        'Le service de paiement est momentanément indisponible. ' +
        'Vérifiez la configuration PayDunya dans le backend.'
      );
    }
    if (err.status === 409) {
      return 'Cette vente ne peut pas être payée dans son statut actuel.';
    }
    const detail = err.error?.detail;
    return typeof detail === 'string'
      ? detail
      : 'Une erreur est survenue. Veuillez réessayer.';
  }

  /** Initiales du citoyen pour l'avatar (prénom + nom ou email). */
  initiales(vente: VenteDechet): string {
    const p = vente.prenomUtilisateur?.[0] ?? '';
    const n = vente.nomUtilisateur?.[0] ?? '';
    if (p || n) return (p + n).toUpperCase();
    return (vente.emailUtilisateur ?? '??').slice(0, 2).toUpperCase();
  }

  /** Nom complet du citoyen ou email si nom absent. */
  nomCitoyen(vente: VenteDechet): string {
    const nom = `${vente.prenomUtilisateur ?? ''} ${vente.nomUtilisateur ?? ''}`.trim();
    return nom || vente.emailUtilisateur || 'Citoyen';
  }

  /** Formate une date ISO en "23 sept. 2026". */
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Classe CSS du badge de statut paiement. */
  classeStatut(s: string): string {
    switch (s) {
      case 'paye':       return 'bg-green-100 text-green-700';
      case 'en_attente': return 'bg-orange-100 text-orange-600';
      case 'echoue':     return 'bg-red-100 text-red-600';
      case 'rembourse':  return 'bg-slate-100 text-slate-500';
      default:           return 'bg-slate-100 text-slate-400';
    }
  }

  /** Libellé français du statut. */
  libelleStatut(s: string): string {
    const map: Record<string, string> = {
      paye:       'Payé',
      en_attente: 'En attente',
      echoue:     'Échoué',
      rembourse:  'Remboursé',
    };
    return map[s] ?? s;
  }

  /** Change l'onglet actif et remet la pagination à zéro. */
  changerOnglet(o: 'a_payer' | 'payees' | 'tout'): void {
    this.onglet.set(o);
  }
}
