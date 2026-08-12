import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { catchError, of, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../layout/layout.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ChartModule, SelectModule, FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private http = inject(HttpClient);
  public auth = inject(AuthService);
  public layoutService = inject(LayoutService);

  lots = signal<any[]>([]);
  selectedLotId = signal<string | null>(null);
  
  stats = signal({
    activeTickets: 0,
    occupiedSpots: 0,
    dailyRevenue: 0,
    availableSpots: 0
  });

  chartData = signal<any>(null);
  chartOptions = signal<any>(null);

  ngOnInit() {
    this.initChartOptions();
    this.loadLots();
  }

  initChartOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--p-text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = documentStyle.getPropertyValue('--p-surface-200');
    
    this.chartOptions.set({
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder, drawBorder: false }
        },
        y: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder, drawBorder: false }
        }
      }
    });
  }

  loadLots() {
    this.http.get<any>('/api/parking-lots').pipe(catchError(() => of(null))).subscribe(res => {
      if (res && res.data) {
        this.lots.set(res.data);
        if (res.data.length > 0) {
          this.selectedLotId.set(res.data[0].id);
          this.loadDashboardData();
        }
      }
    });
  }

  onLotChange() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    const lotId = this.selectedLotId();
    if (!lotId) return;

    const today = new Date().toISOString().split('T')[0];

    forkJoin({
      stats: this.http.get<any>(`/api/parking-lots/${lotId}/stats`).pipe(catchError(() => of(null))),
      revenue: this.http.get<any>(`/api/payments/daily-report?date=${today}&lotId=${lotId}`).pipe(catchError(() => of(null)))
    }).subscribe(({ stats, revenue }) => {
      
      const s = stats?.data || { activeTickets: 0, occupiedSpots: 0, availableSpots: 0 };
      const r = revenue?.data || { totalAmount: 0, byMethod: [] };

      this.stats.set({
        activeTickets: s.activeTickets,
        occupiedSpots: s.occupiedSpots,
        dailyRevenue: r.totalAmount,
        availableSpots: s.availableSpots
      });

      this.updateChart(r.byMethod);
    });
  }

  updateChart(byMethod: any[]) {
    const documentStyle = getComputedStyle(document.documentElement);
    const primary = documentStyle.getPropertyValue('--p-primary-500');
    const blue = documentStyle.getPropertyValue('--p-cyan-500');
    const green = documentStyle.getPropertyValue('--p-green-500');
    const orange = documentStyle.getPropertyValue('--p-orange-500');
    const colors = [primary, blue, green, orange];

    const labels = byMethod.map(m => m.method);
    const data = byMethod.map(m => m.amount);

    this.chartData.set({
      labels: labels.length ? labels : ['Sin datos'],
      datasets: [
        {
          data: data.length ? data : [1],
          backgroundColor: data.length ? colors : [documentStyle.getPropertyValue('--p-surface-200')],
          hoverBackgroundColor: data.length ? colors : [documentStyle.getPropertyValue('--p-surface-300')]
        }
      ]
    });
  }
}
