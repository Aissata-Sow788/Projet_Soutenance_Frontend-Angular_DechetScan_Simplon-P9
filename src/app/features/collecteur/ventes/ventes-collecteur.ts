import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { VenteDechetService } from '../../../core/services/vente-dechet';
import { VenteDechet } from '../../../shared/models/vente-dechet.model';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-ventes-collecteur',
  styleUrl: './ventes-collecteur.css',
  templateUrl: './ventes-collecteur.html',
})
export class VentesCollecteur implements OnInit {

  // Service utilisé pour récupérer les ventes depuis l'API.
  private readonly venteService = inject(VenteDechetService);

  // Permet d'annuler une requête de détail encore en cours.
  private detailRequest?: Subscription;

  // États principaux de la page.
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // Liste complète des ventes récupérées depuis l'API.
  ventes = signal<VenteDechet[]>([]);

  // Valeurs utilisées par les différents filtres.
  recherche = signal('');
  filtreStatut = signal('');
  filtreDechet = signal('');
  filtrePeriode = signal('');

  // Vente actuellement ouverte dans la fenêtre de détail.
  venteDetail = signal<VenteDechet | null>(null);
  chargementDetail = signal(false);
  erreurDetail = signal<string | null>(null);

  // Construit automatiquement la liste des types de déchets disponibles.
  typesDechet = computed(() => [
    ...new Set(
      this.ventes()
        .map(vente => vente.typeDechet?.nom)
        .filter((nom): nom is string => Boolean(nom))
    ),
  ].sort((a, b) => a.localeCompare(b, 'fr')));

  // Nombre maximum de ventes affichées sur une page.
  readonly parPage = 10;
  pageCourante = signal(1);

  // Applique tous les filtres sur la liste des ventes.
  ventesFiltrees = computed(() => {
    let res = [...this.ventes()];

    // Recherche par nom, email, type de déchet ou référence de paiement.
    const texte = this.recherche().trim().toLowerCase();

    if (texte) {
      res = res.filter(v =>
        this.nomCitoyen(v).toLowerCase().includes(texte) ||
        (v.emailUtilisateur ?? '').toLowerCase().includes(texte) ||
        (v.typeDechet?.nom ?? '').toLowerCase().includes(texte) ||
        (v.referencePaiement ?? '').toLowerCase().includes(texte)
      );
    }

    // Filtre selon le statut du paiement.
    if (this.filtreStatut()) {
      res = res.filter(
        v => v.statutPaiement === this.filtreStatut()
      );
    }

    // Filtre selon le type de déchet sélectionné.
    if (this.filtreDechet()) {
      res = res.filter(
        v =>
          (v.typeDechet?.nom ?? '').toLowerCase() ===
          this.filtreDechet().toLowerCase()
      );
    }

    // Filtre selon la période choisie.
    if (this.filtrePeriode()) {
      const maintenant = new Date();
      const debut = new Date(maintenant);

      if (this.filtrePeriode() === 'semaine') {
        // Définit le lundi comme début de la semaine.
        debut.setDate(
          maintenant.getDate() -
          ((maintenant.getDay() + 6) % 7)
        );
        debut.setHours(0, 0, 0, 0);
      } else {
        // Pour le filtre mensuel, on commence au premier jour du mois.
        debut.setDate(1);
        debut.setHours(0, 0, 0, 0);
      }

      res = res.filter(
        v => new Date(v.dateVente) >= debut
      );
    }

    return res;
  });

