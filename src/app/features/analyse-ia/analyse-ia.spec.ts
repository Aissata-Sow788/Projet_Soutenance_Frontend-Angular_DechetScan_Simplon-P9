import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyseIA } from './analyse-ia';

describe('AnalyseIA', () => {
  let component: AnalyseIA;
  let fixture: ComponentFixture<AnalyseIA>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyseIA],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyseIA);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
