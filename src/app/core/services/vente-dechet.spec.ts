import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { VenteDechetService } from './vente-dechet';

describe('VenteDechetService', () => {
  let service: VenteDechetService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VenteDechetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('convertit les décimaux Django en nombres avant de les retourner', () => {
    let prixNormalise: number | undefined;

    service.listerVentes().subscribe(ventes => {
      prixNormalise = ventes.reduce((total, vente) => total + vente.prixPaye, 0);
    });

    // Django renvoie les champs Decimal comme chaînes JSON.
    httpMock.expectOne('/api/ventes/').flush([
      {
        idVente: 1,
        idUtilisateur: 1,
        emailUtilisateur: 'citoyen@example.com',
        prenomUtilisateur: 'Awa',
        nomUtilisateur: 'Ndiaye',
        idCollecteur: 1,
        nomCollecteur: 'Collecteur',
        idTypeDechet: null,
        typeDechet: null,
        quantite: '2.000',
        poidsTotalKg: '2.000',
        nombreObjets: null,
        details: [
          {
            idDetail: 1,
            idPanier: 1,
            idTypeDechet: 1,
            typeDechet: { idTypeDechet: 1, nom: 'Métal', description: '' },
            nombreObjets: null,
            poidsKg: '2.000',
            quantite: '2.000',
            prixParKg: '500.00',
            sousTotal: '1000.00',
          },
        ],
        prixPaye: '1000.00',
        methodePaiement: 'Wave',
        statutPaiement: 'paye',
        referencePaiement: '',
        dateVente: '2026-10-01T17:58:38.362485Z',
      },
      {
        idVente: 2,
        idUtilisateur: 1,
        emailUtilisateur: 'citoyen@example.com',
        prenomUtilisateur: 'Awa',
        nomUtilisateur: 'Ndiaye',
        idCollecteur: 1,
        nomCollecteur: 'Collecteur',
        idTypeDechet: null,
        typeDechet: null,
        quantite: '1.000',
        poidsTotalKg: '1.000',
        nombreObjets: null,
        details: [],
        prixPaye: '500.00',
        methodePaiement: 'Wave',
        statutPaiement: 'en_attente',
        referencePaiement: '',
        dateVente: '2026-10-01T17:58:38.362485Z',
      },
    ]);

    expect(prixNormalise).toBe(1500);
  });
});
