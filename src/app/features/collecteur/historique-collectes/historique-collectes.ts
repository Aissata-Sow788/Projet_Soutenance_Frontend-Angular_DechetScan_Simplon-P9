import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollecteService } from '../../../core/services/collecte';
import { Collecte } from '../../../shared/models/collecte.model';

@Component({
  imports: [CommonModule],
  selector: 'app-historique-collectes',
  styleUrl: './historique-collectes.css',
  templateUrl: './historique-collectes.html',
})
export class HistoriqueCollectes implements OnInit {

  private readonly collecteService = inject(CollecteService);

  // ─── État ─────────────────────────────────────────────────────
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // ─── Données : uniquement les collectes terminées ─────────────
  collectes = signal<Collecte[]>([]);

  // ─── Filtres ──────────────────────────────────────────────────
  recherche = signal('');
  filtrePeriode = signal('tout');

  // ─── Pagination ───────────────────────────────────────────────
  readonly parPage = 8;
  pageCourante = signal(1);

  // ─── Collectes filtrées ───────────────────────────────────────
  collectesFiltrees = computed(() => {
    let resultat = [...this.collectes()];

    // Filtre par période.
    if (this.filtrePeriode() !== 'tout') {
      const maintenant = new Date();
      const limite = new Date();

      if (this.filtrePeriode() === 'semaine') {
        limite.setDate(maintenant.getDate() - 7);
      } else if (this.filtrePeriode() === 'mois') {
        limite.setMonth(maintenant.getMonth() - 1);
      } else if (this.filtrePeriode() === 'trimestre') {
        limite.setMonth(maintenant.getMonth() - 3);
      }

      resultat = resultat.filter(c => {
        const date = new Date(c.dateRealisation ?? c.datePlanifiee);
        return date >= limite;
      });
    }

    // Filtre par recherche (sur le nom du point ou la demande).
    const texte = this.recherche().trim().toLowerCase();
    if (texte) {
      resultat = resultat.filter(c =>
        (c.nomPoint ?? '').toLowerCase().includes(texte) ||
        (c.nomCollecteur ?? '').toLowerCase().includes(texte)
      );
    }

    return resultat;
  });

  // ─── Total pages ──────────────────────────────────────────────
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.collectesFiltrees().length / this.parPage))
  );

  collectesPage = computed(() => {
    const debut = (this.pageCourante() - 1) * this.parPage;
    return this.collectesFiltrees().slice(debut, debut + this.parPage);
  });

  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // Nombre total de collectes réalisées.
  totalTerminees = computed(() => this.collectes().length);

  ngOnInit(): void {
    this.chargerHistorique();
  }

  private chargerHistorique(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.collecteService.listerCollectes().subscribe({
      next: (collectes) => {
        // Garde uniquement les collectes terminées, triées par date réelle décroissante.
        const terminees = collectes
          .filter(c => c.statut === 'terminee')
          .sort((a, b) =>
            new Date(b.dateRealisation ?? b.datePlanifiee).getTime() -
            new Date(a.dateRealisation ?? a.datePlanifiee).getTime()
          );
        this.collectes.set(terminees);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger l\'historique.');
        this.chargement.set(false);
      }
    });
  }

  // Formater date.
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // Changer de page.
  allerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageCourante.set(page);
    }
  }

  // Gestion de la recherche.
  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
    this.pageCourante.set(1);
  }

  // Gestion du filtre période.
  onFiltrePeriode(event: Event): void {
    this.filtrePeriode.set((event.target as HTMLSelectElement).value);
    this.pageCourante.set(1);
  }

  // Initiales pour avatar.
  initiales(nom: string | null): string {
    if (!nom) return '?';
    return nom.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
