import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AjouterPointCollecte } from './ajouter-point-collecte';

describe('AjouterPointCollecte', () => {
  let component: AjouterPointCollecte;
  let fixture: ComponentFixture<AjouterPointCollecte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjouterPointCollecte],
    }).compileComponents();

    fixture = TestBed.createComponent(AjouterPointCollecte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
