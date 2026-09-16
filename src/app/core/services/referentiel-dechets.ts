// Importe Injectable pour rendre le service disponible dans toute l'application.
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

// Importe delay pour un petit temps de réponse réseau.
import { delay } from 'rxjs/operators';
import { TypeDechet } from '../../shared/models/type-dechet.model';
// HttpClient pour communiquer avec Django.
import { HttpClient } from '@angular/common/http'


@Injectable({
  // Rend le service disponible dans toute l'application.
  providedIn: 'root'
})
export class ReferentielDechetsService {

  private readonly baseUrl = 'http://127.0.0.1:8000/api';

  // Permet d'effectuer les requêtes HTTP vers Django.
  private readonly httpurl = inject(HttpClient);

  // Retourne la liste des types de déchets.
  // Plus tard, cette méthode pourra utiliser HttpClient avec Django.
  listerTypes(): Observable<TypeDechet[]> {

    // Retourne les données mockées avec un délai simulé.
    return this.httpurl.get<TypeDechet[]>(`${this.baseUrl}/types/`);
  }

  // Retourne un type de déchet précis grâce à son identifiant.
  obtenirType(idType: number): Observable<TypeDechet> {
    // Django attend l'identifiant directement dans l'URL :
    // GET /api/types/1/, GET /api/types/2/, etc.
    return this.httpurl.get<TypeDechet>(`${this.baseUrl}/types/${idType}/`);
  }

    // Supprime un type de déchet.
  supprimerType(idType: number): Observable<void> {

    // Appelle DELETE /api/types/{id}/.
    return this.httpurl.delete<void>(`${this.baseUrl}/types/${idType}/`);
  }

}
