
export enum Role {
  CITOYEN = 'CITOYEN',
  ADMINISTRATEUR = 'ADMINISTRATEUR'
}

export interface Utilisateur {
  idUtilisateur: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  telephone: string;
  ville: string;
  dateInscription: string; // ISO date string
  compteActif: boolean;
}

export interface RegisterRequest {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  motDePasse: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  userId?: string;
}
