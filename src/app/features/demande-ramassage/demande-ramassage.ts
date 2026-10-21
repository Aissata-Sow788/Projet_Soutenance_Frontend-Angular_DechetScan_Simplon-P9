
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DemandeCollecteService } from '../../core/services/demande-collecte';
import { PanierDechetApi, ScanService } from '../../core/services/scan';
import {
  DemandeCollecte,
  DemandeCollecteCreation
} from '../../shared/models/demande-collecte.model';

type GeoStatut = 'chargement' | 'obtenu' | 'refuse' | 'non_supporte';

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-demande-ramassage',
  styleUrl: './demande-ramassage.css',
  templateUrl: './demande-ramassage.html',
})
export class DemandeRamassage implements OnInit {

  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly demandeService = inject(DemandeCollecteService);
  private readonly scanService = inject(ScanService);

  // Paniers et déchets
  paniers = signal<PanierDechetApi[]>([]);
  chargementPaniers = signal(true);

  // Géolocalisation
  latitude = signal<number | null>(null);
  longitude = signal<number | null>(null);
  precisionPosition = signal<number | null>(null);
  geoStatut = signal<GeoStatut>('chargement');
  geoErreur = signal('');

  // Adresse et quartier
  adresseDetectee = signal('');
  quartierDetecte = signal('');
  quartierManuel = signal('');

  quartierFinal = computed(() =>
    this.quartierManuel().trim() || this.quartierDetecte()
  );

  // Sélection des déchets
  paniersSelectionnes = signal<Set<number>>(new Set());
  nombresObjetsDemandes = signal<Record<number, number>>({});
  poidsMesuresKg = signal<Record<number, number | null>>({});

  // Date et heure souhaitées
  dateSouhaitee = signal('');
  heureSouhaitee = signal('');

  // Vente éventuelle des déchets
  prixPropose = signal<number | null>(null);
  afficherPrix = signal(false);

  // Informations complémentaires
  informationsComplementaires = signal('');

  // État de la demande
  enEnvoi = signal(false);
  erreur = signal<string | null>(null);
  demandeCreee = signal<DemandeCollecte | null>(null);

  // Paniers ayant des déchets disponibles
  paniersRemplis = computed(() =>
    this.paniers().filter(panier => panier.nombreDisponible > 0)
  );

  // Paniers sélectionnés uniquement
  paniersChoisis = computed(() =>
    this.paniersRemplis().filter(panier =>
      this.paniersSelectionnes().has(panier.idPanier)
    )
  );

  // Nombre total d'objets demandés
  nombreObjetsDemande = computed(() =>
    this.paniersChoisis().reduce(
      (total, panier) => total + this.nombreObjetsPourDemande(panier),
      0
    )
  );

  // Poids total demandé
  poidsTotalKgDemande = computed(() =>
    this.paniersChoisis().reduce(
      (total, panier) => total + (this.poidsKgPourDemande(panier) ?? 0),
      0
    )
  );

  // Montant estimé de la vente
  montantEstime = computed(() => {
    const poids = this.poidsTotalKgDemande();
    const prix = this.prixPropose();

    if (poids <= 0 || prix === null || prix <= 0) {
      return null;
    }

    return Math.round(poids * prix);
  });

  // Validation générale du formulaire
  formulaireValide = computed(() =>
    !this.chargementPaniers() &&
    this.paniersChoisis().length > 0 &&
    this.paniersChoisis().every(panier =>
      this.nombreObjetsPourDemande(panier) > 0 &&
      (this.poidsKgPourDemande(panier) ?? 0) > 0
    ) &&
    this.latitude() !== null &&
    this.longitude() !== null &&
    this.messageErreurDate() === null
  );

  ngOnInit(): void {
    this.chargerPaniers();
    this.demanderGeolocalisation();
  }

  // Chargement des paniers du citoyen
  private chargerPaniers(): void {
    this.chargementPaniers.set(true);

    this.scanService.getPaniers().subscribe({
      next: paniers => {
        this.paniers.set(paniers);
        this.paniersSelectionnes.set(new Set());
        this.nombresObjetsDemandes.set({});
        this.poidsMesuresKg.set({});
        this.chargementPaniers.set(false);
      },
      error: (err: unknown) => {
        console.error('Erreur chargement des paniers :', err);
        this.erreur.set(
          'Impossible de charger vos déchets. Vérifiez votre connexion puis réessayez.'
        );
        this.chargementPaniers.set(false);
      }
    });
  }

  panierEstSelectionne(panier: PanierDechetApi): boolean {
    return this.paniersSelectionnes().has(panier.idPanier);
  }

  changerSelection(panier: PanierDechetApi, selectionne: boolean): void {
    this.paniersSelectionnes.update(selection => {
      const miseAJour = new Set(selection);

      if (selectionne) {
        miseAJour.add(panier.idPanier);

        this.nombresObjetsDemandes.update(nombres => ({
          ...nombres,
          [panier.idPanier]:
            nombres[panier.idPanier] ?? panier.nombreDisponible
        }));
      } else {
        miseAJour.delete(panier.idPanier);
      }

      return miseAJour;
    });
  }

