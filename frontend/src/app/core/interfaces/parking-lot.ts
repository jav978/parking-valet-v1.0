export interface ParkingLot {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  totalSpots: number;
  availableSpots: number;
  openingTime?: string;
  closingTime?: string;
  is24h: boolean;
  isActive: boolean;
  hasEvCharging: boolean;
  hasSecurity: boolean;
  hasCovered: boolean;
  taxPercentage?: number;
  currency?: string;
  ticketPrefix?: string;
  ticketNextNum?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    parkingSpots: number;
    tickets: number;
  };
}

export interface CreateParkingLotRequest {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  totalSpots?: number;
  availableSpots?: number;
  openingTime?: string;
  closingTime?: string;
  is24h?: boolean;
  isActive?: boolean;
  hasEvCharging?: boolean;
  hasSecurity?: boolean;
  hasCovered?: boolean;
  taxPercentage?: number;
  currency?: string;
  ticketPrefix?: string;
  notes?: string;
}

export interface UpdateParkingLotRequest extends Partial<CreateParkingLotRequest> {}

export interface ParkingLotFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
}
