import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors  } from '@angular/common/http';
// Importe notre interceptor JWT.
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

const shouldEnableServiceWorker =
  !isDevMode() || ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
          withInterceptors([
        authInterceptor
      ])
    ),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // Le service worker est nécessaire pour les notifications push.
    // On l'active aussi en local sur localhost pour tester le flux sans HTTPS.
    provideServiceWorker('ngsw-worker.js', {
      enabled: shouldEnableServiceWorker,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ]
};
