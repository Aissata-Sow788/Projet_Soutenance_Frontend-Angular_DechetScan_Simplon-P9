import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { ScanService } from '../../core/services/scan';
import { ScanDechet } from '../../shared/models/scan.model';
import { RouterLink } from '@angular/router';

// Format utilisé uniquement pour préparer les données avant leur affichage dans le HTML.
interface ScanHistorique {
  id: number;
  image: string;
  categorie: string;
  objet: string;
  date: string;
  heure: string;
  destination: string;
  icone: 'recyclage' | 'bac' | 'carton' | 'compost';

  // Date ISO originale provenant de Django.
  // Elle permet de faire correctement les filtres semaine/mois.
  dateOriginale: string;
}

@Component({
  imports: [CommonModule, BarreNavigations, RouterLink],
  selector: 'app-historique',
  styleUrl: './historique.css',
  templateUrl: './historique.html',
})
export class Historique implements OnInit {

  // Permet de naviguer vers le scanner.
  private router = inject(Router);

  // Service permettant de récupérer les scans depuis l'API Django.
  private scanService = inject(ScanService);

  // Texte saisi dans la barre de recherche.
  recherche = signal('');

  // Filtre de période sélectionné.
  filtreActif = signal<'semaine' | 'mois' | 'tout'>('semaine');

  // Indique si les données sont en cours de chargement.
  chargement = signal(true);

  // Contient le message d'erreur éventuel.
  erreur = signal<string | null>(null);

  // Liste des scans récupérés depuis l'API et préparés pour l'affichage.
  scans = signal<ScanHistorique[]>([]);


  /**
   * Retourne les scans correspondant aux filtres sélectionnés.
   *
   * Les filtres appliqués sont :
   * - période : semaine / mois / tout ;
   * - recherche : objet / catégorie / destination.
   */
  scansFiltres = computed(() => {

    // Copie de la liste complète afin de pouvoir appliquer les filtres.
    let resultat = [...this.scans()];

    // ---------------------------------------------------------
    // FILTRE PAR PÉRIODE
    // ---------------------------------------------------------

    const aujourdHui = new Date();

    if (this.filtreActif() !== 'tout') {

      // Date à partir de laquelle les scans doivent être conservés.
      const dateLimite = new Date(aujourdHui);

      if (this.filtreActif() === 'semaine') {

        // Conserve les scans des 7 derniers jours.
        dateLimite.setDate(
          aujourdHui.getDate() - 7
        );

      } else if (this.filtreActif() === 'mois') {

        // Conserve les scans du dernier mois.
        dateLimite.setMonth(
          aujourdHui.getMonth() - 1
        );
      }

      // Compare la vraie date ISO reçue de Django.
      resultat = resultat.filter((scan) => {

        const dateScan = new Date(scan.dateOriginale);

        return dateScan >= dateLimite;
      });
    }

    // ---------------------------------------------------------
    // FILTRE PAR RECHERCHE
    // ---------------------------------------------------------

    const texte = this.recherche()
      .trim()
      .toLowerCase();

    // Si une recherche est saisie, on filtre les résultats.
    if (texte) {

      resultat = resultat.filter((scan) => {

        return (
          scan.objet.toLowerCase().includes(texte) ||
          scan.categorie.toLowerCase().includes(texte) ||
          scan.destination.toLowerCase().includes(texte)
        );
      });
    }

    return resultat;
  });


  // Méthode appelée automatiquement lors du chargement du composant.
  ngOnInit(): void {

    // Lance la récupération de l'historique depuis Django.
    this.chargerHistorique();
  }


