import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { PointCollecteService } from './point-collecte';

describe('PointCollecteService', () => {
  let service: PointCollecteService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(PointCollecteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
