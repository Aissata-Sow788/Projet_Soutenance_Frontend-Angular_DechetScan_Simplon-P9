
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PointCollecteService } from '../../../core/services/point-collecte';
import { PointCollecte } from '../../../shared/models/point-collecte.model';
import * as L from 'leaflet';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-points-collecte',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './points-collecte.html',
  styleUrl: './points-collecte.css',
})
export class PointsCollecte implements OnInit, OnDestroy {

  private pointCollecteService = inject(PointCollecteService);
  private router = inject(Router);

  points = signal<PointCollecte[]>([]);
  chargement = signal(true);
  recherche = signal('');
  filtreQuartier = signal('Tous');

  private carte: L.Map | null = null;
  private marqueurs: L.Marker[] = [];

  // Identifiant de l'administrateur actuellement connecté.
  private idAdministrateurConnecte: number | null = null;

  // Liste des points filtrés par recherche et quartier.
  pointsFiltres = computed(() => {
    const texte = this.recherche().trim().toLowerCase();
    const quartierSelectionne = this.filtreQuartier();

    return this.points().filter(point => {
      const correspondRecherche =
        !texte ||
        (point.nom ?? '').toLowerCase().includes(texte) ||
        (point.ville ?? '').toLowerCase().includes(texte) ||
        (point.dechetsAcceptes ?? []).some(dechet =>
          (dechet.nom ?? '').toLowerCase().includes(texte)
        );

      const correspondQuartier =
        quartierSelectionne === 'Tous' ||
        this.determinerQuartier(point) === quartierSelectionne;

      return correspondRecherche && correspondQuartier;
    });
  });

  ngOnInit(): void {
    this.lireAdministrateurConnecte();
    this.chargerPoints();
  }

  ngOnDestroy(): void {
    if (this.carte) {
      this.carte.remove();
      this.carte = null;
    }

    this.marqueurs = [];
  }

  // Lit l'utilisateur stocké lors de la connexion.
  private lireAdministrateurConnecte(): void {
    try {
      const utilisateurStocke = localStorage.getItem('dechetscan_user');

      if (!utilisateurStocke) {
        this.idAdministrateurConnecte = null;
        return;
      }

      const utilisateur = JSON.parse(utilisateurStocke);

      const id =
        utilisateur.idUtilisateur ??
        utilisateur.id ??
        utilisateur.user_id;

      this.idAdministrateurConnecte =
        id !== undefined && id !== null && Number.isFinite(Number(id))
          ? Number(id)
          : null;

    } catch {
      this.idAdministrateurConnecte = null;
    }
  }

  // Vérifie si le point a été créé par l'administrateur connecté.
  // Le backend doit renvoyer le champ creePar avec l'identifiant du créateur.
  estCreateur(point: PointCollecte): boolean {
    if (this.idAdministrateurConnecte === null) {
      return false;
    }

    // Tolère plusieurs formats possibles de réponse de l'API.
    const donnees = point as unknown as Record<string, unknown>;

    const createur =
      donnees['creePar'] ??
      donnees['cree_par'] ??
      donnees['created_by'];

    let idCreateur: unknown = createur;

    if (typeof createur === 'object' && createur !== null) {
      const objetCreateur = createur as Record<string, unknown>;

      idCreateur =
        objetCreateur['idUtilisateur'] ??
        objetCreateur['id'] ??
        objetCreateur['user_id'];
    }

    return (
      idCreateur !== undefined &&
      idCreateur !== null &&
      Number(idCreateur) === this.idAdministrateurConnecte
    );
  }

  // Charge les points depuis le service.
  private chargerPoints(): void {
    this.chargement.set(true);

    this.pointCollecteService.listerPoints().subscribe({
      next: (liste) => {
        this.points.set(liste);
        this.chargement.set(false);

        // Attend que le conteneur de la carte soit affiché.
        setTimeout(() => this.initialiserCarte(), 100);
      },
      error: () => {
        this.chargement.set(false);

        void Swal.fire({
          title: 'Chargement impossible',
          text: 'Les points de collecte ne peuvent pas être chargés.',
          icon: 'error',
          confirmButtonColor: '#0EA5A4',
        });
      },
    });
  }

  // Met à jour le texte de recherche.
  rechercher(event: Event): void {
    const valeur = (event.target as HTMLInputElement).value;
    this.recherche.set(valeur);
  }

  // Change le filtre de quartier.
  changerQuartier(quartier: string): void {
    this.filtreQuartier.set(quartier);
  }

  // Nombre de points actifs.
  nombreActifs(): number {
    return this.points().filter(point => point.statut === 'actif').length;
  }

