import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';

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
export class Historique {

   private router = inject(Router);

  // Texte saisi dans la recherche.
  recherche = signal('');

  // Filtre actuellement sélectionné.
  filtreActif = signal<'semaine' | 'mois' | 'tout'>('semaine');

  // Données temporaires : elles pourront venir de l'API plus tard.
  scans = signal<ScanHistorique[]>([
    { id: 1, image: 'assets/bouteille-eau.jpg', categorie: 'Plastique (PET)', objet: 'Bouteille en plastique', date: '15/09/2026', heure: '10:45', destination: 'Tri validé', icone: 'recyclage' },
    { id: 2, image: 'assets/canette.jpg', categorie: 'Métal', objet: 'Canette en aluminium', date: '15/09/2026', heure: '09:20', destination: 'Bac Jaune', icone: 'bac' },
    { id: 3, image: 'assets/carton.jpg', categorie: 'Papier / Carton', objet: 'Boîte en carton', date: '14/09/2026', heure: '15:30', destination: 'Tri validé', icone: 'carton' },
    { id: 4, image: 'assets/compost.jpg', categorie: 'Organique (Compost)', objet: 'Épluchures de banane', date: '14/09/2026', heure: '12:10', destination: 'Composteur', icone: 'compost' }
  ]);

  // computed recalcule automatiquement la liste quand la recherche change.
  scansFiltres = computed(() => {
    const texte = this.recherche().trim().toLowerCase();
    if (!texte) return this.scans();

    return this.scans().filter(scan =>
      scan.objet.toLowerCase().includes(texte) ||
      scan.categorie.toLowerCase().includes(texte) ||
      scan.destination.toLowerCase().includes(texte)
    );
  });

  ngOnInit(): void {
    // Plus tard, les scans pourront être chargés depuis le backend.
  }

  // Change le filtre visuel.
  changerFiltre(filtre: 'semaine' | 'mois' | 'tout'): void {
    this.filtreActif.set(filtre);
  }

  // Met à jour le champ de recherche.
  rechercher(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  // Ouvre le scanner.
  ouvrirScanner(): void {
    this.router.navigate(['/scanner']);
  }
}
