import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CollecteService } from '../../../core/services/collecte';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { Collecte, CollecteCreation } from '../../../shared/models/collecte.model';
import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';

/** Représente un jour dans la grille calendrier. */
interface JourCalendrier {
  date: Date;
  jouActuel: boolean;
  moisCourant: boolean;
  collectes: Collecte[];
}

/**
 * Collecte pouvant éventuellement porter des coordonnées GPS.
 * Si ton API Django les renvoie (latitude / longitude), l'itinéraire sera plus précis.
 */
type CollecteGeo = Collecte & {
  latitude?: number | null;
  longitude?: number | null;
};

/** Nombre maximum d'étapes envoyées à Google Maps (9 étapes + 1 destination). */
const MAX_ETAPES_ITINERAIRE = 10;

/** Formate une date en "AAAA-MM-JJ" selon l'heure LOCALE (évite le décalage UTC de toISOString). */
function formaterDateLocale(date: Date): string {
  const annee = date.getFullYear();
  const mois  = String(date.getMonth() + 1).padStart(2, '0');
  const jour  = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

/** Formate l'heure locale en "HH:mm". */
function formaterHeureLocale(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-planification',
  styleUrl: './planification.css',
  templateUrl: './planification.html',
})
export class Planification implements OnInit {

  private readonly router      = inject(Router);
  private readonly collecteService = inject(CollecteService);
  private readonly demandeService  = inject(DemandeCollecteService);

  // ─── État ─────────────────────────────────────────────────────
  chargement = signal(true);
  erreur     = signal<string | null>(null);

  // ─── Données brutes ───────────────────────────────────────────
  collectes = signal<Collecte[]>([]);
  /** Demandes proposées dans le formulaire (acceptées / en attente seulement). */
  demandes  = signal<DemandeCollecte[]>([]);
  /** Toutes les demandes, sans filtre : sert à retrouver l'adresse d'une collecte. */
  toutesDemandes = signal<DemandeCollecte[]>([]);

  // ─── Calendrier ───────────────────────────────────────────────
  /** Date du mois affiché dans le calendrier. */
  moisAffiche = signal(new Date());

  // ─── Filtres de la liste en bas ───────────────────────────────
  filtreStatut = signal('');
  filtreZone   = signal('Dakar Plateau');
  filtreDate   = signal('');

  // ─── Modal planifier ──────────────────────────────────────────
  modalOuverte  = signal(false);
  enCreation    = signal(false);
  erreurModal   = signal<string | null>(null);

  // Champs du formulaire de planification rapide.
  nouvelleDatePlanifiee = signal('');
  nouvelleHeure         = signal('09:00');
  nouvelIdDemande       = signal<number | null>(null);

  // ─── Itinéraire ───────────────────────────────────────────────
  /** Message affiché sous le bouton "Lancer l'itinéraire" (info ou erreur). */
  messageItineraire = signal<string | null>(null);

  // ─── Validation de la date (pas de date passée) ───────────────
  /** Date minimale autorisée = aujourd'hui (format AAAA-MM-JJ). */
  dateMin = signal(formaterDateLocale(new Date()));

  /** Heure minimale : l'heure actuelle si la date choisie est aujourd'hui, sinon aucune. */
  heureMin = computed(() =>
    this.nouvelleDatePlanifiee() === this.dateMin()
      ? formaterHeureLocale(new Date())
      : null
  );

  /** Message d'erreur si la date/heure choisie est dans le passé (null si valide). */
  erreurDate = computed((): string | null => {
    const date  = this.nouvelleDatePlanifiee();
    const heure = this.nouvelleHeure() || '00:00';

    // Rien de saisi : le bouton gère déjà ce cas.
    if (!date) return null;

    // Jour antérieur à aujourd'hui (comparaison de chaînes AAAA-MM-JJ).
    if (date < this.dateMin()) {
      return 'La date ne peut pas être dans le passé. Choisissez aujourd\'hui ou une date future.';
    }

    // Aujourd'hui mais heure déjà dépassée.
    if (date === this.dateMin() && heure < formaterHeureLocale(new Date())) {
      return 'Cette heure est déjà passée. Choisissez une heure à venir.';
    }

    return null;
  });

