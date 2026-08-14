import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, TagModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Estado del usuario activo
  user = this.authService.user;
  isLoggedIn = signal<boolean>(!!this.authService.getAccessToken());

  // Navegación móvil
  mobileMenuOpen = signal<boolean>(false);

  // Calculadora ROI
  vehiclesPerDay = signal<number>(120);
  avgRateUsd = signal<number>(3.5);

  // FAQ Expandibles
  openFaq = signal<number | null>(0);

  // Cálculo estimado mensual
  get estimatedMonthlyRevenue(): number {
    return Math.round(this.vehiclesPerDay() * this.avgRateUsd() * 30);
  }

  get estimatedSavingsMinutes(): number {
    return Math.round((this.vehiclesPerDay() * 2.5 * 30) / 60); // Horas ahorradas al mes
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  toggleFaq(index: number): void {
    this.openFaq.update((current) => (current === index ? null : index));
  }

  navigateToApp(): void {
    if (this.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }
}