  // Détermine le quartier à partir des coordonnées.
  // À remplacer par un vrai champ quartier si ton API en fournit un.
  private determinerQuartier(point: PointCollecte): string {
    if (point.latitude > 14.72 && point.longitude < -17.48) {
      return 'Almadies';
    }

    if (point.longitude > -17.44) {
      return 'Plateau';
    }

    return 'Grand Dakar';
  }

  // Libellé du quartier affiché sur la carte.
  quartier(point: PointCollecte): string {
    return this.determinerQuartier(point);
  }

  // Ouvre le détail du point.
  ouvrirDetail(point: PointCollecte): void {
    this.router.navigate(['/admin/points-collecte', point.idPoint]);
  }

  // Ouvre le formulaire de modification.
  modifierPoint(point: PointCollecte): void {
    if (!this.estCreateur(point)) {
      void Swal.fire({
        title: 'Action non autorisée',
        text: 'Tu peux modifier uniquement les points que tu as créés.',
        icon: 'warning',
        confirmButtonColor: '#0EA5A4',
      });
      return;
    }

    this.router.navigate(['/admin/ajouter-point-collecte'], {
      queryParams: { id: point.idPoint },
    });
  }

  // Supprime un point après confirmation.
  async supprimerPoint(point: PointCollecte): Promise<void> {
    if (!this.estCreateur(point)) {
      await Swal.fire({
        title: 'Action non autorisée',
        text: 'Tu peux supprimer uniquement les points que tu as créés.',
        icon: 'warning',
        confirmButtonColor: '#0EA5A4',
      });
      return;
    }

    const resultat = await Swal.fire({
      title: 'Supprimer le point ?',
      text: `Voulez-vous vraiment supprimer « ${point.nom} » ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0EA5A4',
      cancelButtonColor: '#94A3B8',
      reverseButtons: true,
    });

    if (!resultat.isConfirmed) {
      return;
    }

    this.pointCollecteService
      .supprimerPointCollecte(point.idPoint)
      .subscribe({
        next: () => {
          this.points.update(liste =>
            liste.filter(element => element.idPoint !== point.idPoint)
          );

          this.reconstruireCarte();

          void Swal.fire({
            title: 'Point supprimé',
            text: 'Le point de collecte a bien été supprimé.',
            icon: 'success',
            confirmButtonColor: '#0EA5A4',
          });
        },
        error: () => {
          void Swal.fire({
            title: 'Suppression impossible',
            text: 'Vérifie tes droits ou réessaie plus tard.',
            icon: 'error',
            confirmButtonColor: '#0EA5A4',
          });
        },
      });
  }

  // Initialise Leaflet une seule fois.
  private initialiserCarte(): void {
    const conteneur = document.getElementById('carte-admin-points');

    if (!conteneur || this.carte) {
      return;
    }

    this.carte = L.map(conteneur, {
      zoomControl: true,
    }).setView([14.7167, -17.4677], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.carte);

    this.ajouterMarqueurs();

    // Corrige l'affichage des tuiles après le rendu responsive.
    setTimeout(() => this.carte?.invalidateSize(), 150);
  }

  // Supprime puis recrée les marqueurs après une suppression.
  private reconstruireCarte(): void {
    if (!this.carte) {
      return;
    }

    this.marqueurs.forEach(marqueur => marqueur.remove());
    this.marqueurs = [];

    this.ajouterMarqueurs();
  }

  // Ajoute les marqueurs des points.
  private ajouterMarqueurs(): void {
    if (!this.carte) {
      return;
    }

    this.points().forEach(point => {
      const couleur =
        point.statut === 'actif' ? '#10B981' : '#94A3B8';

      const icone = L.divIcon({
        className: 'marqueur-point-admin',
        html: `
          <div style="
            width: 30px;
            height: 30px;
            border-radius: 9999px;
            background: ${couleur};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: 800;
          ">✓</div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marqueur = L.marker(
        [point.latitude, point.longitude],
        { icon: icone }
      )
        .bindPopup(`
          <strong>${this.echapperHtml(point.nom)}</strong><br>
          ${this.echapperHtml(point.ville)}
        `)
        .addTo(this.carte!);

      this.marqueurs.push(marqueur);
    });
  }

  // Évite d'insérer directement du texte de l'API dans le HTML de la popup.
  private echapperHtml(valeur: string): string {
    return (valeur ?? '').replace(/[&<>"']/g, caractere => {
      const caracteres: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      return caracteres[caractere];
    });
  }
}
