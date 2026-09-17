import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScanService } from '../../core/services/scan';

@Component({
  imports: [],
  selector: 'app-analyse-ia',
  styleUrl: './analyse-ia.css',
  templateUrl: './analyse-ia.html',
})
export class AnalyseIA {

    private scanService = inject(ScanService);
  private router = inject(Router);

  // Lecture directe du signal du service : la fiche se met à jour si le résultat change ailleurs
  resultat = this.scanService.dernierResultat;

  // Retour vers la page de scan
  retour(): void {
    this.router.navigate(['/scandechet']);
  }

  // Vers la carte des points de collecte (route à créer plus tard)
  voirPointsCollecte(): void {
    this.router.navigate(['/points-collecte']);
  }

}
