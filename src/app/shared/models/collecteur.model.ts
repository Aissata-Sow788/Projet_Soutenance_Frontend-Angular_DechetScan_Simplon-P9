/**
 * Statut de validation d'un collecteur par l'admin.
 */
export type StatutValidation = 'en_attente' | 'valide' | 'rejete';

/**
 * Statut de paiement d'un abonnement collecteur.
 */
export type StatutPaiementAbonnement = 'en_attente' | 'paye' | 'echoue' | 'annule';

/**
 * Représente un profil collecteur retourné par l'API Django.
 */
export interface Collecteur {
  idCollecteur: number;
  idUtilisateur: number;
  // Infos de l'utilisateur lié (calculées côté Django).
  emailUtilisateur: string;
  prenomUtilisateur: string;
  nomUtilisateur: string;
  nomEntreprise: string;
  telephoneProfessionnel: string;
  // Zone géographique d'intervention professionnelle.
  zoneIntervention: string;
  statutValidation: StatutValidation;
  dateInscription: string;
}

/**
 * Données envoyées à Django pour créer un profil collecteur.
 * idUtilisateur est affecté automatiquement depuis request.user.
 */
export interface CollecteurCreation {
  nomEntreprise: string;
  telephoneProfessionnel: string;
  zoneIntervention: string;
}

/**
 * Représente un abonnement collecteur retourné par l'API Django.
 */
export interface AbonnementCollecteur {
  idAbonnement: number;
  idCollecteur: number;
  dateDebut: string;
  dateFin: string;
  statutPaiement: StatutPaiementAbonnement;
  methodePaiement: string;
  montant: number;
  plan: PlanAbonnementCode;
  referencePaiement: string | null;
}

export type PlanAbonnementCode = 'essentiel' | 'professionnel' | 'entreprise';

export interface OffreAbonnement {
  code: PlanAbonnementCode;
  label: string;
  montant: number;
  description: string;
  fonctionnalites: string[];
  dureeJours: number;
}

export type OperateurPaiement = 'paydunya' | 'wave' | 'orange_money';

export interface StatutAbonnementCollecteur {
  hasProfile: boolean;
  statutValidation: StatutValidation | null;
  isActive: boolean;
  abonnement: Pick<AbonnementCollecteur, 'idAbonnement' | 'plan' | 'montant' | 'dateFin'> | null;
}

export interface ProfilCollecteur {
  idCollecteur: number;
  first_name: string;
  last_name: string;
  email: string;
  telephone: string | null;
  ville: string;
  nomEntreprise: string;
  telephoneProfessionnel: string;
  zoneIntervention: string;
  statutValidation: StatutValidation;
  nombrePointsGeres: number;
}

export type ProfilCollecteurModification = Pick<
  ProfilCollecteur,
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'telephone'
  | 'ville'
  | 'nomEntreprise'
  | 'telephoneProfessionnel'
>;

export interface InitialisationPaiementAbonnement {
  reference: string;
  urlPaiement: string;
}

export interface VerificationPaiementAbonnement {
  statutPaiement: StatutPaiementAbonnement;
  isActive: boolean;
}

export interface ChangementMotDePasse {
  ancienMotDePasse: string;
  nouveauMotDePasse: string;
  confirmationMotDePasse: string;
}

/**
 * Données envoyées à Django pour créer un abonnement.
 * idCollecteur est affecté automatiquement depuis request.user.
 */
export interface AbonnementCollecteurCreation {
  dateDebut: string;
  dateFin: string;
  statutPaiement: StatutPaiementAbonnement;
  methodePaiement: string;
  montant: number;
}
