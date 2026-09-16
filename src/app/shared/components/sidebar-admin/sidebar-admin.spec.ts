import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarAdmin } from './sidebar-admin';

describe('SidebarAdmin', () => {
  let component: SidebarAdmin;
  let fixture: ComponentFixture<SidebarAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
