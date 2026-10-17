import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Notification } from '../../models/notification.model';

@Component({
  imports: [RouterLink],
  selector: 'app-navigations',
  styleUrl: './navigations.css',
  templateUrl: './navigations.html',
})
export class Navigations {

    // Stocke toutes les notifications récupérées depuis l'API.
  notifications = signal<Notification[]>([]);

    nombreNonLues = computed(() =>
    this.notifications().filter(notification => !notification.lu).length
  );
}
