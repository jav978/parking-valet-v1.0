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
    <div class="layout-topbar backdrop-blur-md bg-surface-0/80 dark:bg-surface-900/80 border-b border-surface-200/80 dark:border-surface-800/80 transition-colors">
      <div class="layout-topbar-logo-container">
        <button class="layout-menu-button layout-topbar-action hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all" (click)="layoutService.onMenuToggle()">
          <i class="pi pi-bars"></i>
        </button>
      </div>

      <div class="layout-topbar-actions flex items-center gap-3">
        <!-- Live System Status indicator -->
        <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <span class="pulse-dot pulse-dot-green"></span>
          <span>Sistema Activo</span>
        </div>

        <button 
          type="button" 
          class="layout-topbar-action hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all text-surface-600 dark:text-surface-300" 
          (click)="toggleDarkMode()"
          [title]="layoutService.isDarkTheme() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <i [ngClass]="{ 'pi': true, 'pi-sun text-amber-400': layoutService.isDarkTheme(), 'pi-moon text-indigo-400': !layoutService.isDarkTheme() }" class="transition-transform hover:rotate-12"></i>
        </button>

        <div class="layout-topbar-menu hidden lg:block">
          <div class="layout-topbar-menu-content flex items-center gap-3">
            <span class="user-info flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200/60 dark:border-surface-700/60">
              <div class="w-7 h-7 rounded-lg bg-primary-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {{ userInitials }}
              </div>
              <div class="flex flex-col text-left">
                <span class="user-name text-xs font-bold text-surface-900 dark:text-surface-0 leading-tight">{{ displayName }}</span>
                <span class="user-role-badge text-[10px] font-semibold tracking-wider uppercase text-primary-600 dark:text-primary-400">{{ userRole }}</span>
              </div>
            </span>
            <button type="button" class="layout-topbar-action hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all" (click)="logout()" title="Cerrar sesión">
              <i class="pi pi-sign-out"></i>
              <span class="font-medium text-xs">Cerrar sesión</span>
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

  get userInitials(): string {
    const u = this.user();
    if (!u) return 'P';
    const f = u.firstName ? u.firstName.charAt(0).toUpperCase() : '';
    const l = u.lastName ? u.lastName.charAt(0).toUpperCase() : '';
    return `${f}${l}` || 'P';
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
