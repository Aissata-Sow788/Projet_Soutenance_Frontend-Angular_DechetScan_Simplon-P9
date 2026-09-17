import { ConseilTri } from "./conseil-tri.model";


// Représente un type de déchet du référentiel.
export interface TypeDechet {

  // Identifiant du type de déchet.
  idTypeDechet: number;

  // Nom du type de déchet.
  nom: string;

  // Description du type de déchet.
  description: string;

  // Conseil de tri associé au type.
  conseil: ConseilTri | null;
}
