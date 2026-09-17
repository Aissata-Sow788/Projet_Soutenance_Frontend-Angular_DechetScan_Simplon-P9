import { ConseilTri } from "./conseil-tri.model";

// Type de déchet accepté par un point, avec son conseil de tri imbriqué
export interface TypeDechet {
  idTypeDechet: number;
  nom: string;
  description: string;
  conseil: ConseilTri | null;
}

// Un point de collecte tel que renvoyé par l'API Django
export interface PointCollecte {
  idPoint: number;
  nom: string;
  ville: string;
  latitude: number;
  longitude: number;
  statut: 'actif' | 'inactif';
  heureOuverture: string;
  heureFermeture: string;
  dechetsAcceptes: TypeDechet[];
}
