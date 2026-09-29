import { TypeDechet } from './type-dechet.model';

/**
 * Type de demande de collecte.
 * ramassage : le collecteur vient chez le citoyen.
 * depot     : le citoyen dépose au point de collecte.
 */
export type TypeDemande = 'ramassage' | 'depot';

/**
 * Statut d'une demande de collecte.
 */
export type StatutDemande =
  | 'en_attente'
  | 'acceptee'
  | 'en_cours'
  | 'terminee'
  | 'annulee';

/**
 * Résumé de la collecte liée à une demande.
 * Utilisé dans la page "Suivi de ma demande" pour afficher
 * le collecteur assigné et la date de passage prévue.
 */
export interface CollecteResumeSuivi {
  idCollecte: number;
  datePlanifiee: string;
  statut: string;
  // Infos du collecteur assigné (null si pas encore assigné).
  prenomCollecteur: string | null;
  nomCollecteur: string | null;
  telephoneCollecteur: string | null;
  nomEntrepriseCollecteur: string | null;
}

/**
 * Infos du collecteur attribué à une demande de ramassage.
 * Renvoyé par Django dans DemandeCollecte.collecteurAttribue.
 * NULL tant que la demande est en_attente (pas encore acceptée).
 */
export interface CollecteurAttribue {
  idCollecteur: number;
  nomEntreprise: string;
  telephoneProfessionnel: string;
  zoneIntervention: string;
  // Prénom et nom du représentant du collecteur.
  prenom: string | null;
  nom: string | null;
}

/**
 * Représente une demande de collecte retournée par l'API Django.
 */
export interface DemandeCollecte {
  idDemande: number;
  idUtilisateur: number;
  emailUtilisateur: string;
  prenomUtilisateur: string;
  nomUtilisateur: string;
  telephoneUtilisateur: string | null;
  idTypeDechet: number;
  typeDechet: TypeDechet;
  quantite: number;
  typeDemande: TypeDemande;
  prixPropose: number | null;
  quartier: string;
  latitude: number | null;
  longitude: number | null;
  dateDemande: string;
  dateSouhaitee: string | null;
  statut: StatutDemande;
  // Collecteur qui a accepté la demande.
  // NULL tant que la demande est en_attente.
  collecteurAttribue: CollecteurAttribue | null;
  // Collecte planifiée liée (pour la page suivi citoyen).
  collecte: CollecteResumeSuivi | null;
}

/**
 * Données envoyées à Django pour créer une demande de collecte.
 * idUtilisateur est affecté automatiquement depuis request.user.
 * latitude/longitude sont optionnels (géolocalisation navigateur).
 * prixPropose est optionnel (si le citoyen veut juste un ramassage).
 */
export interface DemandeCollecteCreation {
  idTypeDechet: number;
  quantite: number;
  typeDemande: TypeDemande;
  // Optionnel : NULL si le citoyen ne veut pas vendre ses déchets.
  prixPropose?: number | null;
  quartier: string;
  // Optionnel : fourni automatiquement par le navigateur.
  latitude?: number | null;
  longitude?: number | null;
  dateSouhaitee?: string | null;
}
