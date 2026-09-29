import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DemandeCollecteService } from '../../core/services/demande-collecte';
import { PointCollecteService } from '../../core/services/point-collecte';
import { TypeDechet } from '../../shared/models/type-dechet.model';
import {
  DemandeCollecte,
  DemandeCollecteCreation
} from '../../shared/models/demande-collecte.model';

// Représente les différents états possibles de la géolocalisation.
type GeoStatut = 'chargement' | 'obtenu' | 'refuse' | 'non_supporte';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-demande-ramassage',
  styleUrl: './demande-ramassage.css',
  templateUrl: './demande-ramassage.html',
})
export class DemandeRamassage implements OnInit {

  // Services utilisés pour la navigation, les appels HTTP et les demandes de collecte.
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly demandeService = inject(DemandeCollecteService);
  private readonly pointCollecteService = inject(PointCollecteService);

  // Liste des types de déchets disponibles dans le backend.
  typesDechets = signal<TypeDechet[]>([]);
  chargementTypes = signal(true);

  // Coordonnées GPS détectées par le navigateur.
  // null signifie qu'aucune position n'a encore été obtenue.
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);

  // Précision de la position GPS en mètres.
  // Exemple : 15 signifie que la position est estimée à environ 15 mètres près.
  precisionPosition = signal<number | null>(null);

  // État actuel de la géolocalisation.
  geoStatut = signal<GeoStatut>('chargement');

  // Message affiché lorsque la géolocalisation échoue.
  geoErreur = signal('');

  /**
   * Adresse lisible obtenue à partir des coordonnées GPS.
   *
   * Les coordonnées comme 14.7167, -17.4677 sont difficiles
   * à comprendre pour l'utilisateur. Le reverse geocoding permet
   * donc de les transformer en une adresse lisible.
   */
  adresseDetectee = signal<string>('');

  // Quartier récupéré automatiquement depuis l'adresse.
  quartierDetecte = signal<string>('');

  // Permet à l'utilisateur de remplacer le quartier détecté.
  quartierManuel = signal<string>('');

  /**
   * Quartier réellement utilisé pour la demande.
   *
   * Si l'utilisateur saisit manuellement un quartier,
   * celui-ci est prioritaire sur le quartier détecté automatiquement.
   */
  quartierFinal = computed(() =>
    this.quartierManuel().trim() || this.quartierDetecte()
  );

  // Informations saisies dans le formulaire de demande.
  idTypeDechetSelectionne = signal<number | null>(null);
  quantite = signal<number | null>(null);
  dateSouhaitee = signal('');
  heureSouhaitee = signal('');

  // Prix proposé uniquement si le citoyen souhaite vendre ses déchets.
  prixPropose = signal<number | null>(null);
  afficherPrix = signal(false);

  // Informations supplémentaires éventuellement saisies par l'utilisateur.
  informationsComplementaires = signal('');

  // États liés à l'envoi de la demande.
  enEnvoi = signal(false);
  erreur = signal<string | null>(null);
  demandeCreee = signal<DemandeCollecte | null>(null);

  // Récupère automatiquement le type de déchet sélectionné.
  typeDechetSelectionne = computed(() =>
    this.typesDechets().find(
      t => t.idTypeDechet === this.idTypeDechetSelectionne()
    ) ?? null
  );

  /**
   * Calcule le montant estimé de la vente.
   *
   * Formule :
   * quantité × prix proposé par unité.
   */
  montantEstime = computed(() => {
    const q = this.quantite();
    const p = this.prixPropose();

    if (!q || !p || q <= 0 || p <= 0) {
      return null;
    }

    return Math.round(q * p);
  });

  /**
   * Vérifie si les informations indispensables sont présentes.
   *
   * Les coordonnées GPS sont obligatoires car elles permettent
   * au collecteur de connaître l'emplacement du ramassage.
   */
  formulaireValide = computed(() =>
    this.idTypeDechetSelectionne() !== null &&
    (this.quantite() ?? 0) > 0 &&
    this.latitude() !== null &&
    this.longitude() !== null
  );

  ngOnInit(): void {
    // Charge les types de déchets dès l'ouverture de la page.
    this.chargerTypesDechets();

    // Demande automatiquement la position actuelle du citoyen.
    this.demanderGeolocalisation();
  }

  private chargerTypesDechets(): void {
    this.chargementTypes.set(true);

    // Récupère les types de déchets disponibles depuis l'API.
    this.pointCollecteService.listerTypesDechets().subscribe({
      next: types => {
        this.typesDechets.set(types);
        this.chargementTypes.set(false);
      },
      error: () => {
        this.chargementTypes.set(false);
      }
    });
  }

  /**
   * Demande la position actuelle au navigateur.
   *
   * La position provient du service de géolocalisation du navigateur
   * et non d'une estimation basée sur l'adresse IP.
   */
  demanderGeolocalisation(): void {
    // Réinitialise l'état avant une nouvelle tentative.
    this.geoStatut.set('chargement');
    this.geoErreur.set('');
    this.latitude.set(null);
    this.longitude.set(null);
    this.precisionPosition.set(null);
    this.adresseDetectee.set('');
    this.quartierDetecte.set('');

    /**
     * La géolocalisation du navigateur nécessite généralement
     * HTTPS ou localhost pour des raisons de sécurité.
     */
    if (!window.isSecureContext) {
      this.geoStatut.set('non_supporte');
      this.geoErreur.set(
        'La géolocalisation nécessite une connexion sécurisée (HTTPS ou localhost).'
      );
      return;
    }

    // Vérifie que le navigateur possède bien l'API Geolocation.
    if (!navigator.geolocation) {
      this.geoStatut.set('non_supporte');
      this.geoErreur.set(
        'Ce navigateur ne prend pas en charge la géolocalisation.'
      );
      return;
    }

    /**
     * Demande la position actuelle de l'utilisateur.
     *
     * getCurrentPosition() ouvre une demande d'autorisation
     * dans le navigateur si la permission n'a pas encore été donnée.
     */
    navigator.geolocation.getCurrentPosition(

      // Ce bloc est exécuté lorsque la position est obtenue avec succès.
      (position) => {
        // Latitude et longitude représentent la position GPS.
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Stocke les coordonnées pour les utiliser dans le formulaire.
        this.latitude.set(lat);
        this.longitude.set(lon);

        /**
         * accuracy indique la précision estimée de la position
         * en mètres.
         *
         * Exemple :
         * accuracy = 20 signifie que la position est estimée
         * avec une précision d'environ 20 mètres.
         */
        this.precisionPosition.set(position.coords.accuracy);

        // Indique que la géolocalisation a réussi.
        this.geoStatut.set('obtenu');

        // Transforme ensuite les coordonnées en adresse lisible.
        this.reverseGeocoder(lat, lon);
      },

      // Ce bloc est exécuté lorsque le navigateur ne peut pas obtenir la position.
      (erreur) => {
        this.geoStatut.set('refuse');

        // Transforme le code d'erreur GPS en message compréhensible.
        this.geoErreur.set(
          this.messageErreurGeolocalisation(erreur)
        );
      },

      /**
       * Options de géolocalisation :
       *
       * enableHighAccuracy: demande la meilleure précision disponible.
       * timeout: abandonne la recherche après 30 secondes.
       * maximumAge: 0 demande une position fraîche plutôt qu'une ancienne position.
       */
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  }

  /**
   * Transforme les erreurs techniques de l'API Geolocation
   * en messages compréhensibles pour l'utilisateur.
   */
  private messageErreurGeolocalisation(
    erreur: GeolocationPositionError
  ): string {

    switch (erreur.code) {
      // Permission de localisation refusée par l'utilisateur.
      case 1:
        return 'L’accès à votre position est refusé. Autorisez la localisation dans les réglages du navigateur, puis réessayez.';

      // Le navigateur ou l'appareil n'arrive pas à déterminer la position.
      case 2:
        return 'La position est indisponible. Activez le GPS ou les services de localisation de votre appareil, puis réessayez.';

      // Le délai maximum de recherche a été dépassé.
      case 3:
        return 'La recherche de position a pris trop de temps. Vérifiez que le GPS est activé, puis réessayez.';

      default:
        return 'La position n’a pas pu être déterminée. Vérifiez les réglages de localisation, puis réessayez.';
    }
  }

  /**
   * Reverse geocoding :
   *
   * Entrée :
   * latitude + longitude
   *
   * Sortie :
   * une adresse lisible et un quartier.
   *
   * Ici, Nominatim d'OpenStreetMap est utilisé pour convertir
   * les coordonnées GPS en informations géographiques.
   */
  private reverseGeocoder(lat: number, lon: number): void {

    // Construit l'URL de l'API Nominatim avec les coordonnées GPS.
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lon}&format=json&accept-language=fr`;

    // Envoie les coordonnées à Nominatim.
    this.http.get<any>(url).subscribe({

      // Réponse reçue avec succès.
      next: (data) => {

        // Adresse complète destinée à être affichée dans l'interface.
        this.adresseDetectee.set(
          data.display_name ?? ''
        );

        /**
         * Nominatim peut placer le quartier dans différents champs
         * selon la structure géographique de la zone.
         *
         * On essaie donc plusieurs propriétés dans un ordre de priorité.
         */
        const addr = data.address ?? {};

        const quartier =
          addr.suburb ??
          addr.quarter ??
          addr.city_district ??
          addr.district ??
          addr.town ??
          addr.city ??
          '';

        // Stocke le quartier détecté automatiquement.
        this.quartierDetecte.set(quartier);
      },

      // Le reverse geocoding peut échouer même si le GPS fonctionne.
      error: () => {

        /**
         * Les coordonnées GPS restent disponibles même si
         * Nominatim ne retourne pas d'adresse.
         *
         * On affiche donc les coordonnées comme solution de secours.
         */
        this.adresseDetectee.set(
          `${lat.toFixed(5)}, ${lon.toFixed(5)}`
        );

        // L'utilisateur peut alors saisir son quartier manuellement.
      }
    });
  }

  envoyerDemande(): void {
    // Empêche l'envoi si le formulaire est incomplet ou déjà en cours d'envoi.
    if (!this.formulaireValide() || this.enEnvoi()) {
      return;
    }

    this.enEnvoi.set(true);
    this.erreur.set(null);

    // Prépare la date au format attendu par le backend.
    let dateSouhaiteeIso: string | null = null;

    if (this.dateSouhaitee() && this.heureSouhaitee()) {
      dateSouhaiteeIso =
        `${this.dateSouhaitee()}T${this.heureSouhaitee()}:00`;
    } else if (this.dateSouhaitee()) {
      // Si aucune heure n'est indiquée, utilise 09:00 par défaut.
      dateSouhaiteeIso =
        `${this.dateSouhaitee()}T09:00:00`;
    }

    /**
     * Prépare les données envoyées au backend.
     *
     * Les coordonnées latitude/longitude permettent au collecteur
     * de connaître précisément l'emplacement du ramassage.
     */
    const donnees: DemandeCollecteCreation = {
      idTypeDechet: this.idTypeDechetSelectionne()!,
      quantite: this.quantite()!,
      typeDemande: 'ramassage',
      prixPropose: this.afficherPrix()
        ? this.prixPropose()
        : null,

      // Envoie le quartier détecté ou celui corrigé par l'utilisateur.
      quartier: this.quartierFinal(),

      // Position GPS du citoyen.
      latitude: this.latitude(),
      longitude: this.longitude(),

      // Date souhaitée pour le ramassage.
      dateSouhaitee: dateSouhaiteeIso,
    };

    // Création de la demande dans le backend.
    this.demandeService.creerDemande(donnees).subscribe({

      // Demande créée avec succès.
      next: (demande) => {
        this.enEnvoi.set(false);

        /**
         * Vérifie que le backend a bien renvoyé l'identifiant
         * de la demande avant de permettre son suivi.
         */
        if (
          !Number.isInteger(demande?.idDemande) ||
          demande.idDemande <= 0
        ) {
          this.erreur.set(
            'La demande a été créée, mais le serveur n’a pas renvoyé son identifiant de suivi. Consultez votre historique avant de la soumettre à nouveau.'
          );

          console.error(
            'Réponse de création sans identifiant de demande :',
            demande
          );

          return;
        }

        // Conserve la demande créée pour afficher la confirmation.
        this.demandeCreee.set(demande);
      },

      // Gestion de l'erreur lors de la création.
      error: (err) => {
        this.enEnvoi.set(false);
        this.erreur.set(
          'Une erreur est survenue. Veuillez réessayer.'
        );

        console.error(
          'Erreur création demande :',
          err
        );
      }
    });
  }

  // Met à jour le type de déchet sélectionné.
  onTypeDechetChange(event: Event): void {
    const val =
      (event.target as HTMLSelectElement).value;

    this.idTypeDechetSelectionne.set(
      val ? Number(val) : null
    );
  }

  // Met à jour la quantité saisie.
  onQuantiteChange(event: Event): void {
    const val =
      parseFloat(
        (event.target as HTMLInputElement).value
      );

    this.quantite.set(
      isNaN(val) ? null : val
    );
  }

  // Met à jour le prix proposé par l'utilisateur.
  onPrixChange(event: Event): void {
    const val =
      parseFloat(
        (event.target as HTMLInputElement).value
      );

    this.prixPropose.set(
      isNaN(val) ? null : val
    );
  }

  // Retourne vers l'accueil citoyen.
  retour(): void {
    this.router.navigate(['/home-citoyen']);
  }

  // Ouvre la page de suivi de la demande créée.
  suivreDemande(): void {
    const demande = this.demandeCreee();

    if (demande) {
      void this.router.navigate([
        '/suivi-demande',
        demande.idDemande
      ]);
    }
  }

  // Génère une référence lisible à partir de l'identifiant de la demande.
  referenceDemande(id: number): string {
    return `DEM-${String(id).padStart(5, '0')}`;
  }

  // Formate la date souhaitée en français.
  formaterDateSouhaitee(dateIso: string | null): string {
    if (!dateIso) {
      return 'Non précisée';
    }

    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  }

  // Formate l'heure souhaitée en français.
  formaterHeureSouhaitee(dateIso: string | null): string {
    if (!dateIso) {
      return 'Non précisée';
    }

    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
