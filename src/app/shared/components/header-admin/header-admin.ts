import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-header-admin',
  styleUrl: './header-admin.css',
  templateUrl: './header-admin.html',
})
export class HeaderAdmin {

  // Cette méthode pourra être reliée plus tard
  // au système de notifications administrateur.
  ouvrirNotifications(): void {
    console.log('Ouverture des notifications administrateur');
  }
}
