import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DemandeCollecteService } from '../../core/services/demande-collecte';
import {
  DemandeCollecte,
  StatutDemande,
} from '../../shared/models/demande-collecte.model';

@Component({
  selector: 'app-mes-demandes',
  imports: [CommonModule],
  templateUrl: './mes-demandes.html',
})
export class MesDemandes implements OnInit {
  private readonly router = inject(Router);
  private readonly demandeService = inject(DemandeCollecteService);

  // Les états permettent de différencier chargement, erreur, liste et liste vide.
  chargement = signal(true);
  erreur = signal('');
  demandes = signal<DemandeCollecte[]>([]);

  // Les demandes récentes apparaissent en premier, comme dans un historique.
  demandesTriees = computed(() =>
    [...this.demandes()].sort(
      (a, b) =>
        new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime()
    )
  );

  ngOnInit(): void {
    this.chargerDemandes();
  }

  /** Charge depuis l'API Django les demandes associées au compte connecté. */
  chargerDemandes(): void {
    this.chargement.set(true);
    this.erreur.set('');
    this.demandeService.listerDemandes().subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger vos demandes de collecte.');
        this.chargement.set(false);
      },
    });
  }

  /** Ouvre le suivi de la demande sélectionnée, jamais celui d'une autre demande. */
  suivreDemande(idDemande: number): void {
    this.router.navigate(['/suivi-demande', idDemande]);
  }

  /** Retourne à la page profil. */
  retour(): void {
    this.router.navigate(['/profile']);
  }

  /** Commence une nouvelle demande de ramassage. */
  nouvelleDemande(): void {
    this.router.navigate(['/demande-ramassage']);
  }

  /** Libellé lisible du statut Django de la demande. */
  libelleStatut(statut: StatutDemande): string {
    const libelles: Record<StatutDemande, string> = {
      en_attente: 'En attente',
      acceptee: 'Acceptée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      annulee: 'Annulée',
    };
    return libelles[statut];
  }

  /** Couleur du badge en fonction de l'avancement de la demande. */
  classeStatut(statut: StatutDemande): string {
    switch (statut) {
      case 'acceptee':
      case 'en_cours':
        return 'bg-blue-50 text-blue-700';
      case 'terminee':
        return 'bg-emerald-50 text-emerald-700';
      case 'annulee':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-amber-50 text-amber-700';
    }
  }

  /** Présente la date planifiée lorsqu'elle existe, sinon la date de création. */
  dateAffichee(demande: DemandeCollecte): string {
    const date = demande.dateSouhaitee || demande.dateDemande;
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