  nombreObjetsPourDemande(panier: PanierDechetApi): number {
    return this.nombresObjetsDemandes()[panier.idPanier] ?? 0;
  }

  modifierNombreObjets(
    panier: PanierDechetApi,
    valeur: number
  ): void {
    const nombre = Number.isFinite(valeur)
      ? Math.max(
          1,
          Math.min(panier.nombreDisponible, Math.floor(valeur))
        )
      : 1;

    this.nombresObjetsDemandes.update(nombres => ({
      ...nombres,
      [panier.idPanier]: nombre
    }));
  }

  poidsKgPourDemande(panier: PanierDechetApi): number | null {
    return this.poidsMesuresKg()[panier.idPanier] ?? null;
  }

  modifierPoidsMesure(
    panier: PanierDechetApi,
    valeur: number | null
  ): void {
    this.poidsMesuresKg.update(poids => ({
      ...poids,
      [panier.idPanier]:
        valeur !== null && Number.isFinite(valeur) && valeur > 0
          ? valeur
          : null
    }));
  }

  // Géolocalisation
  demanderGeolocalisation(): void {
    this.geoStatut.set('chargement');
    this.geoErreur.set('');
    this.latitude.set(null);
    this.longitude.set(null);
    this.precisionPosition.set(null);
    this.adresseDetectee.set('');
    this.quartierDetecte.set('');

    if (!window.isSecureContext) {
      this.geoStatut.set('non_supporte');
      this.geoErreur.set(
        'La géolocalisation nécessite une connexion sécurisée (HTTPS ou localhost).'
      );
      return;
    }

    if (!navigator.geolocation) {
      this.geoStatut.set('non_supporte');
      this.geoErreur.set(
        'Ce navigateur ne prend pas en charge la géolocalisation.'
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        this.latitude.set(lat);
        this.longitude.set(lon);
        this.precisionPosition.set(position.coords.accuracy);
        this.geoStatut.set('obtenu');

        this.reverseGeocoder(lat, lon);
      },
      err => {
        this.geoStatut.set('refuse');
        this.geoErreur.set(
          this.messageErreurGeolocalisation(err)
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  }

  private messageErreurGeolocalisation(
    err: GeolocationPositionError
  ): string {
    switch (err.code) {
      case 1:
        return 'L’accès à votre position est refusé. Autorisez la localisation dans les réglages du navigateur, puis réessayez.';
      case 2:
        return 'La position est indisponible. Activez le GPS ou les services de localisation de votre appareil, puis réessayez.';
      case 3:
        return 'La recherche de position a pris trop de temps. Vérifiez que le GPS est activé, puis réessayez.';
      default:
        return 'La position n’a pas pu être déterminée. Vérifiez les réglages de localisation, puis réessayez.';
    }
  }

  // Conversion des coordonnées GPS en adresse
  private reverseGeocoder(lat: number, lon: number): void {
    const url =
      'https://nominatim.openstreetmap.org/reverse' +
      `?lat=${lat}&lon=${lon}&format=json&accept-language=fr`;

    this.http.get<any>(url).subscribe({
      next: data => {
        this.adresseDetectee.set(data.display_name ?? '');

        const addr = data.address ?? {};
        const quartier =
          addr.suburb ??
          addr.quarter ??
          addr.city_district ??
          addr.district ??
          addr.town ??
          addr.city ??
          '';

        this.quartierDetecte.set(quartier);
      },
      error: () => {
        this.adresseDetectee.set(
          `${lat.toFixed(5)}, ${lon.toFixed(5)}`
        );
      }
    });
  }

  // Validation de la date souhaitée

  private formaterDateLocale(date: Date): string {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');

    return `${annee}-${mois}-${jour}`;
  }

  private heureActuelle(): string {
    const maintenant = new Date();
    const heures = String(maintenant.getHours()).padStart(2, '0');
    const minutes = String(maintenant.getMinutes()).padStart(2, '0');

    return `${heures}:${minutes}`;
  }

  // La date minimale autorisée est aujourd'hui
  dateMinimale(): string {
    return this.formaterDateLocale(new Date());
  }

  // L'heure minimale s'applique si la date choisie est aujourd'hui
  heureMinimale(): string {
    return this.dateSouhaitee() === this.dateMinimale()
      ? this.heureActuelle()
      : '';
  }

  /**
   * La date est obligatoire.
   * Une date passée est refusée.
   * Si la date est aujourd'hui, l'heure indiquée doit être future.
   */
  messageErreurDate(): string | null {
    const date = this.dateSouhaitee();
    const heure = this.heureSouhaitee();
    const aujourdHui = this.dateMinimale();

    if (!date) {
      return 'Veuillez choisir une date pour le ramassage.';
    }

    if (date < aujourdHui) {
      return 'La date souhaitée ne peut pas être dans le passé.';
    }

    if (date === aujourdHui) {
      if (heure && heure < this.heureActuelle()) {
        return 'L’heure souhaitée est déjà passée pour aujourd’hui.';
      }

      // L'heure par défaut à l'envoi est 09:00.
      // Si 09:00 est passée, une heure future doit être saisie.
      if (!heure && this.heureActuelle() > '09:00') {
        return 'Pour aujourd’hui, précisez une heure à venir.';
      }
    }

    return null;
  }

  // Envoi de la demande de ramassage
  envoyerDemande(): void {
    if (this.enEnvoi()) {
      return;
    }

    // Vérifie d'abord la date pour afficher son erreur précise.
    const messageDate = this.messageErreurDate();

    if (messageDate) {
      this.erreur.set(messageDate);
      return;
    }

    if (!this.formulaireValide()) {
      this.erreur.set(
        'Veuillez sélectionner vos déchets, renseigner leur nombre et leur poids, puis autoriser la géolocalisation.'
      );
      return;
    }

    this.enEnvoi.set(true);
    this.erreur.set(null);

    // La date est désormais obligatoire.
    // Si aucune heure n'est saisie, on utilise 09:00.
    const heure = this.heureSouhaitee() || '09:00';
    const dateSouhaiteeIso =
      `${this.dateSouhaitee()}T${heure}:00`;

    // IMPORTANT : seuls les paniers sélectionnés sont envoyés.
    const details = this.paniersChoisis()
      .map(panier => ({
        idPanier: panier.idPanier,
        nombreObjets: this.nombreObjetsPourDemande(panier),
        poidsKg: this.poidsKgPourDemande(panier) ?? 0
      }))
      .filter(detail =>
        detail.nombreObjets > 0 && detail.poidsKg > 0
      );

    const donnees: DemandeCollecteCreation = {
      details,
      typeDemande: 'ramassage',
      prixPropose: this.afficherPrix()
        ? this.prixPropose()
        : null,
      quartier: this.quartierFinal(),
      latitude: this.latitude(),
      longitude: this.longitude(),
      dateSouhaitee: dateSouhaiteeIso
    };

    this.demandeService.creerDemande(donnees).subscribe({
      next: demande => {
        this.enEnvoi.set(false);

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

        this.demandeCreee.set(demande);
      },
      error: err => {
        this.enEnvoi.set(false);

        // Affiche un message serveur si disponible.
        this.erreur.set(
          err?.error?.dateSouhaitee?.[0] ??
          err?.error?.detail ??
          'Une erreur est survenue. Veuillez vérifier les informations puis réessayer.'
        );

        console.error('Erreur création demande :', err);
      }
    });
  }

  // Modification du prix proposé
  onPrixChange(event: Event): void {
    const valeur = parseFloat(
      (event.target as HTMLInputElement).value
    );

    this.prixPropose.set(
      Number.isNaN(valeur) ? null : valeur
    );
  }

  // Navigation
  retour(): void {
    void this.router.navigate(['/home-citoyen']);
  }

  retourPanier(): void {
    void this.router.navigate(['/mes-paniers']);
  }

  suivreDemande(): void {
    const demande = this.demandeCreee();

    if (demande) {
      void this.router.navigate([
        '/suivi-demande',
        demande.idDemande
      ]);
    }
  }

  // Référence de la demande
  referenceDemande(id: number): string {
    return `DEM-${String(id).padStart(5, '0')}`;
  }

  // Types de déchets de la demande créée
  typesDechetsDemande(demande: DemandeCollecte): string {
    const types = demande.details
      ?.map(detail => detail.typeDechet?.nom)
      .filter((nom): nom is string => Boolean(nom));

    return types?.length
      ? types.join(', ')
      : demande.typeDechet?.nom ?? 'Non précisé';
  }

  // Nombre total d'objets de la demande créée
  nombreObjetsDemandeCreee(
    demande: DemandeCollecte
  ): number | null {
    if (
      demande.details.some(
        detail => detail.nombreObjets === null
      )
    ) {
      return null;
    }

    return demande.details.reduce(
      (total, detail) => total + (detail.nombreObjets ?? 0),
      0
    );
  }

  // Affichage de la date souhaitée
  formaterDateSouhaitee(dateIso: string | null): string {
    if (!dateIso) {
      return 'Non précisée';
    }

    const date = new Date(dateIso);

    if (Number.isNaN(date.getTime())) {
      return 'Date invalide';
    }

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Affichage de l'heure souhaitée
  formaterHeureSouhaitee(dateIso: string | null): string {
    if (!dateIso) {
      return 'Non précisée';
    }

    const date = new Date(dateIso);

    if (Number.isNaN(date.getTime())) {
      return 'Heure invalide';
    }

    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
