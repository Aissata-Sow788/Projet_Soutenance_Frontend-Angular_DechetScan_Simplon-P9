import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BarreNavigations } from '../../shared/components/barre-navigations/barre-navigations';


/**
 * Représente une notification affichée dans la page.
 */
interface Notification {
  id: number;
  titre: string;
  date: string;
  message: string;
  conseil: string;
  lue: boolean;
}


@Component({
  imports: [CommonModule, BarreNavigations],
  selector: 'app-notifications',
  styleUrl: './notifications.css',
  templateUrl: './notifications.html',
})
export class Notifications {


  /**
   * Liste des notifications.
   *
   * Pour le moment les données sont locales.
   * Plus tard, cette liste pourra être récupérée
   * depuis le backend avec un service.
   */
  notifications = signal<Notification[]>([
    {
      id: 1,
      titre: 'Conseil du jour',
      date: "Aujourd'hui",
      message:
        "Pensez à bien rincer vos emballages avant de les trier. Cela évite d'altérer la chaîne de valorisation locale.",
      conseil: "Économisez l'eau de rinçage",
      lue: false
    },
    {
      id: 2,
      titre: 'Conseil du jour',
      date: "Aujourd'hui",
      message:
        "Pensez à bien rincer vos emballages avant de les trier. Cela évite d'altérer la chaîne de valorisation locale.",
      conseil: "Économisez l'eau de rinçage",
      lue: false
    }
  ]);

  /**
   * Filtre actuellement sélectionné.
   *
   * Cette valeur pourra ensuite servir à afficher
   * les notifications selon la période choisie.
   */
  filtre = signal<'toutes' | 'collectes'>('toutes');

  /**
   * Change le filtre affiché.
   */
  changerFiltre(filtre: 'toutes' | 'collectes'): void {
    this.filtre.set(filtre);
  }

  /**
   * Marque toutes les notifications comme lues.
   *
   * map() parcourt chaque notification et crée
   * une nouvelle version avec lue = true.
   */
  marquerToutesCommeLues(): void {
    this.notifications.update(liste =>
      liste.map(notification => ({
        ...notification,
        lue: true
      }))
    );
  }

  /**
   * Retourne le nombre de notifications non lues.
   */
  nombreNonLues(): number {
    return this.notifications().filter(notification => !notification.lue).length;
  }
}
