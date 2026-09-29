import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PrixDechet,
  PrixDechetCreation,
} from '../../shared/models/prix-dechet.model';

@Injectable({ providedIn: 'root' })
export class PrixDechetService {

  private http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000/api/prix-dechets';

  /**
   * Récupère tous les tarifs d'achat des déchets.
   */
  listerPrix(): Observable<PrixDechet[]> {
    return this.http.get<PrixDechet[]>(`${this.apiUrl}/`);
  }

  /**
   * Récupère le tarif d'un type de déchet précis.
   */
  obtenirPrix(id: number): Observable<PrixDechet> {
    return this.http.get<PrixDechet>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Crée un nouveau tarif (admin uniquement).
   */
  creerPrix(donnees: PrixDechetCreation): Observable<PrixDechet> {
    return this.http.post<PrixDechet>(`${this.apiUrl}/`, donnees);
  }

  /**
   * Modifie un tarif existant (admin uniquement).
   */
  modifierPrix(
    id: number,
    donnees: Partial<PrixDechetCreation>
  ): Observable<PrixDechet> {
    return this.http.patch<PrixDechet>(`${this.apiUrl}/${id}/`, donnees);
  }

  /**
   * Supprime un tarif (admin uniquement).
   */
  supprimerPrix(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }
}
