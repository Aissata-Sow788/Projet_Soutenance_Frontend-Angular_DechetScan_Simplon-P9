import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, DashboardStatistiques, PointEvolution } from '../../../core/services/dashboard';


@Component({
  imports: [CommonModule],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {

  // ============================================================
  // SERVICE
  // ============================================================

  // Service qui récupère les statistiques depuis Django.
  private readonly dashboardService = inject(DashboardService);


  // ============================================================
  // ÉTAT DE LA PAGE
  // ============================================================

  // True pendant le chargement des statistiques.
  chargement = signal(true);

  // Message d'erreur éventuel.
  erreur = signal<string | null>(null);


  // ============================================================
  // GRAPHIQUE D'ÉVOLUTION
  // ============================================================

  // Série brute reçue de Django.
  evolution = signal<PointEvolution[]>([]);

  // Coordonnées SVG de chaque point (viewBox 700x245).
  points = computed(() => {
    const data = this.evolution();
    const max = Math.max(...data.map(d => d.scans), 1); // évite /0
    return data.map((d, i) => ({
      ...d,
      x: data.length > 1 ? (i / (data.length - 1)) * 700 : 350,
      y: 215 - (d.scans / max) * 180, // plus de scans = plus haut
    }));
  });

  // Courbe lissée (Bézier entre points voisins).
  ligne = computed(() => {
    const p = this.points();
    if (!p.length) return '';
    let d = `M${p[0].x} ${p[0].y}`;
    for (let i = 1; i < p.length; i++) {
      const mx = (p[i - 1].x + p[i].x) / 2; // point de contrôle au milieu
      d += ` C${mx} ${p[i - 1].y} ${mx} ${p[i].y} ${p[i].x} ${p[i].y}`;
    }
    return d;
  });

  // Zone sous la courbe : on ferme le tracé en bas.
  aire = computed(() => {
    const p = this.points();
    if (!p.length) return '';
    return `${this.ligne()} L${p[p.length - 1].x} 245 L${p[0].x} 245 Z`;
  });


  // ============================================================
  // STATISTIQUES
  // ============================================================

  nombreScans = signal(0);
  utilisateursActifs = signal(0);
  pointsActifs = signal(0);
  dechetsAnalyses = signal(0);
  utilisateursAyantScan = signal(0);
  tauxParticipation = signal(0);


  // ============================================================
  // RÉPARTITION DES DÉCHETS (en %)
  // ============================================================

  plastique = signal(0);
  papier = signal(0);
  carton = signal(0);
  metal = signal(0);
  verre = signal(0);
  organique = signal(0);


  // ============================================================
  // PÉRIODE DU GRAPHIQUE
  // ============================================================

  // Période sélectionnée.
  periodeActive = signal('30 jours');


  // ============================================================
  // CYCLE DE VIE
  // ============================================================

  // Appelé après l'init : le token JWT est déjà disponible.
  ngOnInit(): void {
    this.chargerStatistiques();
  }


  // ============================================================
  // CHARGEMENT DES STATISTIQUES
  // ============================================================

  chargerStatistiques(): void {

    this.chargement.set(true);
    this.erreur.set(null);

    this.dashboardService.getStatistiques().subscribe({

      next: (statistiques: DashboardStatistiques) => {

        this.nombreScans.set(statistiques.nombreScans);
        this.utilisateursActifs.set(statistiques.utilisateursActifs);
        this.pointsActifs.set(statistiques.pointsActifs);
        this.dechetsAnalyses.set(statistiques.dechetsAnalyses);
        this.utilisateursAyantScan.set(statistiques.utilisateursAyantScan);
        this.tauxParticipation.set(statistiques.tauxParticipation);

        // TEMPORAIRE : fausses données pour tester le dessin.
        // Remplacer par : this.evolution.set(statistiques.evolutionScans ?? []);
        this.evolution.set([
          { label: 'Sem 1', scans: 12 },
          { label: 'Sem 2', scans: 30 },
          { label: 'Sem 3', scans: 22 },
          { label: 'Sem 4', scans: 45 },
        ]);

        this.calculerRepartition(statistiques.repartitionDechets);

        this.chargement.set(false);
      },

      error: (error) => {
        console.error('Erreur lors du chargement du Dashboard :', error);
        this.erreur.set('Impossible de récupérer les statistiques.');
        this.chargement.set(false);
      }

    });
  }


  // ============================================================
  // CALCUL DE LA RÉPARTITION
  // ============================================================

  calculerRepartition(repartition: { [categorie: string]: number }): void {

    // Total des détections.
    const total = Object.values(repartition)
      .reduce((somme, valeur) => somme + valeur, 0);

    // Évite la division par zéro.
    if (total === 0) {
      this.plastique.set(0);
      this.papier.set(0);
      this.carton.set(0);
      this.metal.set(0);
      this.verre.set(0);
      this.organique.set(0);
      return;
    }

    // Convertit une quantité en pourcentage.
    const pourcentage = (valeur: number): number =>
      Math.round((valeur / total) * 100);

    this.plastique.set(pourcentage(repartition['Plastique'] ?? 0));
    this.papier.set(pourcentage(repartition['Papier'] ?? 0));
    this.carton.set(pourcentage(repartition['Papier-carton'] ?? repartition['Carton'] ?? 0));
    this.metal.set(pourcentage(repartition['Métal'] ?? repartition['Metal'] ?? 0));
    this.verre.set(pourcentage(repartition['Verre'] ?? 0));
    this.organique.set(pourcentage(repartition['Organique'] ?? 0));
  }


  // ============================================================
  // CHANGEMENT DE PÉRIODE
  // ============================================================

  changerPeriode(periode: string): void {
    this.periodeActive.set(periode);

    // TODO : envoyer la période à Django pour filtrer les données.
  }


  // ============================================================
  // ACTUALISATION
  // ============================================================

  actualiser(): void {
    this.chargerStatistiques();
  }


  // ============================================================
  // EXPORT
  // ============================================================

  exporterRapport(): void {
    // TODO : relier à un endpoint Django qui génère le CSV.
    console.log('Export du rapport CSV');
  }
}
