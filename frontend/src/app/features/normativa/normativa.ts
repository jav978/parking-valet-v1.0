import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-normativa',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    AccordionModule,
    TabsModule,
    CardModule,
    TagModule
  ],
  templateUrl: './normativa.html',
  styleUrl: './normativa.scss'
})
export class Normativa {
  activeTab = signal<string>('0');

  printNormativa(): void {
    window.print();
  }
}
