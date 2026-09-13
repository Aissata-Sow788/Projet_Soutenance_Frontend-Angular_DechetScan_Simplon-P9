import { Component, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScanService } from '../../core/services/scan';
import { ScanDechet as ScanDechetModel } from '../../shared/models/scan.model';

@Component({
  imports: [CommonModule],
  selector: 'app-scan',
  styleUrl: './scan.css',
  templateUrl: './scan.html',
})
export class Scan {

  private scanService = inject(ScanService);
  private router = inject(Router);

  // Référence vers les deux inputs cachés du template (caméra / galerie)
  @ViewChild('inputCamera') inputCamera!: ElementRef<HTMLInputElement>;
  @ViewChild('inputGalerie') inputGalerie!: ElementRef<HTMLInputElement>;

  // État du composant en signals
  photoApercu = signal<string | null>(null);      // aperçu affiché dans le cadre de scan
  fichierSelectionne = signal<File | null>(null); // fichier réel à envoyer au backend
  analyseEnCours = signal(false);
  erreur = signal<string | null>(null);

  // Simule un clic sur l'input caché pour ouvrir l'appareil photo natif
  ouvrirCamera(): void {
    this.inputCamera.nativeElement.click();
  }

  // Simule un clic sur l'input caché pour ouvrir la galerie
  ouvrirGalerie(): void {
    this.inputGalerie.nativeElement.click();
  }

  // Appelé quand une photo est choisie (caméra ou galerie)
  onFichierChoisi(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    if (!fichier) return;

    this.fichierSelectionne.set(fichier);
    this.erreur.set(null);

    // Lit le fichier pour générer un aperçu affichable dans le <img>
    const lecteur = new FileReader();
    lecteur.onload = () => this.photoApercu.set(lecteur.result as string);
    lecteur.readAsDataURL(fichier);

    input.value = ''; // permet de reprendre la même photo si besoin
  }

  // Annule la photo et repasse en mode caméra
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
      this.scanService.dernierResultat.set(resultat); // stocke le résultat pour la page /resultat
      this.router.navigate(['/analyse-ia']); // redirige vers la fiche déchet
    },
    error: (err) => {
      this.analyseEnCours.set(false);
      this.erreur.set(err.message ?? 'Erreur lors de l\'analyse.');
    }
  });
}
}
