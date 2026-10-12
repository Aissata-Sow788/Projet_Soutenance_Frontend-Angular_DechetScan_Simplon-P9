import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PrixDechet,
  PrixDechetCreation,
} from '../../shared/models/prix-dechet.model';

@Injectable({ providedIn: 'root' })
export class PrixDechetService {

  private http = inject(HttpClient);

  private readonly apiUrl = '/api/prix-dechets';

  /**
   * Récupère les tarifs visibles, éventuellement limités à un collecteur.
   */
  listerPrix(idCollecteur?: number): Observable<PrixDechet[]> {
    let params = new HttpParams();
    if (idCollecteur !== undefined) {
      params = params.set('idCollecteur', idCollecteur);
    }
    return this.http.get<PrixDechet[]>(`${this.apiUrl}/`, { params });
  }

  /**
   * Récupère le tarif d'un type de déchet précis.
   */
  obtenirPrix(id: number): Observable<PrixDechet> {
    return this.http.get<PrixDechet>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Crée un tarif global (admin) ou un tarif appartenant au collecteur connecté.
   */
  creerPrix(donnees: PrixDechetCreation): Observable<PrixDechet> {
    return this.http.post<PrixDechet>(`${this.apiUrl}/`, donnees);
  }

  /**
   * Modifie un tarif global (admin) ou un tarif appartenant au collecteur connecté.
   */
  modifierPrix(
    id: number,
    donnees: Partial<PrixDechetCreation>
  ): Observable<PrixDechet> {
    return this.http.patch<PrixDechet>(`${this.apiUrl}/${id}/`, donnees);
  }

  /**
   * Supprime un tarif global (admin) ou un tarif appartenant au collecteur connecté.
   */
  supprimerPrix(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }
}
