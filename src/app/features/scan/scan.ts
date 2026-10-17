
import {
  Component,
  ElementRef,
  ViewChild,
  signal,
  inject,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ScanService } from '../../core/services/scan';

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-scan',
  styleUrl: './scan.css',
  templateUrl: './scan.html',
})
export class Scan implements AfterViewInit, OnDestroy {

  private scanService = inject(ScanService);
  private router = inject(Router);

  // Éléments HTML nécessaires à la caméra et à la capture.
  @ViewChild('videoElement')
  videoElement!: ElementRef<HTMLVideoElement>;

  @ViewChild('canvasCapture')
  canvasCapture!: ElementRef<HTMLCanvasElement>;

  @ViewChild('inputGalerie')
  inputGalerie!: ElementRef<HTMLInputElement>;

  // États utilisés par l'interface Angular.
  photoApercu = signal<string | null>(null);
  fichierSelectionne = signal<File | null>(null);
  analyseEnCours = signal(false);
  erreur = signal<string | null>(null);
  cameraActive = signal(false);
  messageSucces = signal<string | null>(null);

  // La caméra arrière est sélectionnée par défaut.
  modeCamera = signal<'environment' | 'user'>('environment');

  // Flux de la caméra actuellement utilisé.
  private streamActif: MediaStream | null = null;

  // Évite que deux demandes de caméra se chevauchent.
  private numeroDemandeCamera = 0;

  // Liste des webcams ou caméras disponibles sur l'appareil.
  private appareilsVideo: MediaDeviceInfo[] = [];
  private indexAppareil = 0;
  private deviceIdForce: string | null = null;

