import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarreNavigations } from './barre-navigations';

describe('BarreNavigations', () => {
  let component: BarreNavigations;
  let fixture: ComponentFixture<BarreNavigations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarreNavigations],
    }).compileComponents();

    fixture = TestBed.createComponent(BarreNavigations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
