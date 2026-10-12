import { CommonModule, Location } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { PanierDechetApi, ScanService } from '../../core/services/scan';

@Component({
  imports: [CommonModule, BarreNavigations],
  selector: 'app-mes-paniers',
  styleUrl: './mes-paniers.css',
  templateUrl: './mes-paniers.html',
})
export class MesPaniers implements OnInit {
  private readonly scanService = inject(ScanService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  paniers = signal<PanierDechetApi[]>([]);
  chargement = signal(true);
  erreur = signal<string | null>(null);
  panierEnCours = signal<number | null>(null);
  confirmationVider = signal(false);
  vidageEnCours = signal(false);

  ngOnInit(): void {
    this.chargerPaniers();
  }

  chargerPaniers(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.scanService.getPaniers().subscribe({
      next: (paniers) => {
        this.paniers.set(paniers);
        this.chargement.set(false);
      },
      error: (erreur: unknown) => {
        console.error('Erreur lors du chargement des paniers :', erreur);
        this.erreur.set('Impossible de charger vos paniers. Vérifiez votre connexion puis réessayez.');
        this.chargement.set(false);
      },
    });
  }

  get paniersRemplis(): PanierDechetApi[] {
    return this.paniers().filter((panier) => panier.nombreDisponible > 0);
  }

  get nombreObjetsTotal(): number {
    return this.paniersRemplis.reduce(
      (total, panier) => total + panier.nombreDisponible,
      0,
    );
  }

  get nombreCategories(): number {
    return this.paniersRemplis.length;
  }

  get derniereMiseAJour(): Date | null {
    const dates = this.paniersRemplis
      .map((panier) => new Date(panier.dateMiseAJour))
      .filter((date) => !Number.isNaN(date.getTime()));
    return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
  }

  get derniereMiseAJourTexte(): string {
    const derniereMiseAJour = this.derniereMiseAJour;
    if (!derniereMiseAJour) return 'Aujourd’hui';

    const maintenant = new Date();
    if (
      derniereMiseAJour.getDate() === maintenant.getDate()
      && derniereMiseAJour.getMonth() === maintenant.getMonth()
      && derniereMiseAJour.getFullYear() === maintenant.getFullYear()
    ) {
      return 'Aujourd’hui';
    }

    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
      .format(derniereMiseAJour);
  }

  modifierNombreObjets(panier: PanierDechetApi, variation: number): void {
    if (this.panierEnCours() !== null) return;
    const nombreActuel = panier.nombreDisponible;
    const nouveauNombre = Math.max(0, nombreActuel + variation);
    this.enregistrerNombreObjets(panier, nouveauNombre);
  }

  retirer(panier: PanierDechetApi): void {
    if (this.panierEnCours() !== null) return;
    this.enregistrerNombreObjets(panier, 0);
  }

  ouvrirConfirmationVider(): void {
    if (this.paniersRemplis.length) this.confirmationVider.set(true);
  }

  fermerConfirmationVider(): void {
    if (!this.vidageEnCours()) this.confirmationVider.set(false);
  }

  viderPanier(): void {
    const paniersARemettreAZero = this.paniersRemplis;
    if (!paniersARemettreAZero.length || this.vidageEnCours()) return;

    this.vidageEnCours.set(true);
    this.erreur.set(null);
    this.mettreAZeroSuivant(paniersARemettreAZero, 0);
  }

  scanner(): void {
    this.router.navigate(['/scan']);
  }

  retour(): void {
    this.location.back();
  }

  demanderCollecte(): void {
    this.router.navigate(['/demande-ramassage']);
  }

  voirPointsCollecte(): void {
    this.router.navigate(['/points-collecte']);
  }

  getCouleurCategorie(nomCategorie: string): string {
    const nom = nomCategorie.toLowerCase();
    if (nom.includes('plastique')) return 'category-plastic';
    if (nom.includes('métal') || nom.includes('metal')) return 'category-metal';
    if (nom.includes('papier') || nom.includes('carton')) return 'category-paper';
    if (nom.includes('verre')) return 'category-glass';
    return 'category-default';
  }

  private enregistrerNombreObjets(panier: PanierDechetApi, nombre: number): void {
    this.panierEnCours.set(panier.idPanier);
    this.erreur.set(null);

    this.scanService.modifierPanier(panier.idPanier, nombre).subscribe({
      next: (panierMisAJour) => {
        this.paniers.update((paniers) => paniers.map((element) =>
          element.idPanier === panierMisAJour.idPanier ? panierMisAJour : element,
        ));
        this.panierEnCours.set(null);
      },
      error: (erreur: unknown) => {
        console.error('Erreur lors de la modification du panier :', erreur);
        this.erreur.set('La modification du panier a échoué. Réessayez.');
        this.panierEnCours.set(null);
      },
    });
  }

  private mettreAZeroSuivant(paniers: PanierDechetApi[], index: number): void {
    if (index >= paniers.length) {
      this.vidageEnCours.set(false);
      this.confirmationVider.set(false);
      this.chargerPaniers();
      return;
    }

    const panier = paniers[index];
    this.scanService.modifierPanier(panier.idPanier, 0).subscribe({
      next: (panierMisAJour) => {
        this.paniers.update((elements) => elements.map((element) =>
          element.idPanier === panierMisAJour.idPanier ? panierMisAJour : element,
        ));
        this.mettreAZeroSuivant(paniers, index + 1);
      },
      error: (erreur: unknown) => {
        console.error('Erreur lors du vidage du panier :', erreur);
        this.erreur.set('Le vidage du panier est incomplet. Les quantités déjà modifiées ont été conservées.');
        this.vidageEnCours.set(false);
        this.confirmationVider.set(false);
      },
    });
  }
}
