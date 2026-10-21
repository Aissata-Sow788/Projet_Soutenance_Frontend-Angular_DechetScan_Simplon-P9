import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ScanDechet } from '../../shared/models/scan.model';

/**
 * Panier d'un citoyen : nombre d'objets par catégorie.
 */
export interface PanierDechetApi {
  idPanier: number;
  idTypeDechet: number;
  typeDechet: {
    idTypeDechet: number;
    nom: string;
    description: string;
    conseil?: {
      idConseil: number;
      consigne: string;
      idTypeDechet: number;
    } | null;
  };
  nombreDisponible: number;
  unite: string;
  dateMiseAJour: string;
}

/** Informations du citoyen affichées dans l'administration. */
export interface CitoyenAdmin {
  id: number;
  prenom: string;
  nom: string;
  email: string;
}

/** Type de déchet retourné par l'API Django. */
export interface TypeDechetAdmin {
  idTypeDechet: number;
  nom: string;
  description: string;
  conseil?: {
    idConseil: number;
    consigne: string;
    idTypeDechet: number;
  } | null;
}

/** Détection réalisée par l'intelligence artificielle. */
export interface DetectionAdmin {
  idDetection: number;
  objet: string;
  confiance: number;
  idTypeDechet: TypeDechetAdmin | null;
}

/** Résultat de l'analyse IA d'un scan. */
export interface AnalyseAdmin {
  idAnalyse: number;
  dateAnalyse: string;
  detections: DetectionAdmin[];
}

/** Structure d'un scan pour la console d'administration. */
export interface ScanAdmin {
  idScan: number;
  dateScan: string;
  photoUrl: string;
  idUtilisateur: number | null;
  citoyen: CitoyenAdmin | null;
  analyseIA: AnalyseAdmin | null;
  nombreScans: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScanService {

  // Client HTTP pour communiquer avec le backend Django.
  private readonly http = inject(HttpClient);

  // URL de base de l'API.
  // En développement ou derrière un proxy, /api/ doit être routé
  // vers le backend Django.
  private readonly baseUrl = '/api/';

  // Conserve le dernier résultat pour les pages citoyennes.
  dernierResultat = signal<ScanDechet | null>(null);

  /**
   * Envoie une image pour analyse.
   *
   * L'intercepteur JWT ajoute automatiquement le token lorsque
   * le citoyen est connecté.
   *
   * Sans token, la requête est envoyée comme une requête anonyme.
   *
   * IMPORTANT :
   * C'est le backend Django qui doit décider si le scan doit
   * être enregistré en base de données.
   */
  envoyerImage(fichier: File): Observable<ScanDechet> {
    const formData = new FormData();

    // Le nom du champ doit correspondre au serializer Django.
    formData.append('photoUrl', fichier);

    // Ne pas définir manuellement Content-Type :
    // le navigateur gère automatiquement le multipart/form-data.
    return this.http.post<ScanDechet>(
      `${this.baseUrl}scans/`,
      formData
    );
  }

  /**
   * Récupère l'historique du citoyen connecté.
   *
   * Django doit filtrer les résultats selon l'utilisateur
   * authentifié et ne jamais retourner l'historique d'un autre.
   */
  historique(): Observable<ScanDechet[]> {
    return this.http.get<ScanDechet[]>(
      `${this.baseUrl}scans/historique/`
    );
  }

  /**
   * Récupère le détail d'un scan citoyen.
   */
  getScan(idScan: number): Observable<ScanDechet> {
    return this.http.get<ScanDechet>(
      `${this.baseUrl}scans/${idScan}/`
    );
  }

  /**
   * Récupère les paniers du citoyen authentifié.
   */
  getPaniers(): Observable<PanierDechetApi[]> {
    return this.http.get<PanierDechetApi[]>(
      `${this.baseUrl}paniers/`
    );
  }

  /**
   * Ajoute des objets à un panier de déchets.
   */
  ajouterAuPanier(
    idTypeDechet: number,
    nombreObjets = 1,
  ): Observable<PanierDechetApi> {
    return this.http.post<PanierDechetApi>(
      `${this.baseUrl}paniers/`,
      {
        idTypeDechet,
        nombreDisponible: nombreObjets,
      }
    );
  }

  /**
   * Modifie le nombre d'objets disponibles dans un panier.
   */
  modifierPanier(
    idPanier: number,
    nombreDisponible: number,
  ): Observable<PanierDechetApi> {
    return this.http.patch<PanierDechetApi>(
      `${this.baseUrl}paniers/${idPanier}/`,
      { nombreDisponible }
    );
  }

  /**
   * Récupère tous les scans accessibles à l'administration.
   * L'endpoint Django doit être protégé par les permissions admin.
   */
  tousLesScans(): Observable<ScanDechet[]> {
    return this.http.get<ScanDechet[]>(
      `${this.baseUrl}scans/admin/`
    );
  }

  /**
   * Récupère le détail administratif d'un scan.
   */
  detailAdmin(idScan: number): Observable<ScanAdmin> {
    return this.http.get<ScanAdmin>(
      `${this.baseUrl}scans/admin/${idScan}/`
    );
  }
}
