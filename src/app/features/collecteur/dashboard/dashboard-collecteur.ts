
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { CollecteService } from '../../../core/services/collecte';
import { Auth } from '../../../core/services/auth';

import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';
import { Collecte } from '../../../shared/models/collecte.model';

@Component({
  selector: 'app-dashboard-collecteur',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-collecteur.html',
  styleUrl: './dashboard-collecteur.css',
})
export class DashboardCollecteur implements OnInit {

  private readonly router = inject(Router);
  private readonly demandeService = inject(DemandeCollecteService);
  private readonly collecteService = inject(CollecteService);
  private readonly authService = inject(Auth);

  // État de chargement
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // Nom de l'utilisateur connecté
  nomUtilisateur = signal('Collecteur');

  // Données du dashboard
  demandes = signal<DemandeCollecte[]>([]);
  collectes = signal<Collecte[]>([]);

  // Nombre de nouvelles demandes en attente
  nombreNouvellesDemandes = computed(() =>
    this.demandes().filter(d => d.statut === 'en_attente').length
  );

  // Nombre de collectes planifiées
  collectesAVenir = computed(() =>
    this.collectes().filter(c => c.statut === 'planifiee').length
  );

  // Nombre de collectes terminées
  collectesTerminees = computed(() =>
    this.collectes().filter(c => c.statut === 'terminee').length
  );

  // Les 4 demandes les plus récentes
  demandesRecentes = computed(() =>
    [...this.demandes()]
      .sort(
        (a, b) =>
          new Date(b.dateDemande).getTime() -
          new Date(a.dateDemande).getTime()
      )
      .slice(0, 4)
  );

  // Prochaine collecte planifiée
  prochaineCollecte = computed(() =>
    [...this.collectes()]
      .filter(c => c.statut === 'planifiee')
      .sort(
        (a, b) =>
          new Date(a.datePlanifiee).getTime() -
          new Date(b.datePlanifiee).getTime()
      )[0] ?? null
  );

  // Objectif mensuel : 500 kg
  objectifMensuel = computed(() => {
    const totalKg = this.collectes()
      .filter(c => c.statut === 'terminee')
      .reduce(
        (sum, c) => sum + (c.quantiteRecuperee ?? 0),
        0
      );

    return Math.min(Math.round((totalKg / 500) * 100), 100);
  });

  // Quantité restante pour atteindre l'objectif
  kgRestants = computed(() => {
    const totalKg = this.collectes()
      .filter(c => c.statut === 'terminee')
      .reduce(
        (sum, c) => sum + (c.quantiteRecuperee ?? 0),
        0
      );

    return Math.max(500 - totalKg, 0);
  });

  ngOnInit(): void {
    this.chargerNomUtilisateur();
    this.chargerDonnees();
  }

  /**
   * Récupère le nom de l'utilisateur connecté.
   * Cette méthode suppose que getCurrentUser() renvoie
   * un utilisateur contenant les propriétés prenom et nom.
   */
  private chargerNomUtilisateur(): void {
    const utilisateur = this.authService.getCurrentUser();

    if (!utilisateur) {
      this.nomUtilisateur.set('Collecteur');
      return;
    }

    const prenom = utilisateur.first_name.trim() ?? '';
    const nom = utilisateur.last_name.trim() ?? '';
    const nomComplet = `${prenom} ${nom}`.trim();

    this.nomUtilisateur.set(nomComplet || 'Collecteur');
  }

  /**
   * Charge les demandes et les collectes.
   */
  private chargerDonnees(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.demandeService.listerDemandes().subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);

        this.collecteService.listerCollectes().subscribe({
          next: (collectes) => {
            this.collectes.set(collectes);
            this.chargement.set(false);
          },
          error: () => {
            // Le dashboard reste accessible si les collectes
            // ne peuvent pas encore être chargées.
            this.collectes.set([]);
            this.chargement.set(false);
          },
        });
      },
      error: () => {
        this.erreur.set(
          'Impossible de charger les données du dashboard.'
        );
        this.chargement.set(false);
      },
    });
  }

  // Formate une date : 12 oct.
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  // Formate une date et une heure
  formaterDateHeure(dateIso: string): string {
    const date = new Date(dateIso);

    const demain = new Date();
    demain.setDate(demain.getDate() + 1);

    const estDemain =
      date.getDate() === demain.getDate() &&
      date.getMonth() === demain.getMonth() &&
      date.getFullYear() === demain.getFullYear();

    const dateFormatee = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });

    const heure = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return estDemain
      ? `Demain, ${dateFormatee} à ${heure}`
      : `${dateFormatee} à ${heure}`;
  }

  // Classes CSS selon le statut
  classeStatut(statut: string): string {
    switch (statut) {
      case 'en_attente':
        return 'bg-orange-100 text-orange-600';

      case 'acceptee':
        return 'bg-green-100 text-green-700';

      case 'en_cours':
        return 'bg-blue-100 text-blue-700';

      case 'terminee':
        return 'bg-gray-100 text-gray-600';

      case 'annulee':
        return 'bg-red-100 text-red-600';

      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  // Libellés français des statuts
  libelleStatut(statut: string): string {
    switch (statut) {
      case 'en_attente':
        return 'EN ATTENTE';

      case 'acceptee':
        return 'ACCEPTÉE';

      case 'en_cours':
        return 'EN COURS';

      case 'terminee':
        return 'TERMINÉE';

      case 'annulee':
        return 'REFUSÉE';

      default:
        return statut.toUpperCase();
    }
  }

  // Navigation vers les demandes
  voirToutesDemandes(): void {
    this.router.navigate(['/collecteur/demandes']);
  }

  // Navigation vers le détail d'une demande
  voirDemande(id: number): void {
    this.router.navigate(['/collecteur/demandes', id]);
  }
}
