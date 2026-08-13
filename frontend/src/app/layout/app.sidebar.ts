import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AppMenu } from './app.menu';
import { LayoutService } from './layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, AppMenu, RouterModule],
  template: `
    <div class="layout-sidebar flex flex-col justify-between h-full">
      <div>
        <!-- Sidebar Logo Header -->
        <div class="sidebar-header flex items-center gap-3 px-6 h-16 border-b border-surface-200 dark:border-surface-800">
          <a class="flex items-center gap-3 text-lg font-bold text-surface-800 dark:text-surface-100" routerLink="/">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-500/10 border border-primary-500/20">
              <i class="pi pi-car text-xl text-primary-500"></i>
            </div>
            <span class="tracking-wide">Parking System</span>
          </a>
        </div>
        <!-- Sidebar Menu -->
        <div class="py-4">
          <app-menu></app-menu>
        </div>
      </div>

      <!-- Sidebar Footer (System Version & Developer Credits) -->
      <div class="p-4 mt-auto border-t border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 text-xs">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1.5 font-bold text-surface-900 dark:text-surface-100">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Parking System</span>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
            v1.1.0
          </span>
        </div>

        <div class="flex items-center justify-between text-[11px] text-surface-500 dark:text-surface-400 mb-2">
          <span>Hash Compilación:</span>
          <span class="font-mono text-surface-700 dark:text-surface-300 font-bold">#7639a0c</span>
        </div>

        <div class="pt-2 border-t border-surface-200/80 dark:border-surface-700/60 text-[11px] text-center">
          <p class="text-surface-600 dark:text-surface-400 font-medium">
            Desarrollado por <strong class="text-surface-900 dark:text-surface-100 font-bold">José Vásquez</strong>
          </p>
          <div class="flex items-center justify-center mt-1 text-[10px] text-surface-500 dark:text-surface-400">
            <a href="mailto:jvasquez978@gmail.com" class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1 font-mono">
              <i class="pi pi-envelope text-[10px]"></i>
              <span>jvasquez978&#64;gmail.com</span>
            </a>
          </div>
          <p class="text-[9.5px] text-surface-400 dark:text-surface-500 mt-1.5 text-center">
            © 2026 Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  `
})
export class AppSidebar implements OnInit, OnDestroy {
  layoutService = inject(LayoutService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.layoutService.hideMenu());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
