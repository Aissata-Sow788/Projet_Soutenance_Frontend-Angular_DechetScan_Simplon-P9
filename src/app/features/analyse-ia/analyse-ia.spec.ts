import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnalyseIA } from './analyse-ia';
import { ScanService } from '../../core/services/scan';
import { Auth } from '../../core/services/auth';
import { ScanDechet } from '../../shared/models/scan.model';

describe('AnalyseIA', () => {
  let component: AnalyseIA;
  let fixture: ComponentFixture<AnalyseIA>;
  const scanService = {
    dernierResultat: signal<ScanDechet | null>(null),
    getPaniers: () => of([]),
    ajouterAuPanier: vi.fn(() => of({
      idPanier: 1,
      idTypeDechet: 1,
      typeDechet: {
        idTypeDechet: 1,
        nom: 'Plastique',
        description: '',
      },
      nombreDisponible: 1,
      unite: 'objet',
      dateMiseAJour: '',
    })),
    getScan: () => of({
      idScan: 1,
      dateScan: '',
      photoUrl: '',
      idUtilisateur: 1,
      citoyen: null,
      analyseIA: {
        idAnalyse: 1,
        dateAnalyse: '',
        detections: [{
          idDetection: 8,
          objet: 'Bouteille',
          confiance: 0.95,
          idTypeDechet: {
            idTypeDechet: 1,
            nom: 'Plastique',
            description: '',
          },
        }, {
          idDetection: 9,
          objet: 'Canette',
          confiance: 0.92,
          idTypeDechet: {
            idTypeDechet: 2,
            nom: 'Métal',
            description: '',
          },
        }],
      },
    }),
  };
  const authService = { isAuthenticated: () => true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyseIA],
      providers: [
        { provide: ScanService, useValue: scanService },
        { provide: Auth, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({ idScan: '1' })) },
        },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyseIA);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('adds one detected object instead of inferring its weight', () => {
    scanService.ajouterAuPanier.mockClear();
    component.ajouterAuPanier(component.detections[0]);
    expect(scanService.ajouterAuPanier).toHaveBeenCalledWith(1, 1);
  });

  it('uses the selected quantity when adding a detected waste item', () => {
    scanService.ajouterAuPanier.mockClear();
    component.modifierQuantite(component.detections[0].idDetection, 2);
    component.ajouterAuPanier(component.detections[0]);

    expect(component.quantiteSelectionnee(component.detections[0].idDetection)).toBe(3);
    expect(scanService.ajouterAuPanier).toHaveBeenCalledWith(1, 3);
  });

  it('stops loading and displays the loaded scan', () => {
    expect(component.chargement()).toBe(false);
    expect(component.detections).toHaveLength(2);
  });

  it('adds all identified detections to the basket without duplicating in-flight additions', () => {
    scanService.ajouterAuPanier.mockClear();
    component.ajouterTousAuPanier();
    component.ajouterTousAuPanier();
    fixture.detectChanges();

    expect(scanService.ajouterAuPanier).toHaveBeenCalledTimes(2);
    expect(scanService.ajouterAuPanier).toHaveBeenNthCalledWith(1, 1, 1);
    expect(scanService.ajouterAuPanier).toHaveBeenNthCalledWith(2, 2, 1);
  });

  it('keeps earlier detections added when adding another detection', () => {
    component.ajouterAuPanier(component.detections[0]);
    component.ajouterAuPanier(component.detections[1]);
    fixture.detectChanges();

    expect(component.detectionsAjoutees()).toEqual(new Set([8, 9]));
  });

  it('shows the confidence score on each detected waste item', () => {
    const confidenceLabels = Array.from(
      fixture.nativeElement.querySelectorAll('.detection-confidence'),
    ) as HTMLElement[];

    expect(confidenceLabels.map((label) => label.textContent?.trim()))
      .toEqual(['IA 95 %', 'IA 92 %']);
  });

  it('hides the add action and refuses to add the API unknown category', () => {
    const detectionNonIdentifiee = {
      idDetection: 10,
      objet: 'Aucun déchet',
      confiance: 1,
      idTypeDechet: {
        idTypeDechet: 20,
        nom: 'Inconnu',
        description: 'Déchet que le système ne peut pas identifier.',
      },
    };
    scanService.dernierResultat.set({
      ...component.resultat()!,
      analyseIA: {
        ...component.resultat()!.analyseIA!,
        detections: [...component.detections, detectionNonIdentifiee],
      },
    });
    scanService.ajouterAuPanier.mockClear();
    fixture.detectChanges();

    const unknownCard = Array.from(
      fixture.nativeElement.querySelectorAll('.detection-card'),
    ).at(-1) as HTMLElement;

    expect(unknownCard.textContent).toContain('Inconnu');
    expect(unknownCard.querySelector('.add-button')).toBeNull();
    expect(unknownCard.textContent).not.toContain('Ajouter au panier');

    component.ajouterAuPanier(detectionNonIdentifiee);
    expect(scanService.ajouterAuPanier).not.toHaveBeenCalled();
  });
});
