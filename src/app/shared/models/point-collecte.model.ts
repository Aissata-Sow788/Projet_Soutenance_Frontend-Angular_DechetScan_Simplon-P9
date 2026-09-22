

/**
 * Représente un type de déchet disponible dans le référentiel.
 */
export interface TypeDechetPoint {
  idTypeDechet: number;
  nom: string;
  description: string;
  conseil?: {
    idConseil: number;
    consigne: string;
    idTypeDechet: number;
  };
}

/**
 * Données envoyées à Django lors de la création
 * d'un point de collecte.
 */
export interface PointCollecteCreation {
  nom: string;
  ville: string;
  latitude: number;
  longitude: number;
  statut: 'actif' | 'inactif';
  heureOuverture: string;
  heureFermeture: string;
  dechetsAcceptes: number[];
}

/**
 * Représente un point de collecte retourné par Django.
 */
export interface PointCollecte {
  idPoint: number;
  nom: string;
  ville: string;
  latitude: number;
  longitude: number;
  statut: 'actif' | 'inactif';
  heureOuverture: string;
  heureFermeture: string;
  dechetsAcceptes: TypeDechetPoint[];
  gerePar: number | null;
}
