import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

// Réponse brute renvoyée par l'API Nominatim (on ne garde que ce qui nous intéresse)
interface NominatimReponse {
  display_name: string;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {

  private http = inject(HttpClient);
  private readonly URL_BASE = 'https://nominatim.openstreetmap.org/reverse';

  // Convertit des coordonnées GPS en adresse lisible (ex: "Avenue Lamine Guèye, Dakar")
  obtenirAdresse(latitude: number, longitude: number): Observable<string> {
    const url = `${this.URL_BASE}?format=json&lat=${latitude}&lon=${longitude}`;

    return this.http.get<NominatimReponse>(url).pipe(
      map(reponse => reponse.display_name),
      catchError(() => of('Adresse indisponible')) // évite de casser l'affichage si l'API échoue
    );
  }
}
