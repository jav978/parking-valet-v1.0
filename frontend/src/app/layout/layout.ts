import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { LayoutService } from './layout.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AppTopbar, AppSidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout {
  layoutService = inject(LayoutService);

  containerClass = computed(() => {
    const config = this.layoutService.layoutConfig();
    const state = this.layoutService.layoutState();
    return {
      'layout-overlay': config.menuMode === 'overlay',
      'layout-static': config.menuMode === 'static',
      'layout-static-inactive': state.staticMenuDesktopInactive && config.menuMode === 'static',
      'layout-overlay-active': state.overlayMenuActive,
      'layout-mobile-active': state.mobileMenuActive
    };
  });

  constructor() {
    effect(() => {
      if (this.layoutService.layoutState().mobileMenuActive) {
        document.body.classList.add('blocked-scroll');
      } else {
        document.body.classList.remove('blocked-scroll');
      }
    });
  }
}
