import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Resultat } from './resultat';

describe('Resultat', () => {
  let component: Resultat;
  let fixture: ComponentFixture<Resultat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Resultat]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Resultat);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
