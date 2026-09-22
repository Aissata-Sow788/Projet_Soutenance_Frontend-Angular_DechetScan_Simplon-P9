// Importe les éléments Angular nécessaires au composant.
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PointCollecteService } from '../../../core/services/point-collecte';
import { PointCollecte } from '../../../shared/models/point-collecte.model';
// Importe Leaflet pour afficher la carte.
import * as L from 'leaflet';
import { RouterLink } from '@angular/router';


@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-points-collecte',
  styleUrl: './points-collecte.css',
  templateUrl: './points-collecte.html',
})
export class PointsCollecte implements OnInit {

   // Injecte le service des points de collecte.
  private pointCollecteService = inject(PointCollecteService);

  // Injecte le Router pour ouvrir une page de détail si nécessaire.
  private router = inject(Router);

  // Stocke tous les points récupérés depuis le service.
  points = signal<PointCollecte[]>([]);

  // Indique si les données sont encore en chargement.
  chargement = signal(true);

  // Contient le texte saisi dans la recherche.
  recherche = signal('');

  // Filtre actuellement sélectionné.
  filtreQuartier = signal('Tous');

  // Instance de la carte Leaflet.
  private carte: L.Map | null = null;

  // Liste des points après recherche et filtrage.
  pointsFiltres = computed(() => {

    // Récupère le texte de recherche en supprimant les espaces inutiles.
    const texte = this.recherche().trim().toLowerCase();

    // Récupère le quartier actuellement sélectionné.
    const quartier = this.filtreQuartier();

    // Filtre les points.
    return this.points().filter(point => {

      // Vérifie si le point correspond à la recherche.
      const correspondRecherche =
        !texte ||
        point.nom.toLowerCase().includes(texte) ||
        point.ville.toLowerCase().includes(texte) ||
        point.dechetsAcceptes.some(dechet =>
          dechet.nom.toLowerCase().includes(texte)
        );

      // Vérifie le filtre géographique.
      const correspondQuartier = quartier === 'Tous' || this.determinerQuartier(point) === quartier;

      // Le point doit respecter les deux conditions.
      return correspondRecherche && correspondQuartier;
    });
  });


  // Exécute le chargement au démarrage du composant.
  ngOnInit(): void {

    // Charge les données mockées.
    this.chargerPoints();
  }


  // Récupère les points depuis le service.
  private chargerPoints(): void {

    // Lance la récupération des points.
    this.pointCollecteService.listerPoints().subscribe({

      // Lorsque les données sont reçues.
      next: (liste) => {

        // Stocke les points.
        this.points.set(liste);

        // Arrête l'indicateur de chargement.
        this.chargement.set(false);

        // Initialise la carte après l'affichage du composant.
        setTimeout(() => this.initialiserCarte(), 100);
      },

      // En cas d'erreur.
      error: () => {

        // Arrête le chargement.
        this.chargement.set(false);
      }
    });
  }


  // Met à jour la recherche.
  rechercher(event: Event): void {

    // Récupère la valeur du champ.
    const valeur = (event.target as HTMLInputElement).value;

    // Met à jour le signal.
    this.recherche.set(valeur);
  }


  // Change le filtre géographique.
  changerQuartier(quartier: string): void {

    // Met à jour le filtre actif.
    this.filtreQuartier.set(quartier);
  }


  // Retourne le nombre de points actifs.
  nombreActifs(): number {

    // Compte uniquement les points actifs.
    return this.points().filter(point => point.statut === 'actif').length;
  }


  // Détermine un quartier approximatif à partir des coordonnées mock.
  private determinerQuartier(point: PointCollecte): string {

    // Les coordonnées des Almadies sont plus à l'ouest et au nord.
    if (point.latitude > 14.72 && point.longitude < -17.48) {
      return 'Almadies';
    }

    // Les autres points sont ici regroupés dans le secteur Plateau.
    if (point.longitude > -17.44) {
      return 'Plateau';
    }

    // Secteur Grand Dakar pour les autres points.
    return 'Grand Dakar';
  }


  // Retourne le libellé du quartier d'un point.
  quartier(point: PointCollecte): string {

    // Utilise la fonction de détermination.
    return this.determinerQuartier(point);
  }


  // Ouvre le détail du point.
  ouvrirDetail(point: PointCollecte): void {

    // Navigue vers la page détail citoyenne existante.
    this.router.navigate(['/points-collecte', point.idPoint]);
  }


  // Fonction appelée par le bouton modifier.
  modifierPoint(point: PointCollecte): void {

    // Pour l'instant, affiche le point sélectionné dans la console.
    // Cette fonction pourra être reliée plus tard à un formulaire admin.
    console.log('Modifier le point :', point);
  }


  // Fonction appelée par le bouton supprimer.
  supprimerPoint(point: PointCollecte): void {

    // Pour l'instant, cette fonction est uniquement préparée.
    // La suppression sera ajoutée lorsque le backend existera.
    console.log('Supprimer le point :', point);
  }


  // Initialise la carte Leaflet.
  private initialiserCarte(): void {

    // Évite de créer plusieurs cartes.
    if (this.carte) {
      return;
    }

    // Crée la carte centrée sur Dakar.
    this.carte = L.map('carte-admin-points', {
      zoomControl: false
    }).setView([14.7167, -17.4677], 12);

    // Ajoute les tuiles OpenStreetMap.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.carte);

    // Ajoute les marqueurs.
    this.ajouterMarqueurs();
  }


  // Ajoute les marqueurs correspondant aux points mockés.
  private ajouterMarqueurs(): void {

    // Vérifie que la carte existe.
    if (!this.carte) {
      return;
    }

    // Parcourt tous les points.
    this.points().forEach(point => {

      // Choisit une couleur selon le statut.
      const couleur =
        point.statut === 'actif'
          ? '#10B981'
          : '#94A3B8';

      // Crée un marqueur circulaire personnalisé.
      const icone = L.divIcon({
        className: 'marqueur-point-admin',
        html: `
          <div
            style="
              width: 30px;
              height: 30px;
              border-radius: 9999px;
              background: ${couleur};
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
              font-weight: 800;
            "
          >
            ✓
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      // Crée le marqueur.
      L.marker(
        [point.latitude, point.longitude],
        { icon: icone }
      )
        // Ajoute une popup avec le nom du point.
        .bindPopup(`
          <strong>${point.nom}</strong><br>
          ${point.ville}
        `)

        // Ajoute le marqueur à la carte.
        .addTo(this.carte!);
    });
  }
}
