import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DetectionIA } from '../../shared/models/analyse-ia.model';
import { PanierDechetApi, ScanService } from '../../core/services/scan';
import { Auth } from '../../core/services/auth';

@Component({
  imports: [CommonModule],
  selector: 'app-analyse-ia',
  styleUrl: './analyse-ia.css',
  templateUrl: './analyse-ia.html',
})


export class AnalyseIA implements OnInit {

  private scanService = inject(ScanService);

  private router = inject(Router);

  private route = inject(ActivatedRoute);

  private auth = inject(Auth);



  // Résultat actuellement affiché.

  resultat = this.scanService.dernierResultat;

  // Active le mode lecture seule lorsque la fiche vient de l’historique.
  modeConsultation = signal(false);



  // Indique si l'analyse est en cours de chargement.

  chargement = signal(true);



  // Permet d'afficher un message d'erreur à l'utilisateur.

  erreur = signal<string | null>(null);

  paniers = signal<PanierDechetApi[]>([]);

  ajoutsEnCours = signal<Set<number>>(new Set());

  detectionsAjoutees = signal<Set<number>>(new Set());

  quantitesSelectionnees = signal<Record<number, number>>({});

  erreurPanier = signal<string | null>(null);

  nombreCategories = computed(

    () => new Set(this.detections

      .map((detection) => detection.idTypeDechet?.idTypeDechet)

      .filter((id): id is number => Number.isInteger(id) && (id ?? 0) > 0)).size,

  );

  confianceMoyenne = computed(() => {

    const detections = this.detections;

    if (!detections.length) return 0;

    return detections.reduce((total, detection) => total + detection.confiance, 0) / detections.length;

  });



  ngOnInit(): void {

    // Récupère l'identifiant du scan présent dans l'URL.

    this.route.queryParamMap.subscribe((params) => {

      const idScan = Number(params.get('idScan'));

      const ouvrirPanier = params.get('panier') === '1' || params.get('popup') === 'panier';
      this.modeConsultation.set(params.get('mode') === 'consultation');



      if (ouvrirPanier) {

        this.router.navigate(['/mes-paniers']);

        return;

      }



      // Si l'identifiant existe, on recharge le scan depuis Django.

      if (idScan) {

        this.chargerScan(idScan);

      } else {

        // Aucun identifiant : on utilise éventuellement

        // le résultat déjà présent dans le service.

        this.chargement.set(false);



        if (!this.resultat()) {

          this.erreur.set('Aucun résultat de scan disponible.');

        } else {

          if (!this.modeConsultation()) {
            this.chargerPaniers(this.auth.isAuthenticated());
          }

        }

      }

    });

  }



  /**

   * Recharge le scan depuis Django.

   *

   * Cette méthode permet au résultat de rester disponible

   * même après un rafraîchissement de la page.

   */

  private chargerScan(idScan: number): void {

    this.chargement.set(true);

    this.erreur.set(null);



    this.scanService.getScan(idScan).subscribe({

      next: (scan) => {

        // Met à jour le résultat dans le service.

        this.scanService.dernierResultat.set(scan);



        this.chargement.set(false);

        if (!this.modeConsultation()) {
          this.chargerPaniers(this.auth.isAuthenticated());
        }

      },



      error: (err) => {

        console.error(

          'Erreur lors de la récupération du scan :',

          err

        );



        this.chargement.set(false);

        this.erreur.set('Impossible de récupérer le résultat du scan.');

      }

    });

  }



  estConnecte(): boolean {

    return this.auth.isAuthenticated();

  }



  /**

   * Retourne les détections réalisées par l'IA.

   */

  get detections() {

    return this.resultat()?.analyseIA?.detections ?? [];

  }



  private chargerPaniers(citoyenConnecte: boolean): void {

    if (!citoyenConnecte) {

      this.paniers.set([]);

      return;

    }



    this.scanService.getPaniers().subscribe({

      next: (paniers) => this.paniers.set(paniers),

      error: () => this.erreurPanier.set(

        'Impossible de charger vos paniers pour le moment.',

      ),

    });

  }



