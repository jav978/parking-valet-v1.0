export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  documentType: 'ID' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'OTHER';
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  clientType: 'REGULAR' | 'FREQUENT' | 'VIP' | 'CORPORATE';
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  documentType: 'ID' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'OTHER';
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  clientType?: 'REGULAR' | 'FREQUENT' | 'VIP' | 'CORPORATE';
  notes?: string;
  isActive?: boolean;
}

export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  documentType?: 'ID' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'OTHER';
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  clientType?: 'REGULAR' | 'FREQUENT' | 'VIP' | 'CORPORATE';
  notes?: string;
  isActive?: boolean;
}

export interface ClientFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
  clientType?: string;
}
