import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  DetailVenteDechet,
  VenteDechet,
  VenteDechetCreation,
  StatutPaiementVente,
  OperateurPaiementVente,
  VentePaiementInitiationReponse,
  VentePaiementVerification,
} from '../../shared/models/vente-dechet.model';

type ValeurNumeriqueApi = number | string;

// Django sérialise ses Decimal en chaînes ; ces types décrivent le transport HTTP.
type DetailVenteDechetApi = Omit<
  DetailVenteDechet,
  'poidsKg' | 'quantite' | 'prixParKg' | 'sousTotal'
> & {
  poidsKg: ValeurNumeriqueApi;
  quantite: ValeurNumeriqueApi;
  prixParKg: ValeurNumeriqueApi;
  sousTotal: ValeurNumeriqueApi;
};

type VenteDechetApi = Omit<
  VenteDechet,
  'quantite' | 'poidsTotalKg' | 'prixPaye' | 'details'
> & {
  quantite: ValeurNumeriqueApi;
  poidsTotalKg: ValeurNumeriqueApi;
  prixPaye: ValeurNumeriqueApi;
  details: DetailVenteDechetApi[];
};

@Injectable({ providedIn: 'root' })
export class VenteDechetService {

  private http = inject(HttpClient);

  // URL de base des endpoints ventes Django.
  private readonly apiUrl = '/api/ventes';

  // URL de base des endpoints paiement vente PayDunya.
  private readonly apiPaiementUrl = '/api/ventes/paiement';

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
    return this.http.get<VenteDechetApi[]>(`${this.apiUrl}/`).pipe(
      map(ventes => ventes.map(vente => this.normaliserVente(vente)))
    );
  }

  /**
   * Récupère le détail d'une vente précise par son identifiant.
   */
  obtenirVente(id: number): Observable<VenteDechet> {
    return this.http.get<VenteDechetApi>(`${this.apiUrl}/${id}/`).pipe(
      map(vente => this.normaliserVente(vente))
    );
  }

  /**
   * Crée une nouvelle vente de déchets.
   * idUtilisateur est affecté automatiquement côté Django
   * depuis l'utilisateur connecté (le citoyen vendeur).
   */
  creerVente(donnees: VenteDechetCreation): Observable<VenteDechet> {
    return this.http.post<VenteDechetApi>(`${this.apiUrl}/`, donnees).pipe(
      map(vente => this.normaliserVente(vente))
    );
  }

  /**
   * Met à jour le statut de paiement d'une vente (admin uniquement).
   * Valeurs possibles : en_attente, paye, echoue, rembourse.
   */
  changerStatut(
    id: number,
    statutPaiement: StatutPaiementVente
  ): Observable<VenteDechet> {
    return this.http.patch<VenteDechetApi>(
      `${this.apiUrl}/${id}/statut/`,
      { statutPaiement }
    ).pipe(map(vente => this.normaliserVente(vente)));
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

  /** Convertit les décimaux renvoyés par Django avant les calculs Angular. */
  private normaliserVente(vente: VenteDechetApi): VenteDechet {
    return {
      ...vente,
      quantite: this.convertirNombre(vente.quantite, 'quantite'),
      poidsTotalKg: this.convertirNombre(vente.poidsTotalKg, 'poidsTotalKg'),
      prixPaye: this.convertirNombre(vente.prixPaye, 'prixPaye'),
      details: vente.details.map(detail => ({
        ...detail,
        poidsKg: this.convertirNombre(detail.poidsKg, 'details.poidsKg'),
        quantite: this.convertirNombre(detail.quantite, 'details.quantite'),
        prixParKg: this.convertirNombre(detail.prixParKg, 'details.prixParKg'),
        sousTotal: this.convertirNombre(detail.sousTotal, 'details.sousTotal'),
      })),
    };
  }

  /** Refuse une valeur invalide au lieu de la propager jusqu'au pipe number. */
  private convertirNombre(valeur: ValeurNumeriqueApi, champ: string): number {
    const nombre = typeof valeur === 'number' ? valeur : Number(valeur);

    if (!Number.isFinite(nombre)) {
      throw new Error(`Valeur numérique invalide reçue pour ${champ}.`);
    }

    return nombre;
  }
}
