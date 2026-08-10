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

export type OrderStatus = 'Pendente' | 'Em Preparo' | 'Pronto' | 'Saiu para Entrega' | 'Entregue';

export type OrderType = 'mesa' | 'balcao' | 'delivery';

export interface DeliveryAddress {
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference: string;
  deliveryInstructions?: string;
  phone: string;
  locationPhotoUrl?: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  code: string; // Ex: #1001
  table: string; // Mesa do cliente ou 'Balcão' / 'Delivery'
  customerName: string;
  orderType?: OrderType;
  customerPhone?: string;
  deliveryAddress?: DeliveryAddress;
  deliveryFee?: number;
  deliveryPin?: string;
  deliveryPhotoUrl?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;
  notes?: string;
  paymentMethod?: string;
  amountPaid?: number;
  cashChange?: number;
  archived?: boolean;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  role: 'client' | 'admin' | null;
}
