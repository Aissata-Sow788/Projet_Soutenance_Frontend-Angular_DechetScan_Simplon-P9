import { TypeDechet } from './type-dechet.model';

/**
 * Représente un tarif d'achat d'un type de déchet
 * retourné par l'API Django.
 */
export interface PrixDechet {
  idPrix: number;
  idTypeDechet: number;
  // Nom du type de déchet pour affichage (calculé côté Django).
  nomTypeDechet: string;
  // Prix d'achat en FCFA par kilogramme.
  prixParKg: number;
  // Commission de la plateforme en pourcentage.
  commission: number;
  dateDebut: string;
  // NULL si le tarif est encore en vigueur.
  dateFin: string | null;
  // Calculé dynamiquement par Django (pas stocké en base).
  est_actif: boolean;
}

/**
 * Données envoyées à Django pour créer un tarif.
 */
export interface PrixDechetCreation {
  idTypeDechet: number;
  prixParKg: number;
  commission: number;
  dateDebut: string;
  dateFin?: string | null;
}
