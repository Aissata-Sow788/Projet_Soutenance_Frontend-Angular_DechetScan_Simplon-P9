import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar-admin',
  styleUrl: './sidebar-admin.css',
  templateUrl: './sidebar-admin.html',
})
export class SidebarAdmin {}
