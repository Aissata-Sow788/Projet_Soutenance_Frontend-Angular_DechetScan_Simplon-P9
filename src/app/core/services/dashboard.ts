import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


// ============================================================
// MODÈLE DES STATISTIQUES DU DASHBOARD
// ============================================================

export interface DashboardStatistiques {

  // Nombre total de scans réalisés.
  nombreScans: number;

  // Nombre total d'utilisateurs enregistrés.
  utilisateursActifs: number;

  // Nombre de points de collecte actuellement actifs.
  pointsActifs: number;

  // Nombre total de déchets détectés par l'IA.
  dechetsAnalyses: number;

  // Nombre d'utilisateurs ayant effectué au moins un scan.
  utilisateursAyantScan: number;

  // Pourcentage d'utilisateurs ayant participé.
  tauxParticipation: number;

  // Répartition des déchets par catégorie.
  repartitionDechets: {
    [categorie: string]: number;
  };
}


@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  // URL de base de l'API Django.
  private readonly baseUrl =
    'http://127.0.0.1:8000/api/';

  // Client HTTP utilisé pour appeler Django.
  private readonly http = inject(HttpClient);


  // ============================================================
  // STATISTIQUES DU DASHBOARD
  // ============================================================

  getStatistiques(): Observable<DashboardStatistiques> {

    // Appelle l'endpoint Django du tableau de bord.
    return this.http.get<DashboardStatistiques>(
      `${this.baseUrl}dashboard/statistiques/`
    );
  }
}
