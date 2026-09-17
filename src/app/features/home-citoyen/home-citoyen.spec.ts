import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeCitoyen } from './home-citoyen';

describe('HomeCitoyen', () => {
  let component: HomeCitoyen;
  let fixture: ComponentFixture<HomeCitoyen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeCitoyen],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeCitoyen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
