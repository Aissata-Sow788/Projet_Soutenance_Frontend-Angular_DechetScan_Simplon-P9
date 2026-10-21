import { Component, Injector, OnInit, computed, inject, signal, afterNextRender, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DemandeCollecteService } from '../../../core/services/demande-collecte';
import { DemandeCollecte, DetailDemandeCollecte, DemandeScanPhoto } from '../../../shared/models/demande-collecte.model';
import * as L from 'leaflet';

// Icône par défaut de Leaflet (les images du bundler sont introuvables sous Angular,
// on pointe donc vers le CDN).
const iconDefault = L.icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-detail-demande',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './detail-demande.html',
  styleUrl: './detail-demande.css'
})
export class DetailDemande implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly demandeService = inject(DemandeCollecteService);
  // Nécessaire pour appeler afterNextRender en dehors du constructeur.
  private readonly injector = inject(Injector);

  chargement = signal(true);
  erreur = signal<string | null>(null);
  enTraitement = signal(false);
  demande = signal<DemandeCollecte | null>(null);

  photosOuvertes = signal<{
    categorie: string;
    photos: DemandeScanPhoto[];
    index: number;
  } | null>(null);

  statutNormalise = computed(() => {
    const st = this.demande()?.statut;
    return st ? st.toLowerCase().trim() : '';
  });

  private map: L.Map | undefined;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.erreur.set('Identifiant de demande invalide.');
      this.chargement.set(false);
      return;
    }

    this.demandeService.obtenirDemande(id).subscribe({
      next: dem => {
        this.demande.set(dem);
        this.chargement.set(false);
        // Attend que Angular ait réellement affiché la div de la carte
        // (elle n'existe qu'après le rendu du bloc @if) avant d'initialiser Leaflet.
        afterNextRender(() => this.initialiserCarte(), { injector: this.injector });
      },
      error: () => {
        this.erreur.set('Impossible de charger les détails de la demande.');
        this.chargement.set(false);
      }
    });
  }

  private initialiserCarte(): void {
    const dem = this.demande();
    if (!dem || dem.latitude == null || dem.longitude == null) {
      return;
    }

    // Convertit en nombre : l'API (Django DecimalField) peut renvoyer des chaînes.
    const lat = Number(dem.latitude);
    const lng = Number(dem.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }

    // Récupère la div de la carte (id identique à celui du HTML).
    const elementCarte = document.getElementById('carte-position-citoyen');
    if (!elementCarte) {
      return;
    }

    // Détruit l'ancienne carte avant d'en recréer une.
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }

    // On passe l'élément DOM directement plutôt que son id.
    this.map = L.map(elementCarte).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Contenu du popup construit en texte brut (évite d'injecter du HTML venant des données).
    const contenuPopup = document.createElement('div');
    const nom = document.createElement('b');
    nom.textContent = `${dem.prenomUtilisateur || ''} ${dem.nomUtilisateur || ''}`.trim();
    contenuPopup.appendChild(nom);
    contenuPopup.appendChild(document.createElement('br'));
    contenuPopup.appendChild(document.createTextNode(dem.quartier || 'Lieu de collecte'));

    L.marker([lat, lng]).addTo(this.map)
      .bindPopup(contenuPopup)
      .openPopup();

    // Recalcule la taille de la carte une fois la mise en page stabilisée.
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }


accepterDemande(): void {
  const dem = this.demande();

  if (!dem || this.enTraitement()) {
    return;
  }

  this.enTraitement.set(true);
  this.erreur.set(null);

  this.demandeService.accepterDemande(dem.idDemande).subscribe({
    next: demandeMiseAJour => {
      // Conserve les détails et les photos déjà chargés.
      this.demande.set({
        ...dem,
        ...demandeMiseAJour,
        details: demandeMiseAJour.details?.length
          ? demandeMiseAJour.details
          : dem.details,
      });

      this.enTraitement.set(false);
    },
    error: err => {
      this.erreur.set(
        err.error?.detail ?? 'Impossible d’accepter la demande.'
      );
      this.enTraitement.set(false);
    }
  });
}


refuserDemande(): void {
  const dem = this.demande();

  if (!dem || this.enTraitement()) {
    return;
  }

  this.enTraitement.set(true);
  this.erreur.set(null);

  this.demandeService.refuserDemande(dem.idDemande).subscribe({
    next: () => {
      this.enTraitement.set(false);
      this.retour();
    },
    error: err => {
      this.erreur.set(
        err.error?.detail ?? 'Impossible de refuser la demande.'
      );
      this.enTraitement.set(false);
    }
  });
}

  ouvrirPhotos(detail: DetailDemandeCollecte, index: number): void {
    if (!detail.photos || detail.photos.length === 0) return;
    this.photosOuvertes.set({
      categorie: detail.typeDechet?.nom ?? 'Déchets',
      photos: detail.photos,
      index
    });
  }

  fermerPhotos(): void {
    this.photosOuvertes.set(null);
  }

  photoSuivante(direction: number): void {
    const galerie = this.photosOuvertes();
    if (!galerie) return;
    const nouveauIndex = (galerie.index + direction + galerie.photos.length) % galerie.photos.length;
    this.photosOuvertes.set({ ...galerie, index: nouveauIndex });
  }


urlPhoto(photo: DemandeScanPhoto): string {
  if (!photo.photoUrl) {
    return 'assets/placeholder-image.png';
  }

  try {
    const url = new URL(photo.photoUrl, window.location.origin);

    const chemin = url.pathname.startsWith('/media/')
      ? url.pathname
      : `/media/${url.pathname.replace(/^\/+/, '')}`;

    return `${chemin}${url.search}${url.hash}`;
  } catch {
    return 'assets/placeholder-image.png';
  }
}

  retour(): void {
    this.router.navigate(['/collecteur/demandes']);
  }

  initiales(prenom?: string, nom?: string): string {
    const p = prenom ? prenom.charAt(0).toUpperCase() : '';
    const n = nom ? nom.charAt(0).toUpperCase() : '';
    return `${p}${n}` || 'C';
  }

  formaterDate(dateIso: string | null): string {
    if (!dateIso) return 'Non précisée';
    return new Date(dateIso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formaterHeure(dateIso: string | null): string {
    if (!dateIso) return 'Non précisée';
    return new Date(dateIso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  classeStatut(statut: string): string {
    const s = statut ? statut.toLowerCase() : '';
    switch (s) {
      case 'acceptee':
      case 'terminee':
        return 'bg-green-100 text-green-700';
      case 'en_cours':
        return 'bg-blue-100 text-blue-700';
      case 'refusee':
      case 'annulee':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-orange-100 text-orange-700';
    }
  }

  libelleStatut(statut: string): string {
    const s = statut ? statut.toLowerCase() : '';
    switch (s) {
      case 'en_attente':
        return 'En attente';
      case 'acceptee':
        return 'Acceptée';
      case 'en_cours':
        return 'En cours';
      case 'terminee':
        return 'Terminée';
      case 'refusee':
        return 'Refusée';
      default:
        return statut;
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
