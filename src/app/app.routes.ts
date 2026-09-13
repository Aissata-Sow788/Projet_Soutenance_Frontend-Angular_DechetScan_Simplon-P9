import { Routes } from '@angular/router';
import { Accueil } from './features/accueil/accueil';
import { Inscription } from './features/authentification/inscription/inscription';
import { Connexion } from './features/authentification/connexion/connexion';
import { Scan } from './features/scan/scan';
import { AnalyseIA } from './features/analyse-ia/analyse-ia';
import { PointsCollecte } from './features/points-collecte/points-collecte';
import { HomeCitoyen } from './features/home-citoyen/home-citoyen';
import { DetailPointCollecte } from './features/detail-point-collecte/detail-point-collecte';

export const routes: Routes = [
  {
    path: '', component: Accueil
  },
  {
    path: 'inscription', component: Inscription
  },
  {
    path: 'connexion', component: Connexion
  },
  {
    path: 'scan', component: Scan
  },
  {
    path: 'analyse-ia', component: AnalyseIA
  },
  {
    path: 'points-collecte', component: PointsCollecte
  },
  {
  path: 'points-collecte/:id', component: DetailPointCollecte
  },
  {
    path: 'home-citoyen', component: HomeCitoyen
  },
];
