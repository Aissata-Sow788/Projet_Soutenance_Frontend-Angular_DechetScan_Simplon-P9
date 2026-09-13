import { TypeDechet } from "./type-dechet.model";
import { AnalyseIA } from "./analyse-ia.model";
import { ConseilTri } from "./conseil-tri.model";

// Un scan complet : la photo + son résultat d'analyse
export interface ScanDechet {
  idScan: number;
  dateScan: string;
  photoUrl: string;
  typeDechet?: TypeDechet;
  analyseIA?: AnalyseIA;
  conseilTri?: ConseilTri;
}
