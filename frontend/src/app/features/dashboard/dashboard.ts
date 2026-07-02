import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="flex flex-column gap-4">
      <div class="flex align-items-center justify-content-between">
        <h1 class="text-2xl font-bold text-surface-800">Dashboard</h1>
        <span class="text-sm text-surface-400">Resumen del día</span>
      </div>

      <div class="grid grid-cols-12 gap-4">
        @for (item of stats; track item.label) {
          <div class="col-span-12 sm:col-span-6 xl:col-span-3">
            <div class="card">
              <div class="flex align-items-center gap-3">
                <div
                  class="flex align-items-center justify-content-center w-3rem h-3rem border-round"
                  [style]="{ background: item.iconBg }"
                >
                  <i [class]="item.icon" style="font-size: 1.25rem; color: white;"></i>
                </div>
                <div>
                  <span class="text-surface-500 text-sm font-medium">{{ item.label }}</span>
                  <div class="text-2xl font-bold text-surface-800">{{ item.value }}</div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="card">
        <h2 class="text-lg font-bold mb-3">Actividad Reciente</h2>
        <p class="text-sm text-surface-400">
          Los tickets y movimientos del día se mostrarán aquí cuando el módulo de tickets esté operativo.
        </p>
      </div>
    </div>
  `
})
export class Dashboard {
  stats = [
    { label: 'Tickets Hoy', value: 0, icon: 'pi pi-ticket', iconBg: 'var(--p-primary-500)' },
    { label: 'Vehículos Dentro', value: 0, icon: 'pi pi-car', iconBg: 'var(--p-cyan-500)' },
    { label: 'Ingresos Hoy', value: '$0.00', icon: 'pi pi-dollar', iconBg: 'var(--p-green-500)' },
    { label: 'Disponibles', value: 22, icon: 'pi pi-map-marker', iconBg: 'var(--p-orange-500)' }
  ];
}
