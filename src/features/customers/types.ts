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
}

export interface CustomerDetail extends Customer {
  orders: CustomerOrderSummary[];
  payments: CustomerPayment[];
}
