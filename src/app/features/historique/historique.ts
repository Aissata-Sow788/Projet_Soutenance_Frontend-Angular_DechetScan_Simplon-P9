import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';
import { ScanService } from '../../core/services/scan';
import { ScanDechet } from '../../shared/models/scan.model';

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
}

@Component({
  imports: [CommonModule, BarreNavigations],
  selector: 'app-historique',
  styleUrl: './historique.css',
  templateUrl: './historique.html',
})
export class Historique implements OnInit {

  // Injecte le Router pour permettre la navigation vers d'autres pages.
  private router = inject(Router);

  // Injecte le service qui permet de récupérer l'historique des scans depuis l'API.
  private scanService = inject(ScanService);


  // Contient le texte saisi par l'utilisateur dans la barre de recherche.
  recherche = signal('');


  // Contient le filtre actuellement sélectionné.
  // Par défaut, seuls les scans de la semaine sont sélectionnés.
  filtreActif = signal<'semaine' | 'mois' | 'tout'>('semaine');


  // Indique si les données sont actuellement en cours de chargement.
  chargement = signal(true);


  // Contient le message à afficher lorsqu'une erreur se produit.
  // null signifie qu'aucune erreur n'est présente.
  erreur = signal<string | null>(null);


  // Contient la liste des scans préparés pour être affichés dans le template.
  scans = signal<ScanHistorique[]>([]);


  // Filtre automatiquement les scans lorsque le texte de recherche change.
  // Le calcul est également relancé lorsque la liste des scans est modifiée.
  scansFiltres = computed(() => {

    // Récupère le texte recherché, supprime les espaces inutiles
    // et convertit le texte en minuscules pour faciliter la comparaison.
    const texte = this.recherche().trim().toLowerCase();

    // Si aucun texte n'est saisi, retourne directement tous les scans.
    if (!texte) {
      return this.scans();
    }

    // Retourne uniquement les scans correspondant à la recherche.
    return this.scans().filter(scan => scan.objet.toLowerCase().includes(texte) || scan.categorie.toLowerCase().includes(texte) ||scan.destination.toLowerCase().includes(texte));
  });


  // Méthode exécutée automatiquement lors du chargement du composant.
  ngOnInit(): void {

    // Lance la récupération de l'historique depuis l'API.
    this.chargerHistorique();
  }


  // Récupère l'historique réel des scans depuis le backend.
  private chargerHistorique(): void {

    // Active l'état de chargement avant de lancer la requête.
    this.chargement.set(true);

    // Supprime une éventuelle ancienne erreur.
    this.erreur.set(null);

    // Appelle l'API via le service des scans.
    this.scanService.historique().subscribe({

      // Exécuté lorsque l'API retourne correctement les données.
      next: (scans) => {

        console.log('Données reçues depuis l API :', scans);
        // Transforme chaque scan reçu du backend dans le format
        // attendu par l'interface graphique.
        this.scans.set(
          scans.map(scan => this.convertirEnHistorique(scan))
        );

        // Arrête l'indicateur de chargement.
        this.chargement.set(false);
      },


      // Exécuté lorsqu'une erreur se produit pendant l'appel API.
      error: (err) => {

        // Stocke le message de l'erreur pour pouvoir l'afficher dans le HTML.
        this.erreur.set(
          err.message ?? 'Erreur lors du chargement de l\'historique.'
        );

        // Arrête l'indicateur de chargement même en cas d'erreur.
        this.chargement.set(false);
      }
    });
  }


/**
 * Transforme les détections IA en informations
 * utilisables par l'écran historique.
 */
private convertirEnHistorique(scan: ScanDechet): ScanHistorique {

  // Récupère toutes les détections réalisées par l'IA.
  const detections = scan.analyseIA?.detections ?? [];

  // Première détection utilisée comme information principale
  // pour la ligne de l'historique.
  const premiereDetection = detections[0];

  const type = premiereDetection?.idTypeDechet;

  const [date, heure] = this.formaterDateHeure(scan.dateScan);

  return {
    id: scan.idScan,

    image: scan.photoUrl.startsWith('http')
      ? scan.photoUrl
      : `http://127.0.0.1:8000${scan.photoUrl}`,

    // Exemple : Plastique.
    categorie: type?.nom ?? 'Non identifié',

    // Exemple : Bouteille.
    objet: premiereDetection?.objet ?? 'Analyse en cours',

    date,
    heure,

    // Conseil provenant du référentiel Django.
    destination:
      type?.conseil?.consigne ?? 'Aucun conseil disponible',

    icone: this.determinerIcone(type?.nom)
  };
}
  // Transforme une date ISO provenant de l'API
  // en date et heure adaptées à l'affichage français.
  private formaterDateHeure(dateIso: string): [string, string] {

    // Convertit la date reçue du backend en objet Date JavaScript.
    const d = new Date(dateIso);

    // Formate la date selon le format français.
    const date = d.toLocaleDateString('fr-FR');

    // Formate l'heure selon le format français.
    const heure = d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});

    // Retourne la date et l'heure séparément.
    return [date, heure];
  }


  // Détermine l'icône à afficher selon le nom du type de déchet.
  // Le champ "icone" n'existe pas directement dans la base de données.
  private determinerIcone(
    nomType: string | undefined
  ): 'recyclage' | 'bac' | 'carton' | 'compost' {

    // Convertit le nom du type en minuscules.
    // Si aucun nom n'est disponible, utilise une chaîne vide.
    const nom = nomType?.toLowerCase() ?? '';

    // Les déchets en carton ou papier utilisent l'icône carton.
    if (['carton', 'papier'].some(type => nom.includes(type))) {
      return 'carton';
    }

    // Les déchets organiques utilisent l'icône compost.
    if (nom.includes('organique')) {
      return 'compost';
    }

    // Les déchets métalliques utilisent l'icône bac.
    if (['métal', 'metal'].some(type => nom.includes(type))) {
      return 'bac';
    }

    // Icône utilisée par défaut pour les autres types de déchets.
    return 'recyclage';
  }


  // Modifie le filtre sélectionné par l'utilisateur.
  changerFiltre(filtre: 'semaine' | 'mois' | 'tout'): void {

    // Met à jour le signal avec le nouveau filtre.
    this.filtreActif.set(filtre);
  }


  // Récupère la valeur saisie dans la barre de recherche.
  rechercher(event: Event): void {

    // Transforme l'événement en HTMLInputElement,
    // puis récupère la valeur saisie par l'utilisateur.
    this.recherche.set(
      (event.target as HTMLInputElement).value
    );
  }


  // Ouvre la page du scanner.
  ouvrirScanner(): void {

    // Redirige l'utilisateur vers la route du scanner.
    this.router.navigate(['/scan']);
  }
}
