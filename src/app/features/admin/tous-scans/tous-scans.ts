import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ScanService } from '../../../core/services/scan';
import { ScanDechet } from '../../../shared/models/scan.model';

@Component({
  selector: 'app-tous-scans',
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrl: './tous-scans.css',
  templateUrl: './tous-scans.html',
})
export class TousScans {

  // ============================================================
  // SERVICES
  // ============================================================

  // Service permettant de récupérer les scans depuis Django.
  private readonly scanService = inject(ScanService);

  // Service Angular permettant de naviguer vers la page de détail.
  private readonly router = inject(Router);


  // ============================================================
  // OUTILS DISPONIBLES DANS LE TEMPLATE
  // ============================================================

  // Rend l'objet Math disponible dans le HTML.
  // Cela permet notamment d'utiliser Math.min().
  readonly Math = Math;


  // ============================================================
  // ÉTAT DE LA PAGE
  // ============================================================

  // Tous les scans récupérés depuis l'API Django.
  scans = signal<ScanDechet[]>([]);

  // Indique si les données sont encore en cours de chargement.
  chargement = signal(true);

  // Contient le message d'erreur en cas de problème API.
  erreur = signal<string | null>(null);

  // Texte saisi dans la barre de recherche.
  recherche = signal('');

  // Catégorie de déchet actuellement sélectionnée.
  categorieActive = signal('Tous');

  // Type de tri actuellement sélectionné.
  // "recent" = plus récent en premier.
  // "ancien" = plus ancien en premier.
  triActif = signal('recent');


  // ============================================================
  // PAGINATION
  // ============================================================

  // Numéro de la page actuellement affichée.
  pageActuelle = signal(1);

  // Nombre de lignes affichées par page.
  taillePage = 6;


  // ============================================================
  // INITIALISATION
  // ============================================================

  ngOnInit(): void {

    // Charge les scans dès que la page est ouverte.
    this.chargerScans();
  }


  // ============================================================
  // CHARGEMENT DES SCANS
  // ============================================================

  /**
   * Récupère tous les scans administratifs depuis Django.
   */
  chargerScans(): void {

    // Active l'état de chargement.
    this.chargement.set(true);

    // Réinitialise l'éventuelle erreur précédente.
    this.erreur.set(null);

    // Appel vers l'API Django.
    this.scanService.tousLesScans().subscribe({

      // Si les scans sont correctement récupérés.
      next: (scans) => {

        console.log('SCANS ADMIN REÇUS :', scans);
        console.log('NOMBRE DE SCANS :', scans.length);

        // Enregistre les scans dans le signal.
        this.scans.set(scans);

        // Le chargement est terminé.
        this.chargement.set(false);

        // Après un nouveau chargement,
        // on revient toujours à la première page.
        this.pageActuelle.set(1);
      },

      // Si l'appel API échoue.
      error: (error) => {

        console.error('ERREUR SCANS ADMIN :', error);

        // Affiche le message dans l'interface.
        this.erreur.set(
          'Impossible de charger les scans.'
        );

        // Termine l'état de chargement.
        this.chargement.set(false);
      }
    });
  }


  // ============================================================
  // FILTRAGE DES SCANS
  // ============================================================

  /**
   * Applique :
   * - la recherche ;
   * - le filtre par catégorie ;
   * - le tri par date.
   *
   * Cette méthode travaille toujours sur les vrais scans
   * reçus depuis l'API.
   */
  scansFiltres(): ScanDechet[] {

    // Copie du tableau afin de ne pas modifier directement
    // le tableau contenu dans le signal.
    let resultat = [...this.scans()];


    // ----------------------------------------------------------
    // RECHERCHE
    // ----------------------------------------------------------

    const recherche = this.recherche()
      .trim()
      .toLowerCase();

    // On applique le filtre uniquement si une recherche existe.
    if (recherche) {

      resultat = resultat.filter((scan) => {

        // Nom de l'utilisateur.
        const nomUtilisateur =
          scan.citoyen
            ? `${scan.citoyen.prenom} ${scan.citoyen.nom}`
            : 'Utilisateur anonyme';

        // Email de l'utilisateur.
        const email =
          scan.citoyen?.email ?? '';

        // Tous les objets détectés par l'IA.
        const objets =
          scan.analyseIA?.detections
            ?.map((detection) => detection.objet)
            .join(' ') ?? '';

        // Toutes les catégories détectées.
        const categories =
          scan.analyseIA?.detections
            ?.map((detection) => detection.idTypeDechet?.nom)
            .join(' ') ?? '';

        // Texte complet utilisé pour la recherche.
        const texteRecherche = `
          ${nomUtilisateur}
          ${email}
          ${objets}
          ${categories}
        `.toLowerCase();

        // Garde uniquement les scans contenant le texte recherché.
        return texteRecherche.includes(recherche);
      });
    }


    // ----------------------------------------------------------
    // FILTRE PAR CATÉGORIE
    // ----------------------------------------------------------

    if (this.categorieActive() !== 'Tous') {

      const categorie =
        this.categorieActive().toLowerCase();

      resultat = resultat.filter((scan) => {

        // Un scan est conservé si au moins une détection
        // correspond à la catégorie sélectionnée.
        return scan.analyseIA?.detections?.some(
          (detection) =>
            detection.idTypeDechet?.nom
              ?.toLowerCase()
              .includes(categorie)
        );
      });
    }


    // ----------------------------------------------------------
    // TRI PAR DATE
    // ----------------------------------------------------------

    resultat.sort((a, b) => {

      // Conversion des dates en timestamps.
      const dateA =
        new Date(a.dateScan).getTime();

      const dateB =
        new Date(b.dateScan).getTime();

      // Tri du plus ancien au plus récent.
      if (this.triActif() === 'ancien') {
        return dateA - dateB;
      }

      // Par défaut : du plus récent au plus ancien.
      return dateB - dateA;
    });


    return resultat;
  }


