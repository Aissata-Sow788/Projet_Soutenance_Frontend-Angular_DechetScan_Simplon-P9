import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { ScanService } from '../../core/services/scan';
import { ScanDechet } from '../../shared/models/scan.model';

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

@Component({
  imports: [CommonModule, BarreNavigations, RouterLink],
  selector: 'app-historique',
  styleUrl: './historique.css',
  templateUrl: './historique.html',
})
export class Historique implements OnInit {
  private readonly router = inject(Router);
  private readonly scanService = inject(ScanService);

  readonly recherche = signal('');
  readonly filtreActif = signal<PeriodeHistorique>('tout');
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly scans = signal<ScanHistorique[]>([]);
  readonly pageActuelle = signal(1);
  readonly scansParPage = 6;

  // Les statistiques sont calculées depuis l'historique réellement renvoyé par l'API.
  readonly nombreScans = computed(() => this.scans().length);
  readonly nombreDetections = computed(() =>
    this.scans().reduce((total, scan) => total + scan.nombreDetections, 0)
  );
  // Compte les catégories distinctes, sans compter plusieurs fois le même type.
  readonly categoriesIdentifiees = computed(() =>
    new Set(this.scans().flatMap((scan) => scan.categories)).size
  );

  readonly scansFiltres = computed(() => {
    const maintenant = new Date();
    const filtreDate = this.filtreActif();
    const terme = this.recherche().trim().toLocaleLowerCase('fr');

    return this.scans()
      .filter((scan) => {
        if (filtreDate === 'tout') return true;

        const limite = new Date(maintenant);
        if (filtreDate === 'semaine') {
          limite.setDate(limite.getDate() - 7);
        } else {
          limite.setMonth(limite.getMonth() - 1);
        }
        return new Date(scan.dateOriginale) >= limite;
      })
      .filter((scan) => {
        if (!terme) return true;
        return [scan.objet, ...scan.categories]
          .some((valeur) => valeur.toLocaleLowerCase('fr').includes(terme));
      });
  });

  readonly nombrePages = computed(() =>
    Math.max(1, Math.ceil(this.scansFiltres().length / this.scansParPage))
  );
  readonly pages = computed(() =>
    Array.from({ length: this.nombrePages() }, (_, index) => index + 1)
  );
  readonly scansPage = computed(() => {
    const debut = (this.pageActuelle() - 1) * this.scansParPage;
    return this.scansFiltres().slice(debut, debut + this.scansParPage);
  });

  ngOnInit(): void {
    this.chargerHistorique();
  }

  chargerHistorique(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.scanService.historique().subscribe({
      next: (scans) => {
        this.scans.set(scans.map((scan) => this.convertirEnHistorique(scan)));
        this.pageActuelle.set(1);
        this.chargement.set(false);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération de l’historique :', error);
        this.erreur.set(error.status === 401
          ? 'Votre session a expiré. Reconnectez-vous pour consulter vos scans.'
          : 'Impossible de charger votre historique. Vérifiez votre connexion puis réessayez.');
        this.chargement.set(false);
      },
    });
  }

  private convertirEnHistorique(scan: ScanDechet): ScanHistorique {
    const detections = scan.analyseIA?.detections ?? [];
    const categories = [...new Set(
      detections
        .map((detection) => detection.idTypeDechet?.nom)
        .filter((nom): nom is string => Boolean(nom))
    )];
    const objets = detections
      .map((detection) => detection.objet)
      .filter(Boolean);
    const date = new Date(scan.dateScan);

    return {
      id: scan.idScan,
      image: this.urlPhoto(scan.photoUrl),
      objet: objets.length
        ? objets.join(', ')
        : 'Aucun déchet identifié',
      categories,
      nombreDetections: detections.length,
      date: date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      heure: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      dateOriginale: scan.dateScan,
    };
  }

  private urlPhoto(photoUrl: string): string {
    const url = new URL(photoUrl, window.location.origin);
    // Les photos passent par le proxy /media du frontend et non par localhost Django.
    const chemin = url.pathname.startsWith('/media/')
      ? url.pathname
      : `/media/${url.pathname.replace(/^\/+/, '')}`;
    return `${chemin}${url.search}${url.hash}`;
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

  ouvrirDetail(idScan: number): void {
    void this.router.navigate(['/analyse-ia'], {
      queryParams: { idScan },
    });
  }

  ouvrirScanner(): void {
    void this.router.navigate(['/scan']);
  }
}
