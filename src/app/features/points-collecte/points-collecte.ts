// Outils Angular nécessaires au composant.
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
// Service et modèle des points de collecte.
import { PointCollecteService } from '../../core/services/point-collecte';
import { PointCollecte } from '../../shared/models/point-collecte.model';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { Navigations } from '../../shared/components/navigations/navigations';
import { Footer } from '../../shared/components/footer/footer';

// Point enrichi avec sa distance et son icône (calculées pour l'affichage).
interface PointAvecDistance extends PointCollecte {
  distanceKm: number;
  icone: 'recyclage' | 'poubelle' | 'ecran' | 'maison';
}

@Component({
  imports: [CommonModule, BarreNavigations, RouterLink, Navigations, Footer],
  selector: 'app-points-collecte',
  styleUrl: './points-collecte.css',
  templateUrl: './points-collecte.html',
})
export class PointsCollecte implements OnInit {
  // Service d'appel à l'API et Router pour la navigation.
  private pointCollecteService = inject(PointCollecteService);
  private router = inject(Router);

  // true tant que l'API n'a pas répondu.
  chargement = signal(true);

  // Message d'erreur de géolocalisation (null = aucune erreur).
  erreurGeoloc = signal<string | null>(null);

  // Position de l'utilisateur (null tant qu'elle est inconnue).
  positionUtilisateur = signal<{ lat: number; lng: number } | null>(null);

  // Points récupérés depuis l'API.
  points = signal<PointCollecte[]>([]);

  // Texte saisi dans la barre de recherche.
  recherche = signal('');

  // Liste finale : filtrée par la recherche, avec icône, distance et tri.
  pointsTries = computed<PointAvecDistance[]>(() => {
    const position = this.positionUtilisateur();
    const terme = this.normaliser(this.recherche());

    // 1. Filtre : garde les points dont le nom, l'adresse,
    //    le quartier ou un type de déchet contient le terme.
    const filtres = this.points().filter(p => {
      if (!terme) return true;
      const champs = [
        p.nom,
        (p as any).adresse ?? '',
        (p as any).quartier ?? '',
        ...p.dechetsAcceptes.map(d => d.nom),
      ];
      return champs.some(c => this.normaliser(c ?? '').includes(terme));
    });

    // 2. Ajoute l'icône à chaque point.
    const avecIcone = filtres.map(p => ({ ...p, icone: this.determinerIcone(p) }));

    // 3. Sans position : distance à 0, pas de tri.
    if (!position) {
      return avecIcone.map(p => ({ ...p, distanceKm: 0 }));
    }

    // 4. Avec position : calcule la distance puis trie du plus proche au plus loin.
    return avecIcone
      .map(p => ({
        ...p,
        distanceKm: this.pointCollecteService.calculerDistanceKm(
          position.lat, position.lng, p.latitude, p.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  });

  // Au chargement : récupère les points et la position.
  ngOnInit(): void {
    this.chargerPoints();
    this.localiserUtilisateur();
  }

  // Met à jour la recherche à chaque frappe.
  surRecherche(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  // Minuscules + suppression des accents ("Médina" = "medina").
  private normaliser(texte: string): string {
    return texte
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // Appelle l'API Django pour lister les points.
  private chargerPoints(): void {
    this.pointCollecteService.listerPoints().subscribe({
      next: (liste) => {
        this.points.set(liste);
        this.chargement.set(false);
      },
      // Même en cas d'erreur, on arrête le chargement.
      error: () => this.chargement.set(false),
    });
  }

  // Demande la position au navigateur.
  private localiserUtilisateur(): void {
    if (!navigator.geolocation) {
      this.erreurGeoloc.set('Géolocalisation non supportée par ce navigateur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        this.positionUtilisateur.set({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => this.erreurGeoloc.set('Position non disponible — tri par proximité désactivé.')
    );
  }

  // Choisit l'icône selon le premier type de déchet accepté.
  private determinerIcone(point: PointCollecte): 'recyclage' | 'poubelle' | 'ecran' | 'maison' {
    const type = point.dechetsAcceptes[0]?.nom?.toLowerCase() ?? '';

    if (type.includes('électro') || type.includes('electro')) return 'ecran';
    if (type.includes('organique') || type.includes('carton')) return 'poubelle';
    if (type.includes('métal') || type.includes('metal') || type.includes('verre')) return 'maison';
    return 'recyclage'; // Icône par défaut.
  }

  // Ouvre la page de détail, ex. /points-collecte/5.
  ouvrirDetail(idPoint: number): void {
    this.router.navigate(['/points-collecte', idPoint]);
  }
}
