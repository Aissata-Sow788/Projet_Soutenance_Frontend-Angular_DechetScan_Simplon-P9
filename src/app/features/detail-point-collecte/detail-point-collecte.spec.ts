import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailPointCollecte } from './detail-point-collecte';

describe('DetailPointCollecte', () => {
  let component: DetailPointCollecte;
  let fixture: ComponentFixture<DetailPointCollecte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailPointCollecte],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailPointCollecte);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
