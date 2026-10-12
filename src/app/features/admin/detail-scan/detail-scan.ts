import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScanService, DetectionAdmin, ScanAdmin } from '../../../core/services/scan';


@Component({
  imports: [CommonModule],
  selector: 'app-detail-scan',
  styleUrl: './detail-scan.css',
  templateUrl: './detail-scan.html',
})
export class DetailScan implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scanService = inject(ScanService);

  // Indique si les données du scan sont encore en cours de chargement.
  chargement = signal(true);

  // Contient le message d'erreur à afficher si l'API échoue.
  erreur = signal('');

  // Contient le scan récupéré depuis Django.
  scan = signal<ScanAdmin | null>(null);

  // Masque la photo si le fichier média ne peut pas être chargé.
  imageEnErreur = signal(false);

  ngOnInit(): void {

    // IMPORTANT :
    // La route utilise ":idScan", donc on doit récupérer
    // "idScan" et non "id".
    const idScan = Number(
      this.route.snapshot.paramMap.get('idScan')
    );

    console.log('[DETAIL SCAN] ID reçu dans l URL :', idScan);

    // Vérifie que l'identifiant existe réellement.
    if (!idScan) {
      this.erreur.set('Identifiant du scan invalide.');
      this.chargement.set(false);
      return;
    }

    // Appelle Django avec l'identifiant du scan.
    this.chargerScan(idScan);
  }

  // Récupère le détail du scan depuis l'API Django.
  private chargerScan(idScan: number): void {

    this.chargement.set(true);
    this.erreur.set('');

    console.log(
      '[DETAIL SCAN] Appel API pour le scan :',
      idScan
    );

    this.scanService.detailAdmin(idScan).subscribe({

      next: (scan) => {
        console.log('[DETAIL SCAN] Scan reçu :', scan);
        this.scan.set(scan);
        this.imageEnErreur.set(false);
        this.chargement.set(false);
      },

      // Django a retourné une erreur.
      error: (error) => {

        console.error(
          '[DETAIL SCAN] Erreur API :',
          error
        );

        this.erreur.set(
          'Impossible de récupérer les informations du scan.'
        );

        this.chargement.set(false);
      }
    });
  }

  // Retourne toutes les détections réalisées par l'IA.
  detections(): DetectionAdmin[] {
    return this.scan()?.analyseIA?.detections ?? [];
  }

  // Retourne la première détection comme classification principale.
  detectionPrincipale(): DetectionAdmin | null {
    return this.detections()[0] ?? null;
  }

  // Retourne le nom de la catégorie détectée.
  categoriePrincipale(): string {

    const detection = this.detectionPrincipale();

    return (
      detection?.idTypeDechet?.nom ??
      'Déchet non identifié'
    );
  }

  // Retourne l'objet identifié par l'IA.
  objetPrincipal(): string {

    const detection = this.detectionPrincipale();

    return (
      detection?.objet ??
      'Objet non identifié'
    );
  }

  // Retourne le niveau de confiance de l'IA.
  confiancePrincipale(): number {

    const detection = this.detectionPrincipale();

    return detection?.confiance ?? 0;
  }

  // Retourne le conseil de tri associé au type de déchet.
  conseilTri(): string {

    const detection = this.detectionPrincipale();

    return (
      detection?.idTypeDechet?.conseil?.consigne ??
      'Aucun conseil de tri disponible.'
    );
  }

  // Utilise le proxy média du frontend au lieu d'une adresse locale codée en dur.
  imageScan(): string {

    const photo = this.scan()?.photoUrl;

    if (!photo?.trim()) {
      return '';
    }

    const url = new URL(photo, window.location.origin);
    const cheminMedia = url.pathname.startsWith('/media/')
      ? url.pathname
      : `/media/${url.pathname.replace(/^\/+/, '')}`;

    return `${cheminMedia}${url.search}${url.hash}`;
  }

  // Affiche un état de remplacement si la photo est absente ou inaccessible.
  imageScanIndisponible(): void {
    this.imageEnErreur.set(true);
  }

  ouvrirImage(): void {
    const image = this.imageScan();
    if (image && !this.imageEnErreur()) {
      window.open(image, '_blank', 'noopener,noreferrer');
    }
  }

  // Formate la date du scan.
  dateScan(): string {

    const date = this.scan()?.dateScan;

    if (!date) {
      return '--';
    }

    return new Intl.DateTimeFormat(
      'fr-FR',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    ).format(new Date(date));
  }

  // Formate l'heure du scan.
  heureScan(): string {

    const date = this.scan()?.dateScan;

    if (!date) {
      return '--:--';
    }

    return new Intl.DateTimeFormat(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(new Date(date));
  }

/**
 * Retourne le nombre total de scans réalisés
 * par l'utilisateur associé à ce scan.
 *
 * Cette valeur est calculée par Django et envoyée
 * avec le détail du scan.
 */
nombreScans(): number {

  // Récupère le scan actuellement chargé.
  const scan = this.scan();

  // Si aucun scan n'est encore chargé,
  // on retourne 0.
  if (!scan) {
    return 0;
  }

  // Django nous fournit directement le nombre
  // total de scans de cet utilisateur.
  return scan.nombreScans;
}

  // Retourne vers la liste de tous les scans.
  retourScans(): void {
    this.router.navigate(['/admin/tous-scans']);
  }

  // ─── Helpers visuels (couleurs badges et icônes) ──────────────

  /**
   * Formate la confiance en pourcentage lisible.
   * Ex: 0.96 → "96%"
   */
  formaterConfiance(confiance: number): string {
    return `${Math.round(confiance * 100)}%`;
  }

  /** Classe de fond de l'icône selon la catégorie. */
  iconeBg(nom: string | null | undefined): string {
    const n = (nom ?? '').toLowerCase();
    if (n.includes('plastique'))                    return 'bg-[#C9F5EF]';
    if (n.includes('métal') || n.includes('metal')) return 'bg-[#DCE8FA]';
    if (n.includes('papier') || n.includes('carton')) return 'bg-orange-100';
    if (n.includes('verre'))                        return 'bg-green-100';
    return 'bg-slate-100';
  }

  /** Classe de couleur de l'icône selon la catégorie. */
  iconeColor(nom: string | null | undefined): string {
    const n = (nom ?? '').toLowerCase();
    if (n.includes('plastique'))                    return 'text-[#0EA5A4]';
    if (n.includes('métal') || n.includes('metal')) return 'text-blue-600';
    if (n.includes('papier') || n.includes('carton')) return 'text-orange-500';
    if (n.includes('verre'))                        return 'text-green-600';
    return 'text-slate-500';
  }

  /** Classe du badge catégorie. */
  badgeClasse(nom: string | null | undefined): string {
    const n = (nom ?? '').toLowerCase();
    if (n.includes('plastique'))                    return 'bg-[#C9F5EF] text-[#087C78]';
    if (n.includes('métal') || n.includes('metal')) return 'bg-[#DCE8FA] text-[#315273]';
    if (n.includes('papier') || n.includes('carton')) return 'bg-orange-100 text-orange-700';
    if (n.includes('verre'))                        return 'bg-green-100 text-green-700';
    return 'bg-slate-100 text-slate-500';
  }

  /** Libellé de destination selon la catégorie. */
  destinationLabel(nom: string | null | undefined): string {
    const n = (nom ?? '').toLowerCase();
    if (n.includes('plastique'))                    return 'Bac plastique';
    if (n.includes('métal') || n.includes('metal')) return 'Bac métaux';
    if (n.includes('papier') || n.includes('carton')) return 'Bac papier/carton';
    if (n.includes('verre'))                        return 'Bac verre';
    if (n.includes('organique'))                    return 'Compost';
    return 'Bac approprié';
  }
}
