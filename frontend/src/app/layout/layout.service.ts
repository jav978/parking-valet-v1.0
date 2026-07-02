import { Injectable, signal, computed, effect } from '@angular/core';

export interface LayoutConfig {
  darkTheme: boolean;
  menuMode: 'static' | 'overlay';
}

interface LayoutState {
  staticMenuDesktopInactive: boolean;
  overlayMenuActive: boolean;
  mobileMenuActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  layoutConfig = signal<LayoutConfig>({
    darkTheme: false,
    menuMode: 'static'
  });

  layoutState = signal<LayoutState>({
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    mobileMenuActive: false
  });

  isDarkTheme = computed(() => this.layoutConfig().darkTheme);
  isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');
  isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

  private initialized = false;

  constructor() {
    effect(() => {
      const config = this.layoutConfig();
      if (!this.initialized) {
        this.initialized = true;
        return;
      }
      this.toggleDarkMode(config);
    });
  }

  onMenuToggle(): void {
    if (this.isOverlay()) {
      this.layoutState.update(prev => ({ ...prev, overlayMenuActive: !prev.overlayMenuActive }));
    }
    if (this.isDesktop()) {
      this.layoutState.update(prev => ({ ...prev, staticMenuDesktopInactive: !prev.staticMenuDesktopInactive }));
    } else {
      this.layoutState.update(prev => ({ ...prev, mobileMenuActive: !prev.mobileMenuActive }));
    }
  }

  hideMenu(): void {
    this.layoutState.update(prev => ({
      ...prev,
      overlayMenuActive: false,
      mobileMenuActive: false
    }));
  }

  toggleDarkMode(config?: LayoutConfig): void {
    const cfg = config || this.layoutConfig();
    document.documentElement.classList.toggle('app-dark', cfg.darkTheme);
  }

  isDesktop(): boolean {
    return window.innerWidth > 991;
  }

  isMobile(): boolean {
    return !this.isDesktop();
  }
}