  // ─── Titre du mois affiché ────────────────────────────────────
  titreMois = computed(() => {
    return this.moisAffiche().toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  });

  // ─── Grille du calendrier (5 semaines × 7 jours) ─────────────
  grille = computed((): JourCalendrier[] => {
    const mois  = this.moisAffiche();
    const debut = new Date(mois.getFullYear(), mois.getMonth(), 1);
    // Commence le lundi avant le 1er du mois (ou le lundi lui-même).
    const lundiDebut = new Date(debut);
    const jourSemaine = (debut.getDay() + 6) % 7; // lundi = 0
    lundiDebut.setDate(debut.getDate() - jourSemaine);

    const aujourdHui = new Date();
    const jours: JourCalendrier[] = [];

    for (let i = 0; i < 35; i++) {
      const date = new Date(lundiDebut);
      date.setDate(lundiDebut.getDate() + i);

      // Collectes planifiées ce jour-là.
      const collectesDuJour = this.collectes().filter(c => {
        const d = new Date(c.datePlanifiee);
        return (
          d.getDate()     === date.getDate() &&
          d.getMonth()    === date.getMonth() &&
          d.getFullYear() === date.getFullYear()
        );
      });

      jours.push({
        date,
        jouActuel:
          date.getDate()     === aujourdHui.getDate() &&
          date.getMonth()    === aujourdHui.getMonth() &&
          date.getFullYear() === aujourdHui.getFullYear(),
        moisCourant: date.getMonth() === mois.getMonth(),
        collectes: collectesDuJour,
      });
    }
    return jours;
  });

  // ─── Noms des jours de la semaine ─────────────────────────────
  readonly joursSemaine = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

  // ─── Collectes d'aujourd'hui (liste du bas) ───────────────────
  collectesAujourdhui = computed(() => {
    const auj = new Date();
    return this.collectes().filter(c => {
      const d = new Date(c.datePlanifiee);
      return (
        d.getDate()     === auj.getDate() &&
        d.getMonth()    === auj.getMonth() &&
        d.getFullYear() === auj.getFullYear()
      );
    });
  });

  /** Collectes du jour encore à faire (ni terminées, ni annulées), triées par heure. */
  collectesAItineraire = computed(() =>
    this.collectesAujourdhui()
      .filter(c => c.statut !== 'terminee' && c.statut !== 'annulee')
      .sort((a, b) =>
        new Date(a.datePlanifiee).getTime() - new Date(b.datePlanifiee).getTime()
      )
  );

  // ─── Statistiques résumé du jour ─────────────────────────────
  nbRamassages = computed(() =>
    this.collectesAujourdhui().filter(c => !c.idPoint).length
  );
  nbPointsCollecte = computed(() =>
    this.collectesAujourdhui().filter(c => !!c.idPoint).length
  );

  // ─── Collectes filtrées pour la liste ─────────────────────────
  collectesFiltrees = computed(() => {
    let res = [...this.collectes()];
    if (this.filtreStatut()) {
      res = res.filter(c => c.statut === this.filtreStatut());
    }
    if (this.filtreDate()) {
      res = res.filter(c =>
        c.datePlanifiee.startsWith(this.filtreDate())
      );
    }
    return res;
  });

  // ─── Pagination ───────────────────────────────────────────────
  readonly parPage    = 10;
  pageCourante        = signal(1);
  totalPages          = computed(() =>
    Math.max(1, Math.ceil(this.collectesFiltrees().length / this.parPage))
  );
  collectesPage = computed(() => {
    const debut = (this.pageCourante() - 1) * this.parPage;
    return this.collectesFiltrees().slice(debut, debut + this.parPage);
  });
  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  // Expose Number et Math pour les calculs dans le template.
  readonly Number = Number;
  readonly Math = Math;

