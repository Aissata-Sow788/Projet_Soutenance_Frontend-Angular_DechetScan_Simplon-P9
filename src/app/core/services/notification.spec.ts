import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { NotificationsService } from './notification';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(NotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
