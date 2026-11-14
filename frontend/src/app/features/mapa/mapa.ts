import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, SharedModule } from 'primeng/api';
import { catchError, of } from 'rxjs';

import { ApiResponse } from '../../core/interfaces/api-response';
import { ParkingMapService, MapSpot } from '../../core/services/parking-map.service';

interface ParkingLotOption { id: string; name: string; code: string; }

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, DialogModule, ButtonModule, SelectModule, ToastModule, TooltipModule, SharedModule],
  providers: [MessageService],
  templateUrl: './mapa.html',
  styleUrl: './mapa.scss',
})
export class Mapa {
  private http = inject(HttpClient);
  private toast = inject(MessageService);
  private router = inject(Router);
  private mapService = inject(ParkingMapService);
  private destroyRef = inject(DestroyRef);

  protected Math = Math;

  lots = signal<ParkingLotOption[]>([]);
  lotId = signal<string | null>(null);
  spots = signal<MapSpot[]>([]);
  loading = signal(false);
  connected = this.mapService.connected;

  selectedSpot = signal<MapSpot | null>(null);
  showDetail = false;

  // ─── Agrupación del croquis: piso → sección → puestos ───
  floors = computed(() => {
    const byFloor = new Map<string, MapSpot[]>();
    for (const s of this.spots()) {
      const list = byFloor.get(s.floorLabel) ?? [];
      list.push(s);
      byFloor.set(s.floorLabel, list);
    }
    return Array.from(byFloor.entries()).map(([floorLabel, floorSpots]) => {
      const bySection = new Map<string, MapSpot[]>();
      for (const s of floorSpots) {
        const key = s.section || 'General';
        const list = bySection.get(key) ?? [];
        list.push(s);
        bySection.set(key, list);
      }
      return {
        floorLabel,
        sections: Array.from(bySection.entries()).map(([name, spots]) => ({ name, spots })),
        total: floorSpots.length,
        occupied: floorSpots.filter((s) => s.status === 'OCCUPIED' || s.activeTicket).length,
      };
    });
  });

  summary = computed(() => {
    const all = this.spots();
    const occupied = all.filter((s) => s.status === 'OCCUPIED' || s.activeTicket).length;
    const available = all.filter((s) => s.status === 'AVAILABLE' && !s.activeTicket).length;
    const reserved = all.filter((s) => s.status === 'RESERVED').length;
    const maintenance = all.filter((s) => s.status === 'MAINTENANCE').length;
    return {
      total: all.length,
      occupied,
      available,
      reserved,
      maintenance,
      occupancyPct: all.length > 0 ? Math.round((occupied / all.length) * 100) : 0,
    };
  });

  private pollTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.mapService.connect();

    // Delta en tiempo real: reemplaza (o agrega) el puesto recibido.
    const offUpdate = this.mapService.onSpotUpdate((spot) => {
      this.spots.update((list) => {
        const idx = list.findIndex((s) => s.id === spot.id);
        if (idx === -1) return [...list, spot];
        const copy = [...list];
        copy[idx] = spot;
        return copy;
      });
    });

    // Snapshot inicial al suscribirse por socket.
    const offSnapshot = this.mapService.onSnapshot((snap) => {
      if (snap.lotId && snap.lotId !== this.lotId()) return;
      if (snap.spots.length > 0) this.spots.set(snap.spots);
    });

    // Red de seguridad: refresco por polling cada 30s.
    this.pollTimer = setInterval(() => {
      if (this.lotId()) this.loadMap(this.lotId()!);
    }, 30000);

    this.destroyRef.onDestroy(() => {
      clearInterval(this.pollTimer);
      offUpdate();
      offSnapshot();
      this.mapService.disconnect();
    });

