import { TypeDechet } from "./type-dechet.model";
import { AnalyseIA } from "./analyse-ia.model";
import { ConseilTri } from "./conseil-tri.model";

// UTILISATEUR ASSOCIÉ À UN SCAN

export interface CitoyenScan {
  id: number;
  prenom: string;
  nom: string;
  email: string;
}

export interface ScanDechet {
  // Identifiant du scan.
  idScan: number;

  // Date et heure du scan.
  dateScan: string;

  // URL de la photo.
  photoUrl: string;

  // Utilisateur ayant effectué le scan.
  idUtilisateur: number;

 // Informations du citoyen ou null pour un anonyme.
  citoyen: CitoyenScan | null;

  // L'analyse peut être absente dans certains cas.
  analyseIA?: AnalyseIA;
}

export interface DetectionAdmin {
  idDetection: number;
  objet: string;
  confiance: number;
  idTypeDechet?: {
    idTypeDechet: number;
    nom: string;
    description: string;
    conseil?: {
      idConseil: number;
      consigne: string;
      idTypeDechet: number;
    };
  };
}
