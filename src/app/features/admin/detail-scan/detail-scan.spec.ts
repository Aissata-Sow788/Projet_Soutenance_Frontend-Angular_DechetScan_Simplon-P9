import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailScan } from './detail-scan';

describe('DetailScan', () => {
  let component: DetailScan;
  let fixture: ComponentFixture<DetailScan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailScan],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailScan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
