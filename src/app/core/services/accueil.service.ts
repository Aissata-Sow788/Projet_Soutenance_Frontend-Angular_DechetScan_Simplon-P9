import { Injectable, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import {
  StatistiquesAccueil,
  SolutionAccueil,
  DefiAccueil
} from '../../shared/models/accueil.model';

@Injectable({
  providedIn: 'root'
})
export class AccueilService {

  private readonly http = inject(HttpClient);

  // URL de l'endpoint public des statistiques de l'accueil.
  // Accessible sans token JWT — données inoffensives.
  private readonly urlStatsPublic =
    'http://127.0.0.1:8000/api/stats/accueil/';

  // Solutions affichées sur l'accueil (statiques).
  private readonly solutionsMock: SolutionAccueil[] = [
    {
      titre: 'Scan intelligent',
      description:
        'Identification ultra-précise des matériaux plastiques, canettes et bio-déchets via votre caméra.',
      badge: 'IA Vision',
      icone: 'bot'
    },
    {
      titre: 'Conseils de tri',
      description:
        'Des gestes simples et pédagogiques adaptés aux filières de recyclage locales au Sénégal.',
      badge: 'Guide',
      icone: 'check-list'
    },
    {
      titre: 'Points de collecte',
      description:
        'Trouvez instantanément les bacs de recyclage, déchetteries et partenaires proches de vous.',
      badge: 'Géo',
      icone: 'send'
    }
  ];

  // Défi affiché sur l'accueil (statique).
  private readonly defiMock: DefiAccueil = {
    titre: 'Défi Dakar Propre 2025',
    description: 'Rejoignez 840 volontaires ce samedi'
  };

  /**
   * Récupère les statistiques réelles depuis l'endpoint PUBLIC Django.
   * GET /api/stats/accueil/ — aucun token JWT requis.
   * Accessible aux visiteurs non connectés sur la page d'accueil.
   */
  getStatistiques(): Observable<StatistiquesAccueil> {
    return this.http.get<{
      nombreScans: number;
      nombreUtilisateurs: number;
    }>(this.urlStatsPublic).pipe(
      map(data => ({
        scans:    data.nombreScans,
        citoyens: data.nombreUtilisateurs,
      }))
    );
  }

  // Récupère les solutions (statiques).
  getSolutions(): Observable<SolutionAccueil[]> {
    return of(this.solutionsMock);
  }

  // Récupère le défi (statique).
  getDefi(): Observable<DefiAccueil> {
    return of(this.defiMock);
  }
}
