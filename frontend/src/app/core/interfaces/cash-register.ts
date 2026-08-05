import { ParkingLot } from './parking-lot';

export interface UserProfile {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  role?: string;
  permissions?: string[];
}

export type CashRegisterStatus = 'OPEN' | 'CLOSED';
export type MovementType = 'INCOME' | 'EXPENSE';

export interface CashRegisterMovement {
  id: string;
  cashRegisterId: string;
  type: MovementType;
  amount: number | string;
  referenceNumber?: string;
  description?: string;
  createdById: string;
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface CashRegisterSummary {
  openingBalance: number;
  totalIncomes: number;
  totalExpenses: number;
  ticketPayments: number;
  expectedBalance: number;
}

export interface CashRegister {
  id: string;
  lotId: string;
  name: string;
  openedById: string;
  closedById?: string;
  openingBalance: number | string;
  closingBalance?: number | string;
  expectedBalance?: number | string;
  difference?: number | string;
  status: CashRegisterStatus;
  openedAt: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  lot?: ParkingLot;
  openedBy?: UserProfile;
  closedBy?: UserProfile;
  movements?: CashRegisterMovement[];
  currentSummary?: CashRegisterSummary;
  _count?: { movements: number; ticketsExit: number };
}

export interface OpenCashRegisterRequest {
  lotId: string;
  name: string;
  openingBalance: number;
  notes?: string;
}

export interface CloseCashRegisterRequest {
  closingBalance: number;
  notes?: string;
}

export interface CreateMovementRequest {
  type: MovementType;
  amount: number;
  description?: string;
  referenceNumber?: string;
}

export interface CashRegisterFilterParams {
  page?: number;
  limit?: number;
  lotId?: string;
  status?: CashRegisterStatus;
  search?: string;
}
