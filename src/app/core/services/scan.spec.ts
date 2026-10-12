import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ScanService } from './scan';

describe('ScanService', () => {
  let service: ScanService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(ScanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
