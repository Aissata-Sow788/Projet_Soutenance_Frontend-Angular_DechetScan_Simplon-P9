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
