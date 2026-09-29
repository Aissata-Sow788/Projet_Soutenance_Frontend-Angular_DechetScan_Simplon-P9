// Imports Angular et RxJS nécessaires au composant.
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, expand, switchMap, take, takeWhile, timer } from 'rxjs';

// Service qui communique avec l'API collecteur.
import { CollecteurService } from '../../../core/services/collecteur';

// Modèles utilisés pour les abonnements et paiements.
import {
  AbonnementCollecteur,
  OffreAbonnement,
  OperateurPaiement,
  PlanAbonnementCode,
  StatutAbonnementCollecteur,
} from '../../../shared/models/collecteur.model';

// Structure d'un opérateur de paiement affiché dans l'interface.
interface OperateurOption {
  code: OperateurPaiement;
  label: string;
  logo: string;
  description: string;
}

@Component({
  selector: 'app-abonnement-collecteur-page',
  imports: [CommonModule],
  templateUrl: './abonnement-collecteur.html',
})
export class AbonnementCollecteurPage implements OnInit {

  // Services utilisés par la page.
  private readonly collecteurService = inject(CollecteurService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ─── Offres d'abonnement ───────────────────────────────────────

  readonly offres = signal<OffreAbonnement[]>([]);
  readonly offreSelectionnee = signal<PlanAbonnementCode>('professionnel');
  readonly chargement = signal(true);
  readonly erreurChargementOffres = signal<string | null>(null);

  // ─── Statut de l'abonnement actuel ─────────────────────────────

  readonly statut = signal<StatutAbonnementCollecteur | null>(null);

  // ─── Historique des abonnements ────────────────────────────────

  readonly historiqueAbonnements = signal<AbonnementCollecteur[]>([]);

  // ─── Gestion du paiement ───────────────────────────────────────

  readonly operateurSelectionne = signal<OperateurPaiement>('wave');
  readonly modalOperateurOuvert = signal(false);
  readonly chargementPaiement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly erreurPaiement = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly paiementEnVerification = signal(false);

  // Opérateurs disponibles pour le paiement.
  readonly operateurs: OperateurOption[] = [
    {
      code: 'wave',
      label: 'Wave',
      logo: '/assets/payment-operators/wave-logo.png',
      description: 'Paiement mobile via Wave.',
    },
    {
      code: 'orange_money',
      label: 'Orange Money',
      logo: '/assets/payment-operators/orange-money-logo.png',
      description: 'Paiement mobile via Orange Money.',
    },
  ];

  // ─── Initialisation de la page ─────────────────────────────────

  ngOnInit(): void {
    this.chargerOffres();
    this.chargerStatut();

    // Vérifie si l'utilisateur revient d'un paiement.
    const reference = this.route.snapshot.queryParamMap.get('reference');

    if (reference) {
      this.verifierRetourPaiement(reference);
    } else if (this.route.snapshot.queryParamMap.get('paiement') === 'annule') {
      this.message.set(
        'Le paiement a ete annule. Vous pouvez reessayer quand vous le souhaitez.'
      );
    }
  }

  // ─── Chargement des offres ────────────────────────────────────

  rechargerOffres(): void {
    this.chargerOffres();
  }

  private chargerOffres(): void {
    this.chargement.set(true);
    this.erreurChargementOffres.set(null);

    // Récupère les offres depuis l'API.
    this.collecteurService.listerOffresAbonnement().subscribe({
      next: (offres) => {
        this.offres.set(offres);
        this.chargement.set(false);
      },
      error: () => {
        this.offres.set([]);
        this.erreurChargementOffres.set(
          'Impossible de charger les formules. Verifiez que Django fonctionne, puis reessayez.'
        );
        this.chargement.set(false);
      },
    });
  }

  // ─── Chargement du statut actuel ───────────────────────────────

  private chargerStatut(): void {
    this.collecteurService.obtenirStatutAbonnement().subscribe({
      next: (s) => {

        // Sans profil collecteur, retour vers la page correspondante.
        if (!s.hasProfile) {
          this.router.navigate(['/devenir-collecteur']);
          return;
        }

        this.statut.set(s);

        // Sélectionne automatiquement le plan déjà actif.
        if (s.abonnement?.plan) {
          this.offreSelectionnee.set(s.abonnement.plan);
        }

        // Charge l'historique une fois le statut récupéré.
        this.chargerHistorique();
      },

      error: (error: { status?: number }) => {
        if (error.status === 404) {
          this.erreur.set(
            'Le serveur ne permet pas de verifier le profil collecteur. Redemarrez Django avec la derniere version, puis reessayez.'
          );
          return;
        }

        this.erreur.set(
          'Impossible de verifier le statut de votre abonnement.'
        );
      },
    });
  }

  // ─── Historique des abonnements ────────────────────────────────

  private chargerHistorique(): void {
    this.collecteurService.listerAbonnements().subscribe({
      next: (liste) => {

        // Trie les abonnements du plus récent au plus ancien.
        const trie = [...liste].sort(
          (a, b) =>
            new Date(b.dateDebut).getTime() -
            new Date(a.dateDebut).getTime()
        );

        this.historiqueAbonnements.set(trie);
      },

      error: () => {
        // L'historique reste optionnel si l'API échoue.
        this.historiqueAbonnements.set([]);
      },
    });
  }

  // ─── Gestion des offres ────────────────────────────────────────

  // Retourne l'offre actuellement sélectionnée.
  offreCourante(): OffreAbonnement | undefined {
    return this.offres().find(
      o => o.code === this.offreSelectionnee()
    );
  }

  // Retourne l'offre correspondant au plan actif.
  offreActive(): OffreAbonnement | undefined {
    const plan = this.statut()?.abonnement?.plan;

    return plan
      ? this.offres().find(o => o.code === plan)
      : undefined;
  }

  // Change l'offre sélectionnée.
  choisirOffre(code: PlanAbonnementCode): void {
    this.offreSelectionnee.set(code);
    this.erreur.set(null);
  }

  // ─── Paiement ─────────────────────────────────────────────────

  // Ouvre la fenêtre de sélection du moyen de paiement.
  ouvrirChoixOperateur(): void {
    if (!this.offreCourante()) {
      this.erreur.set(
        'Choisissez une formule avant de continuer.'
      );
      return;
    }

    this.erreur.set(null);
    this.modalOperateurOuvert.set(true);
  }

  // Ferme la fenêtre de paiement si aucun paiement n'est en cours.
  fermerChoixOperateur(): void {
    if (!this.chargementPaiement()) {
      this.modalOperateurOuvert.set(false);
    }
  }

  // Sélectionne Wave ou Orange Money.
  choisirOperateur(code: OperateurPaiement): void {
    this.operateurSelectionne.set(code);
    this.erreurPaiement.set(null);
  }

  // Lance la création du paiement côté serveur.
  continuerVersPaiement(): void {
    const offre = this.offreCourante();

    if (!offre || this.chargementPaiement()) {
      return;
    }

    this.chargementPaiement.set(true);
    this.erreur.set(null);
    this.erreurPaiement.set(null);

    this.collecteurService
      .initierPaiementAbonnement(
        offre.code,
        this.operateurSelectionne()
      )
      .subscribe({
        next: ({ urlPaiement }) => {
          // Redirige l'utilisateur vers la page PayDunya.
          globalThis.location.assign(urlPaiement);
        },

        error: (error: HttpErrorResponse) => {
          this.erreurPaiement.set(
            this.messageErreurPaiement(error)
          );
          this.chargementPaiement.set(false);
        },
      });
  }

  // Transforme les erreurs API de paiement en message lisible.
  private messageErreurPaiement(
    error: HttpErrorResponse
  ): string {

    if (error.status === 503) {
      const configuration = error.error?.configurationManquante;

      const champs = Array.isArray(configuration)
        ? configuration.filter(
            (c: unknown): c is string => typeof c === 'string'
          )
        : [];

      const liste = champs.length
        ? ` (${champs.join(', ')})`
        : '';

      return `La creation du paiement est momentanement indisponible. Completez la configuration PayDunya${liste} dans le fichier .env.`;
    }

    const detail: unknown = error.error?.detail;

    return typeof detail === 'string'
      ? detail
      : 'La facture n a pas pu etre creee. Verifiez la connexion puis reessayez.';
  }

  // ─── Vérification du retour de paiement ────────────────────────

  private verifierRetourPaiement(reference: string): void {
    this.paiementEnVerification.set(true);

    this.message.set(
      'Verification securisee de votre paiement aupres de PayDunya...'
    );

    // Vérifie le paiement puis recommence périodiquement
    // jusqu'à sa confirmation ou la fin des tentatives.
    timer(0)
      .pipe(
        switchMap(() =>
          this.collecteurService.verifierPaiementAbonnement(reference)
        ),

        expand(({ isActive }) =>
          isActive
            ? EMPTY
            : timer(2500).pipe(
                switchMap(() =>
                  this.collecteurService.verifierPaiementAbonnement(
                    reference
                  )
                )
              )
        ),

        // Autorise la dernière valeur confirmée.
        takeWhile(({ isActive }) => !isActive, true),

        // Maximum 12 vérifications.
        take(12)
      )
      .subscribe({
        next: ({ isActive }) => {
          if (isActive) {
            this.paiementEnVerification.set(false);

            this.message.set(
              'Paiement confirme ! Rechargement de votre abonnement...'
            );

            // Recharge les données après confirmation.
            this.chargerStatut();
          }
        },

        error: (error: { error?: { detail?: string } }) => {
          this.paiementEnVerification.set(false);

          this.erreur.set(
            error.error?.detail ??
              'La verification du paiement est momentanement indisponible.'
          );
        },

        complete: () => {
          // Si le paiement n'est toujours pas confirmé.
          if (this.paiementEnVerification()) {
            this.paiementEnVerification.set(false);

            this.message.set(
              'Votre paiement est encore en cours de confirmation. Actualisez cette page dans quelques instants.'
            );
          }
        },
      });
  }

  // ─── Helpers d'affichage ───────────────────────────────────────

  // Transforme une date ISO en date française lisible.
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Retourne les classes Tailwind selon le statut du paiement.
  classeStatutPaiement(s: string): string {
    switch (s) {
      case 'paye':
        return 'bg-green-100 text-green-700';

      case 'en_attente':
        return 'bg-orange-100 text-orange-600';

      case 'echoue':
        return 'bg-red-100 text-red-600';

      default:
        return 'bg-slate-100 text-slate-500';
    }
  }

  // Traduit le statut du paiement en français.
  libelleStatutPaiement(s: string): string {
    const map: Record<string, string> = {
      paye: 'Paye',
      en_attente: 'En attente',
      echoue: 'Echoue',
      annule: 'Annule',
    };

    return map[s] ?? s;
  }

  // Traduit le code du plan en français.
  libellePlan(plan: string): string {
    const map: Record<string, string> = {
      essentiel: 'Essentiel',
      professionnel: 'Professionnel',
      entreprise: 'Entreprise',
    };

    return map[plan] ?? plan;
  }

  // Retourne l'icône associée au plan.
  iconePlan(plan: string): string {
    const map: Record<string, string> = {
      essentiel: '⚡',
      professionnel: '',
      entreprise: '',
    };

    return map[plan] ?? '';
  }
}
