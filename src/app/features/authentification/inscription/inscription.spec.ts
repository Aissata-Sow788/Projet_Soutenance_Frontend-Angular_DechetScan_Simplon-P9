import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { formaterErreurInscription, Inscription } from './inscription';

describe('Inscription', () => {
  let component: Inscription;
  let fixture: ComponentFixture<Inscription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inscription],
      providers: [
        provideHttpClient(),
        provideRouter([]),
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Inscription);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('explains duplicate email and phone validation errors', () => {
    const erreur = new HttpErrorResponse({
      status: 400,
      error: {
        email: ['utilisateur with this email already exists.'],
        telephone: ['utilisateur with this telephone already exists.'],
      },
    });

    expect(formaterErreurInscription(erreur)).toBe(
      'Cette adresse e-mail est déjà utilisée. Ce numéro de téléphone est déjà associé à un compte.',
    );
  });

  it('explains gateway timeouts without exposing an opaque HTTP error', () => {
    const erreur = new HttpErrorResponse({ status: 504 });

    expect(formaterErreurInscription(erreur)).toContain(
      'Le serveur a mis trop de temps à répondre.',
    );
  });
});
