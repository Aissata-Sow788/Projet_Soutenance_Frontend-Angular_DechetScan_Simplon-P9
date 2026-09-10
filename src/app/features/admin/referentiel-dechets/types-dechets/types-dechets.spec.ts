import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypesDechets } from './types-dechets';

describe('TypesDechets', () => {
  let component: TypesDechets;
  let fixture: ComponentFixture<TypesDechets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypesDechets]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TypesDechets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
