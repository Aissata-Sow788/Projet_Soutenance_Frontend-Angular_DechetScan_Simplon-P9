import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Notification } from '../../shared/models/notification.model';



@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  // Permet d'effectuer les appels HTTP vers Django.
  private http = inject(HttpClient);

  // URL de base de l'API des notifications.
  private readonly apiUrl =
    'http://127.0.0.1:8000/api/notifications';

  /**
   * Récupère les notifications de l'utilisateur connecté.
   *
   * Le JWT est ajouté automatiquement par l'interceptor.
   */
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/`);
  }

  /**
   * Marque une notification précise comme lue.
   */
  marquerCommeLue(id: number): Observable<Notification> {
    return this.http.patch<Notification>(
      `${this.apiUrl}/${id}/read/`,
      {}
    );
  }

  /**
   * Marque toutes les notifications non lues comme lues.
   *
   * On envoie un PATCH pour chaque notification non lue.
   */
  marquerToutesCommeLues(
    notifications: Notification[]
  ): Observable<Notification[]> {

    // On conserve uniquement les notifications qui ne sont pas encore lues.
    const notificationsNonLues = notifications.filter(
      notification => !notification.lu
    );

    // S'il n'y a rien à modifier, on retourne simplement un tableau vide.
    if (notificationsNonLues.length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    // Lance les requêtes PATCH en parallèle.
    return forkJoin(
      notificationsNonLues.map(notification =>
        this.marquerCommeLue(notification.idNotification)
      )
    );
  }
}
