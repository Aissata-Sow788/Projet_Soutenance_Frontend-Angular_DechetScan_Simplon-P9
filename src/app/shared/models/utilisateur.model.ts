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
   // Date de dernière connexion.
  // Peut être null si l'utilisateur ne s'est jamais connecté.
  last_login?: string | null;
   // Nombre total de scans réalisés par l'utilisateur.
  // Ce champ sera alimenté par le backend lorsqu'il sera ajouté à l'API.
  nombreScans?: number;
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
