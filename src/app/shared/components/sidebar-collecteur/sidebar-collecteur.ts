import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar-collecteur',
  styleUrl: './sidebar-collecteur.css',
  templateUrl: './sidebar-collecteur.html',
})
export class SidebarCollecteur {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Informations affichées dans le profil administrateur.
  interfaceProfil = {
    nom: '',
    prenom: '',
    email: '',
    username: ''
  };

  // Charge automatiquement le compte à l'ouverture de la sidebar.
  ngOnInit(): void {
    this.chargerProfilConnecte();
  }

  // Lit les informations enregistrées après la connexion.
  chargerProfilConnecte(): void {
    try {
      const donnees = localStorage.getItem('dechetscan_user');

      if (!donnees) {
        console.warn(
          'Aucun utilisateur trouvé dans localStorage : dechetscan_user'
        );
        return;
      }

      const resultat: unknown = JSON.parse(donnees);

      // Vérifie que les données récupérées sont un objet.
      if (
        resultat === null ||
        typeof resultat !== 'object' ||
        Array.isArray(resultat)
      ) {
        console.error('Les données utilisateur sont invalides.');
        return;
      }

      const donneesUtilisateur = resultat as Record<string, unknown>;

      // Certains services stockent les informations sous "user".
      const utilisateur =
        donneesUtilisateur['user'] &&
        typeof donneesUtilisateur['user'] === 'object'
          ? donneesUtilisateur['user'] as Record<string, unknown>
          : donneesUtilisateur;

      // Accepte les noms de champs courants du frontend et de Django.
      this.interfaceProfil = {
        nom: this.lireTexte(
          utilisateur['nom'] ?? utilisateur['last_name'] ?? utilisateur['nomUtilisateur']
        ),
        prenom: this.lireTexte(
          utilisateur['prenom'] ?? utilisateur['first_name']
        ),
        email: this.lireTexte(utilisateur['email']),
        username: this.lireTexte(
          utilisateur['username'] ?? utilisateur['identifiant']
        )
      };

      // À vérifier dans la console si les informations restent vides.
      console.log('Profil chargé :', this.interfaceProfil);

    } catch (erreur) {
      console.error(
        'Erreur lors du chargement du profil administrateur :',
        erreur
      );
    }
  }

  // Évite d'afficher des valeurs qui ne sont pas des chaînes de caractères.
  private lireTexte(valeur: unknown): string {
    return typeof valeur === 'string' ? valeur.trim() : '';
  }

  // Construit le nom complet à afficher.
  get nomCompletAdmin(): string {
    const nomComplet = [
      this.interfaceProfil.prenom,
      this.interfaceProfil.nom
    ].filter(Boolean).join(' ');

    return nomComplet ||
      this.interfaceProfil.username ||
      this.interfaceProfil.email ||
      'Administrateur';
  }

  // Génère les initiales du compte connecté.
  get initialesAdmin(): string {
    return this.nomCompletAdmin
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(partie => partie.charAt(0))
      .join('')
      .toUpperCase();
  }
  // Déconnecte le collecteur et redirige vers la page de connexion.
  deconnecter(): void {
    this.auth.logout();
    this.router.navigate(['/connexion-collecteur']);
  }
}
