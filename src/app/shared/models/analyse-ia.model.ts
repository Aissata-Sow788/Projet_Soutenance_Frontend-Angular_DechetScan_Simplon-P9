// Résultat brut renvoyé par le modèle d'IA (Hugging Face)
export interface AnalyseIA {
  idAnalyse: number;
  resultat: string;       // label brut de l'IA, avant mapping vers un TypeDechet officiel
  scoreConfiance: number; // entre 0 et 1
  dateAnalyse: string;    // date ISO (ex: "2026-09-12T13:15:25Z")
}
