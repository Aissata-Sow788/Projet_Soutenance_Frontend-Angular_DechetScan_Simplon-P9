import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CollecteurService } from '../../../core/services/collecteur';
import { Collecteur, StatutValidation } from '../../../shared/models/collecteur.model';
import Swal from 'sweetalert2';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-collecteurs',
  styleUrl: './collecteurs.css',
  templateUrl: './collecteurs.html',
})
export class CollecteursAdmin implements OnInit {

  private readonly collecteurService = inject(CollecteurService);
  private readonly router = inject(Router);

  // ─── Données ──────────────────────────────────────────────────
  collecteurs = signal<Collecteur[]>([]);
  chargement  = signal(true);
  erreur      = signal('');

  // ─── Filtres ──────────────────────────────────────────────────
  recherche    = signal('');
  filtreStatut = signal('tous');
  filtreZone   = signal('');

  // ─── Pagination ───────────────────────────────────────────────
  readonly Math      = Math;
  pageActuelle       = signal(1);
  readonly taillePage = 10;

  // ─── Popup validation ─────────────────────────────────────────
  /** Collecteur actuellement sélectionné dans le menu ⋮. */
  menuOuvert             = signal<number | null>(null);
  popupValidationOuverte = signal(false);
  collecteurSelectionne  = signal<Collecteur | null>(null);
  enTraitement           = signal(false);

  // ─── Stats calculées ──────────────────────────────────────────

  /** Total collecteurs. */
  total = computed(() => this.collecteurs().length);

  /** Collecteurs validés. */
  totalValides = computed(() =>
    this.collecteurs().filter(c => c.statutValidation === 'valide').length
  );

  /** Collecteurs en attente. */
  totalEnAttente = computed(() =>
    this.collecteurs().filter(c => c.statutValidation === 'en_attente').length
  );

  /** Collecteurs rejetés. */
  totalRejetes = computed(() =>
    this.collecteurs().filter(c => c.statutValidation === 'rejete').length
  );

  // ─── Liste filtrée ────────────────────────────────────────────

  collecteursFiltres = computed(() => {
    let resultat = [...this.collecteurs()];

    // Filtre par recherche (nom, email, zone).
    const texte = this.recherche().toLowerCase().trim();
    if (texte) {
      resultat = resultat.filter(c =>
        c.prenomUtilisateur.toLowerCase().includes(texte) ||
        c.nomUtilisateur.toLowerCase().includes(texte) ||
        c.emailUtilisateur.toLowerCase().includes(texte) ||
        c.zoneIntervention.toLowerCase().includes(texte) ||
        c.nomEntreprise.toLowerCase().includes(texte)
      );
    }

    // Filtre par statut.
    if (this.filtreStatut() !== 'tous') {
      resultat = resultat.filter(c =>
        c.statutValidation === this.filtreStatut()
      );
    }

    // Filtre par zone.
    const zone = this.filtreZone().toLowerCase().trim();
    if (zone) {
      resultat = resultat.filter(c =>
        c.zoneIntervention.toLowerCase().includes(zone)
      );
    }

    return resultat;
  });

  // ─── Pagination ───────────────────────────────────────────────

