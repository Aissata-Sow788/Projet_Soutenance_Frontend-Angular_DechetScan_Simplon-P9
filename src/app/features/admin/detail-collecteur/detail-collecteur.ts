import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CollecteurService } from '../../../core/services/collecteur';
import { CollecteService } from '../../../core/services/collecte';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { Collecteur, StatutValidation } from '../../../shared/models/collecteur.model';
import { Collecte } from '../../../shared/models/collecte.model';
import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';
import Swal from 'sweetalert2';

/** Entrée d'historique affichée dans la colonne droite. */
interface EntreeHistorique {
  titre: string;
  description: string;
  date: string;
  couleur: 'vert' | 'bleu' | 'orange' | 'rouge';
  ref: string;
}

@Component({
  imports: [CommonModule],
  selector: 'app-detail-collecteur',
  styleUrl: './detail-collecteur.css',
  templateUrl: './detail-collecteur.html',
})
export class DetailCollecteur implements OnInit {

  private readonly route            = inject(ActivatedRoute);
  private readonly router           = inject(Router);
  private readonly collecteurService = inject(CollecteurService);
  private readonly collecteService  = inject(CollecteService);
  private readonly demandeService   = inject(DemandeCollecteService);

  // ─── État ─────────────────────────────────────────────────────
  chargement = signal(true);
  erreur     = signal<string | null>(null);
  enTraitement = signal(false);

  // ─── Données ──────────────────────────────────────────────────
  collecteur = signal<Collecteur | null>(null);
  collectes  = signal<Collecte[]>([]);
  demandes   = signal<DemandeCollecte[]>([]);