  // Calcule le nombre total de pages après application des filtres.
  totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.ventesFiltrees().length / this.parPage)
    )
  );

  // Retourne uniquement les ventes correspondant à la page actuelle.
  ventesPage = computed(() => {
    const debut = (this.pageCourante() - 1) * this.parPage;

    return this.ventesFiltrees().slice(
      debut,
      debut + this.parPage
    );
  });

  // Nombre total de ventes enregistrées.
  totalVentes = computed(() => this.ventes().length);

  // Additionne uniquement les ventes dont le paiement est confirmé.
  montantTotal = computed(() =>
    this.ventes()
      .filter(v => v.statutPaiement === 'paye')
      .reduce((sum, v) => sum + v.prixPaye, 0)
  );

  // Compte les ventes réalisées pendant le mois en cours.
  ventesduMois = computed(() => {
    const maintenant = new Date();

    return this.ventes().filter(v => {
      const d = new Date(v.dateVente);

      return (
        d.getMonth() === maintenant.getMonth() &&
        d.getFullYear() === maintenant.getFullYear()
      );
    }).length;
  });

  // Compte les ventes dont le paiement est encore en attente.
  ventesEnAttente = computed(() =>
    this.ventes().filter(
      v => v.statutPaiement === 'en_attente'
    ).length
  );

  // Rend Math accessible directement dans le template HTML.
  readonly Math = Math;

  ngOnInit(): void {
    // Charge les ventes dès l'ouverture de la page.
    this.chargerVentes();
  }

  chargerVentes(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    // Revient à la première page après un nouveau chargement.
    this.pageCourante.set(1);

    this.venteService.listerVentes().subscribe({
      next: ventes => {
        // Trie les ventes de la plus récente à la plus ancienne.
        this.ventes.set(
          [...ventes].sort(
            (a, b) =>
              new Date(b.dateVente).getTime() -
              new Date(a.dateVente).getTime()
          )
        );

        this.chargement.set(false);
      },

      error: (error: { status?: number }) => {
        // Affiche un message spécifique si la session a expiré.
        this.erreur.set(
          error.status === 401
            ? 'Votre session a expiré. Reconnectez-vous pour consulter les ventes.'
            : 'Impossible de charger les ventes. Vérifiez votre connexion puis réessayez.'
        );

        this.chargement.set(false);
      }
    });
  }

  onRecherche(event: Event): void {
    // Met à jour la recherche avec la valeur saisie.
    this.recherche.set(
      (event.target as HTMLInputElement).value
    );

    // Revient à la première page après modification du filtre.
    this.pageCourante.set(1);
  }

  onFiltreStatut(event: Event): void {
    // Récupère le statut sélectionné dans la liste déroulante.
    this.filtreStatut.set(
      (event.target as HTMLSelectElement).value
    );

    this.pageCourante.set(1);
  }

  onFiltreDechet(event: Event): void {
    // Récupère le type de déchet sélectionné.
    this.filtreDechet.set(
      (event.target as HTMLSelectElement).value
    );

    this.pageCourante.set(1);
  }

  onFiltrePeriode(event: Event): void {
    // Récupère la période choisie : semaine ou mois.
    this.filtrePeriode.set(
      (event.target as HTMLSelectElement).value
    );

    this.pageCourante.set(1);
  }

  allerPage(page: number): void {
    // Change de page uniquement si le numéro est valide.
    if (page >= 1 && page <= this.totalPages()) {
      this.pageCourante.set(page);
    }
  }

  nomCitoyen(vente: VenteDechet): string {
    // Construit le nom complet à partir du prénom et du nom.
    const nom =
      `${vente.prenomUtilisateur} ${vente.nomUtilisateur}`.trim();

    // Utilise l'email si le nom n'est pas disponible.
    return (
      nom ||
      vente.emailUtilisateur?.split('@')[0] ||
      'Compte supprimé'
    );
  }

  initiales(vente: VenteDechet): string {
    const nom = this.nomCitoyen(vente);

    // Sépare les différentes parties du nom.
    const parties = nom
      .split(/[\s._-]+/)
      .filter(Boolean);

    // Prend les deux premières initiales pour l'avatar.
    return (
      parties
        .slice(0, 2)
        .map(partie => partie[0])
        .join('')
        .toUpperCase() || '—'
    );
  }

  formaterDate(dateIso: string): string {
    // Transforme la date ISO en format français lisible.
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  classeStatut(statut: string): string {
    // Retourne les classes Tailwind correspondant au statut.
    switch (statut) {
      case 'paye':
        return 'bg-green-100 text-green-700';

      case 'en_attente':
        return 'bg-orange-100 text-orange-600';

      case 'echoue':
        return 'bg-red-100 text-red-600';

      case 'rembourse':
        return 'bg-slate-100 text-slate-500';

      default:
        return 'bg-slate-100 text-slate-500';
    }
  }

  libelleStatut(statut: string): string {
    // Traduit les statuts techniques de l'API en libellés français.
    const map: Record<string, string> = {
      paye: 'Payée',
      en_attente: 'En attente',
      echoue: 'Annulée',
      rembourse: 'Remboursée',
    };

    return map[statut] ?? statut;
  }

  voirDetail(id: number): void {
    // Annule une ancienne requête si l'utilisateur ouvre rapidement un autre détail.
    this.detailRequest?.unsubscribe();

    // Réinitialise l'état du panneau de détail.
    this.venteDetail.set(null);
    this.erreurDetail.set(null);
    this.chargementDetail.set(true);

    // Récupère les informations détaillées de la vente.
    this.detailRequest = this.venteService.obtenirVente(id).subscribe({
      next: vente => {
        this.venteDetail.set(vente);
        this.chargementDetail.set(false);
        this.detailRequest = undefined;
      },

      error: () => {
        this.erreurDetail.set(
          'Impossible de charger le détail de cette vente.'
        );
        this.chargementDetail.set(false);
        this.detailRequest = undefined;
      },
    });
  }

  fermerDetail(): void {
    // Annule la requête de détail si elle est encore active.
    this.detailRequest?.unsubscribe();
    this.detailRequest = undefined;

    // Ferme et réinitialise le panneau de détail.
    this.chargementDetail.set(false);
    this.venteDetail.set(null);
    this.erreurDetail.set(null);
  }

  // Génère les numéros de pages visibles avec "..." lorsque la liste est longue.
  pagesVisibles = computed(() => {
    const total = this.totalPages();
    const current = this.pageCourante();
    const pages: (number | '...')[] = [];

    // Si le nombre de pages est faible, on affiche toutes les pages.
    if (total <= 5) {
      return Array.from(
        { length: total },
        (_, i) => i + 1
      );
    }

    // La première page reste toujours visible.
    pages.push(1);

    // Ajoute "..." si les pages précédentes sont éloignées.
    if (current > 3) {
      pages.push('...');
    }

    // Affiche les pages autour de la page actuelle.
    for (
      let i = Math.max(2, current - 1);
      i <= Math.min(total - 1, current + 1);
      i++
    ) {
      pages.push(i);
    }

    // Ajoute "..." si les dernières pages sont éloignées.
    if (current < total - 2) {
      pages.push('...');
    }

    // La dernière page reste toujours visible.
    pages.push(total);

    return pages;
  });
}
