import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ScanDechet } from '../../shared/models/scan.model';

// Liste de types de déchets utilisée pour simuler une réponse IA réaliste (avec conseil de tri associé)
const TYPES_DECHET_MOCK = [
  { idType: 1, nom: 'Plastique', description: 'Bouteilles, emballages plastiques', consigne: 'Rincez et compressez la bouteille avant de la déposer dans le bac dédié au plastique.' },
  { idType: 2, nom: 'Verre', description: 'Bouteilles, bocaux en verre', consigne: 'Retirez le bouchon et déposez le verre dans le point de collecte spécifique, sans le casser.' },
  { idType: 3, nom: 'Métal', description: 'Canettes, boîtes de conserve', consigne: 'Rincez la canette et écrasez-la légèrement pour gagner de la place dans le bac métal.' },
  { idType: 4, nom: 'Papier-carton', description: 'Journaux, cartons, emballages papier', consigne: 'Aplatissez les cartons et gardez-les au sec avant de les déposer.' },
  { idType: 5, nom: 'Organique', description: 'Déchets alimentaires et végétaux', consigne: 'Déposez ce déchet dans le compost ou le bac organique le plus proche.' },
  { idType: 6, nom: 'Électronique', description: 'Piles, appareils électroniques', consigne: 'Ne jetez jamais ce déchet avec les ordures classiques : déposez-le dans un point de collecte électronique.' },
];

@Injectable({ providedIn: 'root' })
export class ScanService {

  // Dernier résultat de scan, lisible depuis n'importe quel composant (ex: la page /resultat après navigation)
  dernierResultat = signal<ScanDechet | null>(null);

  envoyerImage(fichier: File): Observable<ScanDechet> {
    // ---- MOCK : à remplacer par this.http.post<ScanDechet>('/api/scans', formData) ----
    console.log('[MOCK] Envoi de l\'image au backend :', fichier.name, fichier.size, 'octets');

    // Tire un type au hasard pour simuler une réponse IA variée
    const typeAleatoire = TYPES_DECHET_MOCK[Math.floor(Math.random() * TYPES_DECHET_MOCK.length)];

    const reponseSimulee: ScanDechet = {
      idScan: Date.now(),
      dateScan: new Date().toISOString(),
      photoUrl: URL.createObjectURL(fichier), // URL locale temporaire pour afficher la photo
      typeDechet: {
        idType: typeAleatoire.idType,
        nom: typeAleatoire.nom,
        description: typeAleatoire.description
      },
      analyseIA: {
        idAnalyse: Date.now() + 1,
        resultat: typeAleatoire.nom.toLowerCase(),
        scoreConfiance: +(0.75 + Math.random() * 0.24).toFixed(2), // score simulé entre 0.75 et 0.99
        dateAnalyse: new Date().toISOString()
      },
      conseilTri: {
        idConseil: typeAleatoire.idType,
        consigne: typeAleatoire.consigne
      }
    };

    // Délai de 2s pour simuler le temps réel d'upload + inférence IA
    return of(reponseSimulee).pipe(delay(2000));
  }
}