  ngOnInit(): void {
    this.chargerDonnees();
  }

  private chargerDonnees(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    // Charge les collectes et les demandes en parallèle.
    this.collecteService.listerCollectes().subscribe({
      next: (collectes) => {
        this.collectes.set(
          collectes.sort((a, b) =>
            new Date(a.datePlanifiee).getTime() - new Date(b.datePlanifiee).getTime()
          )
        );
        // Charge ensuite les demandes pour le formulaire.
        this.demandeService.listerDemandes().subscribe({
          next: (demandes) => {
            // Garde la liste complète pour retrouver les adresses (itinéraire).
            this.toutesDemandes.set(demandes);
            // Ne garde que les demandes acceptées (disponibles à planifier).
            this.demandes.set(
              demandes.filter(d => d.statut === 'acceptee' || d.statut === 'en_attente')
            );
            this.chargement.set(false);
          },
          error: () => {
            this.chargement.set(false);
          }
        });
      },
      error: () => {
        this.erreur.set('Impossible de charger les collectes.');
        this.chargement.set(false);
      }
    });
  }

  // Navigation calendrier : mois précédent.
  moisPrecedent(): void {
    const m = new Date(this.moisAffiche());
    m.setMonth(m.getMonth() - 1);
    this.moisAffiche.set(m);
  }

  // Navigation calendrier : mois suivant.
  moisSuivant(): void {
    const m = new Date(this.moisAffiche());
    m.setMonth(m.getMonth() + 1);
    this.moisAffiche.set(m);
  }

  // Ouvre la modal de planification rapide.
  ouvrirModal(): void {
    this.modalOuverte.set(true);
    this.erreurModal.set(null);
    // Recalcule "aujourd'hui" à chaque ouverture (la page peut rester ouverte plusieurs jours).
    const auj = new Date();
    this.dateMin.set(formaterDateLocale(auj));
    // Pré-remplit la date avec aujourd'hui (heure locale).
    this.nouvelleDatePlanifiee.set(formaterDateLocale(auj));
  }

  // Ferme la modal.
  fermerModal(): void {
    this.modalOuverte.set(false);
  }

  // Crée une nouvelle collecte planifiée.
  planifierCollecte(): void {
    if (!this.nouvelleDatePlanifiee() || this.enCreation()) return;

    // Bloque l'envoi si la date ou l'heure est dans le passé
    // (le champ HTML "min" peut être contourné en tapant la date à la main).
    const messageDate = this.erreurDate();
    if (messageDate) {
      this.erreurModal.set(messageDate);
      return;
    }

    this.enCreation.set(true);
    this.erreurModal.set(null);

    const datePlanifiee = `${this.nouvelleDatePlanifiee()}T${this.nouvelleHeure()}:00`;

    const donnees: CollecteCreation = {
      datePlanifiee,
      statut: 'planifiee',
      idDemande: this.nouvelIdDemande(),
    };

    this.collecteService.creerCollecte(donnees).subscribe({
      next: (collecte) => {
        // Ajoute la nouvelle collecte à la liste locale.
        this.collectes.update(liste => [...liste, collecte]);
        this.enCreation.set(false);
        this.fermerModal();
      },
      error: () => {
        this.erreurModal.set('Erreur lors de la planification. Réessayez.');
        this.enCreation.set(false);
      }
    });
  }

  // ─── Itinéraire ───────────────────────────────────────────────

  /**
   * Retourne l'adresse (ou les coordonnées) utilisable par Google Maps pour une collecte.
   * Ordre de priorité : coordonnées GPS > nom du point de collecte > quartier de la demande.
   */
  private adresseCollecte(collecte: CollecteGeo): string | null {
    if (collecte.latitude != null && collecte.longitude != null) {
      return `${collecte.latitude},${collecte.longitude}`;
    }

    if (collecte.nomPoint) {
      return `${collecte.nomPoint}, Dakar, Sénégal`;
    }

    if (collecte.idDemande != null) {
      const demande = this.toutesDemandes().find(d => d.idDemande === collecte.idDemande);
      if (demande?.quartier) {
        return `${demande.quartier}, Dakar, Sénégal`;
      }
    }

    return null;
  }

