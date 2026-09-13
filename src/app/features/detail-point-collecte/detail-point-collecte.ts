import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { PointCollecteService } from '../../core/services/point-collecte';
import { GeocodingService } from '../../core/services/geocoding';
import { PointCollecte } from '../../shared/models/point-collecte.model';

interface PointAvecDistance extends PointCollecte {
  distanceKm: number;
}


@Component({
  imports: [CommonModule],
  selector: 'app-detail-point-collecte',
  styleUrl: './detail-point-collecte.css',
  templateUrl: './detail-point-collecte.html',
})

export class DetailPointCollecte implements OnInit, AfterViewInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pointCollecteService = inject(PointCollecteService);
  private geocodingService = inject(GeocodingService);

  @ViewChild('carte') carteRef!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;

  point = signal<PointCollecte | null>(null);
  adresse = signal<string>('Recherche de l\'adresse...');
  chargement = signal(true);
  autresPoints = signal<PointAvecDistance[]>([]);

  // true si l'heure actuelle est comprise entre heureOuverture et heureFermeture
  estOuvert = computed(() => {
    const p = this.point();
    if (!p) return false;
    const maintenant = new Date().toTimeString().slice(0, 5); // format "HH:mm"
    return maintenant >= p.heureOuverture && maintenant <= p.heureFermeture;
  });

  ngOnInit(): void {
    // Corrige un bug connu de Leaflet avec les bundlers (icônes par défaut introuvables)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const idPoint = Number(this.route.snapshot.paramMap.get('id'));
    this.chargerPoint(idPoint);
  }

  ngAfterViewInit(): void {
    // La carte est initialisée après coup, une fois le point chargé (voir chargerPoint)
  }

  private chargerPoint(idPoint: number): void {
    this.pointCollecteService.obtenirPoint(idPoint).subscribe(point => {
      if (!point) {
        this.chargement.set(false);
        return;
      }

      this.point.set(point);
      this.chargement.set(false);

      // Adresse réelle calculée à partir des coordonnées GPS
      this.geocodingService.obtenirAdresse(point.latitude, point.longitude).subscribe(adr => {
        this.adresse.set(adr);
      });

      this.chargerAutresPoints(point);

      // La carte ne peut être créée qu'une fois le <div> du template rendu
      setTimeout(() => this.initialiserCarte(point), 0);
    });
  }

  private chargerAutresPoints(pointActuel: PointCollecte): void {
    this.pointCollecteService.listerPoints().subscribe(liste => {
      const autres = liste
        .filter(p => p.idPoint !== pointActuel.idPoint)
        .map(p => ({
          ...p,
          distanceKm: this.pointCollecteService.calculerDistanceKm(
            pointActuel.latitude, pointActuel.longitude, p.latitude, p.longitude
          )
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3); // les 3 plus proches seulement

      this.autresPoints.set(autres);
    });
  }

  private initialiserCarte(point: PointCollecte): void {
    if (this.map) return; // évite de recréer la carte si déjà initialisée

    this.map = L.map(this.carteRef.nativeElement).setView([point.latitude, point.longitude], 15);

    // Fond de carte OpenStreetMap (gratuit, sans clé API)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    L.marker([point.latitude, point.longitude])
      .addTo(this.map)
      .bindPopup(point.nom)
      .openPopup();
  }

  retour(): void {
    this.router.navigate(['/points-collecte']);
  }

  ouvrirItineraire(): void {
    const p = this.point();
    if (!p) return;
    // Ouvre Google Maps dans un nouvel onglet avec l'itinéraire vers ce point
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`, '_blank');
  }

  ouvrirAutrePoint(idPoint: number): void {
    this.router.navigate(['/points-collecte', idPoint]);
  }
}
