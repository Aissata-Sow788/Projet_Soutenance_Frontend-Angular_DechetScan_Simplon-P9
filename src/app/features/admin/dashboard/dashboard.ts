import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})


export class Dashboard {

  // Nombre total de scans affiché dans la première carte.
  nombreScans = '48 920';

  // Nombre d'utilisateurs actifs affiché dans la deuxième carte.
  utilisateursActifs = '8 430';

  // Pourcentage de déchets correctement triés.
  tauxTri = '92.6%';

  // Nombre de points utilisés sur le nombre total de points.
  pointsUtilises = '78';

  // Nombre total de points disponibles.
  pointsTotal = '84';

  // Nombre de déchets utilisés dans le graphique circulaire.
  dechetsAnalyses = '42 685';

  // Pourcentage de plastique dans la répartition.
  plastique = 44;

  // Pourcentage de papier dans la répartition.
  papier = 18;

  // Pourcentage de carton dans la répartition.
  carton = 14;

  // Pourcentage de métal dans la répartition.
  metal = 11;

  // Pourcentage de verre dans la répartition.
  verre = 7;

  // Pourcentage de déchets organiques.
  organique = 4;

  // Taux de participation citoyenne.
  tauxParticipation = '67.7%';

  // Objectif trimestriel de participation.
  objectifParticipation = '65%';

  // Nombre moyen de scans par citoyen.
  scansParCitoyen = '5.8';

  // Permet de changer la période affichée dans le graphique.
  periodeActive = '30 jours';

  // Change la période active du graphique.
  changerPeriode(periode: string): void {
    // Met à jour la période sélectionnée.
    this.periodeActive = periode;
  }

  // Action appelée lorsque l'administrateur souhaite exporter le rapport.
  exporterRapport(): void {
    // Pour l'instant, cette fonction simule l'export.
    console.log('Export du rapport CSV');
  }
}

