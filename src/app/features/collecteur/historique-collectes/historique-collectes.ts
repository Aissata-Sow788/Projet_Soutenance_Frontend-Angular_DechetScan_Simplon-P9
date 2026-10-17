
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CollecteService } from '../../../core/services/collecte'; // Vérifie le chemin de ton service.
import { Collecte } from '../../../shared/models/collecte.model'; // Vérifie le chemin de ton modèle.

@Component({
  selector: 'app-historique-collectes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historique-collectes.html',
  styleUrl: './historique-collectes.css'
})
export class HistoriqueCollectes implements OnInit {

  private readonly collecteService = inject(CollecteService);

  // État du chargement et des erreurs.
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // Liste des collectes reçues du backend.
  collectes = signal<Collecte[]>([]);

  // Valeurs des filtres.
  recherche = signal('');
  filtrePeriode = signal('tout');
  filtreDechet = signal('');

  // Pagination.
  readonly parPage = 8;
  pageCourante = signal(1);

  // Accès souple aux champs variables du retour API.
  // Cela permet de reconnaître plusieurs noms de propriétés possibles.
  private valeur(
    collecte: Collecte,
    champs: string[]
  ): unknown {
    const objet = collecte as unknown as Record<string, unknown>;

    for (const champ of champs) {
      const valeur = objet[champ];

      if (valeur !== null && valeur !== undefined && valeur !== '') {
        return valeur;
      }
    }

    return null;
  }

  // Affiche le ou les déchets associés à la collecte.
  nomDechets(collecte: Collecte): string {
    const valeur = this.valeur(collecte, [
      'nomDechet',
      'typeDechet',
      'nomTypeDechet',
      'dechet',
      'typesDechets',
      'dechets',
      'categoriesDechets'
    ]);

    if (Array.isArray(valeur)) {
      return valeur
        .map(item => {
          if (typeof item === 'string') return item;

          if (item && typeof item === 'object') {
            const element = item as Record<string, unknown>;
            return element['nom'] ??
              element['nomDechet'] ??
              element['libelle'] ??
              element['type'] ??
              '';
          }

          return '';
        })
        .filter(Boolean)
        .join(', ') || 'Non renseigné';
    }

    if (valeur && typeof valeur === 'object') {
      const element = valeur as Record<string, unknown>;

      return String(
        element['nom'] ??
        element['nomDechet'] ??
        element['libelle'] ??
        element['type'] ??
        'Non renseigné'
      );
    }

    return valeur !== null ? String(valeur) : 'Non renseigné';
  }

  // Identifie le nom de la zone ou de l'adresse d'intervention.
  nomZone(collecte: Collecte): string {
    const valeur = this.valeur(collecte, [
      'zoneIntervention',
      'nomZone',
      'adresseIntervention',
      'adresse',
      'localisation',
      'nomPoint',
      'zone'
    ]);

    if (valeur && typeof valeur === 'object') {
      const objet = valeur as Record<string, unknown>;

      return String(
        objet['nom'] ??
        objet['adresse'] ??
        objet['libelle'] ??
        'Non renseignée'
      );
    }

    return valeur !== null ? String(valeur) : 'Non renseignée';
  }

