import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { AccueilService } from '../../core/services/accueil.service';
import {StatistiquesAccueil, SolutionAccueil, DefiAccueil} from '../../shared/models/accueil.model';


@Component({
  imports: [RouterLink, BarreNavigations, CommonModule],
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

  /**
   * Formate un nombre pour l'affichage dans les statistiques.
   * Exemples : 1250 → "1.2k", 128000 → "128k+", 5 → "5"
   */
  formaterNombre(n: number): string {
    if (n >= 1_000_000) {
      return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M+';
    }
    if (n >= 10_000) {
      return Math.floor(n / 1000) + 'k+';
    }
    if (n >= 1_000) {
      return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return n.toString();
  }

  // ─── Modal "Demander un ramassage" ────────────────────────────

  // Contrôle l'affichage du modal d'invitation à se connecter.
  modalRamassageVisible = signal(false);

  // Contrôle l'affichage de l'invitation à créer un compte collecteur.
  modalCollecteurVisible = signal(false);

  /**
   * Déclenché quand le citoyen non connecté clique sur
   * "Demander un ramassage". Affiche le modal de connexion.
   */
  demanderRamassage(): void {
    this.modalRamassageVisible.set(true);
  }

  /** Ferme le modal. */
  fermerModal(): void {
    this.modalRamassageVisible.set(false);
  }

  /** Redirige vers la page de connexion depuis le modal. */
  allerConnexion(): void {
    this.modalRamassageVisible.set(false);
    this.router.navigate(['/connexion']);
  }

  /** Redirige vers la page d'inscription depuis le modal. */
  allerInscription(): void {
    this.modalRamassageVisible.set(false);
    this.router.navigate(['/inscription']);
  }

  /** Ouvre l'invitation à rejoindre le réseau des collecteurs. */
  devenirCollecteur(): void {
    this.modalCollecteurVisible.set(true);
  }

  /** Ferme l'invitation à devenir collecteur. */
  fermerModalCollecteur(): void {
    this.modalCollecteurVisible.set(false);
  }

  /** Ouvre la page de connexion ou d'inscription depuis l'invitation. */
  naviguerDepuisModalCollecteur(destination: '/connexion' | '/inscription'): void {
    this.modalCollecteurVisible.set(false);
    this.router.navigate([destination]);
  }

}