  // Détecte les téléphones pour distinguer leur fonctionnement de celui d'un PC.
  private get estMobile(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  // Démarre la caméra après l'affichage de la vue Angular.
  ngAfterViewInit(): void {
    void this.demarrerCamera();
  }

  // Arrête la caméra lorsque l'utilisateur quitte la page.
  ngOnDestroy(): void {
    this.numeroDemandeCamera++;
    this.arreterCamera();
  }

  // Ouvre la caméra demandée.
  private async ouvrirFlux(
    mode: 'environment' | 'user',
    deviceId?: string
  ): Promise<MediaStream> {

    // Sur ordinateur, permet de sélectionner une webcam précise.
    if (deviceId) {
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    }

    // Sur téléphone, demande explicitement la caméra avant ou arrière.
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { exact: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    } catch (erreurExact) {
      console.warn(
        'La sélection exacte a échoué. Nouvelle tentative.',
        erreurExact
      );

      // Solution de repli pour les navigateurs qui ne prennent pas
      // en charge la sélection exacte de l'orientation.
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    }
  }

  // Démarre la caméra et attend que la vidéo affiche une véritable image.
  private async demarrerCamera(): Promise<void> {
    const numero = ++this.numeroDemandeCamera;

    this.erreur.set(null);
    this.cameraActive.set(false);

    // Libère la caméra précédente avant d'en ouvrir une autre.
    this.arreterCamera();

    // Laisse au téléphone le temps de libérer le matériel caméra.
    await new Promise<void>(resolve => setTimeout(resolve, 300));

    if (numero !== this.numeroDemandeCamera) {
      return;
    }

    // getUserMedia nécessite un navigateur compatible et HTTPS
    // (ou localhost pendant le développement).
    if (!navigator.mediaDevices?.getUserMedia) {
      this.erreur.set(
        'La caméra nécessite HTTPS et un navigateur compatible.'
      );
      return;
    }

    let flux: MediaStream | null = null;

    try {
      // Ouvre la caméra correspondant au mode ou à l'identifiant choisi.
      flux = await this.ouvrirFlux(
        this.modeCamera(),
        this.deviceIdForce ?? undefined
      );

      // Ignore une demande qui a été remplacée par une autre.
      if (numero !== this.numeroDemandeCamera) {
        flux.getTracks().forEach(piste => piste.stop());
        return;
      }

      this.streamActif = flux;

      const video = this.videoElement.nativeElement;

      // Configure la vidéo pour permettre la lecture sur Android.
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      // Relie le flux de la caméra à l'élément vidéo.
      video.srcObject = flux;

      // Lance la lecture puis attend les premières images.
      await video.play();
      await this.attendreImageVideo(video);

      // Vérifie que cette demande est toujours la plus récente.
      if (numero !== this.numeroDemandeCamera) {
        flux.getTracks().forEach(piste => piste.stop());
        return;
      }

      const piste = flux.getVideoTracks()[0];
      const reglages = piste.getSettings();

      // Active la caméra uniquement si des images sont disponibles.
      if (
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        throw new Error('La vidéo ne fournit aucune image.');
      }

      this.cameraActive.set(true);

      // Informations utiles pour diagnostiquer un problème de caméra.
      console.log('Caméra réellement utilisée :', {
        nom: piste.label,
        modeDemande: this.modeCamera(),
        orientationDetectee: reglages.facingMode ?? 'non communiquée',
        deviceId: reglages.deviceId,
        largeur: video.videoWidth,
        hauteur: video.videoHeight,
        etat: piste.readyState,
        muette: piste.muted,
      });

      // Récupère les caméras disponibles après autorisation.
      this.appareilsVideo = (
        await navigator.mediaDevices.enumerateDevices()
      ).filter(appareil => appareil.kind === 'videoinput');

      // Vérifie encore que la demande n'a pas été remplacée.
      if (numero !== this.numeroDemandeCamera) {
        flux.getTracks().forEach(p => p.stop());
        return;
      }

      // Mémorise la webcam utilisée pour pouvoir passer à la suivante sur PC.
      const position = this.appareilsVideo.findIndex(
        appareil => appareil.deviceId === reglages.deviceId
      );

      if (position >= 0) {
        this.indexAppareil = position;
      }

      console.table(
        this.appareilsVideo.map(appareil => ({
          nom: appareil.label,
          id: appareil.deviceId,
        }))
      );

    } catch (err) {
      console.error('Échec caméra :', err);

      // Ne touche pas au flux d'une demande plus récente.
      if (numero !== this.numeroDemandeCamera) {
        flux?.getTracks().forEach(piste => piste.stop());
        return;
      }

      this.arreterCamera();

      this.erreur.set(
        `Impossible d'afficher la caméra ${
          this.modeCamera() === 'user' ? 'avant' : 'arrière'
        }. Vérifie les autorisations du navigateur et réessaie.`
      );
    }
  }

  // Attend les premières images, avec un délai maximal de 10 secondes.
  private attendreImageVideo(video: HTMLVideoElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let termine = false;

      const nettoyer = (): void => {
        clearTimeout(delai);
        video.removeEventListener('loadeddata', verifier);
        video.removeEventListener('canplay', verifier);
        video.removeEventListener('error', echouer);
      };

      const terminer = (erreurVideo?: Error): void => {
        if (termine) {
          return;
        }

        termine = true;
        nettoyer();

        if (erreurVideo) {
          reject(erreurVideo);
        } else {
          resolve();
        }
      };

      const verifier = (): void => {
        if (
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          terminer();
        }
      };

      const echouer = (): void => {
        terminer(new Error('Erreur de lecture de la vidéo.'));
      };

      const delai = setTimeout(() => {
        terminer(new Error('Aucune image reçue après 10 secondes.'));
      }, 10000);

      video.addEventListener('loadeddata', verifier);
      video.addEventListener('canplay', verifier);
      video.addEventListener('error', echouer);

      // Vérifie aussi si la vidéo était déjà prête.
      verifier();
    });
  }

  // Arrête le flux et libère les ressources de la caméra.
  private arreterCamera(): void {
    const video = this.videoElement?.nativeElement;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (this.streamActif) {
      this.streamActif.getTracks().forEach(piste => piste.stop());
      this.streamActif = null;
    }

    this.cameraActive.set(false);
  }

  // Passe de la caméra arrière à la caméra avant, ou inversement.
  async basculerCamera(): Promise<void> {
    if (this.photoApercu()) {
      return;
    }

    if (this.estMobile) {
      // Sur téléphone, on privilégie le mode avant/arrière.
      this.deviceIdForce = null;

      this.modeCamera.update(mode =>
        mode === 'environment' ? 'user' : 'environment'
      );
    } else if (this.appareilsVideo.length > 1) {
      // Sur PC, on passe à la webcam suivante.
      this.indexAppareil =
        (this.indexAppareil + 1) % this.appareilsVideo.length;

      this.deviceIdForce =
        this.appareilsVideo[this.indexAppareil].deviceId;
    }
    else {
      // Une seule webcam est disponible sur cet ordinateur.
      this.erreur.set(
        'Une seule caméra est détectée sur cet appareil. ' +
        'Pour changer de caméra, connecte une autre webcam.'
      );
      return;


        }

    await this.demarrerCamera();
  }

  // Capture la photo affichée par la caméra.
  prendrePhoto(): void {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasCapture.nativeElement;

    if (
      !this.cameraActive() ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      this.erreur.set(
        'La caméra démarre encore. Attends quelques secondes avant de prendre la photo.'
      );
      return;
    }

    // Utilise la résolution réelle de la vidéo.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexte = canvas.getContext('2d');

    if (!contexte) {
      this.erreur.set("Impossible de capturer l'image.");
      return;
    }

    // Applique un effet miroir à la photo de la caméra avant.
    if (this.modeCamera() === 'user') {
      contexte.translate(canvas.width, 0);
      contexte.scale(-1, 1);
    }

    // Copie l'image vidéo dans le canvas.
    contexte.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Affiche l'aperçu de la photo capturée.
    this.photoApercu.set(canvas.toDataURL('image/jpeg', 0.9));
    this.erreur.set(null);
    this.messageSucces.set(null);

    // Transforme l'image en fichier à envoyer au backend.
    canvas.toBlob(
      blob => {
        if (!blob) {
          this.erreur.set(
            "Impossible de préparer l'image pour l'analyse."
          );
          return;
        }

        const fichier = new File(
          [blob],
          `scan-${Date.now()}.jpg`,
          { type: 'image/jpeg' }
        );

        this.fichierSelectionne.set(fichier);
      },
      'image/jpeg',
      0.9
    );
  }

  // Ouvre la galerie de photos de l'appareil.
  ouvrirGalerie(): void {
    this.inputGalerie.nativeElement.click();
  }

  // Traite l'image sélectionnée dans la galerie.
  onFichierChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];

    if (!fichier) {
      return;
    }

    // Refuse les fichiers qui ne sont pas des images.
    if (!fichier.type.startsWith('image/')) {
      this.erreur.set('Sélectionne un fichier image valide.');
      input.value = '';
      return;
    }

    this.fichierSelectionne.set(fichier);
    this.erreur.set(null);
    this.messageSucces.set(null);

    // Charge le fichier pour afficher son aperçu.
    const lecteur = new FileReader();

    lecteur.onload = () => {
      this.photoApercu.set(lecteur.result as string);
    };

    lecteur.onerror = () => {
      this.erreur.set("Impossible de lire l'image sélectionnée.");
      this.fichierSelectionne.set(null);
    };

    lecteur.readAsDataURL(fichier);

    // Autorise la sélection ultérieure du même fichier.
    input.value = '';
  }

  // Supprime la photo actuelle pour permettre une nouvelle capture.
  reprendrePhoto(): void {
    this.photoApercu.set(null);
    this.fichierSelectionne.set(null);
    this.erreur.set(null);
    this.messageSucces.set(null);
  }

  // Envoie la photo au backend Django pour l'analyse IA.
  envoyerAuScan(): void {
    const fichier = this.fichierSelectionne();

    if (!fichier || this.analyseEnCours()) {
      return;
    }

    this.analyseEnCours.set(true);
    this.erreur.set(null);
    this.messageSucces.set(null);

    this.scanService.envoyerImage(fichier).subscribe({
      next: resultat => {
        this.analyseEnCours.set(false);

        // Conserve le résultat pour la page d'analyse.
        this.scanService.dernierResultat.set(resultat);

        // Affiche le message de remerciement s'il est fourni par Django.
        if (resultat.messageRemerciement) {
          this.messageSucces.set(resultat.messageRemerciement);
        }

        // Ouvre la page d'analyse avec l'identifiant du scan.
        void this.router.navigate(
          ['/analyse-ia'],
          { queryParams: { idScan: resultat.idScan } }
        ).then(navigationReussie => {
          if (!navigationReussie) {
            this.erreur.set(
              'Le scan a réussi, mais la fiche résultat ne peut pas être ouverte.'
            );
          }
        }).catch((erreurNavigation: unknown) => {
          console.error(
            'Erreur lors de la navigation vers le résultat :',
            erreurNavigation
          );

          this.erreur.set(
            'Le scan a réussi, mais la fiche résultat ne peut pas être ouverte.'
          );
        });
      },

      error: err => {
        this.analyseEnCours.set(false);

        this.erreur.set(
          err.error?.detail ??
          err.message ??
          "Erreur lors de l'analyse."
        );
      },
    });
  }
}