  collecteursAffiches = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.taillePage;
    return this.collecteursFiltres().slice(debut, debut + this.taillePage);
  });

  nombrePages(): number {
    return Math.ceil(this.collecteursFiltres().length / this.taillePage);
  }

  changerPage(page: number): void {
    if (page < 1 || page > this.nombrePages()) return;
    this.pageActuelle.set(page);
  }

  ngOnInit(): void {
    this.chargerCollecteurs();
  }

  // ─── Chargement ───────────────────────────────────────────────

  private chargerCollecteurs(): void {
    this.chargement.set(true);
    this.erreur.set('');

    this.collecteurService.listerCollecteurs().subscribe({
      next: (data) => {
        this.collecteurs.set(data);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les collecteurs.');
        this.chargement.set(false);
      }
    });
  }

  // ─── Menu actions ⋮ ──────────────────────────────────────────

  /** Ouvre/ferme le menu d'actions d'un collecteur. */
  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.menuOuvert.set(this.menuOuvert() === id ? null : id);
  }

  /** Ferme le menu si on clique ailleurs. */
  fermerMenu(): void {
    this.menuOuvert.set(null);
  }

  // ─── Popup validation ─────────────────────────────────────────

  /**
   * Ouvre le popup de validation pour un collecteur en_attente.
   * Appelé depuis le menu ⋮ → "Valider / Rejeter".
   */
  ouvrirPopupValidation(collecteur: Collecteur): void {
    this.collecteurSelectionne.set(collecteur);
    this.popupValidationOuverte.set(true);
    this.menuOuvert.set(null);
  }

  /** Ferme le popup de validation. */
  fermerPopupValidation(): void {
    this.popupValidationOuverte.set(false);
    this.collecteurSelectionne.set(null);
  }

  /**
   * Valide ou rejette le collecteur sélectionné.
   * Appelle PATCH /api/collecteurs/{id}/valider/
   * avec { statutValidation: "valide" | "rejete" }.
   */
  changerStatutValidation(nouveau: StatutValidation): void {
    const collecteur = this.collecteurSelectionne();
    if (!collecteur || this.enTraitement()) return;

    this.enTraitement.set(true);

    this.collecteurService.validerCollecteur(
      collecteur.idCollecteur,
      nouveau
    ).subscribe({
      next: (collecteurMAJ) => {
        // Met à jour la liste locale sans recharger.
        this.collecteurs.update(liste =>
          liste.map(c =>
            c.idCollecteur === collecteurMAJ.idCollecteur
              ? collecteurMAJ
              : c
          )
        );
        this.enTraitement.set(false);
        this.fermerPopupValidation();

        // Feedback visuel.
        Swal.fire({
          title: nouveau === 'valide' ? 'Collecteur validé !' : 'Collecteur rejeté',
          text: nouveau === 'valide'
            ? `${collecteur.prenomUtilisateur} ${collecteur.nomUtilisateur} peut maintenant opérer sur la plateforme.`
            : `La demande de ${collecteur.prenomUtilisateur} ${collecteur.nomUtilisateur} a été refusée.`,
          icon: nouveau === 'valide' ? 'success' : 'info',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0EA5A4',
        });
      },
      error: () => {
        this.enTraitement.set(false);
        Swal.fire({
          title: 'Erreur',
          text: 'Impossible de modifier le statut du collecteur.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0EA5A4',
        });
      }
    });
  }

  /**
   * Raccourci pour changer le statut directement depuis
   * les boutons du tableau (sans passer par le popup).
   * Définit d'abord le collecteur sélectionné puis
   * appelle changerStatutValidation.
   */
  changerStatutDirectement(collecteur: Collecteur, nouveau: StatutValidation): void {
    // On définit le collecteur sélectionné avant d'appeler la méthode
    // pour que changerStatutValidation() puisse lire son nom dans le message.
    this.collecteurSelectionne.set(collecteur);
    this.changerStatutValidation(nouveau);
  }

  // ─── Navigation ───────────────────────────────────────────────

  /** Navigue vers le détail d'un collecteur. */
  voirDetail(id: number): void {
    this.menuOuvert.set(null);
    this.router.navigate(['/admin/collecteurs', id]);
  }

  // ─── Helpers affichage ────────────────────────────────────────

  /** Initiales pour l'avatar. */
  initiales(collecteur: Collecteur): string {
    const p = collecteur.prenomUtilisateur?.[0] ?? '';
    const n = collecteur.nomUtilisateur?.[0] ?? '';
    return (p + n).toUpperCase() || '?';
  }

  /** Formate une date ISO en "14 Oct. 2023". */
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Formate uniquement l'heure "14:32". */
  formaterHeure(dateIso: string): string {
    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Retourne les pages visibles pour la pagination
   * avec des "..." quand il y a trop de pages.
   * Exemple : [1, 2, 3, '...', 129]
   */
  pagesVisibles(): (number | string)[] {
    const total   = this.nombrePages();
    const current = this.pageActuelle();
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  /** Classe CSS du badge de statut. */
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
    const map: Record<string, string> = {
      valide:     'ACTIF',
      en_attente: 'EN ATTENTE',
      rejete:     'REJETÉ',
    };
    return map[statut] ?? statut;
  }

  /** Réinitialise tous les filtres. */
  reinitialiserFiltres(): void {
    this.recherche.set('');
    this.filtreStatut.set('tous');
    this.filtreZone.set('');
    this.pageActuelle.set(1);
  }
}
