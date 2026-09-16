// Importe les outils Angular nécessaires au composant.
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Importe le service et le modèle des points de collecte.
import { PointCollecteService } from '../../core/services/point-collecte';
import { PointCollecte } from '../../shared/models/point-collecte.model';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';

// Ajoute la distance calculée à chaque point.
interface PointAvecDistance extends PointCollecte {
  distanceKm: number;
}

@Component({
  imports: [CommonModule, BarreNavigations], // Modules utilisés dans le HTML.
  selector: 'app-points-collecte', // Nom du composant.
  styleUrl: './points-collecte.css', // Fichier CSS.
  templateUrl: './points-collecte.html', // Fichier HTML.
})
export class PointsCollecte implements OnInit {

  // Services utilisés pour les données et la navigation.
  private pointCollecteService = inject(PointCollecteService);
  private router = inject(Router);

  // États de la page.
  chargement = signal(true);
  erreurGeoloc = signal<string | null>(null);
  positionUtilisateur = signal<{ lat: number; lng: number } | null>(null);
  points = signal<PointCollecte[]>([]);

  // Trie automatiquement les points selon la distance.
  pointsTries = computed<PointAvecDistance[]>(() => {
    const position = this.positionUtilisateur();
    const liste = this.points();

    // Sans GPS, conserve l'ordre reçu.
    if (!position) {
      return liste.map(p => ({ ...p, distanceKm: 0 }));
    }

    // Calcule puis trie les points du plus proche au plus loin.
    return liste
      .map(p => ({
        ...p,
        distanceKm: this.pointCollecteService.calculerDistanceKm(
          position.lat,
          position.lng,
          p.latitude,
          p.longitude
        )
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  });

  // Lance le chargement des données au démarrage.
  ngOnInit(): void {
    this.chargerPoints();
    this.localiserUtilisateur();
  }

  // Récupère tous les points de collecte.
  private chargerPoints(): void {
    this.pointCollecteService.listerPoints().subscribe({
      // Enregistre les points reçus.
      next: (liste) => {
        this.points.set(liste);
        this.chargement.set(false);
      },
      // Arrête le chargement en cas d'erreur.
      error: () => this.chargement.set(false)
    });
  }

  // Récupère la position GPS de l'utilisateur.
  private localiserUtilisateur(): void {
    // Vérifie si le navigateur supporte la géolocalisation.
    if (!navigator.geolocation) {
      this.erreurGeoloc.set(
        'Géolocalisation non supportée par ce navigateur.'
      );
      return;
    }

    // Demande la position actuelle.
    navigator.geolocation.getCurrentPosition(
      // Enregistre les coordonnées obtenues.
      (position) => {
        this.positionUtilisateur.set({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      // Affiche un message si la position est indisponible.
      () => {
        this.erreurGeoloc.set(
          'Position non disponible — tri par proximité désactivé.'
        );
      }
    );
  }

  // Ouvre la page détaillée du point sélectionné.
  ouvrirDetail(idPoint: number): void {
    this.router.navigate(['/points-collecte', idPoint]);
  }
}
