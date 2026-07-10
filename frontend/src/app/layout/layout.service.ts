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
    darkTheme: this.resolveInitialTheme(),
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

  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    this.applyTheme(this.layoutConfig().darkTheme);
    this.listenSystemPreference();

    effect(() => {
      const config = this.layoutConfig();
      this.applyTheme(config.darkTheme);
    });
  }

  private resolveInitialTheme(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme-override');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private listenSystemPreference(): void {
    if (typeof window === 'undefined') return;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', (e) => {
      const override = localStorage.getItem('theme-override');
      if (override) return;
      this.layoutConfig.update(prev => ({ ...prev, darkTheme: e.matches }));
    });
  }

  private applyTheme(dark: boolean): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('p-dark', dark);
    }
  }

  toggleDarkMode(): void {
    const next = !this.layoutConfig().darkTheme;
    localStorage.setItem('theme-override', next ? 'dark' : 'light');
    this.layoutConfig.update(prev => ({ ...prev, darkTheme: next }));
  }

  resetToSystemPreference(): void {
    localStorage.removeItem('theme-override');
    if (this.mediaQuery) {
      this.layoutConfig.update(prev => ({ ...prev, darkTheme: this.mediaQuery!.matches }));
    }
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

  isDesktop(): boolean {
    return window.innerWidth > 991;
  }

  isMobile(): boolean {
    return !this.isDesktop();
  }
}
