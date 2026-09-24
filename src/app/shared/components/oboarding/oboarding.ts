import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

// Structure d'une slide d'onboarding
interface OnboardingSlide {
  title: string;
  description: string;
  icon: 'planet' | 'scan' | 'sort';
}

@Component({
  imports: [],
  selector: 'app-oboarding',
  styleUrl: './oboarding.css',
  templateUrl: './oboarding.html',
})
export class Oboarding implements OnInit, OnDestroy {

  private readonly router = inject(Router);

  // 0 = Splash logo
  // 1 = Slide scanner
  // 2 = Slide planète
  // 3 = Slide tri
  slideActif = signal(0);

  // Timer du Splash
  private timerSplash?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {

    // Vérifie si l'utilisateur a déjà terminé l'onboarding
    const onboardingTermine =
      localStorage.getItem('dechetscan_onboarding_done');

    this.timerSplash = setTimeout(() => {

      // ==========================================
      // ONBOARDING DÉJÀ VU
      // ==========================================

      if (onboardingTermine === 'true') {

        const utilisateurBrut =
          localStorage.getItem('dechetscan_user');

        // Utilisateur connecté
        if (utilisateurBrut) {

          try {

            const utilisateur = JSON.parse(utilisateurBrut);

            // Admin
            if (utilisateur.role === 'admin') {
              this.router.navigate(['/admin']);
              return;
            }

            // Citoyen connecté
            this.router.navigate(['/home-citoyen']);
            return;

          } catch {

            // Données utilisateur incorrectes
            localStorage.removeItem('dechetscan_user');
          }
        }

        // Citoyen non connecté
        this.router.navigate(['/accueil']);

        return;
      }

      // ==========================================
      // PREMIÈRE OUVERTURE
      // ==========================================

      // On passe au premier slide d'onboarding
      this.slideActif.set(1);

    }, 1800);
  }

  ngOnDestroy(): void {

    if (this.timerSplash) {
      clearTimeout(this.timerSplash);
    }
  }

  suivant(): void {

    const slide = this.slideActif();

    // Passer au slide suivant
    if (slide < 3) {
      this.slideActif.set(slide + 1);
      return;
    }

    // ==========================================
    // FIN DE L'ONBOARDING
    // ==========================================

    // On mémorise que l'utilisateur a déjà vu
    // l'onboarding.
    localStorage.setItem(
      'dechetscan_onboarding_done',
      'true'
    );

    // Aller vers l'accueil
    this.router.navigate(['/accueil']);
  }

  allerAuSlide(index: number): void {
    this.slideActif.set(index);
  }
}