  // ============================================================
  // REGROUPEMENT DES UTILISATEURS
  // ============================================================

  /**
   * Prépare les lignes qui seront réellement affichées
   * dans le tableau.
   *
   * Règles :
   *
   * 1. Un utilisateur connecté apparaît une seule fois.
   * 2. Ses différents scans sont regroupés.
   * 3. Les scans anonymes restent chacun sur leur propre ligne.
   *
   * IMPORTANT :
   * On utilise scansFiltres() afin que la recherche,
   * le filtre de catégorie et le tri soient pris en compte.
   */
  utilisateursUniques(): ScanDechet[] {

    // Map permettant de retenir un seul scan représentatif
    // pour chaque utilisateur connecté.
    const utilisateurs =
      new Map<number, ScanDechet>();

    // Liste des lignes finales.
    const resultats: ScanDechet[] = [];

    // Récupère les scans après recherche + catégorie + tri.
    const scans = this.scansFiltres();


    // Parcourt tous les scans filtrés.
    for (const scan of scans) {

      // ========================================================
      // CAS 1 : SCAN ANONYME
      // ========================================================

      // Un scan anonyme n'a pas d'idUtilisateur.
      //
      // Chaque scan anonyme reste donc une ligne indépendante.
      if (!scan.idUtilisateur) {

        resultats.push(scan);

        continue;
      }


      // ========================================================
      // CAS 2 : UTILISATEUR CONNECTÉ
      // ========================================================

      // Si l'utilisateur n'est pas encore présent,
      // on conserve ce scan comme ligne représentative.
      if (!utilisateurs.has(scan.idUtilisateur)) {

        utilisateurs.set(
          scan.idUtilisateur,
          scan
        );
      }
    }


    // Retourne :
    // - les utilisateurs connectés uniques ;
    // - puis les scans anonymes.
    return [
      ...Array.from(utilisateurs.values()),
      ...resultats
    ];
  }


  // ============================================================
  // PAGINATION
  // ============================================================

  /**
   * Retourne uniquement les lignes à afficher
   * sur la page actuelle.
   *
   * La pagination est appliquée APRÈS le regroupement
   * des utilisateurs.
   */
  scansAffiches(): ScanDechet[] {

    // Récupère les lignes réellement affichables.
    const lignes = this.utilisateursUniques();

    // Calcule l'index du premier élément de la page.
    const debut =
      (this.pageActuelle() - 1) *
      this.taillePage;

    // Retourne uniquement les lignes de la page.
    return lignes.slice(
      debut,
      debut + this.taillePage
    );
  }


  // ============================================================
  // NOMBRE TOTAL DE RÉSULTATS
  // ============================================================

  /**
   * Retourne le nombre total de lignes affichables.
   *
   * Attention :
   * ce n'est plus forcément le nombre de scans,
   * car plusieurs scans d'un même utilisateur sont regroupés.
   */
  nombreResultats(): number {

    return this.utilisateursUniques().length;
  }


  // ============================================================
  // NOMBRE TOTAL DE PAGES
  // ============================================================

  /**
   * Calcule le nombre de pages nécessaires.
   */
  nombrePages(): number {

    return Math.ceil(
      this.nombreResultats() /
      this.taillePage
    );
  }


  // ============================================================
  // CHANGEMENT DE PAGE
  // ============================================================

  /**
   * Change la page actuellement affichée.
   */
  changerPage(page: number): void {

    // Empêche de passer avant la première page.
    if (page < 1) {
      return;
    }

    // Empêche de dépasser la dernière page.
    if (page > this.nombrePages()) {
      return;
    }

    // Met à jour la page.
    this.pageActuelle.set(page);
  }


  // ============================================================
  // RECHERCHE
  // ============================================================

