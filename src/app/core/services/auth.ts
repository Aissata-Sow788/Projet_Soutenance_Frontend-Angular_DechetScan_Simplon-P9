import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

// HttpClient pour communiquer avec Django.
import { HttpClient } from '@angular/common/http';

let sessionStorageMigrated = false;

function getStorage(): Storage {
  try {
    const storage = localStorage;

    if (!sessionStorageMigrated) {
      for (const key of ['dechetscan_token', 'dechetscan_refresh', 'dechetscan_user']) {
        const sessionValue = sessionStorage.getItem(key);
        if (storage.getItem(key) === null && sessionValue !== null) {
          storage.setItem(key, sessionValue);
        }
        sessionStorage.removeItem(key);
      }
      sessionStorageMigrated = true;
    }

    return storage;
  } catch {
    return sessionStorage;
  }
}

// Importe tous les modèles utilisés par le service Auth.
import {
  Utilisateur,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
} from '../../shared/models/utilisateur.model';
import { ChangementMotDePasse } from '../../shared/models/collecteur.model';

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
  private readonly apiUrl = '/api/auth';


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
    const refresh = getStorage().getItem(this.REFRESH_KEY);

    // Envoie le refresh token à Django.
    // Django vérifie sa validité et renvoie un nouvel access token.
    return this.httpurl.post<{ access: string; refresh: string }>(`${this.apiUrl}/token/refresh/`,{refresh}
    ).pipe(

      // Enregistre automatiquement le nouvel access token.
      tap((response) => {
        getStorage().setItem(this.TOKEN_KEY, response.access);
        getStorage().setItem(this.REFRESH_KEY, response.refresh);
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

  /**
   * Enregistre le profil côté Django, puis synchronise le cache local.
   */
  mettreAJourProfil(
    informations: Pick<
      Utilisateur,
      'first_name' | 'last_name' | 'email' | 'telephone' | 'ville'
    >
  ): Observable<Utilisateur> {
    return this.httpurl.patch<Utilisateur>(
      `${this.apiUrl}/me/`,
      informations
    ).pipe(
      tap((utilisateur) => this.stockerUtilisateur(utilisateur))
    );
  }

  changerMotDePasse(
    donnees: ChangementMotDePasse
  ): Observable<{ detail: string }> {
    return this.httpurl.post<{ detail: string }>(
      `${this.apiUrl}/me/password/`,
      donnees
    );
  }


  // ============================================================
  // DÉCONNEXION
  // ============================================================

  logout(): void {

    const storage = getStorage();

    // Supprime le token d'accès.
    storage.removeItem(this.TOKEN_KEY);

    // Supprime le token de renouvellement.
    storage.removeItem(this.REFRESH_KEY);

    // Supprime les informations utilisateur.
    storage.removeItem(this.USER_KEY);
  }


  // ============================================================
  // UTILISATEUR LOCAL
  // ============================================================

  getCurrentUser(): Utilisateur | null {

    // Récupère les données JSON du Local Storage.
    const raw = getStorage().getItem(this.USER_KEY);

    // Transforme le JSON en objet utilisateur.
    return raw ? JSON.parse(raw) : null;
  }

  mettreAJourUtilisateur(
    informations: Pick<Utilisateur, 'first_name' | 'last_name' | 'email' | 'telephone' | 'ville'>
  ): void {
    const utilisateur = this.getCurrentUser();
    if (utilisateur) {
      this.stockerUtilisateur({ ...utilisateur, ...informations });
    }
  }


  // ============================================================
  // TOKEN
  // ============================================================

  getToken(): string | null {

    // Retourne le token d'accès enregistré.
    return getStorage().getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return getStorage().getItem(this.REFRESH_KEY);
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

    const storage = getStorage();

    // Enregistre le token d'accès.
    storage.setItem(this.TOKEN_KEY, response.access);

    // Enregistre le refresh token.
    storage.setItem(this.REFRESH_KEY,response.refresh);
  }


  // ============================================================
  // STOCKAGE UTILISATEUR
  // ============================================================

  private stockerUtilisateur(utilisateur: Utilisateur): void {

    // Convertit l'utilisateur en JSON avant de le sauvegarder.
    getStorage().setItem(this.USER_KEY, JSON.stringify(utilisateur));
  }
}
