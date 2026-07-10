import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LayoutService } from './layout.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="layout-topbar">
      <div class="layout-topbar-logo-container">
        <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
          <i class="pi pi-bars"></i>
        </button>
      </div>

      <div class="layout-topbar-actions">
        <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
          <i [ngClass]="{ 'pi': true, 'pi-sun': layoutService.isDarkTheme(), 'pi-moon': !layoutService.isDarkTheme() }"></i>
        </button>

        <div class="layout-topbar-menu hidden lg:block">
          <div class="layout-topbar-menu-content">
            <span class="user-info">
              <span class="user-name">{{ displayName }}</span>
              <span class="user-role-badge">{{ userRole }}</span>
            </span>
            <button type="button" class="layout-topbar-action" (click)="logout()">
              <i class="pi pi-sign-out"></i>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        <button class="layout-topbar-menu-button layout-topbar-action lg:hidden" (click)="menuOpen = !menuOpen">
          <i class="pi pi-ellipsis-v"></i>
        </button>
      </div>
    </div>
  `
})
export class AppTopbar {
  layoutService = inject(LayoutService);
  private authService = inject(AuthService);
  private router = inject(Router);
  user = this.authService.user;
  menuOpen = false;

  get displayName(): string {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  }

  get userRole(): string {
    return this.user()?.role ?? '';
  }

  toggleDarkMode(): void {
    this.layoutService.toggleDarkMode();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}
