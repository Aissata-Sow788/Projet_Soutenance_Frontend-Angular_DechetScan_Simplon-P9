import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Représente le conseil associé à un type de déchet.
 */
export interface ConseilTri {
  idConseil: number;
  consigne: string;
  idTypeDechet: number;
}

/**
 * Représente un type de déchet.
 */
export interface TypeDechet {
  idTypeDechet: number;
  nom: string;
  description: string;
  conseil?: ConseilTri;
}

@Injectable({
  providedIn: 'root'
})
export class ReferentielService {

  private readonly http = inject(HttpClient);

  // IMPORTANT :
  // Le "/" à la fin est obligatoire pour éviter :
  // /apitypes/ ou /apiconseils/
  private readonly apiUrl = 'http://127.0.0.1:8000/api/';

  /**
   * Récupère tous les types de déchets.
   */
  listerTypes(): Observable<TypeDechet[]> {
    return this.http.get<TypeDechet[]>(
      `${this.apiUrl}types/`
    );
  }

  /**
   * Crée un nouveau type de déchet.
   */
  creerTypeDechet(donnees: {
    nom: string;
    description: string;
  }): Observable<TypeDechet> {
    return this.http.post<TypeDechet>(
      `${this.apiUrl}types/`,
      donnees
    );
  }

  /**
   * Modifie un type de déchet existant.
   */
  modifierTypeDechet(
    idTypeDechet: number,
    donnees: {
      nom: string;
      description: string;
    }
  ): Observable<TypeDechet> {
    return this.http.patch<TypeDechet>(
      `${this.apiUrl}types/${idTypeDechet}/`,
      donnees
    );
  }

    /**
   * Supprime un type de déchet existant.
   *
   * Exemple :
   * DELETE http://127.0.0.1:8000/api/types/1/
   */
  supprimerType(idTypeDechet: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}types/${idTypeDechet}/`
    );
  }

  /**
   * Crée un nouveau conseil de tri.
   */
  creerConseil(donnees: {
    consigne: string;
    idTypeDechet: number;
  }): Observable<ConseilTri> {
    return this.http.post<ConseilTri>(
      `${this.apiUrl}conseils/`,
      donnees
    );
  }

  /**
   * Modifie un conseil de tri existant.
   */
  modifierConseil(
    idConseil: number,
    consigne: string
  ): Observable<ConseilTri> {
    return this.http.patch<ConseilTri>(
      `${this.apiUrl}conseils/${idConseil}/`,
      {
        consigne
      }
    );
  }
}
