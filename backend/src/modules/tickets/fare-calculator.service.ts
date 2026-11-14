import { Injectable } from '@nestjs/common';
import { Rate, RateType } from '@prisma/client';

export interface FareBreakdown {
  rateId: string;
  rateName: string;
  rateType: RateType;
  durationMinutes: number;
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
   */
  calculate(rate: Rate, durationMinutes: number): FareBreakdown {
    const base = Number(rate.baseAmount || 0);
    const fractionalMinutes = rate.fractionalMinutes ?? 0;
    const fractionalRate = Number(rate.fractionalRate ?? 0);
    const dailyMax = rate.dailyMax !== null && rate.dailyMax !== undefined ? Number(rate.dailyMax) : null;

    let billedUnits = 1;
    let unitLabel = 'período';
    let total = base;
    let fractionalAmount = 0;

    switch (rate.rateType) {
      case RateType.HOURLY: {
        billedUnits = MINUTE_ROUND(durationMinutes, 60);
        unitLabel = 'hora(s)';
        total = base * billedUnits;
        break;
      }
      case RateType.HALF_HOURLY: {
        billedUnits = MINUTE_ROUND(durationMinutes, 30);
        unitLabel = 'media(s) hora';
        total = base * billedUnits;
        break;
      }
      case RateType.FRACTIONAL: {
        const unit = fractionalMinutes > 0 ? fractionalMinutes : 15;
        billedUnits = MINUTE_ROUND(durationMinutes, unit);
        unitLabel = `fracción(es) de ${unit} min`;
        // El monto base cubre la primera fracción; el resto se cobra por fracción adicional.
        const extraFractions = Math.max(0, billedUnits - 1);
        fractionalAmount = extraFractions * fractionalRate;
        total = base + fractionalAmount;
        break;
      }
      case RateType.DAILY: {
        billedUnits = MINUTE_ROUND(durationMinutes, 1440);
        unitLabel = 'día(s)';
        total = base * billedUnits;
        break;
      }
      case RateType.NIGHTLY: {
        // Una "noche" equivale a un día de estadía (convención hotelera:
        // llegada → salida cuenta una noche por fecha).
        billedUnits = Math.max(1, Math.ceil(durationMinutes / 1440));
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
      const dayBuckets = Math.max(1, Math.ceil(durationMinutes / 1440));
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
