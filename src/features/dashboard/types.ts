export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
}

export interface TopCategory {
  categoryId: string;
  name: string;
  profit: number;
}

// Hôtel : facturé (séjours terminés, avances conservées) et encaissé
export interface HotelReport {
  checkedOutStays: number;
  nights: number;
  lodging: number;
  stayTax: number;
  services?: number;
  cancellationFees: number;
  billed: number;
  received: Record<string, number>;
  receivedTotal: number;
  refunds: number;
  advancesHeld: number;
}

export interface DashboardSummary {
  period: { start: string; end: string };
  revenue: number;
  orderCount: number;
  clientCount: number;
  averageBasket: number;
  profit: number;
  merchandiseCost: number;
  expenses: number;
  margin: number;
  paymentBreakdown: Record<string, number>;
  topProducts: TopProduct[];
  topCategories: TopCategory[];
  // null si l'établissement n'a pas de chambres
  hotel?: HotelReport | null;
}

export interface HourlySales {
  period: { start: string; end: string };
  hourly: { hour: number; revenue: number }[];
}

export interface StaffPerformance {
  period: { start: string; end: string };
  staff: {
    userId: string;
    name: string;
    ordersCreated: number;
    revenue: number;
    cancelled: number;
  }[];
}
