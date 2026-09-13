import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Utilisateur } from '../../shared/models/utilisateur.model';
import { Role } from '../../shared/models/utilisateur.model';

export interface LoginResponse {
  token: string;
  utilisateur: Utilisateur;
}

export interface RegisterPayload {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  motDePasse: string;
  ville: string;
}

// ---- Données simulées (à retirer quand l'API Django sera branchée) ----
const MOCK_USERS: (Utilisateur & { motDePasse: string })[] = [
  {
    idUtilisateur: 1,
    nom: 'Sow',
    prenom: 'Aïssata',
    email: 'aissata@test.com',
    motDePasse: 'test1234',
    role: Role.CITOYEN,
    telephone: '+221771234567',
    ville: 'Dakar',
    dateInscription: '2026-01-15T00:00:00Z',
    compteActif: true
  },
  {
    idUtilisateur: 2,
    nom: 'Ndiaye',
    prenom: 'Fatou',
    email: 'fatou.admin@test.com',
    motDePasse: 'test1234',
    role: Role.ADMINISTRATEUR,
    telephone: '+221781234567',
    ville: 'Dakar',
    dateInscription: '2026-01-10T00:00:00Z',
    compteActif: true
  }
];

@Injectable({ providedIn: 'root' })
export class Auth {

  private readonly TOKEN_KEY = 'dechetscan_token';
  private readonly USER_KEY = 'dechetscan_user';


  login(identifiant: string, motDePasse: string): Observable<LoginResponse> {
    const user = MOCK_USERS.find(
      u =>
        (u.email === identifiant || u.telephone === identifiant) &&
        u.motDePasse === motDePasse
    );

    if (!user) {
      return throwError(() => new Error('Identifiants invalides')).pipe(delay(500));
    }

    const { motDePasse: _, ...utilisateur } = user;

    const response: LoginResponse = {
      token: 'mock-jwt-token-' + utilisateur.idUtilisateur,
      utilisateur
    };

    this.stocker(response);

    return of(response).pipe(delay(500));
  }


  register(payload: RegisterPayload): Observable<LoginResponse> {
    console.log('register appelé', payload);
    // ---- MOCK : à remplacer par this.http.post<LoginResponse>('/api/utilisateurs', payload) ----
    const nouvelUtilisateur: Utilisateur = {
      idUtilisateur: MOCK_USERS.length + 1,
      nom: payload.nom,
      prenom: payload.prenom,
      email: payload.email,
      telephone: payload.telephone,
      role: Role.CITOYEN,
      ville: payload.ville,
      dateInscription: new Date().toISOString(),
      compteActif: true
    };

    const response: LoginResponse = {
      token: 'mock-jwt-token-' + nouvelUtilisateur.idUtilisateur,
      utilisateur: nouvelUtilisateur
    };

    this.stocker(response);
    return of(response).pipe(delay(500));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getCurrentUser(): Utilisateur | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }


  private stocker(response: LoginResponse): void {
    console.log('stockage', response)

    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.utilisateur));
  }
}