  // Normalise le nom du déchet pour comparer les filtres.
  private normaliser(texte: string): string {
    return texte
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Collectes filtrées par période, recherche et catégorie de déchet.
  collectesFiltrees = computed(() => {
    let resultat = [...this.collectes()];

    // Filtre de période.
    const periode = this.filtrePeriode();

    if (periode !== 'tout') {
      const maintenant = new Date();
      const limite = new Date(maintenant);

      if (periode === 'semaine') {
        limite.setDate(limite.getDate() - 7);
      } else if (periode === 'mois') {
        limite.setMonth(limite.getMonth() - 1);
      } else if (periode === 'trimestre') {
        limite.setMonth(limite.getMonth() - 3);
      }

      resultat = resultat.filter(collecte => {
        const dateSource =
          collecte.dateRealisation ?? collecte.datePlanifiee;

        if (!dateSource) return false;

        const date = new Date(dateSource);

        return !Number.isNaN(date.getTime()) &&
          date >= limite &&
          date <= maintenant;
      });
    }

    // Recherche par déchet, zone, collecteur et demande.
    const texte = this.normaliser(this.recherche());

    if (texte) {
      resultat = resultat.filter(collecte => {
        const idDemande = this.valeur(collecte, ['idDemande']);

        const contenu = [
          this.nomDechets(collecte),
          this.nomZone(collecte),
          String(this.valeur(collecte, ['nomCollecteur']) ?? ''),
          String(this.valeur(collecte, ['nomPoint']) ?? ''),
          String(idDemande ?? '')
        ].map(element => this.normaliser(element));

        return contenu.some(element => element.includes(texte));
      });
    }

    // Filtre par catégorie de déchet.
    const dechet = this.filtreDechet();

    if (dechet) {
      resultat = resultat.filter(collecte => {
        const noms = this.normaliser(this.nomDechets(collecte));
        return noms.includes(this.normaliser(dechet));
      });
    }

    // Tri du plus récent au plus ancien.
    return resultat.sort((a, b) => {
      const dateA = new Date(
        a.dateRealisation ?? a.datePlanifiee
      ).getTime();

      const dateB = new Date(
        b.dateRealisation ?? b.datePlanifiee
      ).getTime();

      return dateB - dateA;
    });
  });

  // Nombre de pages après application des filtres.
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.collectesFiltrees().length / this.parPage))
  );

  // Collectes de la page actuelle.
  collectesPage = computed(() => {
    const debut = (this.pageCourante() - 1) * this.parPage;

    return this.collectesFiltrees().slice(
      debut,
      debut + this.parPage
    );
  });

  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1)
  );

  // Totaux actualisés selon les filtres.
  totalTerminees = computed(() => this.collectesFiltrees().length);

  debutAffichage = computed(() =>
    this.totalTerminees() === 0
      ? 0
      : (this.pageCourante() - 1) * this.parPage + 1
  );

  finAffichage = computed(() =>
    Math.min(
      this.pageCourante() * this.parPage,
      this.totalTerminees()
    )
  );

  ngOnInit(): void {
    this.chargerHistorique();
  }

// Vérifie si la collecte est réellement terminée.
private estTerminee(collecte: Collecte): boolean {
  const statut = this.valeur(collecte, [
    'statut',
    'statutCollecte',
    'etat',
    'status'
  ]);

  if (typeof statut !== 'string') {
    return false;
  }

  const valeur = this.normaliser(statut)
    .replace(/[\s_-]+/g, '');

  return [
    'terminee',
    'termine',
    'realisee',
    'realise',
    'completed',
    'complete'
  ].includes(valeur);
}


// Charge uniquement les collectes terminées.
private chargerHistorique(): void {
  this.chargement.set(true);
  this.erreur.set(null);

  this.collecteService.listerCollectes().subscribe({
    next: (collectes) => {
      // Filtre les collectes selon leur véritable statut.
      const collectesTerminees = collectes.filter(
        collecte => this.estTerminee(collecte)
      );

      // Trie les collectes de la plus récente à la plus ancienne.
      const triees = [...collectesTerminees].sort((a, b) => {
        const dateA = new Date(
          a.dateRealisation ?? a.datePlanifiee
        ).getTime();

        const dateB = new Date(
          b.dateRealisation ?? b.datePlanifiee
        ).getTime();

        return (
          (Number.isNaN(dateB) ? 0 : dateB) -
          (Number.isNaN(dateA) ? 0 : dateA)
        );
      });

      this.collectes.set(triees);
      this.pageCourante.set(1);
      this.chargement.set(false);

      // À vérifier dans la console si aucune collecte ne s'affiche.
      console.log('Collectes reçues de l’API :', collectes);
      console.log('Collectes terminées retenues :', triees);
    },

    error: (erreur) => {
      console.error('Erreur historique des collectes :', erreur);
      this.erreur.set("Impossible de charger l'historique.");
      this.chargement.set(false);
    }
  });
}



  // Formate une date sans planter si la valeur est invalide.
  formaterDate(dateIso: string | null | undefined): string {
    if (!dateIso) return 'Date inconnue';

    const date = new Date(dateIso);

    if (Number.isNaN(date.getTime())) return 'Date inconnue';

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Remet la pagination à la première page après chaque filtre.
  onRecherche(event: Event): void {
    this.recherche.set(
      (event.target as HTMLInputElement).value
    );
    this.pageCourante.set(1);
  }

  onFiltrePeriode(event: Event): void {
    this.filtrePeriode.set(
      (event.target as HTMLSelectElement).value
    );
    this.pageCourante.set(1);
  }

  onFiltreDechet(event: Event): void {
    this.filtreDechet.set(
      (event.target as HTMLSelectElement).value
    );
    this.pageCourante.set(1);
  }

  // Change de page uniquement si le numéro est valide.
  allerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageCourante.set(page);
    }
  }

  // Génère les initiales pour l'avatar.
  initiales(nom: string | null): string {
    if (!nom) return '?';

    return nom
      .trim()
      .split(/\s+/)
      .map(mot => mot[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}

