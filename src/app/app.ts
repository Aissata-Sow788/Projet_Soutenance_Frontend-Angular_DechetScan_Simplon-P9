import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Projet_DechetScan');
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  constructor() {
    if (!this.swUpdate?.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        void this.swUpdate?.activateUpdate()
          .then(() => window.location.reload())
          .catch((error: unknown) => {
            console.error('Impossible d’activer la mise à jour de DechetScan :', error);
          });
      }
    });

    void this.swUpdate.checkForUpdate().catch((error: unknown) => {
      console.error('Impossible de vérifier les mises à jour de DechetScan :', error);
    });
  }
}
