import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-detail-demande',
  styleUrl: './detail-demande.css',
  templateUrl: './detail-demande.html',
})
export class DetailDemande implements OnInit {

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly demandeService = inject(DemandeCollecteService);

  // ─── État ─────────────────────────────────────────────────────
  chargement = signal(true);
  erreur = signal<string | null>(null);
  enTraitement = signal(false);
  // ─── Demande ──────────────────────────────────────────────────
  demande = signal<DemandeCollecte | null>(null);
  statutNormalise = computed(() => {
    const statut = this.demande()?.statut;
    return statut
      ? statut.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, '_')
      : '';
  });

  ngOnInit(): void {
    // Récupère l'id de l'URL (/collecteur/demandes/:id).
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.chargerDemande(id);
    } else {
      this.erreur.set('Identifiant de demande invalide.');
      this.chargement.set(false);
    }
  }

  private chargerDemande(id: number): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.demandeService.obtenirDemande(id).subscribe({
      next: (demande) => {
        this.demande.set(demande);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les détails de la demande.');
        this.chargement.set(false);
      }
    });
  }

  // Accepte la demande via le nouvel endpoint /accepter/ (atomique).
  // Le backend vérifie que le collecteur est validé et que la demande
  // est encore en_attente, puis l'attribue à ce collecteur.
  accepterDemande(): void {
    const demande = this.demande();
    if (!demande) return;

    this.enTraitement.set(true);

    this.demandeService.accepterDemande(demande.idDemande).subscribe({
      next: (demandeMAJ) => {
        this.demande.set(demandeMAJ);
        this.erreur.set(null);
        this.enTraitement.set(false);
        void this.router.navigate(['/collecteur/collectes/demandes', demandeMAJ.idDemande]);
      },
      error: (err) => {
        this.enTraitement.set(false);
        // 409 : demande déjà acceptée par un autre collecteur.
        if (err.status === 409) {
          this.erreur.set(
            'Cette demande vient d\'être acceptée par un autre collecteur.'
          );
        } else if (err.status === 403) {
          this.erreur.set(
            'Votre profil collecteur doit être validé pour accepter une demande.'
          );
        } else {
          this.erreur.set('Erreur lors de l\'acceptation de la demande.');
        }
      }
    });
  }

  // Le refus est enregistré individuellement, sans annuler la demande.
  refuserDemande(): void {
    const demande = this.demande();
    if (!demande || demande.statut !== 'en_attente') return;

    this.enTraitement.set(true);

    this.demandeService.refuserDemande(demande.idDemande).subscribe({
      next: () => {
        this.enTraitement.set(false);
        this.router.navigate(['/collecteur/demandes']);
      },
      error: (err) => {
        this.erreur.set(err.status === 409
          ? 'Cette demande n’est plus disponible.'
          : err.error?.detail ?? 'Erreur lors du refus de la demande.');
        this.enTraitement.set(false);
      }
    });
  }

  // Retourne à la liste des demandes.
  retour(): void {
    this.router.navigate(['/collecteur/demandes']);
  }

  // Formater date
  formaterDate(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // Formater heure
  formaterHeure(dateIso: string): string {
    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  // Classe CSS du badge de statut.
  classeStatut(statut: string): string {
    switch (this.normaliserStatut(statut)) {
      case 'en_attente': return 'bg-orange-100 text-orange-600';
      case 'acceptee':   return 'bg-green-100 text-green-700';
      case 'en_cours':   return 'bg-blue-100 text-blue-700';
      case 'terminee':   return 'bg-gray-100 text-gray-600';
      case 'annulee':    return 'bg-red-100 text-red-600';
      default:           return 'bg-gray-100 text-gray-500';
    }
  }

  // Libellé français du statut.
  libelleStatut(statut: string): string {
    const map: Record<string, string> = {
      en_attente: 'EN ATTENTE',
      acceptee:   'ACCEPTÉE',
      en_cours:   'EN COURS',
      terminee:   'TERMINÉE',
      annulee:    'REFUSÉE',
    };
    const statutNormalise = this.normaliserStatut(statut);
    return map[statutNormalise] ?? statut.toUpperCase();
  }

  private normaliserStatut(statut: string): string {
    return statut.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  // Initiales pour l'avatar.
  initiales(prenom: string, nom: string): string {
    return ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase();
  }
}