  // ─── Historique récent construit depuis collectes + demandes ──
  historique = signal<EntreeHistorique[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.chargerDonnees(id);
    } else {
      this.erreur.set('Identifiant invalide.');
      this.chargement.set(false);
    }
  }

  private chargerDonnees(id: number): void {
    this.chargement.set(true);
    this.erreur.set(null);

    // Charge le profil collecteur.
    this.collecteurService.obtenirCollecteur(id).subscribe({
      next: (collecteur) => {
        this.collecteur.set(collecteur);

        // Charge les collectes et demandes en parallèle.
        this.collecteService.listerCollectes().subscribe({
          next: (collectes) => {
            // Filtre les collectes de ce collecteur.
            const siennes = collectes.filter(
              c => c.idCollecteur === id
            );
            this.collectes.set(siennes);

            // Charge les demandes.
            this.demandeService.listerDemandes().subscribe({
              next: (demandes) => {
                // Filtre les demandes attribuées à ce collecteur.
                const siennes = demandes.filter(
                  d => d.collecteurAttribue?.idCollecteur === id
                );
                this.demandes.set(siennes);

                // Construit l'historique unifié.
                this.construireHistorique();
                this.chargement.set(false);
              },
              error: () => {
                // Demandes optionnelles, on continue sans.
                this.construireHistorique();
                this.chargement.set(false);
              }
            });
          },
          error: () => {
            this.construireHistorique();
            this.chargement.set(false);
          }
        });
      },
      error: () => {
        this.erreur.set('Impossible de charger ce collecteur.');
        this.chargement.set(false);
      }
    });
  }

  /**
   * Construit la liste d'historique récent depuis les collectes
   * et les demandes, triées par date décroissante (5 entrées max).
   */
  private construireHistorique(): void {
    const entrees: EntreeHistorique[] = [];

    // Ajoute les collectes terminées.
    this.collectes()
      .filter(c => c.statut === 'terminee')
      .forEach(c => {
        const kg = c.quantiteRecuperee
          ? `${c.quantiteRecuperee} kg collectés`
          : 'Collecte réalisée';
        entrees.push({
          titre:       'Collecte terminée',
          description: `${kg} — ${c.nomPoint ?? 'Point non précisé'}.`,
          date:        c.dateRealisation ?? c.datePlanifiee,
          couleur:     'vert',
          ref:         `TR-${c.idCollecte.toString().padStart(5, '0')}`,
        });
      });

    // Ajoute les collectes planifiées.
    this.collectes()
      .filter(c => c.statut === 'planifiee')
      .forEach(c => {
        entrees.push({
          titre:       'Collecte planifiée',
          description: `Collecte prévue le ${this.formaterDate(c.datePlanifiee)}.`,
          date:        c.datePlanifiee,
          couleur:     'bleu',
          ref:         `PL-${c.idCollecte.toString().padStart(5, '0')}`,
        });
      });

    // Ajoute les demandes acceptées.
    this.demandes()
      .filter(d => d.statut === 'acceptee' || d.statut === 'en_cours')
      .forEach(d => {
        entrees.push({
          titre:       'Demande acceptée',
          description: `Demande de collecte ${d.typeDechet?.nom ?? ''} — ${d.quartier}.`,
          date:        d.dateDemande,
          couleur:     'orange',
          ref:         `DM-${d.idDemande.toString().padStart(4, '0')}`,
        });
      });

    // Trie par date décroissante et garde les 5 plus récentes.
    entrees.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    this.historique.set(entrees.slice(0, 5));
  }

  // ─── Stats ────────────────────────────────────────────────────

  /** Nombre de collectes terminées. */
  collectesRealisees(): number {
    return this.collectes().filter(c => c.statut === 'terminee').length;
  }

  /** Nombre de demandes traitées (acceptées ou terminées). */
  demandesTraitees(): number {
    return this.demandes().filter(
      d => d.statut === 'acceptee' || d.statut === 'terminee'
    ).length;
  }

  // ─── Actions ──────────────────────────────────────────────────

  /**
   * Valide ou rejette le collecteur depuis le footer de la page.
   * Même logique que le popup de la liste.
   */
  changerStatut(nouveau: StatutValidation): void {
    const c = this.collecteur();
    if (!c || this.enTraitement()) return;

    const action = nouveau === 'valide' ? 'valider' : 'suspendre';
    const label  = nouveau === 'valide' ? 'Valider' : 'Suspendre';

    Swal.fire({
      title: `${label} ce collecteur ?`,
      text: `${c.prenomUtilisateur} ${c.nomUtilisateur} sera ${
        nouveau === 'valide' ? 'activé sur la plateforme' : 'suspendu'
      }.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Oui, ${label.toLowerCase()}`,
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      confirmButtonColor: nouveau === 'valide' ? '#0EA5A4' : '#EF4444',
      cancelButtonColor: '#64748B',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.enTraitement.set(true);

      this.collecteurService.validerCollecteur(c.idCollecteur, nouveau).subscribe({
        next: (cMAJ) => {
          this.collecteur.set(cMAJ);
          this.enTraitement.set(false);
          Swal.fire({
            title: nouveau === 'valide' ? 'Collecteur validé !' : 'Collecteur suspendu',
            icon: nouveau === 'valide' ? 'success' : 'info',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0EA5A4',
          });
        },
        error: () => {
          this.enTraitement.set(false);
          Swal.fire({
            title: 'Erreur',
            text: 'Impossible de modifier le statut.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0EA5A4',
          });
        }
      });
    });
  }

  /** Retour à la liste des collecteurs. */
  retour(): void {
    this.router.navigate(['/admin/collecteurs']);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  /** Initiales pour l'avatar. */
  initiales(c: Collecteur): string {
    return (
      (c.prenomUtilisateur?.[0] ?? '') +
      (c.nomUtilisateur?.[0] ?? '')
    ).toUpperCase() || '?';
  }

  /** Formate une date ISO courte. */
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Formate une date ISO longue avec heure. Ex: "14 Octobre 2023, 14:32". */
  formaterDateLongue(dateIso: string): string {
    const d = new Date(dateIso);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) + ', ' + d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Classe de couleur du badge statut. */
  classeStatut(statut: StatutValidation): string {
    switch (statut) {
      case 'valide':     return 'bg-green-100 text-green-700';
      case 'en_attente': return 'bg-orange-100 text-orange-600';
      case 'rejete':     return 'bg-red-100 text-red-500';
      default:           return 'bg-slate-100 text-slate-500';
    }
  }

  /** Libellé du statut. */
  libelleStatut(statut: StatutValidation): string {
    return { valide: 'COMPTE ACTIF', en_attente: 'EN ATTENTE', rejete: 'COMPTE REJETÉ' }[statut] ?? statut;
  }

  /** Classe de couleur du point d'historique. */
  classePointHistorique(couleur: EntreeHistorique['couleur']): string {
    return {
      vert:   'bg-green-500',
      bleu:   'bg-blue-500',
      orange: 'bg-orange-400',
      rouge:  'bg-red-500',
    }[couleur];
  }

  /** Formate la date de l'historique en relatif. */
  formaterDateRelative(dateIso: string): string {
    const maintenant = new Date();
    const date       = new Date(dateIso);
    const diffMs     = maintenant.getTime() - date.getTime();
    const diffJours  = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffJours === 0) {
      return "Aujourd'hui, " + date.toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit'
      });
    }
    if (diffJours === 1) return 'Hier, ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return this.formaterDate(dateIso);
  }
}