  /**
   * Ouvre Google Maps avec les collectes du jour comme étapes.
   * Le trajet part de la position actuelle du collecteur (origine non précisée).
   */
  lancerItineraire(): void {
    this.messageItineraire.set(null);

    // Adresses dans l'ordre des heures planifiées, sans doublons.
    const adresses = this.collectesAItineraire()
      .map(c => this.adresseCollecte(c as CollecteGeo))
      .filter((a): a is string => !!a);
    const etapesUniques = [...new Set(adresses)];

    if (etapesUniques.length === 0) {
      this.messageItineraire.set(
        'Aucune adresse exploitable pour les collectes du jour.'
      );
      return;
    }

    const etapes = etapesUniques.slice(0, MAX_ETAPES_ITINERAIRE);

    const params = new URLSearchParams({
      api: '1',
      travelmode: 'driving',
      destination: etapes[etapes.length - 1],
    });
    if (etapes.length > 1) {
      params.set('waypoints', etapes.slice(0, -1).join('|'));
    }

    if (etapesUniques.length > MAX_ETAPES_ITINERAIRE) {
      this.messageItineraire.set(
        `Google Maps accepte ${MAX_ETAPES_ITINERAIRE} étapes maximum : les ${MAX_ETAPES_ITINERAIRE} premières ont été envoyées.`
      );
    }

    window.open(
      `https://www.google.com/maps/dir/?${params.toString()}`,
      '_blank',
      'noopener'
    );
  }

  // Navigue vers le détail d'une collecte.
  voirCollecte(id: number): void {
    this.router.navigate(['/collecteur/mes-collectes']);
  }

  // Change de page.
  allerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageCourante.set(page);
    }
  }

  // Formater heure depuis ISO.
  formaterHeure(dateIso: string): string {
    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  // Formater date courte.
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  // Classe CSS du badge de statut.
  classeStatut(statut: string): string {
    switch (statut) {
      case 'planifiee': return 'bg-orange-100 text-orange-600';
      case 'en_cours':  return 'bg-blue-100 text-blue-700';
      case 'terminee':  return 'bg-green-100 text-green-700';
      case 'annulee':   return 'bg-red-100 text-red-600';
      default:          return 'bg-gray-100 text-gray-500';
    }
  }

  // Libellé français du statut.
  libelleStatut(statut: string): string {
    const map: Record<string, string> = {
      planifiee: 'Confirmé',
      en_cours:  'En attente',
      terminee:  'Terminée',
      annulee:   'Annulée',
    };
    return map[statut] ?? statut;
  }

  // Couleur d'une collecte dans le calendrier.
  couleurCollecteCalendrier(collecte: Collecte): string {
    return collecte.idPoint
      ? 'bg-[#C9F5EF] text-[#087C78]'   // Point de collecte = vert
      : 'bg-blue-100 text-blue-700';       // Ramassage = bleu
  }

  // Étiquette courte pour le calendrier.
  etiquetteCalendrier(collecte: Collecte): string {
    const heure = this.formaterHeure(collecte.datePlanifiee);
    return collecte.idPoint
      ? `${heure} - Point`
      : `${heure} - Ramassage`;
  }

  // Pourcentage ramassages pour la barre de progression.
  pourcentageRamassages = computed(() => {
    const total = this.collectesAujourdhui().length;
    if (!total) return 0;
    return Math.round((this.nbRamassages() / total) * 100);
  });

  // Pourcentage points de collecte.
  pourcentagePoints = computed(() => {
    const total = this.collectesAujourdhui().length;
    if (!total) return 0;
    return Math.round((this.nbPointsCollecte() / total) * 100);
  });
}