  /**

   * Construit l'URL complète de la photo.

   */

  get imageUrl(): string | null {

    const photoUrl = this.resultat()?.photoUrl;



    if (!photoUrl) {

      return null;

    }



    const url = new URL(photoUrl, window.location.origin);

    const path = url.pathname.startsWith('/media/')

      ? url.pathname
      : `/media/${url.pathname.replace(/^\/+/, '')}`;



    return `${path}${url.search}${url.hash}`;

  }



  destinationLabel(nom: string | null | undefined): string {

    const categorie = (nom ?? '').toLocaleLowerCase('fr');



    if (categorie.includes('plastique')) return 'Bac plastique';

    if (categorie.includes('métal') || categorie.includes('metal')) return 'Bac métaux';

    if (categorie.includes('papier') || categorie.includes('carton')) return 'Bac papier/carton';

    if (categorie.includes('verre')) return 'Bac verre';

    if (categorie.includes('organique')) return 'Compost';

    return 'Bac approprié';

  }



  conseilPourDetection(detection: DetectionIA): string {

    const consigne = detection.idTypeDechet?.conseil?.consigne?.trim();

    if (consigne) {

      return consigne;

    }



    const categorie = detection.idTypeDechet?.nom.toLocaleLowerCase('fr') ?? '';

    if (categorie.includes('plastique')) {

      return 'Bac Jaune ou Recyclage Plastique. Videz, rincez et laissez le bouchon vissé.';

    }

    if (categorie.includes('métal') || categorie.includes('metal')) {

      return 'Bac Jaune / Collecteur Métal. Videz complètement la canette avant dépôt.';

    }

    if (categorie.includes('papier') || categorie.includes('carton')) {

      return 'Bac Bleu ou Point d’Apport. Aplatissez le carton et déposez-le plié au sec.';

    }

    if (categorie.includes('verre')) {

      return 'Colonne à Verre / Consigne. Déposez sans bouchon ni capsule.';

    }

    if (categorie.includes('organique')) {

      return 'Bac à compost. Séparez les déchets organiques des emballages recyclables.';

    }

    return 'Séparez ce déchet des autres matières et déposez-le dans le bac adapté.';

  }



  quantiteSelectionnee(idDetection: number): number {

    return this.quantitesSelectionnees()[idDetection] ?? 1;

  }



  modifierQuantite(idDetection: number, variation: number): void {

    this.quantitesSelectionnees.update((quantites) => ({

      ...quantites,

      [idDetection]: Math.max(1, this.quantiteSelectionnee(idDetection) + variation),

    }));

  }



  ajouterTousAuPanier(): void {

    if (!this.estConnecte()) {

      this.connexion();

      return;

    }



    for (const detection of this.detections) {

      if (this.detectionEstIdentifiee(detection)) {

        this.ajouterAuPanier(detection);

      }

    }

  }



  agrandirImage(): void {

    const imageUrl = this.imageUrl;

    if (imageUrl) {

      window.open(imageUrl, '\_blank', 'noopener,noreferrer');

    }

  }



  /**

   * Transforme une confiance décimale en pourcentage.

   */

  formaterConfiance(confiance: number): string {

    return `${Math.round(confiance * 100)} %`;

  }



  dateScan(): string {

    const date = this.resultat()?.dateScan;

    return date

      ? new Intl.DateTimeFormat('fr-FR', {

          day: 'numeric',

          month: 'long',

          year: 'numeric',

        }).format(new Date(date))

      : '--';

  }



  heureScan(): string {

    const date = this.resultat()?.dateScan;

    return date

      ? new Intl.DateTimeFormat('fr-FR', {

          hour: '2-digit',

          minute: '2-digit',

        }).format(new Date(date))

      : '--:--';

  }



  ajoutEstEnCours(idDetection: number): boolean {

    return this.ajoutsEnCours().has(idDetection);

  }



  detectionEstAjoutee(idDetection: number): boolean {

    return this.detectionsAjoutees().has(idDetection);

  }



  /** Une détection doit correspondre à une catégorie connue avant tout ajout. */

