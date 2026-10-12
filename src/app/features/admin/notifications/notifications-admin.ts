import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationsService } from '../../../core/services/notification';
import type { Notification as NotificationModel } from '../../../shared/models/notification.model';
import { PushNotifications } from '../../../shared/components/push-notifications/push-notifications';

type OngletNotification = 'toutes' | 'non-lues';
const TITRE_CANDIDATURE_COLLECTEUR = 'Nouvelle demande pour devenir collecteur';

@Component({
  selector: 'app-notifications-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, PushNotifications],
  templateUrl: './notifications-admin.html',
  styleUrl: './notifications-admin.css',
})
export class NotificationsAdmin implements OnInit {
  private readonly notificationsService = inject(NotificationsService);

  readonly notifications = signal<NotificationModel[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly ongletActif = signal<OngletNotification>('toutes');
  readonly contientNonLues = computed(() =>
    this.notifications().some((notification) => !notification.lu),
  );

  readonly notificationsFiltrees = computed(() => {
    const liste = this.notifications();
    switch (this.ongletActif()) {
      case 'non-lues':
        return liste.filter((notification) => !notification.lu);
      default:
        return liste;
    }
  });

  ngOnInit(): void {
    this.chargerNotifications();
  }

  private chargerNotifications(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.notificationsService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications.set(
          notifications.filter(
            (notification) => notification.titre === TITRE_CANDIDATURE_COLLECTEUR,
          ),
        );
        this.chargement.set(false);
      },
      error: (error: unknown) => {
        console.error('Erreur lors du chargement des notifications administrateur :', error);
        this.erreur.set('Impossible de charger les notifications. Réessayez plus tard.');
        this.chargement.set(false);
      },
    });
  }

  changerOnglet(onglet: OngletNotification): void {
    this.ongletActif.set(onglet);
  }

  marquerCommeLue(notification: NotificationModel): void {
    if (notification.lu) {
      return;
    }

    this.notificationsService.marquerCommeLue(notification.idNotification).subscribe({
      next: () => {
        this.notifications.update((liste) =>
          liste.map((item) =>
            item.idNotification === notification.idNotification
              ? { ...item, lu: true }
              : item,
          ),
        );
      },
      error: (error: unknown) => {
        console.error('Erreur lors du marquage de la notification comme lue :', error);
        this.erreur.set('Impossible de marquer cette notification comme lue.');
      },
    });
  }

  toutMarquerCommeLu(): void {
    const liste = this.notifications();
    if (!liste.some((notification) => !notification.lu)) {
      return;
    }

    this.notificationsService.marquerToutesCommeLues(liste).subscribe({
      next: () => {
        this.notifications.update((notifications) =>
          notifications.map((notification) => ({ ...notification, lu: true })),
        );
      },
      error: (error: unknown) => {
        console.error('Erreur lors du marquage global des notifications :', error);
        this.erreur.set('Impossible de marquer toutes les notifications comme lues.');
      },
    });
  }

  formatterTemps(dateIso: string): string {
    const date = new Date(dateIso);
    const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));

    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`;
    }

    const diffHeures = Math.round(diffMinutes / 60);
    if (diffHeures < 24) {
      return `Il y a ${diffHeures} h`;
    }

    return 'Hier';
  }

  iconeNotification(notification: NotificationModel): string {
    return notification.lu ? '✓' : '!';
  }

  couleurBadge(notification: NotificationModel): string {
    return notification.lu
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';
  }

  badgeActif(onglet: OngletNotification): string {
    return this.ongletActif() === onglet
      ? 'bg-[#11AAA9] text-white'
      : 'bg-[#F1F3F4] text-[#45565E]';
  }

}
