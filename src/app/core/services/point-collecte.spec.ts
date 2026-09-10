import { TestBed } from '@angular/core/testing';
import { PointCollecte } from './point-collecte';

describe('PointCollecte', () => {
  let service: PointCollecte;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PointCollecte);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
