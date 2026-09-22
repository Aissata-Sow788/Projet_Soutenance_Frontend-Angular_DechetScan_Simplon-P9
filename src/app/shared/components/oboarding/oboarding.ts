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

  // Écran actuellement affiché.
  slideActif = signal(0);

  // Timer utilisé uniquement pour le splash.
  private timerSplash?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Le splash reste affiché quelques instants avant le premier écran.
    this.timerSplash = setTimeout(() => {
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

    if (slide < 3) {
      this.slideActif.set(slide + 1);
      return;
    }

    // Dernier écran : on continue vers l'inscription.
    this.router.navigate(['/accueil']);
  }

  allerAuSlide(index: number): void {
    this.slideActif.set(index);
  }

}
