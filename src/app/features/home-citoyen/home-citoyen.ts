import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { ScanService } from '../../core/services/scan';
import { ScanDechet } from '../../shared/models/scan.model';
import { PointCollecteService } from '../../core/services/point-collecte';


/**
 * Représente un scan affiché dans la section
 * "Mes derniers scans".
 *
 * Cette interface correspond uniquement aux données
 * nécessaires à l'affichage de la page d'accueil.
 */
interface DernierScan {
  nom: string;
  categorie: string;
  date: string;
  destination: string;
  image?: string;
}


/**
 * Représente un point de collecte affiché
 * sur la page d'accueil.
 */
interface PointProche {
  nom: string;
  distance: string;
  info: string;
  type: 'recyclage' | 'point';
}


@Component({
  imports: [CommonModule, BarreNavigations],
  selector: 'app-home-citoyen',
  styleUrl: './home-citoyen.css',
  templateUrl: './home-citoyen.html',
})
export class HomeCitoyen implements OnInit {

  // Permet de changer de page.
  private router = inject(Router);

  // Service permettant de récupérer les scans du citoyen connecté.
  private scanService = inject(ScanService);

  // Service permettant de récupérer les points de collecte.
  private pointCollecteService = inject(PointCollecteService);


  // =========================================================
  // DONNÉES DU CITOYEN
  // =========================================================

  /**
   * Prénom du citoyen connecté.
   *
   * Il sera récupéré depuis les informations enregistrées
   * après la connexion.
   */
  nomUtilisateur = signal('Citoyenne');


  /**
   * Nombre total de scans réalisés par le citoyen connecté.
   *
   * Cette valeur sera remplie depuis l'API historique.
   */
  nombreScans = signal(0);


  /**
   * Liste des derniers scans du citoyen.
   */
  derniersScans = signal<DernierScan[]>([]);


  // =========================================================
  // POINTS DE COLLECTE
  // =========================================================

  /**
   * Liste des points de collecte proches.
   *
   * Contrairement à l'ancienne version, nous ne mettons
   * plus de faux points directement dans le code.
   */
  pointsProches = signal<PointProche[]>([]);

  // Nombre de citoyens actifs récupéré depuis l'API.
  // On laisse vide tant que le backend ne fournit pas cette statistique.
  citoyensActifs = signal('—');


  // =========================================================
  // CONSEIL
  // =========================================================

  /**
   * Conseil affiché dans "Conseil du jour".
   *
   * Cette valeur sera remplacée lorsque l'API des conseils
   * sera connectée.
   */
  conseil = signal(
    'Aucun conseil disponible pour le moment.'
  );


  ngOnInit(): void {

    // Récupère les informations du citoyen connecté.
    this.chargerUtilisateur();

    // Récupère l'historique réel du citoyen connecté.
    this.chargerDerniersScans();

    // Récupère les points de collecte disponibles.
    this.chargerPointsCollecte();

    // Récupère le conseil de tri.
    this.chargerConseil();
  }


  // =========================================================
  // UTILISATEUR CONNECTÉ
  // =========================================================

  /**
   * Récupère le prénom du citoyen depuis localStorage.
   *
   * Les informations sont enregistrées lors de la connexion
   * par le service d'authentification.
   */
  private chargerUtilisateur(): void {

    const utilisateurJson =
      localStorage.getItem('dechetscan_user');

    // Aucun utilisateur enregistré.
    if (!utilisateurJson) {
      return;
    }

    try {

      const utilisateur = JSON.parse(utilisateurJson);

      // On affiche le prénom lorsqu'il est disponible.
      if (utilisateur.prenom) {
        this.nomUtilisateur.set(utilisateur.prenom);
      }

    } catch (erreur) {

      console.error(
        'Impossible de lire les informations utilisateur :',
        erreur
      );
    }
  }


  // =========================================================
  // HISTORIQUE DES SCANS
  // =========================================================

  /**
   * Charge les scans du citoyen depuis Django.
   *
   * L'API :
   * GET /api/scans/historique/
   *
   * retourne uniquement les scans appartenant
   * à l'utilisateur connecté.
   */
  private chargerDerniersScans(): void {

    this.scanService.historique().subscribe({

      next: (scans) => {

        console.log(
          'Scans récupérés pour l’accueil :',
          scans
        );

        // Nombre réel de scans du citoyen.
        this.nombreScans.set(scans.length);

        // On affiche uniquement les 5 derniers scans.
        const derniers = scans
          .slice(0, 5)
          .map(scan => this.convertirEnDernierScan(scan));

        this.derniersScans.set(derniers);
      },

      error: (erreur) => {

        console.error(
          'Erreur lors du chargement des scans :',
          erreur
        );

        // En cas d'erreur, on garde une liste vide.
        this.nombreScans.set(0);
        this.derniersScans.set([]);
      }
    });
  }


