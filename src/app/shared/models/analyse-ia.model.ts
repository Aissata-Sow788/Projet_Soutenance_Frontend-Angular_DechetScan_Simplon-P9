import { TypeDechet } from "./type-dechet.model";


/**
 * Représente une détection effectuée par l'IA.
 */
export interface DetectionIA {
  idDetection: number;

  // Objet réellement détecté par Gemini.
  objet: string;

  // Niveau de confiance retourné par le modèle IA.
  confiance: number;

  // Type de déchet correspondant à l'objet détecté.
  idTypeDechet: TypeDechet;
}

/**
 * Représente l'analyse IA complète d'un scan.
 *
 * Une analyse peut maintenant contenir plusieurs détections.
 */
export interface AnalyseIA {
  idAnalyse: number;
  dateAnalyse: string;

  // Liste des objets détectés sur la photo.
  detections: DetectionIA[];
}
