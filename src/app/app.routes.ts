import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth-guard' // adapte le chemin réel

export const routes: Routes = [

  {
    path: '',
    loadComponent: () =>
      import('./features/accueil/accueil')
        .then(m => m.Accueil)
  },

  {
    path: 'inscription',
    loadComponent: () =>
      import('./features/authentification/inscription/inscription')
        .then(m => m.Inscription)
  },

  {
    path: 'connexion',
    loadComponent: () =>
      import('./features/authentification/connexion/connexion')
        .then(m => m.Connexion)
  },

  {
    // Connexion spécifique à l'espace administrateur.
    path: 'connexion-admin',
    loadComponent: () =>
      import('./features/admin/connexion-admin/connexion-admin')
        .then(m => m.ConnexionAdmin)
  },

  {
    path: 'scan',
    loadComponent: () =>
      import('./features/scan/scan')
        .then(m => m.Scan)
  },

  {
    path: 'analyse-ia',
    loadComponent: () =>
      import('./features/analyse-ia/analyse-ia')
        .then(m => m.AnalyseIA)
  },

  {
    path: 'points-collecte',
    loadComponent: () =>
      import('./features/points-collecte/points-collecte')
        .then(m => m.PointsCollecte)
  },

  {
    path: 'points-collecte/:id',
    loadComponent: () =>
      import('./features/detail-point-collecte/detail-point-collecte')
        .then(m => m.DetailPointCollecte)
  },

  {
    path: 'home-citoyen',
    loadComponent: () =>
      import('./features/home-citoyen/home-citoyen')
        .then(m => m.HomeCitoyen)
  },

  {
    path: 'historique',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/historique/historique')
        .then(m => m.Historique)
  },

  {
    path: 'notification',
    loadComponent: () =>
      import('./features/notifications/notifications')
        .then(m => m.Notifications)
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile')
        .then(m => m.Profile)
  },

  {
    path: 'scans',
    loadComponent: () =>
      import('./features/points-collecte/points-collecte')
    .then(m => m.PointsCollecte)
  },




    // ============================================================
    // ESPACE ADMINISTRATEUR
    // ============================================================

    {
      // URL : /admin
      path: 'admin',
      canActivate: [adminGuard],
      // Charge le layout qui contient le SidebarAdmin
      // et le HeaderAdmin.
      loadComponent: () =>
        import('./shared/components/admin-layout/admin-layout')
          .then(m => m.AdminLayout),

      // Les pages administrateur seront affichées
      // à l'intérieur du router-outlet du layout.
      children: [

        {
          // URL finale : /admin
          path: '',

          // Charge le tableau de bord administrateur.
          loadComponent: () =>
            import('./features/admin/dashboard/dashboard')
              .then(m => m.Dashboard)
        },

            {
    path: 'utilisateurs',
    loadComponent: () =>
      import('./features/admin/utilisateurs/utilisateurs')
        .then(m => m.Utilisateurs)
  },

              // Page des points de collecte.
      {
        path: 'points-collecte',
        loadComponent: () =>
          import('./features/admin/points-collecte/points-collecte')
            .then(m => m.PointsCollecte)
      },

    // ----------------------------------------------------------
    // RÉFÉRENTIEL DES DÉCHETS — TYPES
    // ----------------------------------------------------------

    {
      // URL : /admin/referentiel-dechets/types
      path: 'referentiel-dechets/types',

      // Charge la page qui affiche les types de déchets.
      loadComponent: () =>
        import('./features/admin/referentiel-dechets/types-dechets/types-dechets')
          .then(m => m.TypesDechets)
    },


    // ----------------------------------------------------------
    // RÉFÉRENTIEL DES DÉCHETS — CONSEILS
    // ----------------------------------------------------------

    {
      // URL : /admin/referentiel-dechets/conseils
      path: 'referentiel-dechets/conseils',

      // Charge la page qui affiche les conseils de tri.
      loadComponent: () =>
        import('./features/admin/referentiel-dechets/conseils-tri/conseils-tri')
          .then(m => m.ConseilsTri)
    }

      ]

    }

];
