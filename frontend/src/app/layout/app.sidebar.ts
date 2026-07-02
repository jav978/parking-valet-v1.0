import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { AppMenu } from './app.menu';
import { LayoutService } from './layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, AppMenu],
  template: `
    <div class="layout-sidebar">
      <app-menu></app-menu>
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
