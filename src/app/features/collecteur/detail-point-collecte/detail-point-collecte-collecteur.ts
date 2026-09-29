
// Imports Angular
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Bibliothèque utilisée pour afficher la carte.
import * as L from 'leaflet';

// ─── Services de l'application ──────────────────────────────────
import { PointCollecteService } from '../../../core/services/point-collecte';
import { CollecteService } from '../../../core/services/collecte';
import { Auth } from '../../../core/services/auth';

// ─── Modèles ────────────────────────────────────────────────────
import { PointCollecte } from '../../../shared/models/point-collecte.model';
import { Collecte } from '../../../shared/models/collecte.model';

// Librairie utilisée pour les fenêtres de confirmation.
import Swal from 'sweetalert2';


@Component({
  imports: [CommonModule],
  selector: 'app-detail-point-collecte-collecteur',
  styleUrl: './detail-point-collecte-collecteur.css',
  templateUrl: './detail-point-collecte-collecteur.html',
})
export class DetailPointCollecteCollecteur implements OnInit, OnDestroy {

  // ─── Services injectés ────────────────────────────────────────

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pointCollecteService = inject(PointCollecteService);
  private readonly collecteService = inject(CollecteService);
  private readonly auth = inject(Auth);

  // Référence vers la div qui contient la carte Leaflet.
  @ViewChild('carte')
  private carteRef?: ElementRef<HTMLDivElement>;

  // Instance de la carte actuellement affichée.
  private carte: L.Map | null = null;

  // Détermine si la page est ouverte depuis l'espace administrateur.
  readonly estAdministrateur =
    this.route.snapshot.data['espace'] === 'admin';


  // ─── État de la page ──────────────────────────────────────────

  // Indique si les données sont encore en cours de chargement.
  chargement = signal(true);

  // Contient le message d'erreur éventuel.
  erreur = signal<string | null>(null);


  // ─── Données principales ──────────────────────────────────────

  // Point de collecte actuellement consulté.
  point = signal<PointCollecte | null>(null);

  // Liste des collectes récupérées depuis l'API.
  collectes = signal<Collecte[]>([]);

  // Identifiant du citoyen ou collecteur connecté.
  readonly utilisateurId = signal<number | null>(null);


  // ─── Collectes récentes ───────────────────────────────────────

  // Filtre les collectes liées au point affiché
  // et conserve uniquement les 5 premières.
  collectesRecentes = computed(() =>
    this.collectes()
      .filter(c => c.idPoint === this.point()?.idPoint)
      .slice(0, 5)
  );


  // ─── Initialisation ───────────────────────────────────────────

  ngOnInit(): void {

    // Récupère l'identifiant du point depuis l'URL.
    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    // Vérifie que l'identifiant est valide.
    if (Number.isInteger(id) && id > 0) {

      // L'administrateur peut directement charger le point.
      if (this.estAdministrateur) {
        this.chargerPoint(id);

      } else {

        // Pour les autres utilisateurs, on vérifie d'abord
        // l'identité de l'utilisateur connecté.
        this.auth.me().subscribe({
          next: utilisateur => {

            // Conserve son identifiant pour vérifier ses droits.
            this.utilisateurId.set(utilisateur.id);

            this.chargerPoint(id);
          },

          error: () => {
            this.erreur.set(
              'Impossible de vérifier votre compte. Reconnectez-vous puis réessayez.'
            );

            this.chargement.set(false);
          },
        });
      }

    } else {

      // L'identifiant présent dans l'URL n'est pas valide.
      this.erreur.set('Identifiant de point invalide.');
      this.chargement.set(false);
    }
  }


  // ─── Nettoyage du composant ───────────────────────────────────

  ngOnDestroy(): void {

    // Supprime la carte Leaflet avant de détruire le composant.
    this.carte?.remove();

    this.carte = null;
  }


  // ─── Chargement du point ──────────────────────────────────────

