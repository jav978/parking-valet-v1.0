export interface Vehicle {
  id: string;
  clientId?: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType: 'CAR' | 'MOTORCYCLE' | 'TRUCK' | 'SUV' | 'VAN' | 'BUS' | 'BICYCLE' | 'OTHER';
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; firstName: string; lastName: string };
}

export interface CreateVehicleRequest {
  clientId?: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;
  photoUrl?: string;
}

export interface UpdateVehicleRequest {
  clientId?: string;
  plateNumber?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;
  photoUrl?: string;
}

export interface VehicleFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  clientId?: string;
  vehicleType?: string;
  clientName?: string;
  isActive?: boolean;
}
