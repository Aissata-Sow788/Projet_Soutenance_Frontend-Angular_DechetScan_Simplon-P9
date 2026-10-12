import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PrixDechetService } from '../../../core/services/prix-dechet';
import { PrixDechet } from '../../../shared/models/prix-dechet.model';

@Component({
  imports: [CommonModule],
  selector: 'app-tarifs-collecteur',
  styleUrl: './tarifs-collecteur.css',
  templateUrl: './tarifs-collecteur.html',
})
export class TarifsCollecteur implements OnInit {
  private readonly prixService = inject(PrixDechetService);
  private readonly router = inject(Router);

  tarifs = signal<PrixDechet[]>([]);
  chargement = signal(true);
  erreur = signal<string | null>(null);
  suppressionEnCours = signal<number | null>(null);

  ngOnInit(): void {
    this.chargerTarifs();
  }

  chargerTarifs(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.prixService.listerPrix().subscribe({
      next: (tarifs) => {
        this.tarifs.set(
          [...tarifs].sort((a, b) =>
            new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime(),
          ),
        );
        this.chargement.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.erreur.set(error.status === 401 || error.status === 403
          ? 'Votre compte collecteur ne peut pas consulter ces tarifs.'
          : 'Impossible de charger vos tarifs. Vérifiez votre connexion puis réessayez.');
        this.chargement.set(false);
      },
    });
  }

  ouvrirFormulaire(idPrix?: number): void {
    void this.router.navigate(
      ['/collecteur/tarifs/formulaire'],
      idPrix === undefined ? undefined : { queryParams: { id: idPrix } },
    );
  }

  statutTarif(tarif: PrixDechet): 'actif' | 'a-venir' | 'expire' {
    if (tarif.est_actif) return 'actif';
    return tarif.dateDebut > this.dateAujourdhui() ? 'a-venir' : 'expire';
  }

  async supprimerTarif(tarif: PrixDechet): Promise<void> {
    if (this.suppressionEnCours() !== null) return;

    // Reprend la confirmation SweetAlert2 utilisée pour les autres suppressions.
    const confirmation = await Swal.fire({
      title: 'Supprimer ce tarif ?',
      text: `Voulez-vous vraiment supprimer le tarif « ${tarif.nomTypeDechet} » ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0EA5A4',
      cancelButtonColor: '#94A3B8',
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;

    this.suppressionEnCours.set(tarif.idPrix);
    this.erreur.set(null);
    this.prixService.supprimerPrix(tarif.idPrix).subscribe({
      next: () => {
        this.tarifs.update((tarifs) => tarifs.filter((element) => element.idPrix !== tarif.idPrix));
        this.suppressionEnCours.set(null);
        void Swal.fire({
          title: 'Tarif supprimé',
          text: 'Le tarif a bien été supprimé.',
          icon: 'success',
          confirmButtonColor: '#0EA5A4',
        });
      },
      error: () => {
        this.erreur.set('Le tarif n’a pas pu être supprimé. Réessayez.');
        this.suppressionEnCours.set(null);
        void Swal.fire({
          title: 'Suppression impossible',
          text: 'La suppression du tarif a échoué. Veuillez réessayer.',
          icon: 'error',
          confirmButtonColor: '#0EA5A4',
        });
      },
    });
  }

  private dateAujourdhui(): string {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
    const jour = String(maintenant.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }
}
