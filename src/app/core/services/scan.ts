import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScanDechet } from '../../shared/models/scan.model';

@Injectable({ providedIn: 'root' })
export class ScanService {

  private http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/';

  // Garde le dernier résultat en mémoire pour la page /resultat
  dernierResultat = signal<ScanDechet | null>(null);

  envoyerImage(fichier: File): Observable<ScanDechet> {
    // FormData obligatoire pour envoyer un fichier (pas du JSON)
    const formData = new FormData();
    formData.append('photoUrl', fichier); // nom de champ attendu par le backend

    return this.http.post<ScanDechet>(`${this.baseUrl}scans/`, formData);
  }

  historique(): Observable<ScanDechet[]> {
    return this.http.get<ScanDechet[]>(`${this.baseUrl}scans/historique/`);
  }
}

















// import { Injectable, signal } from '@angular/core';
// import { Observable, of } from 'rxjs';
// import { delay } from 'rxjs/operators';
// import { ScanDechet } from '../../shared/models/scan.model';

// // Liste de types de déchets utilisée pour simuler une réponse IA réaliste (avec conseil de tri associé)
// const TYPES_DECHET_MOCK = [
//   { idType: 1, nom: 'Plastique', description: 'Bouteilles, emballages plastiques', consigne: 'Rincez et compressez la bouteille avant de la déposer dans le bac dédié au plastique.' },
//   { idType: 2, nom: 'Verre', description: 'Bouteilles, bocaux en verre', consigne: 'Retirez le bouchon et déposez le verre dans le point de collecte spécifique, sans le casser.' },
//   { idType: 3, nom: 'Métal', description: 'Canettes, boîtes de conserve', consigne: 'Rincez la canette et écrasez-la légèrement pour gagner de la place dans le bac métal.' },
//   { idType: 4, nom: 'Papier-carton', description: 'Journaux, cartons, emballages papier', consigne: 'Aplatissez les cartons et gardez-les au sec avant de les déposer.' },
//   { idType: 5, nom: 'Organique', description: 'Déchets alimentaires et végétaux', consigne: 'Déposez ce déchet dans le compost ou le bac organique le plus proche.' },
//   { idType: 6, nom: 'Électronique', description: 'Piles, appareils électroniques', consigne: 'Ne jetez jamais ce déchet avec les ordures classiques : déposez-le dans un point de collecte électronique.' },
// ];
// // Service utilisé pour gérer les scans de déchets
// @Injectable({ providedIn: 'root' })
// export class ScanService {

//   // Stocke le dernier résultat du scan pour pouvoir
//   // le récupérer depuis les autres composants
//   dernierResultat = signal<ScanDechet | null>(null);

//   // Simule l'envoi d'une image au backend
//   envoyerImage(fichier: File): Observable<ScanDechet> {

//     // Affiche les informations du fichier dans la console
//     console.log(
//       '[MOCK] Envoi de l\'image au backend :',
//       fichier.name,
//       fichier.size,
//       'octets'
//     );

//     // Choisit aléatoirement un type de déchet
//     // afin de simuler le résultat de l'intelligence artificielle
//     const typeAleatoire =
//       TYPES_DECHET_MOCK[
//         Math.floor(Math.random() * TYPES_DECHET_MOCK.length)
//       ];

//     // Construction de la réponse simulée du scan
//     const reponseSimulee: ScanDechet = {
//       // Identifiant temporaire généré à partir de l'heure actuelle
//       idScan: Date.now(),

//       // Date et heure du scan
//       dateScan: new Date().toISOString(),

//       // Crée une URL temporaire permettant d'afficher
//       // l'image sélectionnée par l'utilisateur
//       photoUrl: URL.createObjectURL(fichier),

//       // Informations sur le type de déchet détecté
//       typeDechet: {
//         idTypeDechet: typeAleatoire.idType,
//         nom: typeAleatoire.nom,
//         description: typeAleatoire.description,

//         // Conseil de tri associé au type de déchet
//         conseil: {
//           idConseil: typeAleatoire.idType,
//           consigne: typeAleatoire.consigne,
//           idTypeDechet: typeAleatoire.idType
//         }
//       },

//       // Résultat simulé de l'analyse IA
//       analyseIA: {
//         idAnalyse: Date.now() + 1,
//         resultat: typeAleatoire.nom.toLowerCase(),

//         // Génère un score de confiance entre 0.75 et 0.99
//         scoreConfiance: +(
//           0.75 + Math.random() * 0.24
//         ).toFixed(2),

//         dateAnalyse: new Date().toISOString()
//       }
//     };

//     // Simule un délai de 2 secondes correspondant
//     // au temps d'envoi et d'analyse de l'image
//     return of(reponseSimulee).pipe(
//       delay(2000)
//     );
//   }
// }
