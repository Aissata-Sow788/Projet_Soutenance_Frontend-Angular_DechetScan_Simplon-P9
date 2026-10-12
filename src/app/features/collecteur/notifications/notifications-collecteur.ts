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

  notifications = signal<NotificationModel[]>([]);
  chargement = signal(true);
  erreur = signal<string | null>(null);
  ongletActif = signal<'toutes' | 'non-lues' | 'collectes' | 'paiements'>('toutes');

  notificationsFiltrees = computed(() => {
    const liste = this.notifications();
    switch (this.ongletActif()) {
      case 'non-lues':
        return liste.filter((notification) => !notification.lu);
      case 'collectes':
        return liste.filter((notification) => this.estCollecte(notification));
      case 'paiements':
        return liste.filter((notification) => this.estPaiement(notification));
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
        const liste = notifications.length > 0 ? notifications : this.notificationsFallback();
        this.notifications.set(liste);
        this.chargement.set(false);
      },
      error: () => {
        this.notifications.set(this.notificationsFallback());
        this.erreur.set('Impossible de charger les notifications.');
        this.chargement.set(false);
      },
    });
  }

  private notificationsFallback(): NotificationModel[] {
    const maintenant = new Date();

    return [
      {
        idNotification: 1,
        idUtilisateur: 0,
        titre: 'Nouvelle demande de collecte',
        message: 'Un citoyen a demandé un ramassage de plastique à Dakar.',
        dateEnvoi: new Date(maintenant.getTime() - 5 * 60000).toISOString(),
        lu: false,
      },
      {
        idNotification: 2,
        idUtilisateur: 0,
        titre: 'Collecte planifiée',
        message: 'Une collecte est prévue aujourd\'hui à 15h00.',
        dateEnvoi: new Date(maintenant.getTime() - 3 * 3600000).toISOString(),
        lu: false,
      },
      {
        idNotification: 3,
        idUtilisateur: 0,
        titre: 'Paiement confirmé',
        message: 'Votre abonnement a été renouvelé avec succès.',
        dateEnvoi: new Date(maintenant.getTime() - 24 * 3600000).toISOString(),
        lu: true,
      },
      {
        idNotification: 4,
        idUtilisateur: 0,
        titre: 'Demande modifiée',
        message: 'Le citoyen a modifié les informations de sa demande.',
        dateEnvoi: new Date(maintenant.getTime() - 2 * 3600000).toISOString(),
        lu: false,
      },
    ];
  }

  changerOnglet(
    onglet: 'toutes' | 'non-lues' | 'collectes' | 'paiements',
  ): void {
    this.ongletActif.set(onglet);
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

  private estCollecte(notification: NotificationModel): boolean {
    const texte = `${notification.titre} ${notification.message}`.toLowerCase();
    return (
      texte.includes('collecte') ||
      texte.includes('demande de collecte') ||
      texte.includes('ramassage')
    );
  }

  private estPaiement(notification: NotificationModel): boolean {
    const texte = `${notification.titre} ${notification.message}`.toLowerCase();
    return texte.includes('paiement') || texte.includes('abonnement');
  }

  iconeNotification(notification: NotificationModel): string {
    const texte = `${notification.titre} ${notification.message}`.toLowerCase();
    if (texte.includes('paiement') || texte.includes('abonnement')) {
      return '✓';
    }
    if (texte.includes('collecte') || texte.includes('ramassage')) {
      return '◌';
    }
    return '!';
  }

  couleurBadge(notification: NotificationModel): string {
    const texte = `${notification.titre} ${notification.message}`.toLowerCase();
    if (texte.includes('paiement') || texte.includes('abonnement')) {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (texte.includes('collecte') || texte.includes('ramassage')) {
      return 'bg-sky-100 text-sky-700';
    }
    return 'bg-amber-100 text-amber-700';
  }

  badgeActif(onglet: 'toutes' | 'non-lues' | 'collectes' | 'paiements'): string {
    return this.ongletActif() === onglet ? 'bg-[#11AAA9] text-white' : 'bg-[#F1F3F4] text-[#45565E]';
  }
}
