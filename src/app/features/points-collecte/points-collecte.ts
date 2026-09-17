// Importe les outils Angular nécessaires au composant.
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Importe le service et le modèle des points de collecte.
import { PointCollecteService } from '../../core/services/point-collecte';
import { PointCollecte } from '../../shared/models/point-collecte.model';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';

// Point de collecte enrichi avec sa distance et son icône calculée pour l'affichage
interface PointAvecDistance extends PointCollecte {
  distanceKm: number;
  icone: 'recyclage' | 'poubelle' | 'ecran' | 'maison';
}
@Component({
  imports: [CommonModule, BarreNavigations], // Modules utilisés dans le HTML.
  selector: 'app-points-collecte', // Nom du composant.
  styleUrl: './points-collecte.css', // Fichier CSS.
  templateUrl: './points-collecte.html', // Fichier HTML.
})
export class PointsCollecte implements OnInit {

  // Injection du service responsable des appels API
  // liés aux points de collecte.
  private pointCollecteService = inject(PointCollecteService);

  // Injection du Router pour naviguer vers la page de détail
  // d'un point de collecte.
  private router = inject(Router);


  // Indique si les données sont encore en cours de chargement.
  // true au démarrage signifie que l'API est en train d'être appelée.
  chargement = signal(true);

  // Contient un éventuel message d'erreur lié à la géolocalisation.
  // null signifie qu'aucune erreur n'est présente.
  erreurGeoloc = signal<string | null>(null);

  // Stocke la position actuelle de l'utilisateur.
  // La valeur est null tant que la position n'est pas disponible.
  positionUtilisateur = signal<{
    lat: number;
    lng: number;
  } | null>(null);

  // Contient la liste des points de collecte récupérés depuis l'API.
  points = signal<PointCollecte[]>([]);


  // Liste calculée automatiquement à partir des points récupérés.
  // Chaque point reçoit une icône et éventuellement une distance.
  pointsTries = computed<PointAvecDistance[]>(() => {

    // Récupère la position actuelle de l'utilisateur.
    const position = this.positionUtilisateur();

    // Récupère la liste actuelle des points de collecte.
    const liste = this.points();


    // Ajoute une icône à chaque point de collecte.
    // L'icône est déterminée à partir des déchets acceptés.
    const avecIcone = liste.map(p => ({
      ...p,
      icone: this.determinerIcone(p)
    }));


    // Si la position de l'utilisateur n'est pas encore disponible,
    // on retourne les points sans calculer leur véritable distance.
    if (!position) {
      return avecIcone.map(p => ({
        ...p,
        distanceKm: 0
      }));
    }


    // Lorsque la position est disponible :
    // 1. calcule la distance pour chaque point ;
    // 2. ajoute cette distance au point ;
    // 3. trie les points du plus proche au plus éloigné.
    return avecIcone
      .map(p => ({
        ...p,

        // Calcul de la distance entre la position de l'utilisateur
        // et les coordonnées du point de collecte.
        distanceKm:
          this.pointCollecteService.calculerDistanceKm(
            position.lat,
            position.lng,
            p.latitude,
            p.longitude
          )
      }))

      // Trie les points par distance croissante.
      // Le point le plus proche apparaît donc en premier.
      .sort((a, b) => a.distanceKm - b.distanceKm);
  });


  // Méthode exécutée automatiquement au chargement du composant.
  ngOnInit(): void {

    // Lance la récupération des points depuis l'API.
    this.chargerPoints();

    // Demande la position actuelle de l'utilisateur.
    this.localiserUtilisateur();
  }


  // Récupère les points de collecte depuis le backend.
  private chargerPoints(): void {

    // Appelle la méthode du service qui interroge l'API Django.
    this.pointCollecteService.listerPoints().subscribe({

      // Exécuté lorsque l'API répond correctement.
      next: (liste) => {

        // Stocke les points reçus dans le signal.
        this.points.set(liste);

        // Désactive l'indicateur de chargement.
        this.chargement.set(false);
      },

      // Exécuté lorsqu'une erreur se produit pendant l'appel API.
      error: () => {

        // Arrête le chargement même si la requête échoue.
        this.chargement.set(false);
      }
    });
  }


  // Récupère la position géographique actuelle de l'utilisateur.
  private localiserUtilisateur(): void {

    // Vérifie si le navigateur prend en charge la géolocalisation.
    if (!navigator.geolocation) {

      // Affiche un message si la fonctionnalité n'est pas disponible.
      this.erreurGeoloc.set(
        'Géolocalisation non supportée par ce navigateur.'
      );

      return;
    }


    // Demande la position actuelle au navigateur.
    navigator.geolocation.getCurrentPosition(

      // Exécuté lorsque la position est récupérée avec succès.
      (position) => {

        // Stocke les coordonnées de l'utilisateur.
        this.positionUtilisateur.set({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },

      // Exécuté lorsque la position ne peut pas être récupérée.
      () => {

        // Informe l'utilisateur que le tri par proximité
        // ne pourra pas être effectué.
        this.erreurGeoloc.set(
          'Position non disponible — tri par proximité désactivé.'
        );
      }
    );
  }


  // Détermine l'icône à afficher pour un point de collecte.
  // Le choix est effectué à partir du premier type de déchet accepté.
  //
  // Le champ "icone" n'existe pas directement dans la base de données,
  // donc l'icône est déterminée côté frontend.
  private determinerIcone(
    point: PointCollecte
  ): 'recyclage' | 'poubelle' | 'ecran' | 'maison' {

    // Récupère le nom du premier déchet accepté.
    // Si aucun déchet n'est disponible, utilise une chaîne vide.
    const premierType =
      point.dechetsAcceptes[0]?.nom?.toLowerCase() ?? '';


    // Si le type correspond à un déchet électronique,
    // on utilise l'icône écran.
    if (
      premierType.includes('électro') ||
      premierType.includes('electro')
    ) {
      return 'ecran';
    }


    // Pour les déchets organiques ou le carton,
    // on utilise l'icône poubelle.
    if (premierType.includes('organique') || premierType.includes('carton')) {
      return 'poubelle';
    }


    // Pour le métal ou le verre,
    // on utilise l'icône maison.
    if (premierType.includes('métal') || premierType.includes('metal') || premierType.includes('verre')) {
      return 'maison';
    }


    // Pour les autres types de déchets,
    // on utilise l'icône de recyclage par défaut.
    return 'recyclage';
  }


  // Ouvre la page de détail d'un point de collecte.
  ouvrirDetail(idPoint: number): void {

    // Navigue vers l'URL contenant l'identifiant du point.
    // Exemple : /points-collecte/5
    this.router.navigate([ '/points-collecte', idPoint]);
  }
}
