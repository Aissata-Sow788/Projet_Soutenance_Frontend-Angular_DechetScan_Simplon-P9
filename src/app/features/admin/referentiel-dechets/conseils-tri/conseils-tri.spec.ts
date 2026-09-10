import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConseilsTri } from './conseils-tri';

describe('ConseilsTri', () => {
  let component: ConseilsTri;
  let fixture: ComponentFixture<ConseilsTri>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConseilsTri]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ConseilsTri);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
