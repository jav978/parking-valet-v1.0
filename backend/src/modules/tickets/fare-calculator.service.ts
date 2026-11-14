import { Injectable } from '@nestjs/common';
import { Rate, RateType } from '@prisma/client';

export interface FareBreakdown {
  rateId: string;
  rateName: string;
  rateType: RateType;
  durationMinutes: number;
  graceMinutesApplied: number;
  billedMinutes: number;
  billedUnits: number;
  unitLabel: string;
  baseAmount: number;
  fractionalAmount: number;
  subtotal: number;
  dailyMaxApplied: number | null;
  capped: boolean;
}

const MINUTE_ROUND = (minutes: number, unit: number) => Math.max(1, Math.ceil(minutes / unit));

@Injectable()
export class FareCalculatorService {
  /**
   * Calcula el monto a cobrar de forma determinista en el servidor.
   * El operador NO escribe el monto: solo selecciona el esquema de tarifa
   * y (opcionalmente) aplica descuentos con permisos específicos.
   * `graceMinutes` (cortesía del lote) se descuenta ANTES de facturar;
   * si la estadía cabe dentro de la gracia, el cobro es $0.
   */
  calculate(rate: Rate, durationMinutes: number, graceMinutes = 0): FareBreakdown {
    const grace = Math.max(0, Math.floor(graceMinutes || 0));
    const graceMinutesApplied = Math.min(grace, Math.max(0, durationMinutes));
    const billedMinutes = Math.max(0, durationMinutes - graceMinutesApplied);
    const duration = billedMinutes;

    const base = Number(rate.baseAmount || 0);
    const fractionalMinutes = rate.fractionalMinutes ?? 0;
    const fractionalRate = Number(rate.fractionalRate ?? 0);
    const dailyMax = rate.dailyMax !== null && rate.dailyMax !== undefined ? Number(rate.dailyMax) : null;

    let billedUnits = 1;
    let unitLabel = 'período';
    let total = base;
    let fractionalAmount = 0;

    // Si la estadía cabe completamente en el período de gracia → cobro $0.
    if (duration === 0) {
      return {
        rateId: rate.id,
        rateName: rate.name,
        rateType: rate.rateType,
        durationMinutes,
        graceMinutesApplied,
        billedMinutes: 0,
        billedUnits: 0,
        unitLabel: 'período de gracia',
        baseAmount: 0,
        fractionalAmount: 0,
        subtotal: 0,
        dailyMaxApplied: null,
        capped: false,
      };
    }

    switch (rate.rateType) {
      case RateType.HOURLY: {
        billedUnits = MINUTE_ROUND(duration, 60);
        unitLabel = 'hora(s)';
        total = base * billedUnits;
        break;
      }
      case RateType.HALF_HOURLY: {
        billedUnits = MINUTE_ROUND(duration, 30);
        unitLabel = 'media(s) hora';
        total = base * billedUnits;
        break;
      }
      case RateType.FRACTIONAL: {
        const unit = fractionalMinutes > 0 ? fractionalMinutes : 15;
        billedUnits = MINUTE_ROUND(duration, unit);
        unitLabel = `fracción(es) de ${unit} min`;
        // El monto base cubre la primera fracción; el resto se cobra por fracción adicional.
        const extraFractions = Math.max(0, billedUnits - 1);
        fractionalAmount = extraFractions * fractionalRate;
        total = base + fractionalAmount;
        break;
      }
      case RateType.DAILY: {
        billedUnits = MINUTE_ROUND(duration, 1440);
        unitLabel = 'día(s)';
        total = base * billedUnits;
        break;
      }
      case RateType.NIGHTLY: {
        // Una "noche" equivale a un día de estadía (convención hotelera:
        // llegada → salida cuenta una noche por fecha).
        billedUnits = Math.max(1, Math.ceil(duration / 1440));
        unitLabel = 'noche(s)';
        total = base * billedUnits;
        break;
      }
      case RateType.MONTHLY:
      default: {
        billedUnits = 1;
        unitLabel = 'mes';
        total = base;
        break;
      }
    }

    // Tope diario: se aplica por cada bloque completo de 24h dentro de la estadía.
    let dailyMaxApplied: number | null = null;
    let capped = false;
    if (dailyMax !== null && rate.rateType !== RateType.MONTHLY && rate.rateType !== RateType.NIGHTLY) {
      const dayBuckets = Math.max(1, Math.ceil(duration / 1440));
      dailyMaxApplied = dailyMax * dayBuckets;
      if (total > dailyMaxApplied) {
        total = dailyMaxApplied;
        capped = true;
      }
    }

    return {
      rateId: rate.id,
      rateName: rate.name,
      rateType: rate.rateType,
      durationMinutes,
      graceMinutesApplied,
      billedMinutes: duration,
      billedUnits,
      unitLabel,
      baseAmount: this.round2(base),
      fractionalAmount: this.round2(fractionalAmount),
      subtotal: this.round2(total),
      dailyMaxApplied: dailyMaxApplied !== null ? this.round2(dailyMaxApplied) : null,
      capped,
    };
  }

  round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
