/**
 * Statut d'une opération de collecte.
 * Correspond exactement à l'énumération StatutCollecte du diagramme.
 */
export type StatutCollecte =
  | 'planifiee'
  | 'en_cours'
  | 'terminee'
  | 'annulee';

/**
 * Représente une opération de collecte retournée par l'API Django.
 */
export interface Collecte {
  idCollecte: number;
  idCollecteur: number;
  // Nom de l'entreprise du collecteur (calculé côté Django).
  nomCollecteur: string;
  // Optionnel : point de collecte concerné (NULL si ramassage à domicile).
  idPoint: number | null;
  nomPoint: string | null;
  // Optionnel : demande de collecte à l'origine de cette opération.
  idDemande: number | null;
  nomDechet?: string | null;
  quantite?: number | null;
  prenomCitoyen?: string | null;
  nomCitoyen?: string | null;
  zone?: string | null;
  datePlanifiee: string;
  statut: StatutCollecte;
  // Renseigné uniquement quand la collecte est terminée.
  dateRealisation: string | null;
  quantiteRecuperee: number | null;
}

/**
 * Données envoyées à Django pour créer une collecte.
 * idCollecteur est affecté automatiquement depuis le profil collecteur
 * de l'utilisateur connecté.
 */
export interface CollecteCreation {
  // Optionnel : point de collecte concerné.
  idPoint?: number | null;
  // Optionnel : demande de collecte associée.
  idDemande?: number | null;
  datePlanifiee: string;
  statut: StatutCollecte;
}

/**
 * Données envoyées à Django pour mettre à jour le statut d'une collecte.
 * dateRealisation et quantiteRecuperee sont renseignés quand statut = terminee.
 */
export interface CollecteStatutUpdate {
  statut: StatutCollecte;
  dateRealisation?: string | null;
  quantiteRecuperee?: number | null;
}
