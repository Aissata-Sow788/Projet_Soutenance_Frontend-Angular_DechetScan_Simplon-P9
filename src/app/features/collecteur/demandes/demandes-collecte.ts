import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-demandes-collecte',
  styleUrl: './demandes-collecte.css',
  templateUrl: './demandes-collecte.html',
})
export class DemandesCollecte implements OnInit {

  private readonly router = inject(Router);
  private readonly demandeService = inject(DemandeCollecteService);

  // ─── État ─────────────────────────────────────────────────────
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // ─── Données brutes ───────────────────────────────────────────
  demandes = signal<DemandeCollecte[]>([]);

  // ─── Filtres ──────────────────────────────────────────────────
  recherche = signal('');
  filtreStatut = signal('');
  filtreZone = signal('');

  // ─── Pagination ───────────────────────────────────────────────
  readonly parPage = 6;
  pageCourante = signal(1);

  // ─── Demandes filtrées ────────────────────────────────────────
  demandesFiltrees = computed(() => {
    let resultat = [...this.demandes()];

    // Filtre par recherche (citoyen ou type de déchet).
    const texte = this.recherche().trim().toLowerCase();
    if (texte) {
      resultat = resultat.filter(d =>
        (d.prenomUtilisateur + ' ' + d.nomUtilisateur).toLowerCase().includes(texte) ||
        d.typeDechet?.nom.toLowerCase().includes(texte) ||
        d.quartier.toLowerCase().includes(texte)
      );
    }

    // Filtre par statut.
    if (this.filtreStatut()) {
      resultat = resultat.filter(d => d.statut === this.filtreStatut());
    }

    // Filtre par zone.
    if (this.filtreZone()) {
      resultat = resultat.filter(d =>
        d.quartier.toLowerCase().includes(this.filtreZone().toLowerCase())
      );
    }

    return resultat;
  });

  // ─── Total pages ──────────────────────────────────────────────
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.demandesFiltrees().length / this.parPage))
  );

  // ─── Demandes de la page courante ─────────────────────────────
  demandesPage = computed(() => {
    const debut = (this.pageCourante() - 1) * this.parPage;
    return this.demandesFiltrees().slice(debut, debut + this.parPage);
  });

  // ─── Pages pour la pagination ─────────────────────────────────
  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // Expose Math pour les calculs dans le template.
  readonly Math = Math;

  ngOnInit(): void {
    this.chargerDemandes();
  }

  private chargerDemandes(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.demandeService.listerDemandes().subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les demandes.');
        this.chargement.set(false);
      }
    });
  }

  // Formater date en "23 sept. 2026"
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // Classe CSS selon statut
  classeStatut(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'bg-orange-100 text-orange-600';
      case 'acceptee':   return 'bg-green-100 text-green-700';
      case 'en_cours':   return 'bg-blue-100 text-blue-700';
      case 'terminee':   return 'bg-gray-100 text-gray-600';
      case 'annulee':    return 'bg-red-100 text-red-600';
      default:           return 'bg-gray-100 text-gray-500';
    }
  }

  // Libellé français du statut
  libelleStatut(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'EN ATTENTE',
      acceptee:   'ACCEPTÉE',
      en_cours:   'EN COURS',
      terminee:   'TERMINÉE',
      annulee:    'REFUSÉE',
    };
    return map[statut] ?? statut.toUpperCase();
  }

  // Initiales du citoyen pour l'avatar
  initiales(prenom: string, nom: string): string {
    return ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase();
  }

  // Navigue vers le détail d'une demande
  voirDemande(id: number): void {
    this.router.navigate(['/collecteur/demandes', id]);
  }

  // Gestion de la recherche
  onRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
    this.pageCourante.set(1);
  }

  // Changement de filtre statut
  onFiltreStatut(event: Event): void {
    this.filtreStatut.set((event.target as HTMLSelectElement).value);
    this.pageCourante.set(1);
  }

  // Changement de filtre zone
  onFiltreZone(event: Event): void {
    this.filtreZone.set((event.target as HTMLSelectElement).value);
    this.pageCourante.set(1);
  }

  // Changer de page
  allerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageCourante.set(page);
    }
  }
}
