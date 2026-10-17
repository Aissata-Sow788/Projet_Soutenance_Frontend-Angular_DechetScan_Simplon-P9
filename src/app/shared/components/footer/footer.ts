import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-footer',
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
  // Année du copyright, mise à jour automatiquement
  readonly annee = new Date().getFullYear();

  // Liens internes (supprime ceux dont la route n'existe pas)
  readonly navigation = [
    { label: 'Accueil', route: '/home-citoyen' },
    { label: 'Scanner', route: '/scan' },
    { label: 'Points de collecte', route: '/points-collecte' },
    { label: 'Historique', route: '/historique' },
  ];

    // Colonne "Mon espace"
  readonly espace = [
    { label: 'Connexion', route: '/connexion' },
    { label: 'Inscription', route: '/inscription' },
    { label: 'Devenir collecteur', route: '/devenir-collecteur' },
  ];
}
