import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth-guard' // adapte le chemin réel
import { AjouterPointCollecte } from './features/admin/ajouter-point-collecte/ajouter-point-collecte';
import { collecteurSubscriptionGuard } from './core/guards/collecteur-subscription.guard';

export const routes: Routes = [

    // Écran de démarrage, affiché en premier

      // Redirige automatiquement l'URL racine "/" vers l'écran d'onboarding.
  {
    path: '',
    redirectTo: 'onboarding',
    pathMatch: 'full'
  },

  // Slides de présentation de l'app
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./shared/components/oboarding/oboarding').then((m) => m.Oboarding),
  },

  {
    path: 'accueil',
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
    // canActivate: [authGuard],
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
    // canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile')
        .then(m => m.Profile)
  },

  {
    // Formulaire permettant de modifier et d'enregistrer le profil citoyen.
    path: 'profil/modifier',
    loadComponent: () =>
      import('./features/profile/modifier-profil')
        .then(m => m.ModifierProfil)
  },

  {
    // Liste personnelle des demandes de collecte du citoyen connecté.
    path: 'mes-demandes',
    loadComponent: () =>
      import('./features/profile/mes-demandes')
        .then(m => m.MesDemandes)
  },

  {
    // URL : /connexion-collecteur
    // Page de connexion dédiée à l'espace collecteur.
    path: 'connexion-collecteur',
    loadComponent: () =>
      import('./features/collecteur/connexion-collecteur/connexion-collecteur')
        .then(m => m.ConnexionCollecteur)
  },

  // ============================================================
  // CITOYEN — DEMANDE DE RAMASSAGE
  // ============================================================

  {
    // URL : /demande-ramassage
    // Page du formulaire de demande de ramassage.
    path: 'demande-ramassage',
    loadComponent: () =>
      import('./features/demande-ramassage/demande-ramassage')
        .then(m => m.DemandeRamassage)
  },

  {
    // Formulaire de création du profil professionnel collecteur.
    path: 'devenir-collecteur',
    loadComponent: () =>
      import('./features/devenir-collecteur/devenir-collecteur')
        .then(m => m.DevenirCollecteur)
  },

  {
    // URL : /vendre-dechets
    // Tunnel citoyen en 3 étapes :
    // 1. Choisir le type de déchet et la quantité
    // 2. Choisir le collecteur parmi les disponibles
    // 3. Confirmer la vente (prix + méthode de paiement)
    path: 'vendre-dechets',
    loadComponent: () =>
      import('./features/vendre-dechets/vendre-dechets')
        .then(m => m.VendreDechets)
  },

  {
    // URL : /mes-ventes
    // Liste des ventes réalisées par le citoyen connecté.
    path: 'mes-ventes',
    loadComponent: () =>
      import('./features/mes-ventes/mes-ventes')
        .then(m => m.MesVentes)
  },

  {
    // URL : /mes-ventes/:id
    // Détail d'une vente : type déchet, montant, collecteur, statut paiement.
    path: 'mes-ventes/:id',
    loadComponent: () =>
      import('./features/detail-vente/detail-vente')
        .then(m => m.DetailVente)
  },

  {
    // URL : /suivi-demande/:id
    // Page de suivi d'une demande de collecte du citoyen.
    path: 'suivi-demande/:id',
    loadComponent: () =>
      import('./features/suivi-demande/suivi-demande')
        .then(m => m.SuiviDemande)
  },


  // ============================================================
  // ESPACE ADMINISTRATEUR
  // ============================================================

  {
    // URL : /admin
    path: 'admin',
    // canActivate: [adminGuard],
    // Charge le layout qui contient le SidebarAdmin et le HeaderAdmin.
    loadComponent: () =>
      import('./shared/components/admin-layout/admin-layout')
        .then(m => m.AdminLayout),

    // Les pages administrateur s'affichent dans le router-outlet du layout.
    children: [

      {
        // URL finale : /admin
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard')
            .then(m => m.Dashboard)
      },

      {
        path: 'profile-admin',
        loadComponent: () =>
          import('./features/admin/profile-admin/profile-admin')
            .then(m => m.ProfileAdmin)
      },

      {
        path: 'tous-scans',
        loadComponent: () =>
          import('./features/admin/tous-scans/tous-scans')
            .then(m => m.TousScans)
      },

      {
        path: 'scans/:idScan',
        loadComponent: () =>
          import('./features/admin/detail-scan/detail-scan')
            .then(m => m.DetailScan)
      },

      {
        path: 'utilisateurs',
        loadComponent: () =>
          import('./features/admin/utilisateurs/utilisateurs')
            .then(m => m.Utilisateurs)
      },

      {
        path: 'ajouter-point-collecte',
        loadComponent: () =>
          import('./features/admin/ajouter-point-collecte/ajouter-point-collecte')
            .then(m => m.AjouterPointCollecte)
      },

      {
        path: 'admin-collecte',
        loadComponent: () =>
          import('./features/admin/points-collecte/points-collecte')
            .then(m => m.PointsCollecte)
      },

      {
        path: 'points-collecte/:id',
        data: { espace: 'admin' },
        loadComponent: () =>
          import('./features/collecteur/detail-point-collecte/detail-point-collecte-collecteur')
            .then(m => m.DetailPointCollecteCollecteur)
      },

      {
        path: 'referentiel-dechets',
        loadComponent: () =>
          import('./features/admin/ajouter-referentiel/ajouter-referentiel')
            .then(m => m.AjouterReferentiel)
      },

      {
        path: 'referentiel-dechets/types',
        loadComponent: () =>
          import('./features/admin/referentiel-dechets/types-dechets/types-dechets')
            .then(m => m.TypesDechets)
      },

      {
        path: 'referentiel-dechets/types/:id/modifier',
        loadComponent: () =>
          import('./features/admin/ajouter-referentiel/ajouter-referentiel')
            .then(m => m.AjouterReferentiel)
      },

      {
        path: 'referentiel-dechets/conseils',
        loadComponent: () =>
          import('./features/admin/referentiel-dechets/conseils-tri/conseils-tri')
            .then(m => m.ConseilsTri)
      }

    ]

  },


  // ============================================================
  // ESPACE COLLECTEUR
  // ============================================================

  {
    // URL : /collecteur
    // Layout collecteur : sidebar noir + header.
    path: 'collecteur',
    canActivate: [authGuard],
    canActivateChild: [collecteurSubscriptionGuard],
    loadComponent: () =>
      import('./shared/components/collecteur-layout/collecteur-layout')
        .then(m => m.CollecteurLayout),

    // Toutes les pages collecteur s'affichent dans le router-outlet du layout.
    children: [

      {
        path: 'abonnement',
        loadComponent: () =>
          import('./features/collecteur/abonnement/abonnement-collecteur')
            .then(m => m.AbonnementCollecteurPage)
      },

      {
        // URL finale : /collecteur
        // Dashboard principal du collecteur.
        path: '',
        loadComponent: () =>
          import('./features/collecteur/dashboard/dashboard-collecteur')
            .then(m => m.DashboardCollecteur)
      },

      {
        // URL : /collecteur/demandes
        // Liste de toutes les demandes de collecte disponibles.
        path: 'demandes',
        loadComponent: () =>
          import('./features/collecteur/demandes/demandes-collecte')
            .then(m => m.DemandesCollecte)
      },

      {
        // URL : /collecteur/demandes/:id
        // Détail d'une demande : actions accepter/refuser uniquement.
        path: 'demandes/:id',
        loadComponent: () =>
          import('./features/collecteur/detail-demande/detail-demande')
            .then(m => m.DetailDemande)
      },

      {
        // URL : /collecteur/collectes/demandes/:id
        // Détail de la collecte issue d'une demande acceptée.
        path: 'collectes/demandes/:id',
        loadComponent: () =>
          import('./features/collecteur/detail-collecte/detail-collecte')
            .then(m => m.DetailCollecte)
      },

      {
        // URL : /collecteur/collectes/:id
        // Détail d'une collecte depuis la page Mes collectes.
        path: 'collectes/:id',
        loadComponent: () =>
          import('./features/collecteur/detail-collecte/detail-collecte')
            .then(m => m.DetailCollecte)
      },

      {
        // URL : /collecteur/mes-collectes
        // Collectes du collecteur : onglets à venir / en cours / terminées.
        path: 'mes-collectes',
        loadComponent: () =>
          import('./features/collecteur/mes-collectes/mes-collectes')
            .then(m => m.MesCollectes)
      },

      {
        // URL : /collecteur/historique
        // Historique de toutes les collectes terminées.
        path: 'historique',
        loadComponent: () =>
          import('./features/collecteur/historique-collectes/historique-collectes')
            .then(m => m.HistoriqueCollectes)
      },

      {
        // URL : /collecteur/planification
        // Calendrier des ramassages planifiés + modal de création rapide.
        path: 'planification',
        loadComponent: () =>
          import('./features/collecteur/planification/planification')
            .then(m => m.Planification)
      },

      {
        // URL : /collecteur/points-collecte
        // Liste des points de collecte (grille de cartes).
        path: 'points-collecte',
        loadComponent: () =>
          import('./features/collecteur/points-collecte/points-collecte-collecteur')
            .then(m => m.PointsCollecteCollecteur)
      },

      {
        // URL : /collecteur/points-collecte/:id
        // Détail d'un point : infos, carte OSM, collectes récentes.
        path: 'points-collecte/:id',
        loadComponent: () =>
          import('./features/collecteur/detail-point-collecte/detail-point-collecte-collecteur')
            .then(m => m.DetailPointCollecteCollecteur)
      },

      {
        // URL : /collecteur/ajouter-point-collecte
        // Formulaire d'ajout ou de modification d'un point de collecte.
        // En modification, l'id est passé en queryParam (?id=X).
        path: 'ajouter-point-collecte',
        loadComponent: () =>
          import('./features/collecteur/ajouter-point-collecte/ajouter-point-collecte-collecteur')
            .then(m => m.AjouterPointCollecteCollecteur)
      },

      {
        // URL : /collecteur/ventes
        // Liste de toutes les ventes de déchets du collecteur.
        path: 'ventes',
        loadComponent: () =>
          import('./features/collecteur/ventes/ventes-collecteur')
            .then(m => m.VentesCollecteur)
      },

      {
        // URL : /collecteur/paiements
        // Page de paiement des citoyens vendeurs via PayDunya.
        // Gère aussi le retour PayDunya via ?reference=VP-xxx.
        path: 'paiements',
        loadComponent: () =>
          import('./features/collecteur/paiements/paiements-collecteur')
            .then(m => m.PaiementsCollecteur)
      },

      {
        // URL : /collecteur/profil
        // Consultation et modification du profil collecteur connecté.
        path: 'profil',
        loadComponent: () =>
          import('./features/collecteur/profil/profil-collecteur')
            .then(m => m.ProfilCollecteurPage)
      },

    ]

  },

];
