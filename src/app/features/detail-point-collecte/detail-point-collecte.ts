// Outils Angular nécessaires au composant.
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Leaflet pour afficher la carte.
import * as L from 'leaflet';

// Services et modèle utilisés par la page.
import { PointCollecteService } from '../../core/services/point-collecte';
import { GeocodingService } from '../../core/services/geocoding';
import { PointCollecte } from '../../shared/models/point-collecte.model';
import { Footer } from '../../shared/components/footer/footer';
import { Navigations } from '../../shared/components/navigations/navigations';

// Point de collecte avec sa distance par rapport au point affiché.
interface PointAvecDistance extends PointCollecte {
  distanceKm: number;
}

// Identifiants des filtres de déchets.
type FiltreDechet = 'tous' | 'plastique' | 'metal' | 'carton';

@Component({
  imports: [CommonModule, Footer, Navigations],
  selector: 'app-detail-point-collecte',
  styleUrl: './detail-point-collecte.css',
  templateUrl: './detail-point-collecte.html',
})
export class DetailPointCollecte implements OnInit, OnDestroy {

  // Route, routeur et services.
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pointCollecteService = inject(PointCollecteService);
  private geocodingService = inject(GeocodingService);

  // Div de la carte et objets Leaflet.
  @ViewChild('carte') carteRef!: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;
  private couche: L.LayerGroup | null = null;       // Marqueurs des autres points.
  private marqueurCourant: L.Marker | null = null;  // Marqueur du point affiché.

  // Puces de filtre (mots = fragments cherchés, sans accent).
  readonly filtres: { id: FiltreDechet; label: string; mots: string[] }[] = [
    { id: 'tous', label: 'Tous', mots: [] },
    { id: 'plastique', label: 'Plastique', mots: ['plastique'] },
    { id: 'metal', label: 'Métal', mots: ['metal'] },
    { id: 'carton', label: 'Carton', mots: ['carton'] },
  ];

  // Données du point affiché.
  point = signal<PointCollecte | null>(null);
  adresse = signal<string>('Recherche de l\'adresse...');
  chargement = signal(true);

  // Tous les points + état des filtres.
  tousPoints = signal<PointCollecte[]>([]);
  filtreActif = signal<FiltreDechet>('tous');
  recherche = signal('');
  ouvertSeulement = signal(false);
  panneauFiltres = signal(false);

  // Points qui passent tous les filtres (déchet + recherche + ouvert).
  pointsFiltres = computed(() =>
    this.tousPoints().filter(p => this.passeAutres(p) && this.aDechet(p, this.filtreActif()))
  );

  // Nombre de points par puce.
  compteurs = computed(() => {
    const base = this.tousPoints().filter(p => this.passeAutres(p));
    const res = {} as Record<FiltreDechet, number>;
    this.filtres.forEach(f => (res[f.id] = base.filter(p => this.aDechet(p, f.id)).length));
    return res;
  });

  // Suggestions sous la barre de recherche.
  suggestions = computed(() => (this.recherche().trim() ? this.pointsFiltres().slice(0, 5) : []));

