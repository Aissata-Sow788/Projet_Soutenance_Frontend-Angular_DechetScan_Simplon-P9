import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors  } from '@angular/common/http';
// Importe notre interceptor JWT.
import { authInterceptor } from './core/interceptors/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
          withInterceptors([
        authInterceptor
      ])
    ),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ]
};
