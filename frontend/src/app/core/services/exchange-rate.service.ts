import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';

export interface ExchangeRates {
  bcvUsd: number;
  bcvEur: number;
  paralelo: number;
  binance: number;
  lastUpdated: string;
  source: string;
}

export type RateModality = 'bcvUsd' | 'bcvEur' | 'paralelo' | 'binance';

export interface RateOption {
  key: RateModality;
  label: string;
  symbol: string;
  rate: number;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private http = inject(HttpClient);
  private apiUrl = '/api/rates/exchange-rates';

  // Live Signals
  rates = signal<ExchangeRates>({
    bcvUsd: 752.09,
    bcvEur: 865.18,
    paralelo: 839.45,
    binance: 845.00,
    lastUpdated: new Date().toISOString(),
    source: 'APIs Oficiales BCV + DolarApi + Binance P2P',
  });

  loading = signal<boolean>(false);
  selectedModality = signal<RateModality>('bcvUsd');

  // Computed Active Exchange Rate Value in VES
  activeRate = computed(() => {
    const r = this.rates();
    const mod = this.selectedModality();
    return r[mod] || r.bcvUsd;
  });

  // Computed List of Options for Dropdowns/Widgets
  rateOptions = computed<RateOption[]>(() => {
    const r = this.rates();
    return [
      { key: 'bcvUsd', label: 'BCV Dólar ($)', symbol: 'USD $', rate: r.bcvUsd, icon: 'pi pi-dollar' },
      { key: 'bcvEur', label: 'BCV Euro (€)', symbol: 'EUR €', rate: r.bcvEur, icon: 'pi pi-euro' },
      { key: 'paralelo', label: 'Dólar Paralelo', symbol: 'PAR $', rate: r.paralelo, icon: 'pi pi-chart-line' },
      { key: 'binance', label: 'Binance P2P (USDT)', symbol: 'USDT ₮', rate: r.binance, icon: 'pi pi-bitcoin' },
    ];
  });

  constructor() {
    this.fetchLiveRates();
  }

  fetchLiveRates(forceRefresh = false): Observable<ExchangeRates> {
    this.loading.set(true);
    const url = forceRefresh ? `${this.apiUrl}?refresh=true` : this.apiUrl;
    return this.http.get<any>(url).pipe(
      tap(res => {
        this.loading.set(false);
        const data = res?.data || res;
        if (data && data.bcvUsd) {
          this.rates.set({
            bcvUsd: Number(data.bcvUsd),
            bcvEur: Number(data.bcvEur),
            paralelo: Number(data.paralelo),
            binance: Number(data.binance),
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            source: data.source || 'APIs Oficiales BCV + Binance',
          });
        }
      }),
      catchError(err => {
        this.loading.set(false);
        return of(this.rates());
      })
    );
  }

  setModality(modality: RateModality): void {
    this.selectedModality.set(modality);
  }
}
