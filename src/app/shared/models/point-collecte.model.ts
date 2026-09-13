
export interface TypeDechetAccepte {
  idType: number;
  nom: string;
}

export interface PointCollecte {
  idPoint: number;
  nom: string;
  ville: string;
  latitude: number;
  longitude: number;
  statut: 'actif' | 'inactif'; // 'actif' ou 'inactif'
  heureOuverture: string;
  heureFermeture: string;
  dechetsAcceptes: TypeDechetAccepte[];
  icone: 'recyclage' | 'poubelle' | 'ecran' | 'maison'; // détermine l'icône affichée sur la carte
}
