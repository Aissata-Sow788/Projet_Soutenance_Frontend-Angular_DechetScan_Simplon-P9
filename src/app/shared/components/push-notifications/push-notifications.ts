import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { NotificationsService } from '../../../core/services/notification';
import type { PushSubscriptionPayload } from '../../../core/services/notification';

@Component({
  selector: 'app-push-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="mb-6 rounded-2xl border border-[#bfeae5] bg-white p-4 shadow-sm sm:p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-sm font-extrabold text-[#142337]">Notifications sur cet appareil</h2>
          @if (abonne()) {
            <p class="mt-1 text-xs text-[#087c78]">Les notifications push sont activées.</p>
          } @else if (permission() === 'denied') {
            <p class="mt-1 text-xs text-slate-500">
              Les notifications sont bloquées. Autorisez-les dans les paramètres du navigateur.
            </p>
          } @else if (!configure()) {
            <p class="mt-1 text-xs text-slate-500">
              {{ erreur() ?? 'Vérification de la configuration des notifications…' }}
            </p>
          } @else {
            <p class="mt-1 text-xs text-slate-500">
              Autorisez DechetScan à vous prévenir des nouvelles demandes et des mises à jour.
            </p>
          }
        </div>
        @if (!abonne() && permission() !== 'denied') {
          <button
            type="button"
            (click)="activer()"
            [disabled]="!configure() || enCours()"
            class="min-h-10 rounded-xl bg-[#0EA5A4] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#087c78] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ enCours() ? 'Activation…' : 'Activer les notifications push' }}
          </button>
        }
      </div>
      @if (erreur() && configure()) {
        <p class="mt-3 text-xs font-semibold text-red-600" role="alert">{{ erreur() }}</p>
      }
      @if (message()) {
        <p class="mt-3 text-xs font-semibold text-[#087c78]" role="status">{{ message() }}</p>
      }
    </section>
  `,
})
export class PushNotifications implements OnInit {
  private readonly swPush = inject(SwPush);
  private readonly notificationsService = inject(NotificationsService);
  private readonly endpointsEnregistres = new Set<string>();

  readonly permission = signal<NotificationPermission>('default');
  readonly configure = signal(false);
  readonly abonne = signal(false);
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  private clePublique: string | null = null;

  ngOnInit(): void {
    this.permission.set(
      typeof Notification === 'undefined' ? 'denied' : Notification.permission,
    );

    if (!this.swPush.isEnabled) {
      this.erreur.set(
        'Les notifications push nécessitent un service worker actif et une connexion sécurisée.',
      );
      return;
    }

    this.notificationsService.getPushConfig().subscribe({
      next: (config) => {
        this.configure.set(config.enabled);
        this.clePublique = config.publicKey;
        if (!config.enabled) {
          this.erreur.set('Les notifications push ne sont pas configurées sur le serveur.');
        }
      },
      error: (error: unknown) => {
        console.error('Erreur lors du chargement de la configuration push :', error);
        this.erreur.set('Impossible de vérifier la configuration des notifications push.');
      },
    });

    this.swPush.subscription.subscribe({
      next: (subscription) => {
        this.abonne.set(Boolean(subscription));
        if (subscription) {
          this.enregistrerAbonnement(subscription.toJSON());
        }
      },
      error: (error: unknown) => {
        console.error('Impossible de lire l’abonnement aux notifications push :', error);
        this.erreur.set('Impossible de vérifier cet abonnement push dans le navigateur.');
      },
    });
  }

  activer(): void {
    if (!this.swPush.isEnabled || !this.clePublique || !this.configure()) {
      this.erreur.set(
        'Les notifications push ne sont pas disponibles dans cette configuration.',
      );
      return;
    }
    if (this.permission() === 'denied') {
      this.erreur.set(
        'Les notifications sont bloquées dans votre navigateur. Autorisez-les dans les paramètres du site.',
      );
      return;
    }

    this.erreur.set(null);
    this.message.set(null);
    this.enCours.set(true);

    this.swPush.requestSubscription({ serverPublicKey: this.clePublique })
      .then((subscription) => {
        this.permission.set(Notification.permission);
        this.abonne.set(true);
        this.enregistrerAbonnement(subscription.toJSON());
      })
      .catch((error: unknown) => {
        console.error('Impossible d’activer les notifications push :', error);
        this.permission.set(
          typeof Notification === 'undefined' ? 'denied' : Notification.permission,
        );
        this.erreur.set(
          this.permission() === 'denied'
            ? 'Vous avez refusé les notifications. Vous pourrez les autoriser dans les paramètres du navigateur.'
            : 'Le navigateur ne peut pas activer les notifications. Vérifiez que le service worker est actif et que le site utilise HTTPS ou localhost.',
        );
        this.enCours.set(false);
      });
  }

  private enregistrerAbonnement(
    donnees: PushSubscriptionJSON,
  ): void {
    const endpoint = donnees.endpoint;
    const p256dh = donnees.keys?.['p256dh'];
    const auth = donnees.keys?.['auth'];

    if (!endpoint || !p256dh || !auth || this.endpointsEnregistres.has(endpoint)) {
      if (!endpoint || !p256dh || !auth) {
        this.erreur.set('Le navigateur n’a pas fourni un abonnement push complet.');
        this.enCours.set(false);
      }
      return;
    }

    const abonnement: PushSubscriptionPayload = { endpoint, p256dh, auth };
    this.notificationsService.enregistrerAbonnementPush(abonnement).subscribe({
      next: () => {
        this.endpointsEnregistres.add(endpoint);
        this.permission.set(Notification.permission);
        this.abonne.set(true);
        this.erreur.set(null);
        this.message.set('Cet appareil recevra désormais les notifications DechetScan.');
        this.enCours.set(false);
      },
      error: (error: unknown) => {
        console.error('Erreur lors de l’enregistrement de l’abonnement push :', error);
        this.erreur.set(
          'Le navigateur a autorisé les notifications, mais l’abonnement n’a pas pu être enregistré.',
        );
        this.enCours.set(false);
      },
    });
  }
}
