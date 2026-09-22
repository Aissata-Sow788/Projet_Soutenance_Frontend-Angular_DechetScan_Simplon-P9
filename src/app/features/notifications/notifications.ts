import {Component, OnInit, computed, inject, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {BarreNavigations} from '../../shared/components/barre-navigations/barre-navigations';
import { NotificationsService } from '../../core/services/notification';
import { Notification } from '../../shared/models/notification.model';




@Component({
  imports: [CommonModule, BarreNavigations],
  selector: 'app-notifications',
  styleUrl: './notifications.css',
  templateUrl: './notifications.html',
})
export class Notifications implements OnInit {

  // Permet de revenir à la page précédente.
  private router = inject(Router);

  // Service permettant de communiquer avec l'API Django.
  private notificationsService = inject(NotificationsService);

  // Stocke toutes les notifications récupérées depuis l'API.
  notifications = signal<Notification[]>([]);

  // Indique si les données sont encore en cours de chargement.
  chargement = signal(true);

  // Contient éventuellement le message d'erreur API.
  erreur = signal<string | null>(null);

  // Onglet actuellement sélectionné.
  ongletActif = signal<'toutes' | 'collectes'>('toutes');

  /**
   * Nombre de notifications non lues.
   *
   * Ce nombre est utilisé dans le bouton "Toutes".
   */
  nombreNonLues = computed(() =>
    this.notifications().filter(notification => !notification.lu).length
  );

  /**
   * Notifications affichées selon l'onglet sélectionné.
   */
  notificationsFiltrees = computed(() => {

    const toutes = this.notifications();

    // L'onglet "Toutes" affiche toutes les notifications.
    if (this.ongletActif() === 'toutes') {
      return toutes;
    }

    // L'API ne possède pas encore de champ "type".
    // On identifie donc provisoirement les notifications
    // liées aux collectes grâce à leur texte.
    return toutes.filter(notification => {

      const texte = (
        notification.titre +
        ' ' +
        notification.message
      ).toLowerCase();

      return texte.includes('collecte');
    });
  });

  /**
   * Appelé automatiquement lorsque la page est chargée.
   */
  ngOnInit(): void {
    this.chargerNotifications();
  }

  /**
   * Récupère les notifications directement depuis Django.
   */
  chargerNotifications(): void {

    this.chargement.set(true);
    this.erreur.set(null);

    this.notificationsService.getNotifications().subscribe({

      next: (notifications) => {

        // Stocke les notifications reçues depuis l'API.
        this.notifications.set(notifications);

        this.chargement.set(false);

        console.log(
          'Notifications reçues depuis l API :',
          notifications
        );
      },

      error: (err) => {

        console.error(
          'Erreur lors du chargement des notifications :',
          err
        );

        this.erreur.set(
          'Impossible de charger les notifications.'
        );

        this.chargement.set(false);
      }
    });
  }

  /**
   * Sélectionne l'onglet Toutes ou Collectes.
   */
  changerOnglet(
    onglet: 'toutes' | 'collectes'
  ): void {
    this.ongletActif.set(onglet);
  }

  /**
   * Marque une notification comme lue.
   *
   * La modification est également envoyée à Django.
   */
  marquerCommeLue(
    notification: Notification
  ): void {

    // Si elle est déjà lue, aucune requête n'est nécessaire.
    if (notification.lu) {
      return;
    }

    this.notificationsService
      .marquerCommeLue(notification.idNotification)
      .subscribe({

        next: () => {

          // Met à jour immédiatement l'état dans Angular.
          this.notifications.update(notifications =>
            notifications.map(item =>
              item.idNotification === notification.idNotification
                ? { ...item, lu: true }
                : item
            )
          );
        },

        error: (err) => {
          console.error(
            'Erreur lors du marquage de la notification :',
            err
          );
        }
      });
  }

  /**
   * Marque toutes les notifications comme lues.
   */
  toutMarquerCommeLu(): void {

    const notifications = this.notifications();

    // S'il n'y a aucune notification non lue,
    // on ne fait aucune requête.
    if (!notifications.some(notification => !notification.lu)) {
      return;
    }

    this.notificationsService
      .marquerToutesCommeLues(notifications)
      .subscribe({

        next: () => {

          // Toutes les notifications deviennent visuellement lues.
          this.notifications.update(notifications =>
            notifications.map(notification => ({
              ...notification,
              lu: true
            }))
          );
        },

        error: (err) => {
          console.error(
            'Erreur lors du marquage global :',
            err
          );
        }
      });
  }

  /**
   * Retourne le texte de date utilisé dans la maquette.
   *
   * Une notification créée aujourd'hui affiche "Aujourd'hui".
   */
  afficherDate(dateIso: string): string {

    const date = new Date(dateIso);
    const maintenant = new Date();

    const memeJour =
      date.getDate() === maintenant.getDate() &&
      date.getMonth() === maintenant.getMonth() &&
      date.getFullYear() === maintenant.getFullYear();

    if (memeJour) {
      return "Aujourd'hui";
    }

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Retourne l'heure de la notification.
   */
  afficherHeure(dateIso: string): string {

    return new Date(dateIso).toLocaleTimeString(
      'fr-FR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  /**
   * Permet de revenir à l'écran précédent.
   */
  retour(): void {
    this.router.navigate(['/home-citoyen']);
  }
}
