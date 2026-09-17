import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

//Observable pour gérer la réponse asynchrone de l'API.
import { Observable } from 'rxjs';
// Utilise le modèle Utilisateur centralisé du projet.
import { Utilisateur } from '../../shared/models/utilisateur.model';



@Injectable({
  // Rend automatiquement le service disponible dans toute l'application.
  providedIn: 'root'
})
export class UtilisateursService {

  // URL de base de l'API utilisateurs Django.
  private apiUrl = 'http://127.0.0.1:8000/api/auth';

  // Injecte HttpClient dans le service.
  private readonly httpurl = inject(HttpClient)


  // Récupère la liste des utilisateurs depuis Django.
  getUtilisateurs(): Observable<Utilisateur[]> {
    return this.httpurl.get<Utilisateur[]>(
      `${this.apiUrl}/utilisateurs/`
    );
  }
}
