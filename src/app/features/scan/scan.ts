import { Component, ElementRef, ViewChild, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ScanService } from '../../core/services/scan';
import { ScanDechet as ScanDechetModel } from '../../shared/models/scan.model';

@Component({
  imports: [CommonModule, RouterLink],
  selector: 'app-scan',
  styleUrl: './scan.css',
  templateUrl: './scan.html',
})
export class Scan implements OnInit, OnDestroy {

  private scanService = inject(ScanService);
  private router = inject(Router);

  // Vidéo live (flux caméra) + canvas caché servant à capturer une image du flux
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasCapture') canvasCapture!: ElementRef<HTMLCanvasElement>;
  @ViewChild('inputGalerie') inputGalerie!: ElementRef<HTMLInputElement>;

  // État du composant en signals
  photoApercu = signal<string | null>(null);       // aperçu affiché par-dessus le flux vidéo
  fichierSelectionne = signal<File | null>(null);  // fichier réel à envoyer au backend
  analyseEnCours = signal(false);
  erreur = signal<string | null>(null);
  cameraActive = signal(false);                    // true dès que le flux vidéo tourne

  // 'environment' = caméra arrière, 'user' = caméra avant
  modeCamera = signal<'environment' | 'user'>('environment');

  // Référence vers le flux actif, pour pouvoir couper les pistes proprement
  private streamActif: MediaStream | null = null;

  ngOnInit(): void {
    this.demarrerCamera();
  }

  ngOnDestroy(): void {
    // Indispensable : sinon le voyant caméra du téléphone/PC reste allumé
    this.arreterCamera();
  }

  // Demande l'accès caméra et branche le flux sur la balise <video>
  private async demarrerCamera(): Promise<void> {
    this.erreur.set(null);

    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.modeCamera() },
        audio: false,
      });

      this.streamActif = flux;
      this.videoElement.nativeElement.srcObject = flux;
      this.cameraActive.set(true);
    } catch (err) {
      this.cameraActive.set(false);
      this.erreur.set("Impossible d'accéder à la caméra. Vérifie les autorisations du navigateur.");
      console.error('Erreur getUserMedia :', err);
    }
  }

  // Coupe toutes les pistes du flux en cours (libère la caméra)
  private arreterCamera(): void {
    this.streamActif?.getTracks().forEach((piste) => piste.stop());
    this.streamActif = null;
    this.cameraActive.set(false);
  }

  // Bascule caméra avant/arrière : on coupe l'ancien flux et on en redemande un nouveau
  async basculerCamera(): Promise<void> {
    this.modeCamera.set(this.modeCamera() === 'environment' ? 'user' : 'environment');
    this.arreterCamera();
    await this.demarrerCamera();
  }

  // Capture l'image affichée actuellement par la vidéo (dessin sur canvas caché)
  prendrePhoto(): void {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasCapture.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexte = canvas.getContext('2d');
    if (!contexte) return;

    contexte.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Aperçu affiché immédiatement par-dessus la vidéo
    this.photoApercu.set(canvas.toDataURL('image/jpeg', 0.9));

    // Conversion en File pour l'envoi au backend
    canvas.toBlob((blob) => {
      if (!blob) return;
      const fichier = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.fichierSelectionne.set(fichier);
    }, 'image/jpeg', 0.9);
  }

  // Simule un clic sur l'input caché pour importer une image depuis la galerie
  ouvrirGalerie(): void {
    this.inputGalerie.nativeElement.click();
  }

  // Appelé quand une image est choisie depuis la galerie
  onFichierChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!fichier) return;

    this.fichierSelectionne.set(fichier);
    this.erreur.set(null);

    const lecteur = new FileReader();
    lecteur.onload = () => this.photoApercu.set(lecteur.result as string);
    lecteur.readAsDataURL(fichier);

    input.value = '';
  }

  // Annule la photo prise/importée et repasse en vue caméra live
  reprendrePhoto(): void {
    this.photoApercu.set(null);
    this.fichierSelectionne.set(null);
    this.erreur.set(null);
  }

  // Envoie la photo au service (backend) pour analyse IA
  envoyerAuScan(): void {
    const fichier = this.fichierSelectionne();
    if (!fichier) return;

    this.analyseEnCours.set(true);
    this.erreur.set(null);

    this.scanService.envoyerImage(fichier).subscribe({
      next: (resultat) => {
        this.analyseEnCours.set(false);

        // On conserve toujours le résultat en mémoire pour
        // que la navigation soit immédiate.
        this.scanService.dernierResultat.set(resultat);

        // On transmet l'identifiant du scan dans l'URL.
        // Ainsi, même après un rafraîchissement, AnalyseIA
        // pourra récupérer les données depuis Django.
        this.router.navigate(['/analyse-ia'], { queryParams: { idScan: resultat.idScan } });
      },
      error: (err) => {
        this.analyseEnCours.set(false);
        this.erreur.set(err.message ?? "Erreur lors de l'analyse.");
      }
    });
  }
}
