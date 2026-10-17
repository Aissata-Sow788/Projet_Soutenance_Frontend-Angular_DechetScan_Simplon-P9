import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { ScanService } from '../../core/services/scan';
import { ScanDechet } from '../../shared/models/scan.model';
import { Navigations } from '../../shared/components/navigations/navigations';
import { Footer } from '../../shared/components/footer/footer';

interface ScanHistorique {
  id: number;
  image: string;
  objet: string;
  categories: string[];
  nombreDetections: number;
  date: string;
  heure: string;
  dateOriginale: string;
}

type PeriodeHistorique = 'semaine' | 'mois' | 'tout';
type IconeStatistique = 'scans' | 'detections' | 'categories';

interface Statistique {
  libelle: string;
  valeur: number;
  icone: IconeStatistique;
}

@Component({
  imports: [BarreNavigations, RouterLink, Navigations, Footer],
  selector: 'app-historique',
  styleUrl: './historique.css',
  templateUrl: './historique.html',
})
export class Historique implements OnInit {
  private readonly router = inject(Router);
  private readonly scanService = inject(ScanService);
  private readonly destroyRef = inject(DestroyRef);

  // ---------- État (signals) ----------
  readonly scans = signal<ScanHistorique[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly recherche = signal('');
  readonly filtreActif = signal<PeriodeHistorique>('tout');
  readonly pageActuelle = signal(1);
  readonly scansParPage = signal(6);
  readonly imagesEnErreur = signal<ReadonlySet<number>>(new Set());

  readonly periodes: readonly { id: PeriodeHistorique; libelle: string }[] = [
    { id: 'tout', libelle: 'Tout' },
    { id: 'semaine', libelle: 'Cette semaine' },
    { id: 'mois', libelle: 'Ce mois' },
  ];

  // ---------- Valeurs dérivées (computed) ----------
  readonly nombreScans = computed(() => this.scans().length);

  readonly nombreDetections = computed(() =>
    this.scans().reduce((total, scan) => total + scan.nombreDetections, 0)
  );

  readonly categoriesIdentifiees = computed(
    () => new Set(this.scans().flatMap((scan) => scan.categories)).size
  );

  readonly statistiques = computed<Statistique[]>(() => [
    { libelle: 'Total des scans', valeur: this.nombreScans(), icone: 'scans' },
    { libelle: 'Déchets identifiés', valeur: this.nombreDetections(), icone: 'detections' },
    { libelle: 'Catégories reconnues', valeur: this.categoriesIdentifiees(), icone: 'categories' },
  ]);

  readonly scansFiltres = computed(() => {
    const filtreDate = this.filtreActif();
    const terme = this.recherche().trim().toLocaleLowerCase('fr');

    const limite = new Date();
    if (filtreDate === 'semaine') {
      limite.setDate(limite.getDate() - 7);
    } else if (filtreDate === 'mois') {
      limite.setMonth(limite.getMonth() - 1);
    }

    return this.scans().filter((scan) => {
      const dansLaPeriode = filtreDate === 'tout' || new Date(scan.dateOriginale) >= limite;
      if (!dansLaPeriode) return false;

      if (!terme) return true;
      return [scan.objet, ...scan.categories].some((valeur) =>
        valeur.toLocaleLowerCase('fr').includes(terme)
      );
    });
  });

  readonly nombrePages = computed(() =>
    Math.max(1, Math.ceil(this.scansFiltres().length / this.scansParPage()))
  );

  readonly pages = computed(() =>
    Array.from({ length: this.nombrePages() }, (_, index) => index + 1)
  );

  readonly scansPage = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.scansParPage();
    return this.scansFiltres().slice(debut, debut + this.scansParPage());
  });

  // ---------- Cycle de vie ----------
  ngOnInit(): void {
    this.chargerHistorique();
  }

  // ---------- Actions ----------
  chargerHistorique(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.scanService
      .historique()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (scans) => {
          this.scans.set(scans.map((scan) => this.convertirEnHistorique(scan)));
          this.imagesEnErreur.set(new Set());
          this.pageActuelle.set(1);
          this.chargement.set(false);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur lors de la récupération de l’historique :', error);
          this.erreur.set(
            error.status === 401
              ? 'Votre session a expiré. Reconnectez-vous pour consulter vos scans.'
              : 'Impossible de charger votre historique. Vérifiez votre connexion puis réessayez.'
          );
          this.chargement.set(false);
        },
      });
  }

  changerFiltre(filtre: PeriodeHistorique): void {
    this.filtreActif.set(filtre);
    this.pageActuelle.set(1);
  }

  rechercher(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
    this.pageActuelle.set(1);
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.nombrePages()) {
      this.pageActuelle.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  marquerImageEnErreur(idScan: number): void {
    this.imagesEnErreur.update((ids) => new Set(ids).add(idScan));
  }

  voirDetail(idScan: number): void {
    void this.router.navigate(['/analyse-ia'], {
      queryParams: { idScan, mode: 'consultation' },
    });
  }

  ouvrirScanner(): void {
    void this.router.navigate(['/scan']);
  }

  // ---------- Conversion des données de l'API ----------
  private convertirEnHistorique(scan: ScanDechet): ScanHistorique {
    const detections = scan.analyseIA?.detections ?? [];
    const categories = [
      ...new Set(
        detections
          .map((detection) => detection.idTypeDechet?.nom)
          .filter((nom): nom is string => Boolean(nom))
      ),
    ];
    const objets = detections.map((detection) => detection.objet).filter(Boolean);
    const date = new Date(scan.dateScan);
    const dateValide = !Number.isNaN(date.getTime());

    return {
      id: scan.idScan,
      image: this.urlPhoto(scan.photoUrl),
      objet: objets.length ? objets.join(', ') : 'Aucun déchet identifié',
      categories,
      nombreDetections: detections.length,
      date: dateValide
        ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—',
      heure: dateValide
        ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '—',
      dateOriginale: scan.dateScan,
    };
  }

  private urlPhoto(photoUrl: string | null | undefined): string {
    if (!photoUrl) return '';

    try {
      const url = new URL(photoUrl, window.location.origin);
      const chemin = url.pathname.startsWith('/media/')
        ? url.pathname
        : `/media/${url.pathname.replace(/^\/+/, '')}`;
      return `${chemin}${url.search}${url.hash}`;
    } catch {
      return photoUrl;
    }
  }
}
