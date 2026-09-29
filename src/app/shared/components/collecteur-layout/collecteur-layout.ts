import { Component } from '@angular/core';
import { SidebarCollecteur } from '../sidebar-collecteur/sidebar-collecteur';
import { HeaderCollecteur } from '../header-collecteur/header-collecteur';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [SidebarCollecteur, HeaderCollecteur, RouterOutlet],
  selector: 'app-collecteur-layout',
  styleUrl: './collecteur-layout.css',
  templateUrl: './collecteur-layout.html',
})
export class CollecteurLayout {}
