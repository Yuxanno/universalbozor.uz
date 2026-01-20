export type UserRole = 'admin' | 'cashier' | 'helper';

export interface User {
  _id: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface Product {
  _id: string;
  code: string;
  name: string;
  costPrice?: number;
  price: number;
  quantity: number;
  warehouse: string;
  category?: string;
  image?: string;
  minStock?: number;
}

export interface CartItem extends Product {
  cartQuantity: number;
  price: number; // Ensure price is always number
}

export interface Receipt {
  _id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card';
  cashier: User;
  customer?: Customer;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: User;
  createdAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  debt: number;
}

export interface Debt {
  _id: string;
  customer: Customer;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid' | 'blacklist';
  type?: 'receivable' | 'payable';
  description?: string;
  payments: Payment[];
  createdAt: string;
}

export interface Payment {
  amount: number;
  date: string;
  method: 'cash' | 'card';
}

export interface Warehouse {
  _id: string;
  name: string;
  address: string;
  products: Product[];
}

export interface Order {
  _id: string;
  customer: Customer;
  items: CartItem[];
  total: number;
  status: 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
}

export interface Stats {
  totalRevenue: number;
  todaySales: number;
  weekSales: number;
  monthSales: number;
  totalReceipts: number;
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
}
