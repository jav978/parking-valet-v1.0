import { Injectable, Logger } from '@nestjs/common';

export interface ExchangeRatesResult {
  bcvUsd: number;
  bcvEur: number;
  paralelo: number;
  binance: number;
  lastUpdated: string;
  source: string;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private cachedRates: ExchangeRatesResult | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos cache

  async getLiveExchangeRates(forceRefresh = false): Promise<ExchangeRatesResult> {
    const now = Date.now();
    if (!forceRefresh && this.cachedRates && (now - this.lastFetchTime) < this.CACHE_TTL_MS) {
      return this.cachedRates;
    }

    try {
      const [dolaresRes, eurosRes, binanceRes] = await Promise.allSettled([
        fetch('https://ve.dolarapi.com/v1/dolares'),
        fetch('https://ve.dolarapi.com/v1/euros'),
        fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset: 'USDT',
            fiat: 'VES',
            tradeType: 'BUY',
            page: 1,
            rows: 5,
            payTypes: [],
          }),
        }),
      ]);

      let bcvUsd = 752.09;
      let bcvEur = 865.18;
      let paralelo = 839.45;
      let binance = 845.00;

      // Parse DolarApi Dólares (Oficial BCV + Paralelo)
      if (dolaresRes.status === 'fulfilled' && dolaresRes.value.ok) {
        const data = await dolaresRes.value.json();
        if (Array.isArray(data)) {
          const oficialItem = data.find((d: any) => d.fuente === 'oficial');
          const paraleloItem = data.find((d: any) => d.fuente === 'paralelo');
          if (oficialItem?.promedio) bcvUsd = Number(oficialItem.promedio);
          if (paraleloItem?.promedio) paralelo = Number(paraleloItem.promedio);
        }
      }

      // Parse DolarApi Euros (BCV Euro)
      if (eurosRes.status === 'fulfilled' && eurosRes.value.ok) {
        const data = await eurosRes.value.json();
        if (Array.isArray(data)) {
          const euroItem = data.find((e: any) => e.fuente === 'oficial');
          if (euroItem?.promedio) bcvEur = Number(euroItem.promedio);
        }
      }

      // Parse Binance P2P
      if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
        const data = await binanceRes.value.json();
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const prices = data.data
            .map((item: any) => Number(item?.adv?.price))
            .filter((p: number) => !isNaN(p) && p > 0);
          if (prices.length > 0) {
            // Promedio de las primeras ofertas activas
            const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
            binance = Number(avg.toFixed(2));
          }
        }
      }

      this.cachedRates = {
        bcvUsd: Number(bcvUsd.toFixed(2)),
        bcvEur: Number(bcvEur.toFixed(2)),
        paralelo: Number(paralelo.toFixed(2)),
        binance: Number(binance.toFixed(2)),
        lastUpdated: new Date().toISOString(),
        source: 'APIs Oficiales BCV + DolarApi + Binance P2P',
      };
      this.lastFetchTime = now;

      return this.cachedRates;
    } catch (error) {
      this.logger.error('Error al consultar APIs de tasas de cambio en vivo', error);
      // Fallback si falla la red
      return this.cachedRates || {
        bcvUsd: 752.09,
        bcvEur: 865.18,
        paralelo: 839.45,
        binance: 845.00,
        lastUpdated: new Date().toISOString(),
        source: 'Fallback estático por error de conexión',
      };
    }
  }
}
