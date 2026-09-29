import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CollecteService } from '../../../core/services/collecte';
import { Collecte, StatutCollecte } from '../../../shared/models/collecte.model';

@Component({
  imports: [CommonModule],
  selector: 'app-mes-collectes',
  styleUrl: './mes-collectes.css',
  templateUrl: './mes-collectes.html',
})
export class MesCollectes implements OnInit {

  private readonly router = inject(Router);
  private readonly collecteService = inject(CollecteService);

  // ─── État ─────────────────────────────────────────────────────
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // ─── Données ──────────────────────────────────────────────────
  collectes = signal<Collecte[]>([]);

  // ─── Onglet actif ─────────────────────────────────────────────
  // à_venir = planifiee, en_cours = en_cours, terminées = terminee
  onglet = signal<'a_venir' | 'en_cours' | 'terminees'>('a_venir');

  // ─── Pagination ───────────────────────────────────────────────
  readonly parPage = 3;
  pageCourante = signal(1);

  // ─── Collectes filtrées par onglet ────────────────────────────
  collectesFiltrees = computed(() => {
    const statuts: Record<string, StatutCollecte[]> = {
      a_venir:   ['planifiee'],
      en_cours:  ['en_cours'],
      terminees: ['terminee', 'annulee'],
    };
    const statutsActifs = statuts[this.onglet()] ?? ['planifiee'];
    return this.collectes().filter(c => statutsActifs.includes(c.statut));
  });

  // ─── Pagination ───────────────────────────────────────────────
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.collectesFiltrees().length / this.parPage))
  );

  collectesPage = computed(() => {
    const debut = (this.pageCourante() - 1) * this.parPage;
    return this.collectesFiltrees().slice(debut, debut + this.parPage);
  });

  rangeAffichee = computed(() => {
    const total = this.collectesFiltrees().length;
    const debut = total === 0 ? 0 : (this.pageCourante() - 1) * this.parPage + 1;
    return {
      debut,
      fin: Math.min(this.pageCourante() * this.parPage, total),
    };
  });

  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  ngOnInit(): void {
    this.chargerCollectes();
  }

  private chargerCollectes(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.collecteService.listerCollectes().subscribe({
      next: (collectes) => {
        // Trie par date planifiée décroissante.
        this.collectes.set(
          collectes.sort((a, b) =>
            new Date(b.datePlanifiee).getTime() - new Date(a.datePlanifiee).getTime()
          )
        );
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger vos collectes.');
        this.chargement.set(false);
      }
    });
  }

  // Changer d'onglet.
  changerOnglet(onglet: 'a_venir' | 'en_cours' | 'terminees'): void {
    this.onglet.set(onglet);
    this.pageCourante.set(1);
  }

  // Naviguer vers le détail d'une collecte.
  voirCollecte(id: number): void {
    this.router.navigate(['/collecteur/collectes', id]);
  }

  // Naviguer vers la planification (nouvelle collecte).
  planifier(): void {
    this.router.navigate(['/collecteur/demandes']);
  }

  // Changer de page.
  allerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageCourante.set(page);
    }
  }

  // Formater date.
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short'
    });
  }

  // Formater heure.
  formaterHeure(dateIso: string): string {
    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  // Classe CSS du badge statut.
  classeStatut(statut: string): string {
    switch (statut) {
      case 'planifiee': return 'bg-orange-100 text-orange-600';
      case 'en_cours':  return 'bg-blue-100 text-blue-700';
      case 'terminee':  return 'bg-green-100 text-green-700';
      case 'annulee':   return 'bg-red-100 text-red-600';
      default:          return 'bg-gray-100 text-gray-500';
    }
  }

  // Libellé français du statut.
  libelleStatut(statut: string): string {
    const map: Record<string, string> = {
      planifiee: 'Planifiée',
      en_cours:  'En cours',
      terminee:  'Terminée',
      annulee:   'Annulée',
    };
    return map[statut] ?? statut;
  }

  // Initiales pour avatar du citoyen (depuis idDemande non disponible directement).
  initiales(nom: string | null): string {
    if (!nom) return '?';
    return nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  nomCompletCitoyen(collecte: Collecte): string {
    return [collecte.prenomCitoyen, collecte.nomCitoyen]
      .filter((nom): nom is string => !!nom?.trim())
      .join(' ') || 'Citoyen';
  }
}
