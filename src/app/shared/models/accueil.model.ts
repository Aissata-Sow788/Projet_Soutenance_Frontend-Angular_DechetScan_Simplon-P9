// Données affichées dans les statistiques de l'accueil.
// Alimentées par l'endpoint /api/dashboard/statistiques/.
export interface StatistiquesAccueil {
  // Nombre total de scans réalisés (nombre brut).
  scans: number;
  // Nombre total d'utilisateurs enregistrés (nombre brut).
  citoyens: number;
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