    this.loadLots();
  }

  lotOptions(): Array<{ label: string; value: string }> {
    return this.lots().map((l) => ({ label: l.name, value: l.id }));
  }

  onLotChange(): void {
    const lotId = this.lotId();
    this.mapService.join(lotId);
    if (lotId) this.loadMap(lotId);
  }

  private loadLots(): void {
    this.http.get<ApiResponse<ParkingLotOption[]>>('/api/parking-lots')
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) return;
        this.lots.set(res.data);
        if (res.data.length > 0 && !this.lotId()) {
          this.lotId.set(res.data[0].id);
          this.mapService.join(this.lotId());
          this.loadMap(this.lotId()!);
        }
      });
  }

  loadMap(lotId: string): void {
    this.loading.set(true);
    this.http.get<ApiResponse<any>>(`/api/parking-spots/map`, { params: { lotId } })
      .pipe(catchError((err) => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo cargar el mapa' });
        this.loading.set(false);
        return of(null);
      }))
      .subscribe((res) => {
        if (res) this.spots.set(res.data.spots);
        this.loading.set(false);
      });
  }

  refresh(): void {
    if (this.lotId()) this.loadMap(this.lotId()!);
  }

  openSpot(spot: MapSpot): void {
    this.selectedSpot.set(spot);
    this.showDetail = true;
  }

  spotClass(spot: MapSpot): string {
    const base = `spot spot--${spot.status.toLowerCase()}`;
    const code = (spot.spotType?.code || '').toUpperCase();
    const name = (spot.spotType?.name || '').toLowerCase();
    if (code === 'VIP' || name.includes('vip')) return `${base} spot--vip`;
    if (code === 'HANDICAP' || name.includes('discapac')) return `${base} spot--accessible`;
    if (code === 'SUV' || name.includes('camioneta')) return `${base} spot--suv`;
    if (code === 'BUS' || name.includes('bus')) return `${base} spot--bus`;
    if (code === 'TRUCK' || name.includes('camión') || name.includes('camion')) return `${base} spot--truck`;
    if (code === 'EV' || name.includes('eléctric') || name.includes('electric')) return `${base} spot--ev`;
    if (code === 'MOTORCYCLE' || name.includes('moto')) return `${base} spot--motorcycle`;
    return base;
  }

  /**
   * Icono del vehículo para la celda ocupada: se decide por el tipo de
   * vehículo del ticket activo; si no hay info, por el tipo de puesto.
   */
  vehicleIcon(spot: MapSpot): 'car' | 'moto' | 'pickup' | 'bus' {
    const vt = (spot.activeTicket?.vehicle?.type || '').toUpperCase();
    const st = (spot.spotType?.code || '').toUpperCase();
    if (vt === 'MOTORCYCLE' || st === 'MOTORCYCLE') return 'moto';
    if (vt === 'BUS' || st === 'BUS') return 'bus';
    if (['SUV', 'TRUCK', 'VAN'].includes(vt)) return 'pickup';
    if (['SUV', 'TRUCK'].includes(st)) return 'pickup';
    return 'car';
  }

  /** Etiqueta en español del tipo de vehículo (panel de detalle). */
  vehicleTypeLabel(type?: string | null): string {
    const labels: Record<string, string> = {
      CAR: 'Carro', MOTORCYCLE: 'Moto', TRUCK: 'Camión', SUV: 'Camioneta',
      VAN: 'Van', BUS: 'Bus', BICYCLE: 'Bicicleta', OTHER: 'Otro',
    };
    return labels[(type || '').toUpperCase()] || 'Vehículo';
  }

  // Estado legible para el panel de detalle
  spotStatusLabel(spot: MapSpot): string {
    switch (spot.status) {
      case 'AVAILABLE': return 'Disponible';
      case 'OCCUPIED': return 'Ocupado';
      case 'RESERVED': return 'Reservado';
      case 'MAINTENANCE': return 'Mantenimiento';
      default: return spot.status;
    }
  }

  goTickets(): void {
    this.showDetail = false;
    this.router.navigate(['/tickets']);
  }
}
