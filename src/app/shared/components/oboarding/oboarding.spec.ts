import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Oboarding } from './oboarding';

describe('Oboarding', () => {
  let component: Oboarding;
  let fixture: ComponentFixture<Oboarding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Oboarding],
    }).compileComponents();

    fixture = TestBed.createComponent(Oboarding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
