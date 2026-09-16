import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnexionAdmin } from './connexion-admin';

describe('ConnexionAdmin', () => {
  let component: ConnexionAdmin;
  let fixture: ComponentFixture<ConnexionAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnexionAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnexionAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
