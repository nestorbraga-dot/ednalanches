/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

export type OrderStatus = 'Pendente' | 'Em Preparo' | 'Pronto' | 'Entregue';

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  code: string; // Ex: #1001
  table: string; // Mesa do cliente
  customerName: string;
  items: OrderItem[];
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;
  notes?: string;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  role: 'client' | 'admin' | null;
}
