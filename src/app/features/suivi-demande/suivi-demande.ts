import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DemandeCollecteService } from '../../core/services/demande-collecte';
import { DemandeCollecte } from '../../shared/models/demande-collecte.model';

// Représente une étape affichée dans la timeline de suivi.
// Chaque étape possède un libellé, une description et un état.
interface EtapeSuivi {
  label: string;
  description: string;
  statut: 'fait' | 'en_cours' | 'attente';
}

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-suivi-demande',
  styleUrl: './suivi-demande.css',
  templateUrl: './suivi-demande.html',
})
export class SuiviDemande implements OnInit {

  // Services utilisés pour la navigation, la récupération de l'ID
  // dans l'URL et l'appel à l'API des demandes de collecte.
  private readonly route = inject(ActivatedRoute);
  private readonly demandeService = inject(DemandeCollecteService);

  // Indique si les données de la demande sont encore en cours de chargement.
  chargement = signal(true);

  // Contient un éventuel message d'erreur affiché à l'utilisateur.
  erreur = signal<string | null>(null);

  // Stocke la demande récupérée depuis l'API.
  // null signifie qu'aucune demande n'est encore disponible.
  demande = signal<DemandeCollecte | null>(null);

  /**
   * Construit automatiquement la timeline à partir du statut
   * actuel de la demande.
   *
   * Le computed est recalculé automatiquement lorsque `demande`
   * change.
   */
  etapes = computed((): EtapeSuivi[] => {
    const d = this.demande();

    // Tant que la demande n'est pas chargée, aucune étape n'est affichée.
    if (!d) return [];

    const statut = d.statut;

    // Date à laquelle le citoyen a envoyé sa demande.
    const dateEnvoi = this.formaterDateHeure(d.dateDemande);

    // Informations de collecte si un collecteur a déjà planifié
    // la récupération des déchets.
    const collecte = d.collecte;

    return [
      {
        // Première étape : la demande a bien été envoyée.
        label: 'Demande envoyée',
        description: dateEnvoi,
        statut: 'fait',
      },

      {
        // Deuxième étape : la demande doit être acceptée par un collecteur.
        label: 'Demande acceptée',

        // Si elle est encore en attente, on l'indique clairement.
        // Sinon, on affiche la date de collecte lorsqu'elle existe.
        description: statut === 'en_attente'
          ? 'En attente d\'acceptation'
          : (
              collecte
                ? this.formaterDateHeure(collecte.datePlanifiee)
                : 'Acceptée'
            ),

        // L'étape est considérée comme terminée lorsque la demande
        // a été acceptée et qu'elle peut poursuivre son traitement.
        statut: ['acceptee', 'en_cours', 'terminee'].includes(statut)
          ? 'fait'
          : statut === 'en_attente'
            ? 'attente'
            : 'attente',
      },

      {
        // Troisième étape : le collecteur a planifié la collecte.
        label: 'Collecte planifiée',

        // Affiche la date prévue si une collecte existe.
        description: collecte
          ? `Planifiée pour le ${this.formaterDateHeure(collecte.datePlanifiee)}`
          : 'En attente du collecteur',

        // Une collecte en cours ou terminée signifie que cette étape
        // a déjà été franchie.
        // Si elle est seulement acceptée, elle est encore en cours de préparation.
        statut: collecte && ['en_cours', 'terminee'].includes(statut)
          ? 'fait'
          : collecte && statut === 'acceptee'
            ? 'en_cours'
            : 'attente',
      },

      {
        // Quatrième étape : les déchets ont été récupérés.
        label: 'Collecte effectuée',

        // La date de collecte est affichée lorsque la demande est terminée.
        description: statut === 'terminee' && collecte?.datePlanifiee
          ? this.formaterDateHeure(collecte.datePlanifiee)
          : '',

        // Cette étape est terminée uniquement lorsque la demande
        // possède le statut "terminee".
        statut: statut === 'terminee' ? 'fait' : 'attente',
      },

      {
        // Dernière étape : paiement associé à la collecte.
        label: 'Paiement effectué',

        // Aucun texte supplémentaire n'est affiché pour le moment.
        description: '',

        // Le paiement est considéré comme effectué lorsque la collecte
        // est terminée et qu'un prix a été proposé.
        statut: statut === 'terminee' && d.prixPropose
          ? 'fait'
          : 'attente',
      },
    ];
  });

  /**
   * Récupère l'identifiant de la demande depuis l'URL
   * puis charge ses informations depuis l'API.
   */
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    // Si l'ID est valide, on récupère la demande correspondante.
    if (id) {
      this.chargerDemande(id);
    } else {
      // Si aucun ID valide n'est présent dans l'URL,
      // on arrête le chargement et on affiche une erreur.
      this.erreur.set('Identifiant de demande invalide.');
      this.chargement.set(false);
    }
  }

  /**
   * Récupère les détails d'une demande depuis le backend.
   */
  private chargerDemande(id: number): void {
    // Réinitialise l'état avant de lancer la requête.
    this.chargement.set(true);
    this.erreur.set(null);

    this.demandeService.obtenirDemande(id).subscribe({
      // La demande a été récupérée avec succès.
      next: (demande) => {
        this.demande.set(demande);
        this.chargement.set(false);
      },

      // L'API n'a pas réussi à retourner la demande.
      error: () => {
        this.erreur.set(
          'Impossible de charger les détails de votre demande.'
        );
        this.chargement.set(false);
      }
    });
  }

  /**
   * Transforme une date ISO en date et heure lisibles en français.
   *
   * Exemple :
   * 2026-09-29T14:30:00
   * devient "29 sept. 2026 à 14:30".
   */
  formaterDateHeure(dateIso: string): string {
    const date = new Date(dateIso);

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ' à ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formate uniquement la date sans afficher l'heure.
   */
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Retourne les classes Tailwind correspondant à l'état
   * visuel de l'icône de chaque étape.
   */
  classeIconeEtape(
    statut: 'fait' | 'en_cours' | 'attente'
  ): string {
    switch (statut) {

      // Étape terminée : cercle rempli en turquoise.
      case 'fait':
        return 'bg-[#0EA5A4] border-[#0EA5A4]';

      // Étape actuellement en cours : contour turquoise
      // avec un fond blanc.
      case 'en_cours':
        return 'border-[#0EA5A4] bg-white';

      // Étape pas encore commencée : contour gris.
      case 'attente':
        return 'border-slate-300 bg-white';
    }
  }

  /**
   * Ouvre l'application téléphone du navigateur/mobile
   * avec le numéro du collecteur.
   */
  contacterCollecteur(): void {
    const tel = this.demande()?.collecte?.telephoneCollecteur;

    // On ne lance l'appel que si un numéro est disponible.
    if (tel) {
      window.location.href = `tel:${tel}`;
    }
  }

}
