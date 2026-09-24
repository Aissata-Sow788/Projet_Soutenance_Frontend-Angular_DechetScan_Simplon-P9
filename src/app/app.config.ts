import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors  } from '@angular/common/http';
// Importe notre interceptor JWT.
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
          withInterceptors([
        authInterceptor
      ])
    ),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

        // Service worker : actif seulement en production, s'enregistre
    // une fois l'app stable pour ne pas ralentir le premier chargement
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ]
};
