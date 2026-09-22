import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {PointCollecte, PointCollecteCreation, TypeDechetPoint} from '../../shared/models/point-collecte.model';


@Injectable({ providedIn: 'root' })
export class PointCollecteService {

  private http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/';

  // Récupère tous les points de collecte
  listerPoints(): Observable<PointCollecte[]> {
    return this.http.get<PointCollecte[]>(`${this.baseUrl}points-collecte/`);
  }

  // Récupère un point précis par son id (page détail)
  obtenirPoint(idPoint: number): Observable<PointCollecte> {
    return this.http.get<PointCollecte>(`${this.baseUrl}points-collecte/${idPoint}/`);
  }

  /**
   * Récupère les types de déchets disponibles
   * dans le référentiel.
   *
   * Ces données servent à construire les cartes
   * "Plastique", "Papier", "Carton", etc.
   */
  listerTypesDechets(): Observable<TypeDechetPoint[]> {
    return this.http.get<TypeDechetPoint[]>(
      `${this.baseUrl}types/`
    );
  }

  /**
   * Crée un nouveau point de collecte.
   *
   * Le backend attend uniquement les IDs des types
   * de déchets dans "dechetsAcceptes".
   */
  creerPointCollecte(
    donnees: PointCollecteCreation
  ): Observable<PointCollecte> {
    return this.http.post<PointCollecte>(
      `${this.baseUrl}points-collecte/`,
      donnees
    );
  }

// Calcule la distance à vol d'oiseau entre deux coordonnées GPS
// grâce à la formule de Haversine.
calculerDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {

  // Rayon moyen de la Terre en kilomètres.
  const rayonTerre = 6371;

  // Différence de latitude convertie de degrés en radians.
  const dLat = (lat2 - lat1) * Math.PI / 180;

  // Différence de longitude convertie de degrés en radians.
  const dLon = (lon2 - lon1) * Math.PI / 180;

  // Première étape de la formule de Haversine.
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;

  // Calcule l'angle entre les deux points sur la surface terrestre.
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Convertit l'angle en distance réelle en kilomètres.
  return rayonTerre * c;
}
}
