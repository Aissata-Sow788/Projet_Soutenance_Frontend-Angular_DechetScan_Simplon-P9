// Importe les outils Angular nécessaires au composant.
import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Importe Leaflet pour afficher et manipuler la carte.
import * as L from 'leaflet';

// Services et modèle utilisés par la page.
import { PointCollecteService } from '../../core/services/point-collecte';
import { GeocodingService } from '../../core/services/geocoding';
import { PointCollecte } from '../../shared/models/point-collecte.model';

// Ajoute la distance à un point de collecte.
interface PointAvecDistance extends PointCollecte {
  distanceKm: number;
}

@Component({
  imports: [CommonModule], // Permet d'utiliser les directives Angular dans le HTML.
  selector: 'app-detail-point-collecte', // Nom de la balise du composant.
  styleUrl: './detail-point-collecte.css', // Fichier de styles.
  templateUrl: './detail-point-collecte.html', // Fichier HTML.
})
export class DetailPointCollecte implements OnInit, AfterViewInit {

  // Récupère la route, le routeur et les services de l'application.
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pointCollecteService = inject(PointCollecteService);
  private geocodingService = inject(GeocodingService);

  // Référence vers la div contenant la carte Leaflet.
  @ViewChild('carte') carteRef!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null; // Instance de la carte.

  // Données utilisées directement dans le HTML.
  point = signal<PointCollecte | null>(null);
  adresse = signal<string>('Recherche de l\'adresse...');
  chargement = signal(true);
  autresPoints = signal<PointAvecDistance[]>([]);

  // Vérifie si le point est actuellement ouvert.
  estOuvert = computed(() => {
    const p = this.point();
    if (!p) return false;

    const maintenant = new Date().toTimeString().slice(0, 5);
    return maintenant >= p.heureOuverture && maintenant <= p.heureFermeture;
  });

  // Initialise les données lorsque le composant est créé.
  ngOnInit(): void {
    // Corrige les chemins des icônes par défaut de Leaflet.
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Récupère l'identifiant du point depuis l'URL.
    const idPoint = Number(this.route.snapshot.paramMap.get('id'));
    this.chargerPoint(idPoint);
  }

  // Le HTML est rendu après cette étape ; la carte est créée plus tard.
  ngAfterViewInit(): void {}

  // Charge le point sélectionné et ses informations.
  private chargerPoint(idPoint: number): void {
    this.pointCollecteService.obtenirPoint(idPoint).subscribe(point => {
      // Arrête le chargement si le point n'existe pas.
      if (!point) {
        this.chargement.set(false);
        return;
      }

      // Enregistre le point et affiche son contenu.
      this.point.set(point);
      this.chargement.set(false);

      // Recherche l'adresse à partir des coordonnées GPS.
      this.geocodingService.obtenirAdresse(point.latitude, point.longitude).subscribe(adr => {
        this.adresse.set(adr);
      });

      // Charge les points de collecte proches.
      this.chargerAutresPoints(point);

      // Attend le rendu de la div avant de créer la carte.
      setTimeout(() => this.initialiserCarte(point), 0);
    });
  }

  // Recherche les trois points de collecte les plus proches.
  private chargerAutresPoints(pointActuel: PointCollecte): void {
    this.pointCollecteService.listerPoints().subscribe(liste => {
      const autres = liste
        // Exclut le point actuellement affiché.
        .filter(p => p.idPoint !== pointActuel.idPoint)
        // Calcule la distance de chaque point.
        .map(p => ({...p, distanceKm: this.pointCollecteService.calculerDistanceKm(
            pointActuel.latitude, pointActuel.longitude, p.latitude, p.longitude)
        }))
        // Classe les points du plus proche au plus loin.
        .sort((a, b) => a.distanceKm - b.distanceKm)
        // Garde seulement les trois premiers.
        .slice(0, 3);

      this.autresPoints.set(autres);
    });
  }

  // Initialise la carte Leaflet avec le point sélectionné.
  private initialiserCarte(point: PointCollecte): void {
    // Évite de créer la carte plusieurs fois.
    if (this.map) return;

    this.map = L.map(this.carteRef.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView([point.latitude, point.longitude],15);

    // Ajoute le fond de carte OpenStreetMap.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Crée le marqueur personnalisé affiché au centre de la carte.
    const markerIcon = L.divIcon({
      className: 'custom-point-marker',
      html: `
        <div class="marker-main">
          <div class="marker-trash">
            <svg viewBox="0 0 24 24" fill="none"
                 stroke="white" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 7h14"></path>
              <path d="M9 7V4h6v3"></path>
              <path d="M7 7l1 13h8l1-13"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
            </svg>
          </div>
          <span class="marker-label">${point.nom}</span>
        </div>
      `,
      iconSize: [132, 110],
      iconAnchor: [66, 65],
      popupAnchor: [0, -48]
    });

    // Place le marqueur sur les coordonnées du point.
    L.marker(
      [point.latitude, point.longitude],
      { icon: markerIcon }
    ).addTo(this.map);

    // Force Leaflet à recalculer la taille de la carte.
    this.map.invalidateSize();
  }

  // Zoome sur la carte.
  zoomIn(): void {
    this.map?.zoomIn();
  }

  // Dézoome sur la carte.
  zoomOut(): void {
    this.map?.zoomOut();
  }

  // Replace la carte sur le point sélectionné.
  centrerSurPoint(): void {
    const p = this.point();
    if (!p || !this.map) return;

    this.map.flyTo(
      [p.latitude, p.longitude],
      15,
      { duration: 0.5 }
    );
  }

  // Retourne vers la liste des points de collecte.
  retour(): void {
    this.router.navigate(['/points-collecte']);
  }

  // Ouvre Google Maps avec l'itinéraire vers le point.
  ouvrirItineraire(): void {
    const p = this.point();
    if (!p) return;

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`,
      '_blank'
    );
  }

  // Ouvre la page détail d'un autre point de collecte.
  ouvrirAutrePoint(idPoint: number): void {
    this.router.navigate(['/points-collecte', idPoint]);
  }
}
