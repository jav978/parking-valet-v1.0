import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
                            <a [routerLink]="sub.routerLink" class="menu-item" [class.active]="isActive(sub)">
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
                    <a [routerLink]="child.routerLink" class="menu-item" [class.active]="isActive(child)">
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
  user = this.authService.user;
  expandedMenus = new Set<MenuItem>();
  currentPath = '';

  constructor() {
    import('@angular/router').then(({ Router }) => {
      const router = inject(Router);
      router.events.subscribe((event: any) => {
        if (event.url) {
          this.currentPath = event.url;
        }
      });
    });
  }

  model: any[] = [];

  ngOnInit(): void {
    this.buildMenu();
  }

  private buildMenu(): void {
    const user = this.authService.user();
    const hasPerm = (perm: string) => user?.permissions?.includes(perm) ?? false;

    this.model = [
      {
        label: 'PRINCIPAL',
        items: [
          { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }
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
        ]
      }
    ];
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
