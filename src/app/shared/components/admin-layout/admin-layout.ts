import { Component } from '@angular/core';
import { SidebarAdmin } from '../sidebar-admin/sidebar-admin';
import { HeaderAdmin } from '../header-admin/header-admin';
import { RouterOutlet } from '@angular/router';


@Component({
  imports: [SidebarAdmin, HeaderAdmin, RouterOutlet],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.css',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {


}
