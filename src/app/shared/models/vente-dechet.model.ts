import { TypeDechet } from './type-dechet.model';

/**
 * Statut de paiement d'une vente de déchets.
 * en_attente : vente créée, paiement non encore initié ou en cours.
 * paye       : paiement confirmé par PayDunya.
 * echoue     : paiement échoué ou annulé.
 * rembourse  : montant remboursé au collecteur.
 */
export type StatutPaiementVente =
  | 'en_attente'
  | 'paye'
  | 'echoue'
  | 'rembourse';

/**
 * Opérateurs de paiement disponibles pour payer le citoyen.
 * Wave et Orange Money sont les deux canaux supportés via PayDunya.
 */
export type OperateurPaiementVente = 'wave' | 'orange_money';

/**
 * Représente une vente de déchets retournée par l'API Django.
 */
export interface VenteDechet {
  idVente: number;
  idUtilisateur: number | null;
  // Email du citoyen vendeur (calculé côté Django).
  emailUtilisateur: string | null;
  prenomUtilisateur: string;
  nomUtilisateur: string;
  idCollecteur: number | null;
  // Nom de l'entreprise du collecteur acheteur (calculé côté Django).
  nomCollecteur: string | null;
  idTypeDechet: number | null;
  // Détail complet du type de déchet (calculé côté Django).
  typeDechet: TypeDechet | null;
  quantite: number;
  poidsTotalKg: number;
  nombreObjets: number | null;
  prixPaye: number;
  methodePaiement: string;
  statutPaiement: StatutPaiementVente;
  referencePaiement: string;
  dateVente: string;
  details: DetailVenteDechet[];
}

/** Ligne de vente : le nombre d'objets reste distinct du poids mesuré. */
export interface DetailVenteDechet {
  idDetail: number;
  idPanier: number;
  idTypeDechet: number;
  typeDechet: TypeDechet;
  nombreObjets: number | null;
  poidsKg: number;
  quantite: number;
  prixParKg: number;
  sousTotal: number;
}

/**
 * Données envoyées à Django pour créer une vente.
 * idUtilisateur est affecté automatiquement depuis request.user.
 */
export interface VenteDechetCreation {
  idCollecteur: number;
  methodePaiement: string;
  details: Array<{
    idPanier: number;
    nombreObjets: number;
    poidsKg: number;
  }>;
}

/**
 * Corps envoyé à Django pour initier un paiement PayDunya.
 * Le collecteur connecté paie le citoyen vendeur.
 * POST /api/ventes/paiement/initier/
 */
export interface VentePaiementInitiation {
  // ID de la vente à payer.
  idVente: number;
  // Opérateur de paiement choisi par le collecteur (Wave ou Orange Money).
  operateur: OperateurPaiementVente;
}

/**
 * Réponse de Django après l'initiation du paiement.
 * Contient la référence interne et l'URL PayDunya vers laquelle
 * rediriger le collecteur.
 */
export interface VentePaiementInitiationReponse {
  // Référence unique de la transaction (format VP-xxx).
  reference: string;
  // URL de la page de paiement PayDunya.
  urlPaiement: string;
}

/**
 * Réponse de Django lors de la vérification du paiement.
 * Appelée en polling par Angular après le retour de PayDunya.
 * GET /api/ventes/paiement/verifier/?reference=VP-xxx
 */
export interface VentePaiementVerification {
  // Statut actuel du paiement.
  statutPaiement: StatutPaiementVente;
  // True si le paiement est confirmé et la vente soldée.
  estPaye: boolean;
}
