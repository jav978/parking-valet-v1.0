import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <ul class="layout-menu">
      @for (item of model; track item.label) {
        @if (item.separator) {
          <li class="menu-separator"></li>
        } @else {
          <li>
            <div class="menu-category">{{ item.label }}</div>
            <ul>
              @for (child of item.items; track child.label) {
                @if (child.items) {
                  <li>
                    <a (click)="toggleSubmenu($event, child)" class="menu-item" [class.active]="isActive(child)">
                      <i [class]="child.icon || 'pi pi-fw pi-circle'"></i>
                      <span>{{ child.label }}</span>
                      <i class="pi pi-chevron-down submenu-chevron" [class.rotated]="expandedMenus.has(child)"></i>
                    </a>
                    @if (expandedMenus.has(child)) {
                      <ul class="submenu">
                        @for (sub of child.items; track sub.label) {
                          <li>
                            <a [routerLink]="sub.routerLink" [queryParams]="sub.queryParams" class="menu-item" [class.active]="isActive(sub)">
                              <i [class]="sub.icon || 'pi pi-fw pi-circle'"></i>
                              <span>{{ sub.label }}</span>
                            </a>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                } @else {
                  <li>
                    <a [routerLink]="child.routerLink" [queryParams]="child.queryParams" class="menu-item" [class.active]="isActive(child)">
                      <i [class]="child.icon || 'pi pi-fw pi-circle'"></i>
                      <span>{{ child.label }}</span>
                    </a>
                  </li>
                }
              }
            </ul>
          </li>
        }
      }
    </ul>
  `
})
export class AppMenu {
  private authService = inject(AuthService);
  private router = inject(Router);
  user = this.authService.user;
  expandedMenus = new Set<MenuItem>();
  currentPath = '';

  constructor() {
    this.router.events.subscribe((event: any) => {
      if (event && 'url' in event) {
        this.currentPath = event.url as string;
      }
    });

    effect(() => {
      // Reconstruir el menú cada vez que el usuario cambia (señal reactiva)
      this.buildMenu();
    });
  }

  model: any[] = [];

  ngOnInit(): void {
    this.buildMenu();
  }

  private buildMenu(): void {
    const user = this.authService.user();

    const hasPerm = (perm: string) => {
      if (!user) return false;
      const role = typeof user.role === 'string'
        ? user.role.toUpperCase()
        : (user.role as any)?.name?.toUpperCase() || '';

      if (role === 'ADMIN' || role === 'SUPERADMIN') return true;

      return Array.isArray(user.permissions) && user.permissions.includes(perm);
    };

    const categories = [
      {
        label: 'PRINCIPAL',
        items: [
          ...(hasPerm('dashboard.view') ? [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }] : [])
        ]
      },
      {
        label: 'OPERACIONES',
        items: [
          ...(hasPerm('tickets.list') ? [{ label: 'Tickets', icon: 'pi pi-fw pi-ticket', routerLink: ['/tickets'] }] : []),
          ...(hasPerm('clients.list') ? [{ label: 'Clientes', icon: 'pi pi-fw pi-users', routerLink: ['/clientes'] }] : []),
          ...(hasPerm('vehicles.list') ? [{ label: 'Vehículos', icon: 'pi pi-fw pi-truck', routerLink: ['/vehiculos'] }] : []),
          ...(hasPerm('parking-lots.list') ? [{ label: 'Estacionamiento', icon: 'pi pi-fw pi-building', routerLink: ['/estacionamiento'] }] : []),
          ...(hasPerm('rates.list') ? [{ label: 'Tarifas', icon: 'pi pi-fw pi-dollar', routerLink: ['/tarifas'] }] : []),
          ...(hasPerm('cash-registers.list') ? [{ label: 'Caja', icon: 'pi pi-fw pi-credit-card', routerLink: ['/caja'] }] : []),
        ]
      },
      {
        label: 'REPORTES',
        items: [
          ...(hasPerm('reports.revenue') ? [{ label: 'Reportes', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/reportes'] }] : []),
        ]
      },
      {
        label: 'ADMINISTRACIÓN',
        items: [
          ...(hasPerm('users.list') ? [{ label: 'Usuarios', icon: 'pi pi-fw pi-users', routerLink: ['/usuarios'] }] : []),
          ...(hasPerm('roles.list') ? [{ label: 'Roles', icon: 'pi pi-fw pi-shield', routerLink: ['/roles'] }] : []),
          ...(hasPerm('settings.list') ? [{ label: 'Configuración', icon: 'pi pi-fw pi-wrench', routerLink: ['/configuracion'] }] : []),
          ...(hasPerm('settings.list') ? [{ label: 'Licencia & Suscripción', icon: 'pi pi-fw pi-key', routerLink: ['/configuracion'], queryParams: { tab: 'licencia' } }] : []),
        ]
      },
      {
        label: 'INFORMACIÓN',
        items: [
          { label: 'Normativa y Términos', icon: 'pi pi-fw pi-book', routerLink: ['/normativa'] }
        ]
      }
    ];

    // Solo mostrar categorías que contengan al menos un elemento visible
    this.model = categories.filter(cat => cat.items && cat.items.length > 0);
  }

  isActive(item: any): boolean {
    if (item.routerLink) {
      return this.currentPath.startsWith(item.routerLink[0]);
    }
    return false;
  }

  toggleSubmenu(event: Event, item: MenuItem): void {
    event.preventDefault();
    if (this.expandedMenus.has(item)) {
      this.expandedMenus.delete(item);
    } else {
      this.expandedMenus.add(item);
    }
  }
}
