import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AjouterReferentiel } from './ajouter-referentiel';

describe('AjouterReferentiel', () => {
  let component: AjouterReferentiel;
  let fixture: ComponentFixture<AjouterReferentiel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjouterReferentiel],
    }).compileComponents();

    fixture = TestBed.createComponent(AjouterReferentiel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
