import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TousScans } from './tous-scans';

describe('TousScans', () => {
  let component: TousScans;
  let fixture: ComponentFixture<TousScans>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TousScans],
    }).compileComponents();

    fixture = TestBed.createComponent(TousScans);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
