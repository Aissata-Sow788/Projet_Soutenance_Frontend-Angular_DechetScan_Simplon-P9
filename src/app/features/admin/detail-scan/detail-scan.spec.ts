import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { DetailScan } from './detail-scan';
import { ScanService } from '../../../core/services/scan';

describe('DetailScan', () => {
  let component: DetailScan;
  let fixture: ComponentFixture<DetailScan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailScan],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ScanService,
          useValue: {
            detailAdmin: () => of({
              idScan: 1,
              dateScan: '2026-10-09T12:00:00Z',
              photoUrl: '/media/test.jpg',
              idUtilisateur: null,
              citoyen: null,
              analyseIA: { idAnalyse: 1, dateAnalyse: '', detections: [] },
              nombreScans: 1,
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailScan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