  private chargerPoint(id: number): void {

    this.chargement.set(true);
    this.erreur.set(null);

    // Récupère les informations du point depuis l'API.
    this.pointCollecteService.obtenirPoint(id).subscribe({

      next: (point) => {

        // Stocke le point récupéré.
        this.point.set(point);

        this.chargement.set(false);

        // Initialise la carte après l'affichage du HTML.
        setTimeout(
          () => this.initialiserCarte(point),
          0
        );


        // Récupère également les collectes pour afficher
        // les dernières collectes associées au point.
        this.collecteService.listerCollectes().subscribe({

          next: (collectes) => {
            this.collectes.set(collectes);
          },

          // Les collectes ne bloquent pas l'affichage du point.
          error: () => {
            // On continue même si l'historique est indisponible.
          },
        });
      },

      error: () => {

        // Affiche une erreur si le point n'a pas pu être chargé.
        this.erreur.set(
          'Impossible de charger les informations de ce point.'
        );

        this.chargement.set(false);
      },
    });
  }


  // ─── Initialisation de la carte Leaflet ───────────────────────

  private initialiserCarte(point: PointCollecte): void {

    // Récupère l'élément HTML contenant la carte.
    const element = this.carteRef?.nativeElement;

    // Convertit les coordonnées en nombres.
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);

    // Arrête l'initialisation si les données sont invalides.
    if (
      !element ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    // Supprime une ancienne carte avant d'en créer une nouvelle.
    this.carte?.remove();

    // Crée la carte centrée sur le point de collecte.
    this.carte = L.map(element, {
      zoomControl: false,
      scrollWheelZoom: false,
    }).setView(
      [latitude, longitude],
      15
    );


    // Ajoute le fond de carte OpenStreetMap.
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    ).addTo(this.carte);


    // Ajoute le marqueur correspondant au point de collecte.
    L.marker([
      latitude,
      longitude,
    ]).addTo(this.carte);


