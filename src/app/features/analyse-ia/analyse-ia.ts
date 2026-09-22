import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ScanService } from '../../core/services/scan';

@Component({
  imports: [CommonModule],
  selector: 'app-analyse-ia',
  styleUrl: './analyse-ia.css',
  templateUrl: './analyse-ia.html',
})
export class AnalyseIA implements OnInit {
  private scanService = inject(ScanService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Résultat actuellement affiché.
  resultat = this.scanService.dernierResultat;

  // Indique si l'analyse est en cours de chargement.
  chargement = true;

  // Permet d'afficher un message d'erreur à l'utilisateur.
  erreur: string | null = null;

  ngOnInit(): void {
    // Récupère l'identifiant du scan présent dans l'URL.
    this.route.queryParamMap.subscribe((params) => {
      const idScan = Number(params.get('idScan'));

      // Si l'identifiant existe, on recharge le scan depuis Django.
      if (idScan) {
        this.chargerScan(idScan);
      } else {
        // Aucun identifiant : on utilise éventuellement
        // le résultat déjà présent dans le service.
        this.chargement = false;

        if (!this.resultat()) {
          this.erreur = 'Aucun résultat de scan disponible.';
        }
      }
    });
  }

  /**
   * Recharge le scan depuis Django.
   *
   * Cette méthode permet au résultat de rester disponible
   * même après un rafraîchissement de la page.
   */
  private chargerScan(idScan: number): void {
    this.chargement = true;
    this.erreur = null;

    this.scanService.getScan(idScan).subscribe({
      next: (scan) => {
        // Met à jour le résultat dans le service.
        this.scanService.dernierResultat.set(scan);

        this.chargement = false;

        console.log(
          'Scan récupéré depuis Django :',
          scan
        );
      },

      error: (err) => {
        console.error(
          'Erreur lors de la récupération du scan :',
          err
        );

        this.chargement = false;
        this.erreur = 'Impossible de récupérer le résultat du scan.';
      }
    });
  }

  /**
   * Retourne les détections réalisées par l'IA.
   */
  get detections() {
    return this.resultat()?.analyseIA?.detections ?? [];
  }

  /**
   * Construit l'URL complète de la photo.
   */
  get imageUrl(): string | null {
    const photoUrl = this.resultat()?.photoUrl;

    if (!photoUrl) {
      return null;
    }

    return photoUrl.startsWith('http')
      ? photoUrl
      : `http://127.0.0.1:8000${photoUrl}`;
  }

  /**
   * Transforme une confiance décimale en pourcentage.
   */
  formaterConfiance(confiance: number): string {
    return `${Math.round(confiance * 100)} %`;
  }

  /**
   * Retourne les classes Tailwind correspondant
   * à la catégorie détectée.
   */
  getCouleurCategorie(nomCategorie: string): string {
    const nom = nomCategorie.toLowerCase();

    if (nom.includes('plastique')) {
      return 'bg-[#a9f1e4] text-[#007d78]';
    }

    if (nom.includes('métal') || nom.includes('metal')) {
      return 'bg-[#dce8fa] text-[#455a78]';
    }

    if (nom.includes('papier') || nom.includes('carton')) {
      return 'bg-[#cceee9] text-[#007d78]';
    }

    if (nom.includes('verre')) {
      return 'bg-[#b8eee5] text-[#006e68]';
    }

    return 'bg-[#e5edf8] text-[#455a78]';
  }

  /**
   * Retourne vers l'écran de scan.
   */
  retour(): void {
    this.router.navigate(['/scan']);
  }

  /**
   * Ouvre la liste des points de collecte.
   */
  voirPointsCollecte(): void {
    this.router.navigate(['/points-collecte']);
  }
}
