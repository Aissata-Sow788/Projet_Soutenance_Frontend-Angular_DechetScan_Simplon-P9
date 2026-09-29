import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VenteDechetService } from '../../core/services/vente-dechet';
import {
  VenteDechet,
  StatutPaiementVente
} from '../../shared/models/vente-dechet.model';

@Component({
  imports: [CommonModule],
  selector: 'app-detail-vente',
  styleUrl: './detail-vente.css',
  templateUrl: './detail-vente.html',
})
export class DetailVente implements OnInit {

  // Services utilisés pour récupérer l'identifiant de la route,
  // naviguer entre les pages et communiquer avec l'API des ventes.
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly venteService = inject(VenteDechetService);

  // État général de la page.
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // Contient les informations de la vente récupérée depuis l'API.
  vente = signal<VenteDechet | null>(null);

  /**
   * Calcule le prix payé pour une unité de déchet.
   *
   * Le backend stocke le montant total de la vente et la quantité,
   * mais pas directement le prix unitaire.
   *
   * Exemple :
   * 10 kg vendus pour 5 000 FCFA
   * → prix unitaire = 500 FCFA/kg.
   */
  prixUnitaire = computed(() => {
    const v = this.vente();

    // Évite une division par zéro ou l'utilisation d'une vente inexistante.
    if (!v || v.quantite <= 0) {
      return 0;
    }

    return Math.round(v.prixPaye / v.quantite);
  });

  ngOnInit(): void {
    // Récupère l'identifiant de la vente depuis l'URL.
    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    // Si l'identifiant est valide, on charge la vente.
    if (id) {
      this.chargerVente(id);
    } else {
      // Affiche une erreur si aucun identifiant valide n'est présent dans l'URL.
      this.erreur.set('Identifiant de vente invalide.');
      this.chargement.set(false);
    }
  }

  private chargerVente(id: number): void {
    // Active l'indicateur de chargement avant l'appel API.
    this.chargement.set(true);
    this.erreur.set(null);

    // Récupère les informations détaillées de la vente.
    this.venteService.obtenirVente(id).subscribe({
      next: vente => {
        // Stocke la vente pour l'afficher dans le template.
        this.vente.set(vente);
        this.chargement.set(false);
      },

      error: () => {
        // Affiche un message si l'API ne retourne pas la vente.
        this.erreur.set('Impossible de charger cette vente.');
        this.chargement.set(false);
      },
    });
  }

  retour(): void {
    // Retourne vers la liste des ventes du citoyen.
    this.router.navigate(['/mes-ventes']);
  }

  /**
   * Lance un appel téléphonique vers le collecteur.
   *
   * Attention : nomCollecteur est actuellement utilisé temporairement
   * comme numéro. Il faudra remplacer cette valeur par un vrai
   * champ téléphone dans le modèle VenteDechet.
   */
  appelerCollecteur(): void {
    const tel = this.vente()?.nomCollecteur;

    // Ouvre l'application téléphone si un numéro est disponible.
    if (tel) {
      window.location.href = `tel:${tel}`;
    }
  }

  /**
   * Transforme une date ISO en date française lisible.
   *
   * Exemple :
   * 2023-10-12 → 12 octobre 2023
   */
  formaterDateLongue(dateIso: string): string {
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Transforme le statut technique du paiement
   * en texte compréhensible pour l'utilisateur.
   */
  libellePaiement(statut: StatutPaiementVente): string {
    const map: Record<string, string> = {
      paye: 'Paiement effectué',
      en_attente: 'Paiement en attente',
      echoue: 'Paiement échoué',
      rembourse: 'Montant remboursé',
    };

    // Si le statut n'est pas connu, on affiche directement sa valeur.
    return map[statut] ?? statut;
  }

  /**
   * Retourne les classes Tailwind correspondant au statut du paiement.
   *
   * Chaque statut possède une couleur différente pour permettre
   * à l'utilisateur d'identifier rapidement l'état du paiement.
   */
  classeBadge(statut: StatutPaiementVente): string {
    switch (statut) {
      case 'paye':
        return 'bg-[#E0F9F7] text-[#0EA5A4]';

      case 'en_attente':
        return 'bg-orange-100 text-orange-600';

      case 'echoue':
        return 'bg-red-100 text-red-500';

      default:
        return 'bg-slate-100 text-slate-500';
    }
  }

  /**
   * Génère les initiales du collecteur pour l'avatar.
   *
   * Exemple :
   * "Mamadou Diop" → "MD"
   */
  initialesCollecteur(nom: string | null): string {
    // Affiche "?" si aucun nom n'est disponible.
    if (!nom) {
      return '?';
    }

    // Récupère la première lettre de chaque partie du nom
    // puis limite le résultat à deux caractères.
    return nom
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
