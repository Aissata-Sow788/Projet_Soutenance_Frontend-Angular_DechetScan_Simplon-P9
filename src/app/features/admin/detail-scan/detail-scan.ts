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

  // Construit l'URL complète de l'image stockée par Django.
  imageScan(): string {

    const photo = this.scan()?.photoUrl;

    if (!photo) {
      return '/assets/images/placeholder-scan.png';
    }

    // Si Django renvoie déjà une URL complète,
    // on l'utilise directement.
    if (photo.startsWith('http')) {
      return photo;
    }

    // Sinon on ajoute l'adresse du serveur Django.
    return `http://127.0.0.1:8000${photo}`;
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
}
