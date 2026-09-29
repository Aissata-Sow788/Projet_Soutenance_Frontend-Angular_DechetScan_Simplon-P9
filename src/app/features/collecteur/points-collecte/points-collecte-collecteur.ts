// Imports Angular nécessaires au composant et à la gestion de l'état.
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Leaflet permet d'afficher et de gérer la carte.
import * as L from 'leaflet';

// SweetAlert2 permet d'afficher les confirmations et messages.
import Swal from 'sweetalert2';

// Services utilisés pour l'utilisateur et les points de collecte.
import { Auth } from '../../../core/services/auth';
import { PointCollecteService } from '../../../core/services/point-collecte';

// Modèle représentant un point de collecte.
import { PointCollecte } from '../../../shared/models/point-collecte.model';


@Component({
  imports: [CommonModule],
  selector: 'app-points-collecte-collecteur',
  styleUrl: './points-collecte-collecteur.css',
  templateUrl: './points-collecte-collecteur.html',
})
export class PointsCollecteCollecteur implements OnInit, OnDestroy {

  // Services injectés dans le composant.
  private readonly router = inject(Router);
  private readonly pointCollecteService = inject(PointCollecteService);
  private readonly auth = inject(Auth);

  // Indique si les données sont en cours de chargement.
  chargement = signal(true);

  // Contient le message d'erreur éventuel.
  erreur = signal<string | null>(null);

  // Liste complète des points récupérés depuis l'API.
  points = signal<PointCollecte[]>([]);

  // Identifiant de l'utilisateur connecté.
  readonly utilisateurId = signal<number | null>(null);

  // Instance de la carte Leaflet.
  private carte: L.Map | null = null;

  // Groupe contenant tous les marqueurs de la carte.
  private readonly marqueurs = L.layerGroup();

  // Valeur saisie dans la barre de recherche.
  recherche = signal('');

  // Quartier sélectionné dans le filtre.
  filtreQuartier = signal('Tous');

  // Retourne uniquement les points correspondant aux filtres.
  pointsFiltres = computed(() => {

    // Normalise le texte recherché.
    const texte = this.recherche().trim().toLowerCase();

    // Récupère le quartier sélectionné.
    const quartier = this.filtreQuartier();

    return this.points().filter(point => {

      // Recherche dans le nom, la ville et les types de déchets.
      const correspondRecherche =
        !texte ||
        point.nom.toLowerCase().includes(texte) ||
        point.ville.toLowerCase().includes(texte) ||
        point.dechetsAcceptes.some(
          d => d.nom.toLowerCase().includes(texte)
        );

      // Vérifie le filtre du quartier.
      const correspondQuartier =
        quartier === 'Tous' ||
        this.determinerQuartier(point) === quartier;

      // Le point doit respecter les deux filtres.
      return correspondRecherche && correspondQuartier;
    });
  });

  // Calcule le nombre de points actuellement actifs.
  nombreActifs = computed(() =>
    this.points().filter(
      p => p.statut === 'actif'
    ).length
  );

  // Initialise la page.
  ngOnInit(): void {

    // Vérifie d'abord l'utilisateur connecté.
    this.auth.me().subscribe({

      next: utilisateur => {

        // Stocke son identifiant.
        this.utilisateurId.set(utilisateur.id);

        // Charge ensuite les points de collecte.
        this.chargerPoints();
      },

      error: () => {

        // Affiche une erreur si l'utilisateur ne peut pas être vérifié.
        this.erreur.set(
          'Impossible de vérifier votre compte. Reconnectez-vous puis réessayez.'
        );

        this.chargement.set(false);
      },
    });
  }

  // Récupère les points depuis l'API.
  private chargerPoints(): void {

    this.chargement.set(true);
    this.erreur.set(null);

    this.pointCollecteService.listerPoints().subscribe({

      next: (liste) => {

        // Enregistre les points reçus.
        this.points.set(liste);

        this.chargement.set(false);

        // Initialise la carte après le rendu du HTML.
        setTimeout(
          () => this.initialiserCarte(),
          100
        );
      },

      error: () => {

        // Affiche une erreur si l'API ne répond pas correctement.
        this.erreur.set(
          'Impossible de charger les points de collecte.'
        );

        this.chargement.set(false);
      }
    });
  }

  // Détermine le quartier à partir des coordonnées GPS.
  determinerQuartier(point: PointCollecte): string {

    if (
      point.latitude > 14.72 &&
      point.longitude < -17.48
    ) {
      return 'Almadies';
    }

    if (point.longitude > -17.44) {
      return 'Plateau';
    }

    return 'Grand Dakar';
  }

  // Met à jour la recherche lorsque l'utilisateur saisit du texte.
  rechercher(event: Event): void {

    this.recherche.set(
      (event.target as HTMLInputElement).value
    );

    // Actualise les marqueurs selon la nouvelle recherche.
    this.mettreAJourMarqueurs();
  }

  // Change le quartier sélectionné.
  changerQuartier(quartier: string): void {

    this.filtreQuartier.set(quartier);

    // Actualise les marqueurs après le changement.
    this.mettreAJourMarqueurs();
  }