  // Autres points filtrés, du plus proche au plus loin du point affiché.
  autresPoints = computed<PointAvecDistance[]>(() => {
    const actuel = this.point();
    if (!actuel) return [];
    return this.pointsFiltres()
      .filter(p => p.idPoint !== actuel.idPoint)
      .map(p => ({
        ...p,
        distanceKm: this.pointCollecteService.calculerDistanceKm(
          actuel.latitude, actuel.longitude, p.latitude, p.longitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  });

  // Le point affiché est-il ouvert maintenant ?
  estOuvert = computed(() => {
    const p = this.point();
    return p ? this.ouvert(p) : false;
  });

  ngOnInit(): void {
    // Corrige les icônes par défaut de Leaflet.
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Recharge à chaque changement d'id dans l'URL
    // (Angular réutilise le composant, ngOnInit ne repasse pas).
    this.route.paramMap.subscribe(params => this.chargerPoint(Number(params.get('id'))));

    // Charge la liste complète une seule fois.
    this.pointCollecteService.listerPoints().subscribe(liste => {
      this.tousPoints.set(liste);
      this.rafraichirMarqueurs();
    });
  }

  // Libère la carte quand on quitte la page.
  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  // Recalcule la taille de la carte si la fenêtre change.
  @HostListener('window:resize')
  surRedimensionnement(): void {
    this.map?.invalidateSize();
  }

  // ---------- Filtres ----------

  // Minuscules + suppression des accents.
  private normaliser(t: string): string {
    return (t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  // Ouverture selon l'heure actuelle.
  private ouvert(p: PointCollecte): boolean {
    const maintenant = new Date().toTimeString().slice(0, 5);
    return maintenant >= p.heureOuverture && maintenant <= p.heureFermeture;
  }

  // Filtres "recherche" et "ouverts uniquement".
  private passeAutres(p: PointCollecte): boolean {
    const terme = this.normaliser(this.recherche());
    if (terme) {
      const champs = [p.nom, ...p.dechetsAcceptes.map(d => d.nom)];
      if (!champs.some(c => this.normaliser(c).includes(terme))) return false;
    }
    return !this.ouvertSeulement() || this.ouvert(p);
  }

  // Le point accepte-t-il ce type de déchet ?
  private aDechet(p: PointCollecte, id: FiltreDechet): boolean {
    if (id === 'tous') return true;
    const mots = this.filtres.find(f => f.id === id)!.mots;
    return p.dechetsAcceptes.some(d => mots.some(m => this.normaliser(d.nom).includes(m)));
  }

  // Clic sur une puce.
  choisirFiltre(id: FiltreDechet): void {
    this.filtreActif.set(id);
    this.rafraichirMarqueurs();
  }

  // Saisie dans la barre de recherche.
  surRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
    this.rafraichirMarqueurs();
  }

  // Efface la recherche.
  effacerRecherche(): void {
    this.recherche.set('');
    this.rafraichirMarqueurs();
  }

  // Touche Entrée : ouvre le premier résultat.
  validerRecherche(): void {
    const premier = this.suggestions()[0];
    if (premier) this.ouvrirAutrePoint(premier.idPoint);
  }

  // Ouvre/ferme le panneau de filtres.
  basculerPanneau(): void {
    this.panneauFiltres.update(v => !v);
  }

  // Active/désactive "ouverts uniquement".
  basculerOuvert(): void {
    this.ouvertSeulement.update(v => !v);
    this.rafraichirMarqueurs();
  }

  // Remet tous les filtres à zéro.
  reinitialiser(): void {
    this.filtreActif.set('tous');
    this.recherche.set('');
    this.ouvertSeulement.set(false);
    this.rafraichirMarqueurs();
  }

  // ---------- Données ----------

  // Charge le point demandé par l'URL.
  private chargerPoint(idPoint: number): void {
    this.pointCollecteService.obtenirPoint(idPoint).subscribe(point => {
      if (!point) {
        this.point.set(null);
        this.chargement.set(false);
        return;
      }
      this.point.set(point);
      this.chargement.set(false);

      // Adresse à partir des coordonnées GPS.
      this.adresse.set('Recherche de l\'adresse...');
      this.geocodingService.obtenirAdresse(point.latitude, point.longitude)
        .subscribe(adr => this.adresse.set(adr));

      // Attend le rendu de la div avant de créer/mettre à jour la carte.
      setTimeout(() => this.initialiserCarte(point), 0);
    });
  }

  // ---------- Carte ----------

  // Crée la carte, ou la recentre si elle existe déjà.
  private initialiserCarte(point: PointCollecte): void {
    if (this.map) {
      this.map.flyTo([point.latitude, point.longitude], 15, { duration: 0.5 });
      this.placerMarqueurCourant(point);
      this.rafraichirMarqueurs();
      return;
    }
    if (!this.carteRef) return;

    this.map = L.map(this.carteRef.nativeElement, {
      zoomControl: false,
      attributionControl: false,
    }).setView([point.latitude, point.longitude], 15);

    // Fond de carte OpenStreetMap.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    // Couche des autres points.
    this.couche = L.layerGroup().addTo(this.map);

    this.placerMarqueurCourant(point);
    this.rafraichirMarqueurs();
    this.map.invalidateSize();
  }

  // Place le grand marqueur du point affiché.
  private placerMarqueurCourant(point: PointCollecte): void {
    if (!this.map) return;
    this.marqueurCourant?.remove();

    const icone = L.divIcon({
      className: 'custom-point-marker',
      html: `
        <div class="marker-main">
          <div class="marker-trash">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 7h14"></path><path d="M9 7V4h6v3"></path>
              <path d="M7 7l1 13h8l1-13"></path>
              <path d="M10 11v6"></path><path d="M14 11v6"></path>
            </svg>
          </div>
          <span class="marker-label">${point.nom}</span>
        </div>`,
      iconSize: [132, 110],
      iconAnchor: [66, 65],
    });

    this.marqueurCourant = L.marker([point.latitude, point.longitude], { icon: icone }).addTo(this.map);
  }

  // Redessine les petits marqueurs des autres points filtrés.
  private rafraichirMarqueurs(): void {
    if (!this.map || !this.couche) return;
    this.couche.clearLayers();

    const courant = this.point();
    this.pointsFiltres()
      .filter(p => p.idPoint !== courant?.idPoint)
      .forEach(p => {
        L.circleMarker([p.latitude, p.longitude], {
          radius: 7, color: '#ffffff', weight: 2, fillColor: '#0EA5A4', fillOpacity: 1,
        })
          .bindTooltip(p.nom)
          .on('click', () => this.ouvrirAutrePoint(p.idPoint))
          .addTo(this.couche!);
      });
  }

  zoomIn(): void { this.map?.zoomIn(); }
  zoomOut(): void { this.map?.zoomOut(); }

  // Replace la carte sur le point affiché.
  centrerSurPoint(): void {
    const p = this.point();
    if (p && this.map) this.map.flyTo([p.latitude, p.longitude], 15, { duration: 0.5 });
  }

  // ---------- Navigation ----------

  retour(): void {
    this.router.navigate(['/points-collecte']);
  }

  // Ouvre Google Maps avec l'itinéraire.
  ouvrirItineraire(): void {
    const p = this.point();
    if (!p) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`,
      '_blank'
    );
  }

  // Ouvre un autre point, puis remonte en haut de la page.
  ouvrirAutrePoint(idPoint: number): void {
    this.recherche.set('');
    this.panneauFiltres.set(false);
    this.router.navigate(['/points-collecte', idPoint]).then(() =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
    );
  }
}
