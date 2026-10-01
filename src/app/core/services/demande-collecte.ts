import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DemandeCollecte,
  DemandeCollecteCreation,
} from '../../shared/models/demande-collecte.model';

@Injectable({ providedIn: 'root' })
export class DemandeCollecteService {

  private http = inject(HttpClient);

  // URL de base de l'API des demandes de collecte.
  private readonly apiUrl = '/api/demandes';

  /**
   * Récupère les demandes de l'utilisateur connecté.
   * Un admin reçoit toutes les demandes.
   * Un citoyen reçoit uniquement ses propres demandes.
   */
  listerDemandes(): Observable<DemandeCollecte[]> {
    return this.http.get<DemandeCollecte[]>(`${this.apiUrl}/`);
  }

  /**
   * Récupère le détail d'une demande précise.
   */
  obtenirDemande(id: number): Observable<DemandeCollecte> {
    return this.http.get<DemandeCollecte>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Soumet une nouvelle demande de collecte.
   * prixPropose est optionnel : le citoyen peut demander
   * un simple ramassage sans vouloir vendre ses déchets.
   * latitude et longitude sont optionnels : fournis automatiquement
   * par le navigateur si la géolocalisation est autorisée.
   */
  creerDemande(
    donnees: DemandeCollecteCreation
  ): Observable<DemandeCollecte> {
    return this.http.post<DemandeCollecte>(`${this.apiUrl}/`, donnees);
  }

  /**
   * Le collecteur connecté accepte une demande de collecte.
   * Appelle le nouvel endpoint /accepter/ qui est atomique :
   * - Vérifie que le collecteur est validé (403 sinon)
   * - Pose un verrou sur la ligne (select_for_update)
   * - Retourne 409 si un autre collecteur a déjà accepté
   * Aucun corps n'est nécessaire — seul l'id suffit.
   */
  accepterDemande(id: number): Observable<DemandeCollecte> {
    return this.http.patch<DemandeCollecte>(
      `${this.apiUrl}/${id}/accepter/`,
      {}
    );
  }

  /**
   * Refuse une demande uniquement pour le collecteur connecté.
   * Elle reste disponible pour les autres collecteurs.
   */
  refuserDemande(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/refuser/`, {});
  }

  /**
   * Change le statut d'une demande (admin uniquement).
   * Pour accepter une demande, utiliser accepterDemande() à la place.
   */
  changerStatut(
    id: number,
    statut: string
  ): Observable<DemandeCollecte> {
    return this.http.patch<DemandeCollecte>(
      `${this.apiUrl}/${id}/statut/`,
      { statut }
    );
  }

  /**
   * Supprime une demande (admin uniquement).
   */
  supprimerDemande(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Récupère la position GPS du navigateur.
   * Retourne une Promise résolue avec {latitude, longitude}
   * ou rejetée si la géolocalisation est refusée ou indisponible.
   * À appeler dans le composant du formulaire de demande.
   */
  obtenirPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // Le navigateur ne supporte pas la géolocalisation.
        reject('Géolocalisation non supportée par ce navigateur.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // L'utilisateur a refusé la géolocalisation.
          reject('Géolocalisation refusée par l\'utilisateur.');
        }
      );
    });
  }
}