  // Ouvre la page de détail du point sélectionné.
  ouvrirDetail(point: PointCollecte): void {

    this.router.navigate([
      '/collecteur/points-collecte',
      point.idPoint
    ]);
  }

  // Ouvre le formulaire d'ajout d'un nouveau point.
  ajouterPoint(): void {

    this.router.navigate([
      '/collecteur/ajouter-point-collecte'
    ]);
  }

  // Vérifie si l'utilisateur connecté gère ce point.
  estGerant(point: PointCollecte): boolean {

    const utilisateurId = this.utilisateurId();

    return (
      utilisateurId !== null &&
      Number(point.gerePar) === utilisateurId
    );
  }

  // Ouvre le formulaire pour modifier un point.
  modifierPoint(point: PointCollecte): void {

    this.router.navigate(
      ['/collecteur/ajouter-point-collecte'],
      {
        // Transmet l'identifiant du point à modifier.
        queryParams: {
          id: point.idPoint
        },
      }
    );
  }

  // Supprime un point après confirmation.
  async supprimerPoint(
    point: PointCollecte
  ): Promise<void> {

    // Demande confirmation avant la suppression.
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

    // Arrête la suppression si l'utilisateur annule.
    if (!confirmation.isConfirmed) {
      return;
    }

    // Appelle l'API pour supprimer le point.
    this.pointCollecteService
      .supprimerPointCollecte(point.idPoint)
      .subscribe({

        next: () => {

          // Retire le point de la liste locale.
          this.points.update(points =>
            points.filter(
              element =>
                element.idPoint !== point.idPoint
            )
          );

          // Actualise les marqueurs de la carte.
          this.mettreAJourMarqueurs();

          // Informe l'utilisateur de la réussite.
          void Swal.fire({

            title: 'Point supprimé',

            text:
              'Le point de collecte a bien été supprimé.',

            icon: 'success',

            confirmButtonColor: '#0EA5A4',
          });
        },

        error: (error: { status?: number }) => {

          // Adapte le message selon l'erreur retournée par l'API.
          const message =
            error.status === 403 ||
            error.status === 404
              ? 'Vous ne pouvez supprimer que les points que vous gérez.'
              : 'La suppression du point a échoué. Veuillez réessayer.';

          void Swal.fire({

            title: 'Suppression impossible',

            text: message,

            icon: 'error',

            confirmButtonColor: '#0EA5A4',
          });
        },
      });
  }

  // Détruit la carte lorsque le composant est supprimé.
  ngOnDestroy(): void {

    this.carte?.remove();
    this.carte = null;
  }

  // Initialise la carte Leaflet.
  private initialiserCarte(): void {

    // Si la carte existe déjà, on recalcule simplement sa taille.
    if (this.carte) {

      this.carte.invalidateSize();

      return;
    }

    // Crée la carte centrée sur Dakar.
    this.carte = L.map(
      'carte-collecteur-points',
      {
        zoomControl: false,
      }
    ).setView(
      [14.7167, -17.4677],
      12
    );

    // Ajoute le fond de carte OpenStreetMap.
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap',
      }
    ).addTo(this.carte);

    // Ajoute le groupe de marqueurs à la carte.
    this.marqueurs.addTo(this.carte);

    // Affiche les marqueurs correspondant aux filtres.
    this.mettreAJourMarqueurs();
  }

  // Actualise les marqueurs selon les points filtrés.
  private mettreAJourMarqueurs(): void {

    // Impossible d'ajouter des marqueurs sans carte.
    if (!this.carte) {
      return;
    }

    // Supprime les anciens marqueurs.
    this.marqueurs.clearLayers();

    // Parcourt uniquement les points filtrés.
    this.pointsFiltres().forEach(point => {

      // Vert pour un point actif, gris sinon.
      const couleur =
        point.statut === 'actif'
          ? '#10B981'
          : '#94A3B8';

      // Crée une icône personnalisée pour le marqueur.
      const icone = L.divIcon({

        className: 'marqueur-point-collecteur',

        // HTML utilisé pour dessiner le marqueur.
        html: `
          <div
            style="
              width:30px;
              height:30px;
              border-radius:9999px;
              background:${couleur};
              border:3px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,.25);
              display:flex;
              align-items:center;
              justify-content:center;
              color:white;
              font-size:14px;
              font-weight:800
            "
          >
            ✓
          </div>
        `,

        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      // Crée le contenu de la fenêtre affichée
      // lorsque l'utilisateur clique sur le marqueur.
      const contenuPopup = document.createElement('div');

      const nom = document.createElement('strong');

      // textContent évite d'interpréter le nom comme du HTML.
      nom.textContent = point.nom;

      contenuPopup.append(
        nom,
        document.createElement('br'),
        document.createTextNode(point.ville)
      );

      // Ajoute le marqueur avec sa fenêtre d'information.
      L.marker(
        [point.latitude, point.longitude],
        { icon: icone }
      )
        .bindPopup(contenuPopup)
        .addTo(this.marqueurs);
    });
  }
}
