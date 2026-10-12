import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { of } from 'rxjs';
import { Notifications } from './notifications';
import { NotificationsService } from '../../core/services/notification';

describe('Notifications', () => {
  let component: Notifications;
  let fixture: ComponentFixture<Notifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            getNotifications: () => of([]),
            getPushConfig: () => of({ enabled: false, publicKey: null }),
            marquerToutesCommeLues: () => of([]),
          },
        },
        {
          provide: SwPush,
          useValue: {
            isEnabled: false,
            subscription: of(null),
            requestSubscription: vi.fn(),
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
