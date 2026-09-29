import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { CollecteService } from '../../../core/services/collecte';
import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';
import { Collecte } from '../../../shared/models/collecte.model';

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-dashboard-collecteur',
  styleUrl: './dashboard-collecteur.css',
  templateUrl: './dashboard-collecteur.html',
})
export class DashboardCollecteur implements OnInit {

  private readonly router = inject(Router);
  private readonly demandeService = inject(DemandeCollecteService);
  private readonly collecteService = inject(CollecteService);

  // ─── État de chargement ───────────────────────────────────────
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // ─── Données ──────────────────────────────────────────────────

  // Toutes les demandes disponibles.
  demandes = signal<DemandeCollecte[]>([]);

  // Toutes les collectes du collecteur connecté.
  collectes = signal<Collecte[]>([]);

  // ─── Statistiques calculées ───────────────────────────────────

  // Nombre de nouvelles demandes en attente.
  nombreNouvellesDemandes = computed(() =>
    this.demandes().filter(d => d.statut === 'en_attente').length
  );

  // Nombre de collectes planifiées à venir.
  collectesAVenir = computed(() =>
    this.collectes().filter(c => c.statut === 'planifiee').length
  );

  // Nombre de collectes terminées.
  collectesTerminees = computed(() =>
    this.collectes().filter(c => c.statut === 'terminee').length
  );

  // Les 4 demandes les plus récentes pour le tableau du dashboard.
  demandesRecentes = computed(() =>
    this.demandes()
      .slice()
      .sort((a, b) =>
        new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime()
      )
      .slice(0, 4)
  );

  // Prochaine collecte planifiée.
  prochaineCollecte = computed(() =>
    this.collectes()
      .filter(c => c.statut === 'planifiee')
      .sort((a, b) =>
        new Date(a.datePlanifiee).getTime() - new Date(b.datePlanifiee).getTime()
      )[0] ?? null
  );

  // Objectif mensuel : pourcentage basé sur collectes terminées / 180 kg objectif.
  objectifMensuel = computed(() => {
    const terminées = this.collectes().filter(c => c.statut === 'terminee');
    const totalKg = terminées.reduce((sum, c) => sum + (c.quantiteRecuperee ?? 0), 0);
    // Objectif fixé à 500 kg par mois.
    const objectifKg = 500;
    return Math.min(Math.round((totalKg / objectifKg) * 100), 100);
  });

  // Kg restants pour atteindre l'objectif.
  kgRestants = computed(() => {
    const terminées = this.collectes().filter(c => c.statut === 'terminee');
    const totalKg = terminées.reduce((sum, c) => sum + (c.quantiteRecuperee ?? 0), 0);
    return Math.max(500 - totalKg, 0);
  });

  ngOnInit(): void {
    this.chargerDonnees();
  }

  private chargerDonnees(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    // Charge les demandes disponibles.
    this.demandeService.listerDemandes().subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);

        // Charge ensuite les collectes du collecteur.
        this.collecteService.listerCollectes().subscribe({
          next: (collectes) => {
            this.collectes.set(collectes);
            this.chargement.set(false);
          },
          error: () => {
            // Les collectes peuvent être vides si pas encore de profil collecteur.
            this.collectes.set([]);
            this.chargement.set(false);
          }
        });
      },
      error: () => {
        this.erreur.set('Impossible de charger les données du dashboard.');
        this.chargement.set(false);
      }
    });
  }

  // Formate une date ISO en "12 Oct."
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  // Formate une date ISO en "Demain, 14 Oct à 09:30"
  formaterDateHeure(dateIso: string): string {
    const date = new Date(dateIso);
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);

    const estDemain =
      date.getDate() === demain.getDate() &&
      date.getMonth() === demain.getMonth();

    const heure = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (estDemain) {
      return `Demain, ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${heure}`;
    }

    return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${heure}`;
  }

  // Retourne la classe CSS de couleur selon le statut d'une demande.
  classeStatut(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'bg-orange-100 text-orange-600';
      case 'acceptee':   return 'bg-green-100 text-green-700';
      case 'en_cours':   return 'bg-blue-100 text-blue-700';
      case 'terminee':   return 'bg-gray-100 text-gray-600';
      case 'annulee':    return 'bg-red-100 text-red-600';
      default:           return 'bg-gray-100 text-gray-600';
    }
  }

  // Retourne le libellé français du statut.
  libelleStatut(statut: string): string {
    switch (statut) {
      case 'en_attente': return 'EN ATTENTE';
      case 'acceptee':   return 'ACCEPTÉE';
      case 'en_cours':   return 'EN COURS';
      case 'terminee':   return 'TERMINÉE';
      case 'annulee':    return 'REFUSÉE';
      default:           return statut.toUpperCase();
    }
  }

  // Navigue vers la page "Nouvelle collecte".
  nouvelleCollecte(): void {
    this.router.navigate(['/collecteur/mes-collectes']);
  }

  // Navigue vers la liste complète des demandes.
  voirToutesDemandes(): void {
    this.router.navigate(['/collecteur/demandes']);
  }

  // Navigue vers le détail d'une demande.
  voirDemande(id: number): void {
    this.router.navigate(['/collecteur/demandes', id]);
  }
}
