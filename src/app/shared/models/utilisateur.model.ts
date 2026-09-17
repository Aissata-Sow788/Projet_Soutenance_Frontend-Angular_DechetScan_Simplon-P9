// Représente le rôle d'un utilisateur dans l'application.
export enum Role {
  CITOYEN = 'citoyen',
  ADMINISTRATEUR = 'admin'
}

// Représente l'utilisateur tel qu'il est retourné par Django.
export interface Utilisateur {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  telephone: string | null;
  ville: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
}

// Données envoyées à Django pour l'inscription.
export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  telephone: string;
  password: string;
  password2: string;
  ville: string;
}

// Données envoyées à Django pour la connexion.
export interface LoginPayload {
  identifiant: string;
  password: string;
}

// Réponse retournée par Django après une connexion réussie.
export interface LoginResponse {
  access: string;
  refresh: string;
}

// Réponse retournée par Django après une inscription.
export interface RegisterResponse {
  message: string;
  email: string;
  role: string;
}
