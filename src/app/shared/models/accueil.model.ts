// Données affichées dans les statistiques
export interface StatistiquesAccueil {
  scans: string;
  citoyens: string;
}

// Données d'une solution
export interface SolutionAccueil {
  titre: string;
  description: string;
  badge: string;
  icone: string;
}

// Données du défi
export interface DefiAccueil {
  titre: string;
  description: string;
}
