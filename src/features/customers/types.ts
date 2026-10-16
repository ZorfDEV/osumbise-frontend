export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  creditLimit: string | null;
  balance: string;
  isActive: boolean;
}

export interface CustomerPayment {
  id: string;
  amount: string;
  method: string;
  note: string | null;
  createdAt: string;
}

export interface CustomerOrderSummary {
  id: string;
  total: string;
  createdAt: string;
  status: string;
  // Part réglée « sur le compte » (méthode CREDIT)
  payments: { amount: string }[];
}

// Séjour d'hôtel (ou part) mis sur le compte du client
export interface CustomerStayCharge {
  id: string;
  amount: string;
  createdAt: string;
  note: string | null;
  stay: { id: string; guestName: string; room: { number: string } };
}

export interface CustomerDetail extends Customer {
  orders: CustomerOrderSummary[];
  payments: CustomerPayment[];
  stayPayments: CustomerStayCharge[];
}