  /**
   * Transforme une réponse Django ScanDechet
   * en donnée utilisable directement par le HTML.
   */
  private convertirEnDernierScan(
    scan: ScanDechet
  ): DernierScan {

    // Récupération de la première détection IA.
    const detection =
      scan.analyseIA?.detections?.[0];

    // Type de déchet détecté.
    const type =
      detection?.idTypeDechet;

    // Conversion de la date reçue par Django.
    const date =
      new Date(scan.dateScan);

    return {

      // Nom de l'objet détecté par l'IA.
      nom:
        detection?.objet ??
        'Analyse en cours',

      // Catégorie du déchet.
      categorie:
        type?.nom ??
        'Non identifié',

      // Date et heure du scan.
      date:
        this.formaterDateHeure(date),

      // Conseil de tri associé au type.
      destination:
        type?.conseil?.consigne ??
        'Aucun conseil disponible',

      // URL complète de l'image.
      image:
        scan.photoUrl.startsWith('http')
          ? scan.photoUrl
          : `http://127.0.0.1:8000${scan.photoUrl}`
    };
  }


  /**
   * Formate la date pour l'affichage.
   *
   * Exemple :
   * Aujourd'hui — 20:05
   * 17/09 — 10:08
   */
  private formaterDateHeure(date: Date): string {

    const aujourdHui = new Date();

    const memeJour =
      date.getDate() === aujourdHui.getDate() &&
      date.getMonth() === aujourdHui.getMonth() &&
      date.getFullYear() === aujourdHui.getFullYear();

    const heure =
      date.toLocaleTimeString(
        'fr-FR',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      );

    if (memeJour) {

      return `Aujourd'hui — ${heure}`;
    }

    const dateFormatee =
      date.toLocaleDateString(
        'fr-FR',
        {
          day: '2-digit',
          month: '2-digit'
        }
      );

    return `${dateFormatee} — ${heure}`;
  }


  // =========================================================
  // POINTS DE COLLECTE
  // =========================================================

  /**
   * Récupère les points de collecte depuis l'API.
   *
   * On ne met donc plus de faux points directement
   * dans le composant.
   */
  private chargerPointsCollecte(): void {

    this.pointCollecteService.listerPoints().subscribe({

      next: (points) => {

        console.log(
          'Points de collecte récupérés :',
          points
        );

        /**
         * On prend les deux premiers points pour respecter
         * la maquette actuelle de la page d'accueil.
         *
         * Si ton service utilise un autre nom de méthode
         * que "listerPoints()", il faudra simplement utiliser
         * le nom réel de ta méthode.
         */
        const pointsAccueil =
          points.slice(0, 2).map((point: any) => {

            return {
              nom:
                point.nom ??
                'Point de collecte',

              distance:
                point.distanceKm !== undefined
                  ? `${point.distanceKm.toFixed(1)} km`
                  : 'Distance inconnue',

              info:
                point.description ??
                'Point de collecte disponible',

              type: 'point' as const
            };
          });

        this.pointsProches.set(pointsAccueil);
      },

      error: (erreur) => {

        console.error(
          'Erreur lors du chargement des points de collecte :',
          erreur
        );

        // Aucun faux point : on affiche simplement une liste vide.
        this.pointsProches.set([]);
      }
    });
  }


  // =========================================================
  // CONSEIL DU JOUR
  // =========================================================

  /**
   * Charge un conseil depuis l'API.
   *
   * Cette méthode sera réellement dynamique si ton endpoint
   * /api/conseils/ retourne les conseils de tri.
   */
  private chargerConseil(): void {

    /**
     * Pour l'instant, on ne fabrique pas de faux conseil.
     *
     * Si ton service ConseilService existe déjà, cette méthode
     * devra appeler son endpoint /api/conseils/.
     */
    this.conseil.set(
      'Découvrez les conseils de tri adaptés à vos déchets.'
    );
  }


  // =========================================================
  // NAVIGATION
  // =========================================================

  /**
   * Ouvre la page scanner.
   */
  scanner(): void {

    this.router.navigate(['/scan']);
  }


  /**
   * Ouvre l'historique du citoyen connecté.
   */
  voirHistorique(): void {

    this.router.navigate(['/historique']);
  }


  /**
   * Ouvre la liste des points de collecte.
   */
  voirPoints(): void {

    this.router.navigate(['/points-collecte']);
  }


  /**
   * Ouvre le détail d'un point de collecte.
   */
  ouvrirPoint(index: number): void {

    const routes = [1, 2];

    if (routes[index]) {

      this.router.navigate([
        '/points-collecte',
        routes[index]
      ]);

    } else {

      this.voirPoints();
    }
  }


  /**
   * Ouvre la page des conseils.
   */
  voirConseils(): void {

    this.router.navigate(['/conseils']);
  }
}
