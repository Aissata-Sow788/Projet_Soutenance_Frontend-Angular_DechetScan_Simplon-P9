import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ScanDechet } from '../../shared/models/scan.model';

/**
 * Informations du citoyen associées à un scan côté administration.
 */
export interface CitoyenAdmin {
  id: number;
  prenom: string;
  nom: string;
  email: string;
}

/**
 * Type de déchet retourné par Django.
 */
export interface TypeDechetAdmin {
  idTypeDechet: number;
  nom: string;
  description: string;

  // Conseil de tri associé à ce type de déchet.
  conseil?: {
    idConseil: number;
    consigne: string;
    idTypeDechet: number;
  } | null;
}

/**
 * Détection effectuée par l'IA.
 */
export interface DetectionAdmin {
  idDetection: number;
  objet: string;
  confiance: number;
  idTypeDechet: TypeDechetAdmin | null;
}

/**
 * Analyse IA complète d'un scan.
 */
export interface AnalyseAdmin {
  idAnalyse: number;
  dateAnalyse: string;
  detections: DetectionAdmin[];
}

/**
 * Structure d'un scan retourné par l'API
 * pour la console d'administration.
 */
export interface ScanAdmin {
  idScan: number;
  dateScan: string;
  photoUrl: string;
  idUtilisateur: number | null;
  citoyen: CitoyenAdmin | null;
  analyseIA: AnalyseAdmin | null;
  // Nombre total de scans réalisés par cet utilisateur.
  // Pour un scan anonyme, cette valeur sera 1.
  nombreScans: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScanService {

  // Client HTTP utilisé pour communiquer avec Django.
  private http = inject(HttpClient);

  // URL de base de l'API Django.
  private readonly baseUrl = 'http://127.0.0.1:8000/api/';

  // Conserve le dernier résultat d'un scan côté application citoyen.
  dernierResultat = signal<ScanDechet | null>(null);

  /**
   * Envoie une photo à Django.
   */
  envoyerImage(fichier: File): Observable<ScanDechet> {

    const formData = new FormData();

    // Le nom doit correspondre au champ du serializer Django.
    formData.append('photoUrl', fichier);

    // Django enregistre la photo puis lance l'analyse IA.
    return this.http.post<ScanDechet>(
      `${this.baseUrl}scans/`,
      formData
    );
  }

  /**
   * Récupère l'historique des scans du citoyen connecté.
   */
  historique(): Observable<ScanDechet[]> {

    return this.http.get<ScanDechet[]>(
      `${this.baseUrl}scans/historique/`
    );
  }

  /**
   * Récupère un scan précis côté citoyen.
   */
  getScan(idScan: number): Observable<ScanDechet> {

    return this.http.get<ScanDechet>(
      `${this.baseUrl}scans/${idScan}/`
    );
  }

  /**
   * Récupère tous les scans pour la console administrateur.
   *
   * Cette méthode correspond à :
   * GET /api/scans/admin/
   */
  tousLesScans(): Observable<ScanDechet[]> {

    return this.http.get<ScanDechet[]>(
      `${this.baseUrl}scans/admin/`
    );
  }

  /**
   * Récupère le détail d'un scan pour l'administration.
   *
   * Cette méthode nécessite que Django possède
   * l'endpoint :
   * GET /api/scans/admin/<idScan>/
   */
  detailAdmin(idScan: number): Observable<ScanAdmin> {

    return this.http.get<ScanAdmin>(
      `${this.baseUrl}scans/admin/${idScan}/`
    );
  }
}
