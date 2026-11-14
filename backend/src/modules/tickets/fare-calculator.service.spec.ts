import { Prisma, Rate, RateType } from '@prisma/client';
import { FareCalculatorService } from './fare-calculator.service';

/**
 * Suite de unit tests de la calculadora de tarifas.
 * El servicio es puro (sin dependencias): matemática de facturación
 * que protege el corazón del negocio — cualquier cambio aquí debe
 * mantener estos comportamientos.
 */

const rate = (over: Partial<Rate> = {}): Rate =>
  ({
    id: 'rate-1',
    lotId: 'lot-1',
    spotTypeId: 'spot-type-1',
    name: 'Tarifa de prueba',
    rateType: RateType.HOURLY,
    baseAmount: new Prisma.Decimal(30),
    fractionalMinutes: null,
    fractionalRate: null,
    dailyMax: null,
    nightRate: null,
    monthlyRate: null,
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...over,
  }) as Rate;

describe('FareCalculatorService', () => {
  let service: FareCalculatorService;

  beforeEach(() => {
    service = new FareCalculatorService();
  });

  describe('HOURLY', () => {
    it('cobra un solo bloque por estancias menores a una hora', () => {
      const r = service.calculate(rate({ baseAmount: new Prisma.Decimal(30) }), 30);
      expect(r.subtotal).toBe(30);
      expect(r.billedUnits).toBe(1);
      expect(r.unitLabel).toBe('hora(s)');
    });

    it('cobra un bloque exacto a los 60 minutos', () => {
      const r = service.calculate(rate(), 60);
      expect(r.billedUnits).toBe(1);
      expect(r.subtotal).toBe(30);
    });

    it('redondea hacia arriba a los 61 minutos (2 bloques)', () => {
      const r = service.calculate(rate(), 61);
      expect(r.billedUnits).toBe(2);
      expect(r.subtotal).toBe(60);
    });
  });

  describe('HALF_HOURLY', () => {
    it('15 minutos → 1 bloque', () => {
      const r = service.calculate(rate({ rateType: RateType.HALF_HOURLY }), 15);
      expect(r.billedUnits).toBe(1);
      expect(r.subtotal).toBe(30);
    });

    it('31 minutos → 2 bloques', () => {
      const r = service.calculate(rate({ rateType: RateType.HALF_HOURLY }), 31);
      expect(r.billedUnits).toBe(2);
      expect(r.subtotal).toBe(60);
    });
  });

  describe('FRACTIONAL', () => {
    it('estancia dentro de la primera fracción cobra solo el monto base', () => {
      const r = service.calculate(
        rate({
          rateType: RateType.FRACTIONAL,
          baseAmount: new Prisma.Decimal(30),
          fractionalMinutes: 15,
          fractionalRate: new Prisma.Decimal(10),
        }),
        10,
      );
      expect(r.billedUnits).toBe(1);
      expect(r.fractionalAmount).toBe(0);
      expect(r.subtotal).toBe(30);
    });

    it('cada fracción adicional se cobra con fractionalRate', () => {
      const r = service.calculate(
        rate({
          rateType: RateType.FRACTIONAL,
          baseAmount: new Prisma.Decimal(30),
          fractionalMinutes: 15,
          fractionalRate: new Prisma.Decimal(10),
        }),
        16,
      );
      // 16 min → 2 fracciones (1 cubierta por base + 1 extra)
      expect(r.billedUnits).toBe(2);
      expect(r.fractionalAmount).toBe(10);
      expect(r.subtotal).toBe(40);
    });

    it('45 minutos → base + 2 fracciones extra', () => {
      const r = service.calculate(
        rate({
          rateType: RateType.FRACTIONAL,
          baseAmount: new Prisma.Decimal(30),
          fractionalMinutes: 15,
          fractionalRate: new Prisma.Decimal(10),
        }),
        45,
      );
      expect(r.billedUnits).toBe(3);
      expect(r.fractionalAmount).toBe(20);
      expect(r.subtotal).toBe(50);
    });

    it('sin fractionalMinutes configurado usa 15 min por defecto', () => {
      const r = service.calculate(
        rate({
          rateType: RateType.FRACTIONAL,
          baseAmount: new Prisma.Decimal(30),
          fractionalMinutes: null,
          fractionalRate: new Prisma.Decimal(10),
        }),
        31,
      );
      // 31 min → ceil(31/15) = 3 fracciones → 2 extra
      expect(r.billedUnits).toBe(3);
      expect(r.subtotal).toBe(50);
    });
  });

  describe('DAILY', () => {
    it('90 minutos → 1 día', () => {
      const r = service.calculate(rate({ rateType: RateType.DAILY }), 90);
      expect(r.billedUnits).toBe(1);
      expect(r.unitLabel).toBe('día(s)');
      expect(r.subtotal).toBe(30);
    });

    it('1441 minutos → 2 días', () => {
      const r = service.calculate(rate({ rateType: RateType.DAILY }), 1441);
      expect(r.billedUnits).toBe(2);
      expect(r.subtotal).toBe(60);
    });
  });

  describe('NIGHTLY', () => {
    it('una estadía corta cuenta como 1 noche', () => {
      const r = service.calculate(rate({ rateType: RateType.NIGHTLY }), 300);
      expect(r.billedUnits).toBe(1);
      expect(r.subtotal).toBe(30);
    });

    it('8 días con 36 minutos extra → 9 noches (regresión del bug de bloques de 12h)', () => {
      const r = service.calculate(rate({ rateType: RateType.NIGHTLY, baseAmount: new Prisma.Decimal(80) }), 11636);
      expect(r.billedUnits).toBe(9);
      expect(r.subtotal).toBe(720);
      expect(r.unitLabel).toBe('noche(s)');
    });
  });

  describe('MONTHLY', () => {
    it('cobra siempre el monto base independiente de la duración', () => {
      const r = service.calculate(rate({ rateType: RateType.MONTHLY, baseAmount: new Prisma.Decimal(2500) }), 50000);
      expect(r.billedUnits).toBe(1);
      expect(r.subtotal).toBe(2500);
    });
  });

  describe('Tope diario (dailyMax)', () => {
    it('capa el total cuando las unidades lo superan (regresión del caso EV 194h)', () => {
      const r = service.calculate(
        rate({ baseAmount: new Prisma.Decimal(40), dailyMax: new Prisma.Decimal(250) }),
        11635,
      );
      // 194 h × 40 = 7760 > 250 × 9 días = 2250
      expect(r.capped).toBe(true);
      expect(r.dailyMaxApplied).toBe(2250);
      expect(r.subtotal).toBe(2250);
    });

    it('no capa cuando el cálculo queda por debajo del tope', () => {
      const r = service.calculate(rate({ baseAmount: new Prisma.Decimal(40), dailyMax: new Prisma.Decimal(250) }), 120);
      // 2 h × 40 = 80 < 250
      expect(r.capped).toBe(false);
      expect(r.subtotal).toBe(80);
    });

    it('no aplica tope a tarifas nocturnas ni mensuales', () => {
      const nightly = service.calculate(
        rate({ rateType: RateType.NIGHTLY, baseAmount: new Prisma.Decimal(80), dailyMax: new Prisma.Decimal(50) }),
        11636,
      );
      expect(nightly.capped).toBe(false);
      expect(nightly.subtotal).toBe(720);

      const monthly = service.calculate(
        rate({ rateType: RateType.MONTHLY, baseAmount: new Prisma.Decimal(2500), dailyMax: new Prisma.Decimal(50) }),
        50000,
      );
      expect(monthly.capped).toBe(false);
      expect(monthly.subtotal).toBe(2500);
    });
  });

  describe('Período de gracia', () => {
    it('estancia dentro de la gracia cobra $0', () => {
      const r = service.calculate(rate(), 13, 15);
      expect(r.graceMinutesApplied).toBe(13);
      expect(r.billedMinutes).toBe(0);
      expect(r.billedUnits).toBe(0);
      expect(r.subtotal).toBe(0);
    });

    it('descuenta la gracia antes de facturar', () => {
      const r = service.calculate(rate(), 30, 15);
      // 30 - 15 = 15 min facturables → 1 bloque
      expect(r.graceMinutesApplied).toBe(15);
      expect(r.billedMinutes).toBe(15);
      expect(r.billedUnits).toBe(1);
      expect(r.subtotal).toBe(30);
    });

    it('gracia 0 no altera el cálculo', () => {
      const r = service.calculate(rate(), 61, 0);
      expect(r.graceMinutesApplied).toBe(0);
      expect(r.billedUnits).toBe(2);
      expect(r.subtotal).toBe(60);
    });
  });

  describe('Redondeo monetario', () => {
    it('redondea a centavos con tarifas decimales', () => {
      const r = service.calculate(
        rate({
          rateType: RateType.FRACTIONAL,
          baseAmount: new Prisma.Decimal(30),
          fractionalMinutes: 15,
          fractionalRate: new Prisma.Decimal(10.5),
        }),
        46,
      );
      // 46 min → 4 fracciones → 3 extra × 10.5 = 31.50
      expect(r.billedUnits).toBe(4);
      expect(r.fractionalAmount).toBe(31.5);
      expect(r.subtotal).toBe(61.5);
    });
  });

  describe('Duración cero', () => {
    it('estancia de 0 minutos es gratuita (entra y sale en el mismo instante)', () => {
      const r = service.calculate(rate(), 0);
      expect(r.billedUnits).toBe(0);
      expect(r.subtotal).toBe(0);
      expect(r.graceMinutesApplied).toBe(0);
    });
  });
});
