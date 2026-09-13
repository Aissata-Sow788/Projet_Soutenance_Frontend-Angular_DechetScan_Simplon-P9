import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PointCollecteService } from '../../core/services/point-collecte';
import { PointCollecte } from '../../shared/models/point-collecte.model';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';

// Combine un point de collecte avec sa distance calculée par rapport à l'utilisateur
interface PointAvecDistance extends PointCollecte {
  distanceKm: number;
}


@Component({
  imports: [CommonModule, BarreNavigations],
  selector: 'app-points-collecte',
  styleUrl: './points-collecte.css',
  templateUrl: './points-collecte.html',
})
export class PointsCollecte implements OnInit{

   private pointCollecteService = inject(PointCollecteService);
  private router = inject(Router);

  chargement = signal(true);
  erreurGeoloc = signal<string | null>(null);
  positionUtilisateur = signal<{ lat: number; lng: number } | null>(null);
  points = signal<PointCollecte[]>([]);

  // Recalculé automatiquement dès que points() ou positionUtilisateur() changent
  pointsTries = computed<PointAvecDistance[]>(() => {
    const position = this.positionUtilisateur();
    const liste = this.points();

    if (!position) {
      // Pas de position dispo : distance à 0, ordre par défaut
      return liste.map(p => ({ ...p, distanceKm: 0 }));
    }

    return liste
      .map(p => ({
        ...p,
        distanceKm: this.pointCollecteService.calculerDistanceKm(position.lat, position.lng, p.latitude, p.longitude)
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm); // le plus proche en premier
  });

  ngOnInit(): void {
    this.chargerPoints();
    this.localiserUtilisateur();
  }

  private chargerPoints(): void {
    this.pointCollecteService.listerPoints().subscribe({
      next: (liste) => {
        this.points.set(liste);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false)
    });
  }

  // Demande la position GPS du navigateur (nécessaire pour trier par distance)
  private localiserUtilisateur(): void {
    if (!navigator.geolocation) {
      this.erreurGeoloc.set('Géolocalisation non supportée par ce navigateur.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.positionUtilisateur.set({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        this.erreurGeoloc.set('Position non disponible — tri par proximité désactivé.');
      }
    );
  }

  ouvrirDetail(idPoint: number): void {
    this.router.navigate(['/points-collecte', idPoint]);
  }

}
