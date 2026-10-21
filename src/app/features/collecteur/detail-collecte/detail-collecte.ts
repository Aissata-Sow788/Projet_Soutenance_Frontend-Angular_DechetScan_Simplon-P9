import { Component, OnInit, computed, inject, signal, afterNextRender, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CollecteService } from '../../../core/services/collecte';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { Collecte } from '../../../shared/models/collecte.model';
import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';
import * as L from 'leaflet';

/**
 * - Affiche et met à jour une collecte.
 * - La page peut être ouverte depuis Mes collectes (objet Collecte)
 * - ou après l'acceptation d'une demande (objet DemandeCollecte).
 */
@Component({
  selector: 'app-detail-collecte-collecteur',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './detail-collecte.css',
  templateUrl: './detail-collecte.html',
})
export class DetailCollecte implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly collecteService = inject(CollecteService);
  private readonly demandeService = inject(DemandeCollecteService);

  chargement = signal(true);
  erreur = signal<string | null>(null);
  enTraitement = signal(false);
  confirmation = signal<string | null>(null);

  collecteOperation = signal<Collecte | null>(null);
  demande = signal<DemandeCollecte | null>(null);

  statutNormalise = computed(() => {
    const statut = this.collecteOperation()?.statut ?? this.demande()?.statut;
    return statut ? this.normaliserStatut(statut) : '';
  });

  private map: L.Map | undefined;

  constructor() {
    // Initialise Leaflet en toute sécurité après le rendu de la vue
    afterNextRender(() => {
      this.initialiserCarte();
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.erreur.set('Identifiant de collecte invalide.');
      this.chargement.set(false);
      return;
    }

    if (this.route.routeConfig?.path === 'collectes/:id') {
      this.chargerCollecte(id);
      return;
    }

    this.demandeService.obtenirDemande(id).subscribe({
      next: demande => {
        this.demande.set(demande);
        this.chargement.set(false);
        if (!['acceptee', 'en_cours', 'terminee'].includes(this.normaliserStatut(demande.statut))) {
          this.erreur.set('Cette demande n’a pas encore été acceptée par un collecteur.');
        } else {
          setTimeout(() => this.initialiserCarte(), 150);
        }
      },
      error: () => {
        this.erreur.set('Impossible de charger les détails de la collecte.');
        this.chargement.set(false);
      },
    });
  }

  private chargerCollecte(id: number): void {
    this.collecteService.obtenirCollecte(id).subscribe({
      next: collecte => {
        this.collecteOperation.set(collecte);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les détails de la collecte.');
        this.chargement.set(false);
      },
    });
  }

private initialiserCarte(): void {
    const dem = this.demande();
    if (!dem || dem.latitude == null || dem.longitude == null) {
      return;
    }

    const elementCarte = document.getElementById('carte-detail-collecte');
    if (!elementCarte) {
      return;
    }

    // Si la carte existe déjà, on la supprime proprement pour éviter les doublons
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }

    this.map = L.map('carte-detail-collecte').setView([dem.latitude, dem.longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    L.marker([dem.latitude, dem.longitude]).addTo(this.map)
      .bindPopup(`<b>${dem.prenomUtilisateur || ''} ${dem.nomUtilisateur || ''}</b><br>${dem.quartier || 'Lieu de collecte'}`)
      .openPopup();

    // Force Leaflet à s'adapter aux dimensions réelles du bloc gris
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  changerStatut(statut: 'en_cours' | 'terminee'): void {
    const collecte = this.collecteOperation();
    if (collecte) {
      const transitionAutorisee =
        (statut === 'en_cours' && collecte.statut === 'planifiee') ||
        (statut === 'terminee' && collecte.statut === 'en_cours');
      if (!transitionAutorisee || this.enTraitement()) return;

      this.enTraitement.set(true);
      this.erreur.set(null);
      this.confirmation.set(null);
      this.collecteService.changerStatut(collecte.idCollecte, {
        statut,
        ...(statut === 'terminee'
          ? {
              dateRealisation: new Date().toISOString(),
              quantiteRecuperee: collecte.quantiteRecuperee ?? collecte.quantite ?? 0,
            }
          : {}),
      }).subscribe({
        next: collecteMiseAJour => {
          this.collecteOperation.set(collecteMiseAJour);
          this.confirmation.set(statut === 'en_cours'
            ? 'La collecte est maintenant en cours.'
            : 'La collecte est terminée.');
          this.enTraitement.set(false);
        },
        error: err => {
          this.erreur.set(err.error?.detail ?? 'Impossible de mettre à jour le statut de la collecte.');
          this.enTraitement.set(false);
        },
      });
      return;
    }

    const demande = this.demande();
    const statutActuel = this.statutNormalise();
    if (!demande?.attribueAuCollecteurConnecte) return;
    const transitionAutorisee =
      (statut === 'en_cours' && statutActuel === 'acceptee') ||
      (statut === 'terminee' && statutActuel === 'en_cours');

    if (!demande || !transitionAutorisee || this.enTraitement()) return;

    this.enTraitement.set(true);
    this.erreur.set(null);
    this.confirmation.set(null);

    this.demandeService.changerStatut(demande.idDemande, statut).subscribe({
      next: demandeMiseAJour => {
        this.demande.set(demandeMiseAJour);
        this.confirmation.set(statut === 'en_cours'
          ? 'La collecte est maintenant en cours.'
          : 'La collecte est terminée.');
        this.enTraitement.set(false);
      },
      error: err => {
        this.erreur.set(err.error?.detail ??
          (err.status === 409
            ? 'Le statut de la collecte a changé. Rechargez la page.'
            : 'Impossible de mettre à jour le statut de la collecte.'));
        this.enTraitement.set(false);
      },
    });
  }

  retour(): void {
    this.router.navigate([
      this.collecteOperation() ? '/collecteur/mes-collectes' : '/collecteur/demandes',
    ]);
  }

  formaterDate(dateIso: string | null): string {
    if (!dateIso) return 'Non précisée';
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formaterHeure(dateIso: string | null): string {
    if (!dateIso) return 'Non précisée';
    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private normaliserStatut(statut: string): string {
    return statut.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
