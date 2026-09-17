import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PointCollecte } from '../../shared/models/point-collecte.model';

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

  // Distance à vol d'oiseau entre deux coordonnées GPS (formule de Haversine), calcul local
  calculerDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const rayonTerre = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return rayonTerre * c;
  }
}
