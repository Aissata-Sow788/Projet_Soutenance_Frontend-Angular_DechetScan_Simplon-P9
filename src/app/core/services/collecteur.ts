import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Collecteur,
  CollecteurCreation,
  AbonnementCollecteur,
  AbonnementCollecteurCreation,
  OffreAbonnement,
  PlanAbonnementCode,
  OperateurPaiement,
  StatutAbonnementCollecteur,
  InitialisationPaiementAbonnement,
  VerificationPaiementAbonnement,
  StatutValidation,
  ProfilCollecteur,
  ProfilCollecteurModification,
} from '../../shared/models/collecteur.model';

@Injectable({ providedIn: 'root' })
export class CollecteurService {

  private http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  // ─────────────────────────────────────────────
  // COLLECTEURS
  // ─────────────────────────────────────────────

  /**
   * Récupère la liste de tous les collecteurs (admin uniquement).
   */
  listerCollecteurs(): Observable<Collecteur[]> {
    return this.http.get<Collecteur[]>(`${this.apiUrl}/collecteurs/`);
  }

  /**
   * Récupère le détail d'un collecteur (admin uniquement).
   */
  obtenirCollecteur(id: number): Observable<Collecteur> {
    return this.http.get<Collecteur>(`${this.apiUrl}/collecteurs/${id}/`);
  }

  /**
   * Crée le profil collecteur de l'utilisateur connecté.
   * idUtilisateur est affecté automatiquement côté Django.
   */
  creerProfil(donnees: CollecteurCreation): Observable<Collecteur> {
    return this.http.post<Collecteur>(
      `${this.apiUrl}/collecteurs/`,
      donnees
    );
  }

  /**
   * Valide ou rejette un collecteur (admin uniquement).
   */
  validerCollecteur(
    id: number,
    statutValidation: StatutValidation
  ): Observable<Collecteur> {
    return this.http.patch<Collecteur>(
      `${this.apiUrl}/collecteurs/${id}/valider/`,
      { statutValidation }
    );
  }

  /**
   * Retourne la liste des collecteurs disponibles pour une vente de déchets.
   * Seuls les collecteurs avec statutValidation='valide' sont retournés.
   * Paramètre optionnel : zone (filtre sur zoneIntervention).
   *
   * Utilisé par la page "Vendre mes déchets" pour afficher
   * les entreprises auxquelles le citoyen peut vendre ses déchets.
   */
  listerDisponibles(zone?: string): Observable<Collecteur[]> {
    // Construit les query params si une zone est fournie.
    const params: Record<string, string> = {};
    if (zone && zone.trim()) {
      params['zone'] = zone.trim();
    }

    return this.http.get<Collecteur[]>(
      `${this.apiUrl}/collecteurs/disponibles/`,
      { params }
    );
  }

  obtenirMonProfil(): Observable<ProfilCollecteur> {
    return this.http.get<ProfilCollecteur>(
      `${this.apiUrl}/collecteurs/mon-profil/`
    );
  }

  modifierMonProfil(
    donnees: ProfilCollecteurModification
  ): Observable<ProfilCollecteur> {
    return this.http.patch<ProfilCollecteur>(
      `${this.apiUrl}/collecteurs/mon-profil/`,
      donnees
    );
  }

  // ─────────────────────────────────────────────
  // ABONNEMENTS
  // ─────────────────────────────────────────────

  /**
   * Récupère la liste de tous les abonnements (admin uniquement).
   */
  listerAbonnements(): Observable<AbonnementCollecteur[]> {
    return this.http.get<AbonnementCollecteur[]>(
      `${this.apiUrl}/abonnements/`
    );
  }

  /**
   * Crée un abonnement pour le collecteur connecté.
   * idCollecteur est affecté automatiquement côté Django.
   */
  creerAbonnement(
    donnees: AbonnementCollecteurCreation
  ): Observable<AbonnementCollecteur> {
    return this.http.post<AbonnementCollecteur>(
      `${this.apiUrl}/abonnements/`,
      donnees
    );
  }

  /** Liste les formules mensuelles avec leurs tarifs définis par le backend. */
  listerOffresAbonnement(): Observable<OffreAbonnement[]> {
    return this.http.get<OffreAbonnement[]>(`${this.apiUrl}/abonnements/offres/`);
  }

  /** Vérifie si le compte collecteur possède un abonnement encore valable. */
  obtenirStatutAbonnement(): Observable<StatutAbonnementCollecteur> {
    return this.http.get<StatutAbonnementCollecteur>(
      `${this.apiUrl}/abonnements/statut/`
    );
  }

  /** Demande au backend de créer une facture PayDunya pour l'offre choisie. */
  initierPaiementAbonnement(
    plan: PlanAbonnementCode,
    operateur: OperateurPaiement
  ): Observable<InitialisationPaiementAbonnement> {
    return this.http.post<InitialisationPaiementAbonnement>(
      `${this.apiUrl}/abonnements/initier-paiement/`,
      { plan, operateur }
    );
  }

  /** Vérifie la facture auprès de PayDunya, depuis le backend. */
  verifierPaiementAbonnement(
    reference: string
  ): Observable<VerificationPaiementAbonnement> {
    return this.http.get<VerificationPaiementAbonnement>(
      `${this.apiUrl}/abonnements/verifier-paiement/`,
      { params: { reference } }
    );
  }
}
