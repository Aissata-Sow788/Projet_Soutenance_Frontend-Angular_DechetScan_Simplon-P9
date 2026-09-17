// Modèle utilisé côté admin, aligné sur les vraies réponses de l'API Django
export interface ConseilTri {

  // Identifiant du conseil.
  idConseil: number;

  // Consigne de tri affichée à l'utilisateur.
  consigne: string;

  // Identifiant du type de déchet concerné.
  idTypeDechet: number;
}
