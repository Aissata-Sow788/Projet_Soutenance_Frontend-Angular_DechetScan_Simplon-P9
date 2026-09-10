import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PointsCollecte } from './points-collecte';

describe('PointsCollecte', () => {
  let component: PointsCollecte;
  let fixture: ComponentFixture<PointsCollecte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointsCollecte]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PointsCollecte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
