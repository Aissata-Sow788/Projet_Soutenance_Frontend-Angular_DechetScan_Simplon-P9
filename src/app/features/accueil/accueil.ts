import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AccueilService } from '../../core/services/accueil.service';
import {
  StatistiquesAccueil,
  SolutionAccueil,
  DefiAccueil
} from '../../shared/models/accueil.model';


@Component({
  imports: [],
  selector: 'app-accueil',
  styleUrl: './accueil.css',
  templateUrl: './accueil.html',
})
export class Accueil {

    // Statistiques de la page
  statistiques = signal<StatistiquesAccueil | null>(null);

  // Liste des solutions
  solutions = signal<SolutionAccueil[]>([]);

  // Défi communautaire
  defi = signal<DefiAccueil | null>(null);

  // État du chargement
  chargement = signal(false);

  // Message d'erreur
  erreurServeur = signal<string | null>(null);

  constructor(
    private accueilService: AccueilService,
    private router: Router
  ) {}

  // Charge les données au démarrage
  ngOnInit(): void {
    this.chargerAccueil();
  }

  // Récupère toutes les données de l'accueil
  chargerAccueil(): void {

    // Active le chargement
    this.chargement.set(true);

    // Réinitialise l'erreur
    this.erreurServeur.set(null);

    // Récupère les statistiques
    this.accueilService.getStatistiques().subscribe({
      next: (data) => {
        this.statistiques.set(data);
      },

      error: (err) => {
        this.erreurServeur.set(
          err.message ?? 'Erreur lors du chargement des statistiques.'
        );
      }
    });

    // Récupère les solutions
    this.accueilService.getSolutions().subscribe({
      next: (data) => {
        this.solutions.set(data);
      },

      error: (err) => {
        this.erreurServeur.set(
          err.message ?? 'Erreur lors du chargement des solutions.'
        );
      }
    });

    // Récupère le défi
    this.accueilService.getDefi().subscribe({
      next: (data) => {
        this.defi.set(data);

        // Termine le chargement
        this.chargement.set(false);
      },

      error: (err) => {
        this.chargement.set(false);

        this.erreurServeur.set(
          err.message ?? 'Erreur lors du chargement du défi.'
        );
      }
    });
  }

  // Ouvre la page de connexion
  seConnecter(): void {
    this.router.navigate(['/connexion']);
  }

  // Ouvre la page d'inscription
  sInscrire(): void {
    this.router.navigate(['/inscription']);
  }

  // Ouvre la page de scan
  scannerDechet(): void {
    this.router.navigate(['/scan']);
  }

  // Ouvre les points de collecte
  voirPoints(): void {
    this.router.navigate(['/points-collecte']);
  }

}
