import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-header-admin',
  styleUrl: './header-admin.css',
  templateUrl: './header-admin.html',
})
export class HeaderAdmin {
  private readonly router = inject(Router);

  ouvrirNotifications(): void {
    this.router.navigate(['/admin/notifications']);
  }
}
