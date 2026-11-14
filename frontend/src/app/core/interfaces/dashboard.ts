export interface DashboardStats {
  ticketsToday: number;
  vehiclesInside: number;
  revenueToday: number;
  availableSpots: number;
  totalSpots: number;
  occupiedSpots: number;
  occupancyPercentage: number;
  recentActivity: Array<{
    id: string;
    ticketNumber: string;
    plateNumber: string;
    entryTime: string;
    exitTime?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'LOST';
    paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'EXEMPT';
    totalAmount: number;
    spot?: { spotNumber: string; floor: number };
    lot?: { name: string };
    vehicle?: { brand?: string; model?: string; color?: string };
  }>;
  weeklyEntries: Array<{
    date: string;
    day: string;
    count: number;
  }>;
  parkingLotsSummary: Array<{
    id: string;
    name: string;
    totalSpots: number;
    availableSpots: number;
  }>;
}
