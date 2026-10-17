
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { NotificationsService } from '../../../core/services/notification';
import type { Notification as NotificationModel } from '../../../shared/models/notification.model';
import { PushNotifications } from '../../../shared/components/push-notifications/push-notifications';

@Component({
  selector: 'app-notifications-collecteur',
  standalone: true,
  imports: [CommonModule, PushNotifications],
  templateUrl: './notifications-collecteur.html',
  styleUrl: './notifications-collecteur.css',
})
export class NotificationsCollecteur implements OnInit {
  private readonly notificationsService = inject(NotificationsService);

  // Liste des notifications affichées dans la page.
  notifications = signal<NotificationModel[]>([]);

  // État de chargement et message d'erreur.
  chargement = signal(true);
  erreur = signal<string | null>(null);

  // Onglet actuellement sélectionné.
  ongletActif = signal<'toutes' | 'non-lues' | 'collectes' | 'paiements'>('toutes');

  // Filtrage automatique de la liste selon l'onglet sélectionné.
  notificationsFiltrees = computed(() => {
    const liste = this.notifications();

    switch (this.ongletActif()) {
      case 'non-lues':
        return liste.filter(notification => !notification.lu);

      case 'collectes':
        return liste.filter(notification => this.estCollecte(notification));

      case 'paiements':
        return liste.filter(notification => this.estPaiement(notification));

      default:
        return liste;
    }
  });

  ngOnInit(): void {
    this.chargerNotifications();
  }

  // Récupère les notifications depuis le service.
  private chargerNotifications(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.notificationsService.getNotifications().subscribe({
      next: (notifications) => {
        // Conserve les notifications de secours si l'API ne renvoie rien.
        const liste = notifications.length > 0
          ? notifications
          : this.notificationsFallback();

        this.notifications.set(liste);
        this.chargement.set(false);
      },

      error: () => {
        // Affiche les exemples si la récupération échoue.
        this.notifications.set(this.notificationsFallback());
        this.erreur.set('Impossible de charger les notifications.');
        this.chargement.set(false);
      },
    });
  }

  // Marque une notification comme lue au clic.
  marquerCommeLue(notification: NotificationModel): void {
    // Ne rien faire si elle est déjà lue.
    if (notification.lu) {
      return;
    }

    // Met à jour le signal pour rafraîchir immédiatement l'interface.
    this.notifications.update(liste =>
      liste.map(element =>
        element.idNotification === notification.idNotification
          ? { ...element, lu: true }
          : element
      )
    );
  }

  // Marque toutes les notifications comme lues.
  marquerToutesCommeLues(): void {
    this.notifications.update(liste =>
      liste.map(notification => ({
        ...notification,
        lu: true,
      }))
    );
  }

  // Change l'onglet actif.
  changerOnglet(
    onglet: 'toutes' | 'non-lues' | 'collectes' | 'paiements',
  ): void {
    this.ongletActif.set(onglet);
  }

  // Affiche le temps écoulé depuis l'envoi de la notification.
  formatterTemps(dateIso: string): string {
    const date = new Date(dateIso);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const diffMinutes = Math.max(
      0,
      Math.floor((Date.now() - date.getTime()) / 60000)
    );

    if (diffMinutes < 1) {
      return 'À l’instant';
    }

    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`;
    }

    const diffHeures = Math.floor(diffMinutes / 60);

    if (diffHeures < 24) {
      return `Il y a ${diffHeures} h`;
    }

    const diffJours = Math.floor(diffHeures / 24);

    if (diffJours === 1) {
      return 'Hier';
    }

    return `Il y a ${diffJours} jours`;
  }

  // Identifie les notifications liées aux collectes.
  private estCollecte(notification: NotificationModel): boolean {
    const texte =
      `${notification.titre} ${notification.message}`.toLowerCase();

    return (
      texte.includes('collecte') ||
      texte.includes('ramassage')
    );
  }

  // Identifie les notifications liées aux paiements et abonnements.
  private estPaiement(notification: NotificationModel): boolean {
    const texte =
      `${notification.titre} ${notification.message}`.toLowerCase();

    return (
      texte.includes('paiement') ||
      texte.includes('abonnement')
    );
  }

  // Choisit une icône en fonction du type de notification.
  iconeNotification(notification: NotificationModel): string {
    const texte =
      `${notification.titre} ${notification.message}`.toLowerCase();

    if (this.estPaiement(notification)) {
      return '✓';
    }

    if (this.estCollecte(notification)) {
      return '◌';
    }

    return '!';
  }

  // Définit la couleur de l'icône selon le type de notification.
  couleurBadge(notification: NotificationModel): string {
    if (this.estPaiement(notification)) {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (this.estCollecte(notification)) {
      return 'bg-sky-100 text-sky-700';
    }

    return 'bg-amber-100 text-amber-700';
  }

  // Met en évidence l'onglet actif.
  badgeActif(
    onglet: 'toutes' | 'non-lues' | 'collectes' | 'paiements',
  ): string {
    return this.ongletActif() === onglet
      ? 'bg-[#11AAA9] text-white'
      : 'bg-[#F1F3F4] text-[#45565E]';
  }

  // Notifications de secours utilisées lorsque l'API ne renvoie rien.
  private notificationsFallback(): NotificationModel[] {
    const maintenant = new Date();

    return [
      {
        idNotification: 1,
        idUtilisateur: 0,
        titre: 'Nouvelle demande de collecte',
        message: 'Un citoyen a demandé un ramassage de plastique à Dakar.',
        dateEnvoi: new Date(
          maintenant.getTime() - 5 * 60000
        ).toISOString(),
        lu: false,
      },
      {
        idNotification: 2,
        idUtilisateur: 0,
        titre: 'Collecte planifiée',
        message: 'Une collecte est prévue aujourd’hui à 15h00.',
        dateEnvoi: new Date(
          maintenant.getTime() - 3 * 3600000
        ).toISOString(),
        lu: false,
      },
      {
        idNotification: 3,
        idUtilisateur: 0,
        titre: 'Paiement confirmé',
        message: 'Votre abonnement a été renouvelé avec succès.',
        dateEnvoi: new Date(
          maintenant.getTime() - 24 * 3600000
        ).toISOString(),
        lu: true,
      },
      {
        idNotification: 4,
        idUtilisateur: 0,
        titre: 'Demande modifiée',
        message: 'Le citoyen a modifié les informations de sa demande.',
        dateEnvoi: new Date(
          maintenant.getTime() - 2 * 3600000
        ).toISOString(),
        lu: false,
      },
    ];
  }
}