    // Force Leaflet à recalculer la taille de la carte
    // après son affichage dans le DOM.
    setTimeout(
      () => this.carte?.invalidateSize(),
      0
    );
  }


  // ─── Vérification des droits ──────────────────────────────────

  // Vérifie si l'utilisateur peut gérer ce point.
  estGerant(): boolean {

    const point = this.point();
    const utilisateurId = this.utilisateurId();

    // L'administrateur peut toujours gérer le point.
    return this.estAdministrateur ||

      // Sinon, seul le gestionnaire enregistré du point
      // peut effectuer les opérations de gestion.
      (!!point &&
        utilisateurId !== null &&
        Number(point.gerePar) === utilisateurId);
  }


  // ─── Navigation vers la planification ─────────────────────────

  // Ouvre la page de planification des collectes.
  planifierCollecte(): void {
    this.router.navigate([
      '/collecteur/planification',
    ]);
  }


  // ─── Modification du point ────────────────────────────────────

  modifierPoint(): void {

    // Bloque la modification si l'utilisateur n'est pas gestionnaire.
    if (!this.estGerant()) {
      return;
    }

    // Choisit la route selon l'espace actuel.
    this.router.navigate(
      [
        this.estAdministrateur
          ? '/admin/ajouter-point-collecte'
          : '/collecteur/ajouter-point-collecte',
      ],
      {
        // Envoie l'identifiant du point à modifier.
        queryParams: {
          id: this.point()?.idPoint,
        },
      }
    );
  }


  // ─── Suppression du point ─────────────────────────────────────

  async supprimerPoint(): Promise<void> {

    const point = this.point();

    // Vérifie que le point existe et que l'utilisateur
    // possède les droits nécessaires.
    if (!point || !this.estGerant()) {
      return;
    }


    // Demande une confirmation avant la suppression.
    const confirmation = await Swal.fire({
      title: 'Supprimer ce point ?',

      text:
        `Voulez-vous vraiment supprimer « ${point.nom} » ? Cette action est irréversible.`,

      icon: 'warning',

      showCancelButton: true,

      confirmButtonText: 'Oui, supprimer',

      cancelButtonText: 'Annuler',

      confirmButtonColor: '#0EA5A4',

      cancelButtonColor: '#94A3B8',

      reverseButtons: true,
    });


    // Arrête la fonction si l'utilisateur annule.
    if (!confirmation.isConfirmed) {
      return;
    }


    // Appelle l'API pour supprimer le point.
    this.pointCollecteService
      .supprimerPointCollecte(point.idPoint)
      .subscribe({

        next: () => {

          // Affiche un message de confirmation.
          void Swal.fire({
            title: 'Point supprimé',

            text:
              'Le point de collecte a bien été supprimé.',

            icon: 'success',

            confirmButtonColor: '#0EA5A4',
          })

          // Retourne vers la liste après fermeture du message.
          .then(() => this.retour());
        },


        error: () => {

          // Affiche une erreur si la suppression échoue.
          void Swal.fire({
            title: 'Suppression impossible',

            text:
              'La suppression du point a échoué. Veuillez réessayer.',

            icon: 'error',

            confirmButtonColor: '#0EA5A4',
          });
        },
      });
  }


  // ─── Retour à la liste ────────────────────────────────────────

  retour(): void {

    // Retourne vers la liste correspondant à l'espace actuel.
    this.router.navigate([
      this.estAdministrateur
        ? '/admin/admin-collecte'
        : '/collecteur/points-collecte',
    ]);
  }


  // ─── Historique des collectes ─────────────────────────────────

  voirHistorique(): void {

    // Ouvre l'historique correspondant à l'espace actuel.
    this.router.navigate([
      this.estAdministrateur
        ? '/admin/admin-collecte'
        : '/collecteur/historique',
    ]);
  }


  // ─── Formatage des dates ──────────────────────────────────────

  // Transforme une date ISO en date française lisible.
  formaterDate(dateIso: string): string {

    return new Date(dateIso).toLocaleDateString(
      'fr-FR',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  }


  // ─── Couleur du statut d'une collecte ─────────────────────────

  // Retourne les classes Tailwind correspondant au statut.
  classeStatut(statut: string): string {

    switch (statut) {

      case 'planifiee':
        return 'bg-orange-100 text-orange-600';

      case 'en_cours':
        return 'bg-blue-100 text-blue-700';

      case 'terminee':
        return 'bg-green-100 text-green-700';

      case 'annulee':
        return 'bg-red-100 text-red-600';

      default:
        return 'bg-gray-100 text-gray-500';
    }
  }


  // ─── Libellé du statut ────────────────────────────────────────

  // Transforme le code du statut en texte français.
  libelleStatut(statut: string): string {

    const map: Record<string, string> = {
      planifiee: 'Planifiée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      annulee: 'Annulée',
    };

    return map[statut] ?? statut;
  }


  // ─── Couleur du type de déchet ────────────────────────────────

  // Associe une couleur à chaque catégorie de déchet.
  couleurDechet(nom: string): string {

    const map: Record<string, string> = {

      'Plastique':
        'bg-blue-100 text-blue-700',

      'Verre':
        'bg-green-100 text-green-700',

      'Métal':
        'bg-slate-100 text-slate-600',

      'Papier-carton':
        'bg-orange-100 text-orange-600',

      'Électronique':
        'bg-red-100 text-red-600',

      'Organique':
        'bg-lime-100 text-lime-700',
    };

    // Couleur par défaut si le type n'est pas trouvé.
    return map[nom] ??
      'bg-[#D8F7F4] text-[#087C78]';
  }


  // ─── Lien Google Maps ─────────────────────────────────────────

  // Construit automatiquement une URL Google Maps
  // à partir des coordonnées du point.
  urlGoogleMaps = computed(() => {

    const p = this.point();

    // Aucun point chargé : aucun lien disponible.
    if (!p) {
      return '#';
    }

    return `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
  });

}
