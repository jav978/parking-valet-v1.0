export interface Payment {
  id: string;
  ticketId: string;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'SUBSCRIPTION' | 'APP' | 'OTHER';
  amount: number;
  referenceNumber?: string;
  paidAt: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  ticket?: {
    id: string;
    ticketNumber: string;
    plateNumber: string;
    totalAmount?: number;
    status: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreatePaymentRequest {
  ticketId: string;
  paymentMethod: Payment['paymentMethod'];
  amount: number;
  referenceNumber?: string;
}

export interface PaymentFilterParams {
  ticketNumber?: string;
  ticketId?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedPayments {
  data: Payment[];
  total: number;
  limit: number;
  offset: number;
}

export const PAYMENT_METHOD_LABELS: Record<Payment['paymentMethod'], string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  SUBSCRIPTION: 'Suscripción',
  APP: 'Aplicación',
  OTHER: 'Otro',
};
