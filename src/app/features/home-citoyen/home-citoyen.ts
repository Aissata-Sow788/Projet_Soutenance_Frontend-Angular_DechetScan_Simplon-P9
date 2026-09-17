import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';


// Données affichées dans les cartes "Mes derniers scans".
interface DernierScan {
  nom: string;
  categorie: string;
  date: string;
  destination: string;
  image?: string;
}

// Données affichées dans la section "Points de collecte".
interface PointProche {
  nom: string;
  distance: string;
  info: string;
  type: 'recyclage' | 'point';
}


@Component({
  imports: [CommonModule, BarreNavigations],
  selector: 'app-home-citoyen',
  styleUrl: './home-citoyen.css',
  templateUrl: './home-citoyen.html',
})
export class HomeCitoyen {

   // Permet de modifier les données plus tard sans changer le HTML.
  nombreScans = signal(24);
  citoyensActifs = signal('14.2k');

  // Historique temporaire : à remplacer plus tard par les données de l'API.
  derniersScans = signal<DernierScan[]>([
    {
      nom: "Bouteille d'eau",
      categorie: 'Plastique',
      date: "Aujourd'hui — 10:32",
      destination: 'Bac Jaune'
    },
    {
      nom: 'Canette métal',
      categorie: 'Métal',
      date: 'Hier — 16:45',
      destination: 'Bac Métal'
    }
  ]);

  // Points proches affichés sur la page d'accueil.
  pointsProches = signal<PointProche[]>([
    {
      nom: 'Point de collecte — Plateau',
      distance: '1,2 km',
      info: "Ouvert jusqu'à 19h",
      type: 'point'
    },
    {
      nom: 'Point de collecte — Médina',
      distance: '2,4 km',
      info: 'Bac plastique & verre',
      type: 'recyclage'
    }
  ]);

  // Conseil affiché dans le bloc "Conseil du jour".
  conseil = signal(
    '« Pensez à vider et rincer légèrement les bouteilles avant de les déposer dans un point de collecte adapté. »'
  );

  constructor(private router: Router) {}

  // Ouvre l'écran de scan.
  scanner(): void {
    this.router.navigate(['/scanner']);
  }

  // Ouvre l'historique complet.
  voirHistorique(): void {
    this.router.navigate(['/historique']);
  }

  // Ouvre la liste des points de collecte.
  voirPoints(): void {
    this.router.navigate(['/points-collecte']);
  }

  // Ouvre le détail d'un point de collecte.
  ouvrirPoint(index: number): void {
    const routes = [1, 2];

    if (routes[index]) {
      this.router.navigate(['/points-collecte', routes[index]]);
    } else {
      this.voirPoints();
    }
  }

  // Ouvre la liste complète des conseils.
  voirConseils(): void {
    this.router.navigate(['/conseils']);
  }

}