  /**
   * Récupère l'historique réel des scans depuis l'API Django.
   */
  private chargerHistorique(): void {

    // Active l'indicateur de chargement.
    this.chargement.set(true);

    // Supprime une éventuelle ancienne erreur.
    this.erreur.set(null);

    // Appelle l'API historique.
    this.scanService.historique().subscribe({

      // Cette fonction est exécutée lorsque l'API renvoie les données.
      next: (scans) => {

        console.log(
          'Données reçues depuis l API :',
          scans
        );

        // La requête ayant réussi, aucune erreur ne doit être affichée.
        this.erreur.set(null);

        try {

          // Transforme chaque scan Django dans le format
          // attendu par l'interface historique.
          const historique = scans.map((scan) =>
            this.convertirEnHistorique(scan)
          );

          // Enregistre les scans dans le signal.
          this.scans.set(historique);

        } catch (error) {

          // Permet de détecter une éventuelle incompatibilité
          // entre la réponse Django et le modèle Angular.
          console.error(
            'Erreur lors de la transformation des scans :',
            error
          );

          this.erreur.set(
            'Les données reçues ne peuvent pas être affichées.'
          );

        } finally {

          // Termine toujours le chargement.
          this.chargement.set(false);
        }
      },

      // Cette fonction n'est exécutée que si la requête finale échoue.
      error: (err) => {

        console.error(
          'Erreur lors de la récupération de l historique :',
          err
        );

        this.erreur.set(
          'Impossible de charger votre historique.'
        );

        this.chargement.set(false);
      }
    });
  }


  /**
   * Transforme un scan reçu de Django en données
   * directement utilisables par le HTML.
   */
  private convertirEnHistorique(
    scan: ScanDechet
  ): ScanHistorique {

    // Récupère les détections réalisées par l'IA.
    //
    // Si analyseIA est null, on utilise un tableau vide.
    const detections =
      scan.analyseIA?.detections ?? [];

    // Utilise la première détection comme information principale.
    const premiereDetection = detections[0];

    // Récupère le type de déchet associé à la détection.
    const type = premiereDetection?.idTypeDechet;

    // Transforme la date ISO en date et heure d'affichage.
    const [date, heure] =
      this.formaterDateHeure(scan.dateScan);

    return {

      // Identifiant du scan.
      id: scan.idScan,

      // Django renvoie actuellement des chemins relatifs
      // comme /media/scans/plastique.jpg.
      //
      // On ajoute donc l'adresse du backend Django.
      image: scan.photoUrl.startsWith('http')
        ? scan.photoUrl
        : `http://127.0.0.1:8000${scan.photoUrl}`,

      // Nom du type de déchet.
      categorie:
        type?.nom ?? 'Non identifié',

      // Objet détecté par l'IA.
      objet:
        premiereDetection?.objet ?? 'Analyse en cours',

      // Date et heure préparées pour l'affichage.
      date,
      heure,

      // Conseil de tri provenant du référentiel Django.
      destination:
        type?.conseil?.consigne ??
        'Aucun conseil disponible',

      // Icône déterminée selon le type de déchet.
      icone:
        this.determinerIcone(type?.nom),

      // Conservation de la date originale pour les filtres.
      dateOriginale: scan.dateScan
    };
  }


  /**
   * Transforme une date ISO provenant de Django
   * en date et heure adaptées à l'affichage français.
   */
  private formaterDateHeure(
    dateIso: string
  ): [string, string] {

    // Transforme la chaîne ISO en objet Date JavaScript.
    const d = new Date(dateIso);

    // Formate la date en français.
    const date = d.toLocaleDateString('fr-FR');

    // Formate l'heure en français.
    const heure = d.toLocaleTimeString(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );

    return [date, heure];
  }


  /**
   * Détermine l'icône à afficher selon le type de déchet.
   */
  private determinerIcone(
    nomType: string | undefined
  ): 'recyclage' | 'bac' | 'carton' | 'compost' {

    // Convertit le nom du type en minuscules.
    const nom = nomType?.toLowerCase() ?? '';

    // Papier et carton.
    if (
      ['carton', 'papier'].some(
        type => nom.includes(type)
      )
    ) {
      return 'carton';
    }

    // Déchets organiques.
    if (nom.includes('organique')) {
      return 'compost';
    }

    // Déchets métalliques.
    if (
      ['métal', 'metal'].some(
        type => nom.includes(type)
      )
    ) {
      return 'bac';
    }

    // Icône par défaut.
    return 'recyclage';
  }


  /**
   * Change le filtre de période.
   */
  changerFiltre(
    filtre: 'semaine' | 'mois' | 'tout'
  ): void {

    this.filtreActif.set(filtre);
  }


  /**
   * Récupère la valeur saisie dans la recherche.
   */
  rechercher(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    this.recherche.set(input.value);
  }


  /**
   * Ouvre la page du scanner.
   */
  ouvrirScanner(): void {

    this.router.navigate(['/scan']);
  }
}
