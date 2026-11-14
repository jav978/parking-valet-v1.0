import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

/** Spot del mapa en vivo (mismo shape que GET /api/parking-spots/map). */
export interface MapSpot {
  id: string;
  lotId: string;
  lotName?: string;
  spotNumber: string;
  floor: number;
  floorLabel: string;
  section: string | null;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  spotType: { id: string; code: string; name: string } | null;
  activeTicket: {
    id: string;
    ticketNumber: string;
    plateNumber: string;
    entryTime: string;
    minutesInside: number;
    baseAmount: number | null;
    client: { name: string; document: string; phone: string } | null;
    vehicle: { brand: string; model: string; color: string; type: string } | null;
  } | null;
  updatedAt?: string;
}

export interface MapSnapshot {
  lotId: string | null;
  spots: MapSpot[];
}

/**
 * Conexión WebSocket al croquis de puestos en tiempo real (namespace /mapa).
 * El tráfico pasa por el proxy del dev server (/socket.io, ws: true).
 */
@Injectable({ providedIn: 'root' })
export class ParkingMapService {
  private socket?: Socket;
  private lastLotId: string | null = null;
  connected = signal(false);

  connect(): void {
    if (this.socket) return;
    this.socket = io('/mapa', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 3000,
    });
    this.socket.on('connect', () => {
      this.connected.set(true);
      // Tras (re)conectar hay que re-entrar a la sala para seguir recibiendo deltas.
      if (this.lastLotId !== null) {
        this.socket?.emit('join', { lotId: this.lastLotId });
      }
    });
    this.socket.on('disconnect', () => this.connected.set(false));
    this.socket.on('connect_error', () => this.connected.set(false));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.lastLotId = null;
    this.connected.set(false);
  }

  join(lotId: string | null): void {
    this.lastLotId = lotId;
    this.socket?.emit('join', { lotId });
  }

  /** Suscripción a deltas de un puesto. Devuelve la función de desuscripción. */
  onSpotUpdate(handler: (spot: MapSpot) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('mapa:puesto', handler);
    return () => this.socket?.off('mapa:puesto', handler);
  }

  /** Snapshot inicial que envía el gateway al hacer join. */
  onSnapshot(handler: (snapshot: MapSnapshot) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('mapa:snapshot', handler);
    return () => this.socket?.off('mapa:snapshot', handler);
  }
}
