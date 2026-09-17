import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

// HttpClient pour communiquer avec Django.
import { HttpClient } from '@angular/common/http';

// Importe tous les modèles utilisés par le service Auth.
import {
  Utilisateur,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse
} from '../../shared/models/utilisateur.model';

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

  // Connecte l'utilisateur auprès de Django.
  login(payload: LoginPayload): Observable<LoginResponse> {

    // Envoie les identifiants au backend.
    return this.httpurl
      .post<LoginResponse>(`${this.apiUrl}/login/`, payload)

      // Stocke les tokens après une connexion réussie.
      .pipe(
        tap((response) => {
          this.stocker(response);
        })
      );
  }

  // Inscrit un nouvel utilisateur auprès de Django.
  register(payload: RegisterPayload): Observable<RegisterResponse> {

    // Envoie les informations d'inscription au backend.
    return this.httpurl.post<RegisterResponse>(
      `${this.apiUrl}/register/`,
      payload
    );
  }

  // Récupère l'utilisateur actuellement connecté.
  me(): Observable<Utilisateur> {

    // Appelle l'endpoint protégé /me/.
    return this.httpurl
      .get<Utilisateur>(`${this.apiUrl}/me/`)

      // Enregistre les données récupérées localement.
      .pipe(
        tap((utilisateur) => {
          this.stockerUtilisateur(utilisateur);
        })
      );
  }

  // Déconnecte l'utilisateur.
  logout(): void {

    // Supprime le token d'accès.
    localStorage.removeItem(this.TOKEN_KEY);

    // Supprime le token de renouvellement.
    localStorage.removeItem(this.REFRESH_KEY);

    // Supprime les informations utilisateur.
    localStorage.removeItem(this.USER_KEY);
  }

  // Récupère l'utilisateur enregistré localement.
  getCurrentUser(): Utilisateur | null {

    // Récupère les données JSON du Local Storage.
    const raw = localStorage.getItem(this.USER_KEY);

    // Transforme le JSON en objet utilisateur.
    return raw ? JSON.parse(raw) : null;
  }

  // Récupère le token d'accès.
  getToken(): string | null {

    // Retourne le token enregistré.
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Vérifie si un utilisateur est connecté.
  isAuthenticated(): boolean {

    // Vérifie simplement la présence du token.
    return !!this.getToken();
  }

  // Enregistre les tokens JWT.
  private stocker(response: LoginResponse): void {

    // Enregistre le token d'accès.
    localStorage.setItem(
      this.TOKEN_KEY,
      response.access
    );

    // Enregistre le token de renouvellement.
    localStorage.setItem(
      this.REFRESH_KEY,
      response.refresh
    );
  }

  // Enregistre les informations de l'utilisateur.
  private stockerUtilisateur(utilisateur: Utilisateur): void {

    // Convertit l'utilisateur en JSON avant de le sauvegarder.
    localStorage.setItem(
      this.USER_KEY,
      JSON.stringify(utilisateur)
    );
  }
}
