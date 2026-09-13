import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { PointCollecte } from '../../shared/models/point-collecte.model';

// Points de collecte simulés, positionnés sur des quartiers réels de Dakar
const POINTS_MOCK: PointCollecte[] = [
  {
    idPoint: 1,
    nom: 'Point Éco - Sandaga',
    ville: 'Dakar',
    latitude: 14.6710,
    longitude: -17.4380,
    statut: 'actif',
    heureOuverture: '07:00',
    heureFermeture: '18:00',
    dechetsAcceptes: [
      { idType: 1, nom: 'Plastique (PET/HDPE)' },
      { idType: 3, nom: 'Métal & Canettes' },
      { idType: 4, nom: 'Carton' }
    ],
    icone: 'recyclage',
  },
  {
    idPoint: 2,
    nom: 'Borne Tri Place de l\'Indépendance',
    ville: 'Dakar',
    latitude: 14.6725,
    longitude: -17.4295,
    statut: 'actif',
    heureOuverture: '06:00',
    heureFermeture: '20:00',
    dechetsAcceptes: [
      { idType: 5, nom: 'Organique/Compost' },
      { idType: 2, nom: 'Verre' }
    ],
    icone: 'poubelle',
  },
  {
    idPoint: 3,
    nom: 'Médina Collecte Solidaire',
    ville: 'Dakar',
    latitude: 14.6795,
    longitude: -17.4460,
    statut: 'inactif',
    heureOuverture: '08:00',
    heureFermeture: '17:00',
    dechetsAcceptes: [
      { idType: 1, nom: 'Tous plastiques' }
    ],
    icone: 'ecran',
  },
  {
    idPoint: 4,
    nom: 'Point Almadies',
    ville: 'Dakar',
    latitude: 14.7440,
    longitude: -17.5150,
    statut: 'inactif',
    heureOuverture: '07:00',
    heureFermeture: '19:00',
    dechetsAcceptes: [
      { idType: 1, nom: 'Plastique' },
      { idType: 3, nom: 'Métal' }
    ],
    icone: 'maison',
  }
];

@Injectable({ providedIn: 'root' })
export class PointCollecteService {

  // Liste de tous les points (à remplacer par this.http.get<PointCollecte[]>('/api/points-collecte'))
  listerPoints(): Observable<PointCollecte[]> {
    return of(POINTS_MOCK).pipe(delay(500));
  }

  // Un point précis par son id (pour la page détail)
  obtenirPoint(idPoint: number): Observable<PointCollecte | undefined> {
    const point = POINTS_MOCK.find(p => p.idPoint === idPoint);
    return of(point).pipe(delay(300));
  }

  // Calcule la distance à vol d'oiseau entre deux coordonnées GPS (formule de Haversine)
  calculerDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const rayonTerre = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return rayonTerre * c;
  }
}
