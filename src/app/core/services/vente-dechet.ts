import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  VenteDechet,
  VenteDechetCreation,
  StatutPaiementVente,
  OperateurPaiementVente,
  VentePaiementInitiationReponse,
  VentePaiementVerification,
} from '../../shared/models/vente-dechet.model';

@Injectable({ providedIn: 'root' })
export class VenteDechetService {

  private http = inject(HttpClient);

  // URL de base des endpoints ventes Django.
  private readonly apiUrl = 'http://127.0.0.1:8000/api/ventes';

  // URL de base des endpoints paiement vente PayDunya.
  private readonly apiPaiementUrl = 'http://127.0.0.1:8000/api/ventes/paiement';

  // ─────────────────────────────────────────────────────────────
  // CRUD VENTES
  // ─────────────────────────────────────────────────────────────

  /**
   * Récupère les ventes selon le rôle de l'utilisateur connecté.
   * Admin      → toutes les ventes.
   * Collecteur → les ventes dont il est l'acheteur.
   * Citoyen    → ses propres ventes soumises.
   */
  listerVentes(): Observable<VenteDechet[]> {
    return this.http.get<VenteDechet[]>(`${this.apiUrl}/`);
  }

  /**
   * Récupère le détail d'une vente précise par son identifiant.
   */
  obtenirVente(id: number): Observable<VenteDechet> {
    return this.http.get<VenteDechet>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Crée une nouvelle vente de déchets.
   * idUtilisateur est affecté automatiquement côté Django
   * depuis l'utilisateur connecté (le citoyen vendeur).
   */
  creerVente(donnees: VenteDechetCreation): Observable<VenteDechet> {
    return this.http.post<VenteDechet>(`${this.apiUrl}/`, donnees);
  }

  /**
   * Met à jour le statut de paiement d'une vente (admin uniquement).
   * Valeurs possibles : en_attente, paye, echoue, rembourse.
   */
  changerStatut(
    id: number,
    statutPaiement: StatutPaiementVente
  ): Observable<VenteDechet> {
    return this.http.patch<VenteDechet>(
      `${this.apiUrl}/${id}/statut/`,
      { statutPaiement }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PAIEMENT CITOYEN VIA PAYDUNYA
  // ─────────────────────────────────────────────────────────────

  /**
   * Initie un paiement PayDunya pour régler le citoyen vendeur.
   * Appelé par le collecteur depuis la page Paiements.
   *
   * Flux :
   * 1. Angular appelle cet endpoint.
   * 2. Django crée une facture PayDunya et retourne urlPaiement.
   * 3. Angular redirige le collecteur vers urlPaiement.
   * 4. Après paiement, PayDunya redirige vers
   *    /collecteur/paiements?reference=VP-xxx
   * 5. Angular poll verifierPaiement() jusqu'à confirmation.
   *
   * POST /api/ventes/paiement/initier/
   * Corps : { idVente, operateur }
   */
  initierPaiement(
    idVente: number,
    operateur: OperateurPaiementVente
  ): Observable<VentePaiementInitiationReponse> {
    return this.http.post<VentePaiementInitiationReponse>(
      `${this.apiPaiementUrl}/initier/`,
      { idVente, operateur }
    );
  }

  /**
   * Vérifie le statut d'un paiement auprès de PayDunya.
   * Appelé en polling par Angular après le retour de la page PayDunya.
   *
   * Django interroge PayDunya avec le token de la facture et
   * met à jour le statut en base si le paiement est confirmé.
   *
   * GET /api/ventes/paiement/verifier/?reference=VP-xxx
   */
  verifierPaiement(reference: string): Observable<VentePaiementVerification> {
    return this.http.get<VentePaiementVerification>(
      `${this.apiPaiementUrl}/verifier/`,
      { params: { reference } }
    );
  }
}
