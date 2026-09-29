import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Collecte,
  CollecteCreation,
  CollecteStatutUpdate,
} from '../../shared/models/collecte.model';

@Injectable({ providedIn: 'root' })
export class CollecteService {

  private http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000/api/collectes';

  /**
   * Récupère les collectes.
   * Admin : toutes les collectes.
   * Collecteur connecté : uniquement ses propres collectes.
   */
  listerCollectes(): Observable<Collecte[]> {
    return this.http.get<Collecte[]>(`${this.apiUrl}/`);
  }

  /**
   * Récupère le détail d'une collecte précise.
   */
  obtenirCollecte(id: number): Observable<Collecte> {
    return this.http.get<Collecte>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Crée une nouvelle collecte planifiée.
   * idCollecteur est affecté automatiquement côté Django
   * depuis le profil collecteur de l'utilisateur connecté.
   */
  creerCollecte(donnees: CollecteCreation): Observable<Collecte> {
    return this.http.post<Collecte>(`${this.apiUrl}/`, donnees);
  }

  /**
   * Met à jour le statut d'une collecte.
   * Quand statut = 'terminee', fournir aussi
   * dateRealisation et quantiteRecuperee.
   */
  changerStatut(
    id: number,
    donnees: CollecteStatutUpdate
  ): Observable<Collecte> {
    return this.http.patch<Collecte>(
      `${this.apiUrl}/${id}/statut/`,
      donnees
    );
  }

  /**
   * Supprime une collecte (admin uniquement).
   */
  supprimerCollecte(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }
}
