export interface Ticket {
  id: string;
  ticketNumber: string;
  lotId: string;
  spotId?: string;
  clientId?: string;
  vehicleId?: string;
  plateNumber: string;
  entryTime: string;
  exitTime?: string;
  durationMinutes?: number;
  rateId?: string;
  baseAmount?: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  entryOperatorId: string;
  exitOperatorId?: string;
  notes?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;

  lot?: { id: string; name: string; code: string };
  spot?: { id: string; spotNumber: string; floor?: string; section?: string };
  client?: { id: string; firstName: string; lastName: string };
  vehicle?: { id: string; plateNumber: string; brand?: string; model?: string };
  rate?: { id: string; name: string };
  entryOperator?: { id: string; firstName: string; lastName: string };
  exitOperator?: { id: string; firstName: string; lastName: string };
  payments?: Payment[];
  accessLogs?: AccessLog[];
}

export interface Payment {
  id: string;
  paymentMethod: string;
  amount: number;
  referenceNumber?: string;
  paidAt: string;
}

export interface AccessLog {
  id: string;
  eventType: 'ENTRY' | 'EXIT';
  accessTime: string;
  operatorId: string;
  gateNumber?: string;
}

export interface CreateTicketRequest {
  lotId: string;
  spotId?: string;
  plateNumber: string;
  clientId?: string;
  vehicleId?: string;
  notes?: string;
}

export interface CloseTicketRequest {
  rateId?: string;
  baseAmount?: number;
  discountAmount?: number;
  exitCashRegisterId?: string;
  notes?: string;
}

export interface TicketFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  lotId?: string;
  status?: string;
  paymentStatus?: string;
}
