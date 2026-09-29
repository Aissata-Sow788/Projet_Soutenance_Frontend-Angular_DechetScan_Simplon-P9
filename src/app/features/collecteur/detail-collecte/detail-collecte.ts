import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CollecteService } from '../../../core/services/collecte';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { Collecte } from '../../../shared/models/collecte.model';
import { DemandeCollecte } from '../../../shared/models/demande-collecte.model';

/**
 * Affiche et met à jour une collecte.
 * La page peut être ouverte depuis Mes collectes (objet Collecte)
 * ou après l'acceptation d'une demande (objet DemandeCollecte).
 */
@Component({
  imports: [CommonModule],
  selector: 'app-detail-collecte-collecteur',
  styleUrl: './detail-collecte.css',
  templateUrl: './detail-collecte.html',
})
export class DetailCollecte implements OnInit {
  // Services de navigation et d'accès aux deux API possibles.
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly collecteService = inject(CollecteService);
  private readonly demandeService = inject(DemandeCollecteService);

  // État de l'écran : chargement, messages, action en cours et données affichées.
  chargement = signal(true);
  erreur = signal<string | null>(null);
  enTraitement = signal(false);
  confirmation = signal<string | null>(null);

  // Une seule de ces données est renseignée selon la route d'origine.
  collecteOperation = signal<Collecte | null>(null);
  demande = signal<DemandeCollecte | null>(null);

  // Harmonise le statut des deux modèles pour piloter l'affichage des boutons.
  statutNormalise = computed(() => {
    const statut = this.collecteOperation()?.statut ?? this.demande()?.statut;
    return statut ? this.normaliserStatut(statut) : '';
  });

  /**
   * Lit l'identifiant dans l'URL puis charge la bonne ressource.
   * /collectes/:id utilise l'API des collectes, tandis que
   * /collectes/demandes/:id utilise l'API des demandes acceptées.
   */
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.erreur.set('Identifiant de collecte invalide.');
      this.chargement.set(false);
      return;
    }

    // L'identifiant de demande apparaît dans une route différente.
    if (this.route.routeConfig?.path === 'collectes/:id') {
      this.chargerCollecte(id);
      return;
    }

    // Charge une demande acceptée depuis le bouton de détail de la demande.
    this.demandeService.obtenirDemande(id).subscribe({
      next: demande => {
        this.demande.set(demande);
        this.chargement.set(false);
        if (!['acceptee', 'en_cours', 'terminee'].includes(this.normaliserStatut(demande.statut))) {
          this.erreur.set('Cette demande n’a pas encore été acceptée par un collecteur.');
        }
      },
      error: () => {
        this.erreur.set('Impossible de charger les détails de la collecte.');
        this.chargement.set(false);
      },
    });
  }

  // Charge une opération de collecte depuis la liste « Mes collectes ».
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

  /**
   * Fait progresser la collecte dans l'ordre autorisé par le backend :
   * planifiée/acceptée → en cours → terminée.
   */
  changerStatut(statut: 'en_cours' | 'terminee'): void {
    const collecte = this.collecteOperation();
    if (collecte) {
      // Les opérations Collecte utilisent les statuts planifiee/en_cours.
      const transitionAutorisee =
        (statut === 'en_cours' && collecte.statut === 'planifiee') ||
        (statut === 'terminee' && collecte.statut === 'en_cours');
      if (!transitionAutorisee || this.enTraitement()) return;

      this.enTraitement.set(true);
      this.erreur.set(null);
      this.confirmation.set(null);
      // À la fin, le backend attend la date de réalisation et la quantité récupérée.
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

    // Les demandes acceptées utilisent le statut acceptee avant le démarrage.
    const demande = this.demande();
    const statutActuel = this.statutNormalise();
    const transitionAutorisee =
      (statut === 'en_cours' && statutActuel === 'acceptee') ||
      (statut === 'terminee' && statutActuel === 'en_cours');

    if (!demande || !transitionAutorisee || this.enTraitement()) return;

    this.enTraitement.set(true);
    this.erreur.set(null);
    this.confirmation.set(null);

    // Appelle l'endpoint de progression du workflow des demandes.
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

  // Retourne à la liste d'où la page a été ouverte.
  retour(): void {
    this.router.navigate([
      this.collecteOperation() ? '/collecteur/mes-collectes' : '/collecteur/demandes',
    ]);
  }

  // Transforme une date ISO en date lisible en français.
  formaterDate(dateIso: string | null): string {
    if (!dateIso) return 'Non précisée';
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // Transforme une date ISO en heure locale lisible.
  formaterHeure(dateIso: string | null): string {
    if (!dateIso) return 'Non précisée';
    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Retire les accents et uniformise les espaces pour comparer les statuts.
  private normaliserStatut(statut: string): string {
    return statut.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }
}
