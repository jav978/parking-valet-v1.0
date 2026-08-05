export type RateType = 'HOURLY' | 'FRACTIONAL' | 'NIGHTLY' | 'MONTHLY' | 'FLAT' | 'SPECIAL';

export interface SpotType {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rate {
  id: string;
  lotId: string;
  spotTypeId: string;
  name: string;
  rateType: RateType;
  baseAmount: number;
  fractionalMinutes?: number | null;
  fractionalRate?: number | null;
  dailyMax?: number | null;
  nightRate?: number | null;
  monthlyRate?: number | null;
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  lot?: {
    id: string;
    name: string;
    code: string;
  };
  spotType?: SpotType;
}

export interface CreateRateRequest {
  lotId: string;
  spotTypeId: string;
  name: string;
  rateType: RateType;
  baseAmount: number;
  fractionalMinutes?: number;
  fractionalRate?: number;
  dailyMax?: number;
  nightRate?: number;
  monthlyRate?: number;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateRateRequest {
  lotId?: string;
  spotTypeId?: string;
  name?: string;
  rateType?: RateType;
  baseAmount?: number;
  fractionalMinutes?: number;
  fractionalRate?: number;
  dailyMax?: number;
  nightRate?: number;
  monthlyRate?: number;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface RateFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  lotId?: string;
  spotTypeId?: string;
  rateType?: RateType;
  isActive?: boolean;
}