  detectionEstIdentifiee(detection: DetectionIA): boolean {

    const categorie = detection.idTypeDechet;

    const nomCategorie = categorie?.nom.trim().toLocaleLowerCase('fr');



    return Boolean(

      categorie

      && Number.isInteger(categorie.idTypeDechet)

      && categorie.idTypeDechet > 0

      && nomCategorie

      && !['inconnu', 'unknown', 'non identifié', 'non identifie'].includes(nomCategorie),

    );

  }



  texteBoutonPanier(idDetection: number): string {

    if (this.ajoutEstEnCours(idDetection)) {

      return 'Ajout…';

    }

    return this.detectionEstAjoutee(idDetection)

      ? 'Ajouté au panier'

      : 'Ajouter au panier';

  }



  ajouterAuPanier(detection: DetectionIA): void {

    if (

      this.ajoutEstEnCours(detection.idDetection)

      || this.detectionEstAjoutee(detection.idDetection)

    ) {

      return;

    }



    if (!this.detectionEstIdentifiee(detection)) {

      return;

    }



    const typeDechet = detection.idTypeDechet;

    if (!typeDechet) return;



    this.ajoutsEnCours.update((ids) => new Set(ids).add(detection.idDetection));

    this.erreurPanier.set(null);



    // Une détection ajoutée compte pour un objet; la pesée reste une étape distincte.

    this.scanService.ajouterAuPanier(

      typeDechet.idTypeDechet,

      this.quantiteSelectionnee(detection.idDetection),

    ).subscribe({

      next: (panierMisAJour) => {

        this.paniers.update((paniers) => [

          ...paniers.filter((panier) => panier.idPanier !== panierMisAJour.idPanier),

          panierMisAJour,

        ].sort((a, b) => a.typeDechet.nom.localeCompare(b.typeDechet.nom)));

        this.ajoutsEnCours.update((ids) => {

          const idsMisAJour = new Set(ids);

          idsMisAJour.delete(detection.idDetection);

          return idsMisAJour;

        });

        this.detectionsAjoutees.update((ids) => new Set(ids).add(detection.idDetection));

      },

      error: () => {

        this.ajoutsEnCours.update((ids) => {

          const idsMisAJour = new Set(ids);

          idsMisAJour.delete(detection.idDetection);

          return idsMisAJour;

        });

        this.erreurPanier.set(

          'L’ajout au panier a échoué. Vérifiez votre connexion puis réessayez.',

        );

      },

    });

  }



  nombreObjetsDansPanier(): number {

    return this.paniers().reduce(

      (total, panier) => total + panier.nombreDisponible,

      0,

    );

  }



  nombrePaniersRemplis(): number {

    return this.paniers().filter(

      (panier) => panier.nombreDisponible > 0,

    ).length;

  }



  panierEstVide(nombreDisponible: number): boolean {

    return nombreDisponible === 0;

  }



  ouvrirPanier(): void {

    this.router.navigate(['/mes-paniers']);

  }



  connexion(): void {

    this.router.navigate(['/connexion']);

  }



  /**

   * Retourne les classes Tailwind correspondant

   * à la catégorie détectée.

   */

  getCouleurCategorie(nomCategorie: string): string {

    const nom = nomCategorie.toLowerCase();



    if (nom.includes('plastique')) {

      return 'category-plastic';

    }



    if (nom.includes('métal') || nom.includes('metal')) {

      return 'category-metal';

    }



    if (nom.includes('papier') || nom.includes('carton')) {

      return 'category-paper';

    }



    if (nom.includes('verre')) {

      return 'category-glass';

    }



    return 'category-default';

  }



  /**

   * Retourne vers l'écran de scan.

   */

  retour(): void {

    this.router.navigate(

      this.route.snapshot.queryParamMap.has('idScan')

        ? ['/historique']

        : ['/scan'],

    );

  }



  /**

   * Ouvre la liste des points de collecte.

   */

  voirPointsCollecte(): void {

    this.router.navigate(['/points-collecte']);

  }

}
