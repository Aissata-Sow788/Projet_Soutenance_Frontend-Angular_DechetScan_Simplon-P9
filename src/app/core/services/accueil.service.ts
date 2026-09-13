import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import {
  StatistiquesAccueil,
  SolutionAccueil,
  DefiAccueil
} from '../../shared/models/accueil.model';

@Injectable({
  providedIn: 'root'
})
export class AccueilService {

  // Statistiques temporaires
  private readonly statistiquesMock: StatistiquesAccueil = {
    scans: '128k+',
    citoyens: '15.2k'
  };

  // Solutions affichées sur l'accueil
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

  // Défi affiché sur l'accueil
  private readonly defiMock: DefiAccueil = {
    titre: 'Défi Dakar Propre 2025',
    description: 'Rejoignez 840 volontaires ce samedi'
  };

  // Récupère les statistiques
  getStatistiques(): Observable<StatistiquesAccueil> {
    return of(this.statistiquesMock).pipe(
      delay(300)
    );
  }

  // Récupère les solutions
  getSolutions(): Observable<SolutionAccueil[]> {
    return of(this.solutionsMock).pipe(
      delay(300)
    );
  }

  // Récupère le défi
  getDefi(): Observable<DefiAccueil> {
    return of(this.defiMock).pipe(
      delay(300)
    );
  }
}
