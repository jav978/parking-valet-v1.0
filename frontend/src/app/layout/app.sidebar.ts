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
    <div class="layout-sidebar">
      <!-- Sidebar Logo Header -->
      <div class="sidebar-header flex items-center gap-3 px-6 h-16 border-b border-surface-200">
        <a class="flex items-center gap-3 text-lg font-bold text-surface-800" routerLink="/">
          <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <i class="pi pi-car text-xl text-emerald-500"></i>
          </div>
          <span class="tracking-wide">Parking System</span>
        </a>
      </div>
      <!-- Sidebar Menu -->
      <div class="py-4">
        <app-menu></app-menu>
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