  /**
   * Met à jour le texte de recherche.
   *
   * Après une nouvelle recherche,
   * on revient automatiquement à la page 1.
   */
  modifierRecherche(valeur: string): void {

    // Met à jour la recherche.
    this.recherche.set(valeur);

    // Retour à la première page.
    this.pageActuelle.set(1);
  }


  // ============================================================
  // FILTRE PAR CATÉGORIE
  // ============================================================

  /**
   * Sélectionne une catégorie de déchet.
   */
  choisirCategorie(categorie: string): void {

    // Met à jour la catégorie.
    this.categorieActive.set(categorie);

    // Retour à la première page.
    this.pageActuelle.set(1);
  }


  // ============================================================
  // NOM DU CITOYEN
  // ============================================================

  /**
   * Retourne le nom affiché dans le tableau.
   */
  nomCitoyen(scan: ScanDechet): string {

    // Aucun utilisateur associé = utilisateur anonyme.
    if (!scan.citoyen) {
      return 'Anonyme';
    }

    // Construit le nom complet.
    return `${scan.citoyen.prenom} ${scan.citoyen.nom}`.trim();
  }


  // ============================================================
  // EMAIL DU CITOYEN
  // ============================================================

  /**
   * Retourne l'email affiché sous le nom.
   */
  emailCitoyen(scan: ScanDechet): string {

    // Texte affiché pour les scans anonymes.
    if (!scan.citoyen) {
      return 'Scan sans compte';
    }

    // Email du citoyen connecté.
    return scan.citoyen.email;
  }


  // ============================================================
  // OBJET IDENTIFIÉ
  // ============================================================

  /**
   * Retourne le premier objet détecté par l'IA.
   */
  objetIdentifie(scan: ScanDechet): string {

    const detection =
      scan.analyseIA?.detections?.[0];

    return detection?.objet ?? 'Non identifié';
  }


  // ============================================================
  // CATÉGORIE DU DÉCHET
  // ============================================================

  /**
   * Retourne la catégorie du premier déchet détecté.
   */
  categorieIdentifiee(scan: ScanDechet): string {

    const detection =
      scan.analyseIA?.detections?.[0];

    return detection?.idTypeDechet?.nom ?? 'Autres';
  }


  // ============================================================
  // NOMBRE DE SCANS PAR UTILISATEUR
  // ============================================================

  /**
   * Retourne le nombre de scans réalisés.
   *
   * - Utilisateur connecté :
   *   on compte tous ses scans dans les données API.
   *
   * - Utilisateur anonyme :
   *   chaque ligne correspond directement à un scan,
   *   donc le nombre affiché est 1.
   */
  nombreScansUtilisateur(scan: ScanDechet): number {

    // ----------------------------------------------------------
    // SCAN ANONYME
    // ----------------------------------------------------------

    // Un scan anonyme n'a pas d'utilisateur associé.
    if (!scan.idUtilisateur) {
      return 1;
    }


    // ----------------------------------------------------------
    // UTILISATEUR CONNECTÉ
    // ----------------------------------------------------------

    // Compte tous les scans ayant le même idUtilisateur.
    return this.scans().filter(
      (element) =>
        element.idUtilisateur === scan.idUtilisateur
    ).length;
  }


  // ============================================================
  // NAVIGATION VERS LE DÉTAIL
  // ============================================================

  /**
   * Ouvre la page de détail du scan sélectionné.
   */
  voirDetailScan(scan: ScanDechet): void {

    this.router.navigate([
      '/admin/scans',
      scan.idScan
    ]);
  }


  // ============================================================
  // FORMATAGE DE LA DATE
  // ============================================================

  /**
   * Transforme une date ISO en date lisible en français.
   */
  formaterDate(date: string): string {

    return new Intl.DateTimeFormat(
      'fr-FR',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    ).format(new Date(date));
  }


  // ============================================================
  // FORMATAGE DE L'HEURE
  // ============================================================

  /**
   * Transforme une date ISO en heure lisible.
   */
  formaterHeure(date: string): string {

    return new Intl.DateTimeFormat(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }
    ).format(new Date(date)) + ' (UTC)';
  }


  // ============================================================
  // INITIALES
  // ============================================================

  /**
   * Retourne les initiales affichées dans l'avatar.
   *
   * Pour un utilisateur anonyme :
   * AN = Anonyme.
   */
  initiales(scan: ScanDechet): string {

    // Avatar des utilisateurs anonymes.
    if (!scan.citoyen) {
      return 'AN';
    }

    // Première lettre du prénom.
    const prenom =
      scan.citoyen.prenom?.charAt(0) ?? '';

    // Première lettre du nom.
    const nom =
      scan.citoyen.nom?.charAt(0) ?? '';

    // Retourne les deux initiales en majuscules.
    return `${prenom}${nom}`.toUpperCase();
  }
}
