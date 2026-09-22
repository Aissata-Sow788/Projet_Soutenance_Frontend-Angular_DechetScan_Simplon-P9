import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DashboardService, DashboardStatistiques} from '../../../core/services/dashboard';


@Component({
  imports: [CommonModule],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})


export class Dashboard {

  // ============================================================
  // SERVICE
  // ============================================================

  // Service permettant de récupérer les statistiques depuis Django.
  private readonly dashboardService = inject(DashboardService);


  // ============================================================
  // ÉTAT DE LA PAGE
  // ============================================================

  // Indique si les statistiques sont en cours de chargement.
  chargement = signal(true);

  // Contient un éventuel message d'erreur.
  erreur = signal<string | null>(null);


  // ============================================================
  // STATISTIQUES
  // ============================================================

  // Nombre total de scans.
  nombreScans = signal(0);

  // Nombre d'utilisateurs actifs.
  utilisateursActifs = signal(0);

  // Nombre de points actifs.
  pointsActifs = signal(0);

  // Nombre total de déchets analysés.
  dechetsAnalyses = signal(0);

  // Nombre d'utilisateurs ayant effectué au moins un scan.
  utilisateursAyantScan = signal(0);

  // Taux de participation.
  tauxParticipation = signal(0);


  // ============================================================
  // RÉPARTITION DES DÉCHETS
  // ============================================================

  // Pourcentages calculés pour chaque catégorie.
  plastique = signal(0);

  papier = signal(0);

  carton = signal(0);

  metal = signal(0);

  verre = signal(0);

  organique = signal(0);


  // ============================================================
  // PÉRIODE DU GRAPHIQUE
  // ============================================================

  // Période sélectionnée dans le dashboard.
  periodeActive = signal('30 jours');


  // ============================================================
  // CONSTRUCTEUR
  // ============================================================

  constructor() {

    // Charge automatiquement les statistiques
    // lorsque la page Dashboard est ouverte.
    this.chargerStatistiques();
  }


  // ============================================================
  // CHARGEMENT DES STATISTIQUES
  // ============================================================

  chargerStatistiques(): void {

    // Active l'état de chargement.
    this.chargement.set(true);

    // Supprime l'ancienne erreur.
    this.erreur.set(null);


    // Appelle Django.
    this.dashboardService.getStatistiques().subscribe({

      // ========================================================
      // SUCCÈS
      // ========================================================

      next: (statistiques: DashboardStatistiques) => {

        // Nombre total de scans.
        this.nombreScans.set(
          statistiques.nombreScans
        );

        // Nombre d'utilisateurs.
        this.utilisateursActifs.set(
          statistiques.utilisateursActifs
        );

        // Nombre de points actifs.
        this.pointsActifs.set(
          statistiques.pointsActifs
        );

        // Nombre de déchets analysés.
        this.dechetsAnalyses.set(
          statistiques.dechetsAnalyses
        );

        // Nombre d'utilisateurs ayant participé.
        this.utilisateursAyantScan.set(
          statistiques.utilisateursAyantScan
        );

        // Taux de participation.
        this.tauxParticipation.set(
          statistiques.tauxParticipation
        );


        // Calcule les pourcentages de répartition.
        this.calculerRepartition(
          statistiques.repartitionDechets
        );


        // Fin du chargement.
        this.chargement.set(false);
      },


      // ========================================================
      // ERREUR
      // ========================================================

      error: (error) => {

        // Affiche l'erreur dans la console.
        console.error(
          'Erreur lors du chargement du Dashboard :',
          error
        );

        // Message affiché dans l'interface.
        this.erreur.set(
          'Impossible de récupérer les statistiques.'
        );

        // Fin du chargement.
        this.chargement.set(false);
      }

    });
  }


  // ============================================================
  // CALCUL DE LA RÉPARTITION
  // ============================================================

  calculerRepartition(
    repartition: { [categorie: string]: number }
  ): void {

    // Calcule le nombre total de détections.
    const total = Object.values(repartition)
      .reduce(
        (somme, valeur) => somme + valeur,
        0
      );


    // Évite une division par zéro.
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
    const pourcentage = (valeur: number): number => {

      return Math.round(
        (valeur / total) * 100
      );

    };


    // Récupère chaque catégorie.
    this.plastique.set(
      pourcentage(
        repartition['Plastique'] ?? 0
      )
    );

    this.papier.set(
      pourcentage(
        repartition['Papier'] ?? 0
      )
    );

    this.carton.set(
      pourcentage(
        repartition['Papier-carton'] ??
        repartition['Carton'] ??
        0
      )
    );

    this.metal.set(
      pourcentage(
        repartition['Métal'] ??
        repartition['Metal'] ??
        0
      )
    );

    this.verre.set(
      pourcentage(
        repartition['Verre'] ?? 0
      )
    );

    this.organique.set(
      pourcentage(
        repartition['Organique'] ?? 0
      )
    );
  }


  // ============================================================
  // CHANGEMENT DE PÉRIODE
  // ============================================================

  changerPeriode(periode: string): void {

    // Met à jour la période sélectionnée.
    this.periodeActive.set(periode);

    // Pour le moment, le changement de période ne modifie pas
    // encore les données du backend.
    //
    // Pour avoir réellement "7 jours", "30 jours" et "3 mois",
    // il faudra ajouter un paramètre de période à l'API Django.
  }


  // ============================================================
  // ACTUALISATION
  // ============================================================

  actualiser(): void {

    // Recharge les statistiques depuis Django.
    this.chargerStatistiques();
  }


  // ============================================================
  // EXPORT
  // ============================================================

  exporterRapport(): void {

    // Cette fonction pourra être reliée plus tard
    // à un endpoint Django générant le CSV.
    console.log('Export du rapport CSV');
  }
}
