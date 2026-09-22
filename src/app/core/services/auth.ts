import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

// HttpClient pour communiquer avec Django.
import { HttpClient } from '@angular/common/http';

// Importe tous les modèles utilisés par le service Auth.
import {Utilisateur, LoginPayload, LoginResponse, RegisterPayload, RegisterResponse} from '../../shared/models/utilisateur.model';

@Injectable({
  // Rend le service disponible dans toute l'application.
  providedIn: 'root'
})
export class Auth {

  // Clé du token d'accès dans le Local Storage.
  private readonly TOKEN_KEY = 'dechetscan_token';

  // Clé des informations utilisateur dans le Local Storage.
  private readonly USER_KEY = 'dechetscan_user';

  // Clé du token de renouvellement dans le Local Storage.
  private readonly REFRESH_KEY = 'dechetscan_refresh';

  // Permet d'effectuer les requêtes HTTP vers Django.
  private readonly httpurl = inject(HttpClient);

  // URL de base des endpoints d'authentification.
  private readonly apiUrl = 'http://127.0.0.1:8000/api/auth';


  // ============================================================
  // CONNEXION
  // ============================================================

  login(payload: LoginPayload): Observable<LoginResponse> {

    // Envoie les identifiants au backend.
    return this.httpurl.post<LoginResponse>(`${this.apiUrl}/login/`, payload)

      // Stocke les tokens après une connexion réussie.
      .pipe(
        tap((response) => {
          this.stocker(response);
        })
      );
  }


  // ============================================================
  // RENOUVELLEMENT DU TOKEN
  // ============================================================

  refreshToken(): Observable<{ access: string; refresh: string }> {

    // Récupère le refresh token enregistré après la connexion.
    const refresh = localStorage.getItem(this.REFRESH_KEY);

    // Envoie le refresh token à Django.
    // Django vérifie sa validité et renvoie un nouvel access token.
    return this.httpurl.post<{ access: string; refresh: string }>(`${this.apiUrl}/token/refresh/`,{refresh}
    ).pipe(

      // Enregistre automatiquement le nouvel access token.
      tap((response) => {localStorage.setItem(this.TOKEN_KEY, response.access);
        localStorage.setItem(this.REFRESH_KEY, response.refresh);
      })
    );
  }


  // ============================================================
  // INSCRIPTION
  // ============================================================

  register(payload: RegisterPayload): Observable<RegisterResponse> {

    // Envoie les informations d'inscription au backend.
    return this.httpurl.post<RegisterResponse>(`${this.apiUrl}/register/`,payload);
  }


  // ============================================================
  // UTILISATEUR CONNECTÉ
  // ============================================================

  me(): Observable<Utilisateur> {

    // Appelle l'endpoint protégé /me/.
    return this.httpurl.get<Utilisateur>(`${this.apiUrl}/me/`)

      // Enregistre les données récupérées localement.
      .pipe(tap((utilisateur) => {this.stockerUtilisateur(utilisateur);
        })
      );
  }


  // ============================================================
  // DÉCONNEXION
  // ============================================================

  logout(): void {

    // Supprime le token d'accès.
    localStorage.removeItem(this.TOKEN_KEY);

    // Supprime le token de renouvellement.
    localStorage.removeItem(this.REFRESH_KEY);

    // Supprime les informations utilisateur.
    localStorage.removeItem(this.USER_KEY);
  }


  // ============================================================
  // UTILISATEUR LOCAL
  // ============================================================

  getCurrentUser(): Utilisateur | null {

    // Récupère les données JSON du Local Storage.
    const raw = localStorage.getItem(this.USER_KEY);

    // Transforme le JSON en objet utilisateur.
    return raw ? JSON.parse(raw) : null;
  }


  // ============================================================
  // TOKEN
  // ============================================================

  getToken(): string | null {

    // Retourne le token d'accès enregistré.
    return localStorage.getItem(this.TOKEN_KEY);
  }


  // Vérifie si un utilisateur possède un token.
  isAuthenticated(): boolean {

    // Vérifie la présence du token d'accès.
    return !!this.getToken();
  }


  // ============================================================
  // STOCKAGE DES TOKENS
  // ============================================================

  private stocker(response: LoginResponse): void {

    // Enregistre le token d'accès.
    localStorage.setItem(this.TOKEN_KEY, response.access);

    // Enregistre le refresh token.
    localStorage.setItem(this.REFRESH_KEY,response.refresh);
  }


  // ============================================================
  // STOCKAGE UTILISATEUR
  // ============================================================

  private stockerUtilisateur(utilisateur: Utilisateur): void {

    // Convertit l'utilisateur en JSON avant de le sauvegarder.
    localStorage.setItem(this.USER_KEY, JSON.stringify(utilisateur));
  }
}
