/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  ChefHat, 
  Plus, 
  Minus, 
  Clock, 
  Trash2, 
  Volume2, 
  Bell, 
  LogOut, 
  Database, 
  Smartphone, 
  Key, 
  Check, 
  AlertCircle, 
  Utensils, 
  ChevronRight, 
  Info, 
  Sparkles, 
  Heart, 
  HelpCircle,
  Copy,
  CheckCircle2,
  Calendar,
  Lock,
  User,
  Coffee,
  Search,
  Edit,
  X,
  Sun,
  Moon,
  Power,
  Store,
  Bike,
  MapPin,
  Home,
  Phone,
  ShieldCheck,
  Navigation,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SupabaseGuide from './components/SupabaseGuide';
import ReactNativeCode from './components/ReactNativeCode';
import { playKitchenWhistle, playOrderReadySound, playEasterEggSound } from './components/Buzzer';
import { Product, Order, OrderItem, AuthState, OrderStatus, OrderType, DeliveryAddress } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  // Global App View Mode: 'client' | 'admin'
  const [viewMode, setViewMode] = useState<'client' | 'admin'>('client');

  // Client Sub-View Tabs: 'registro' | 'cardapio' | 'carrinho' | 'pedidos'
  const [clientTab, setClientTab] = useState<'registro' | 'cardapio' | 'carrinho' | 'pedidos'>(() => {
    const savedToken = localStorage.getItem('edna_token');
    const savedRole = localStorage.getItem('edna_role');
    return (savedToken && savedRole === 'client') ? 'cardapio' : 'registro';
  });

  // Light/Dark theme mode state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('edna_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('edna_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);
  
  // Products and Orders states
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Archived orders (client-side tracking + persisted if DB column exists)
  const [archivedOrderIds, setArchivedOrderIds] = useState<string[]>([]);
  const [showArchivedOrders, setShowArchivedOrders] = useState(false);

  // Store Status State
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  // Authentication states
  const [auth, setAuth] = useState<AuthState>(() => {
    const savedToken = localStorage.getItem('edna_token');
    const savedRole = localStorage.getItem('edna_role') as 'client' | 'admin' | null;
    // To satisfy "quando entrar por link deve pedir a senha", do not auto-restore admin session
    if (savedRole === 'admin') {
      return {
        token: null,
        isAuthenticated: false,
        role: null
      };
    }
    return {
      token: savedToken,
      isAuthenticated: !!savedToken,
      role: savedRole
    };
  });
  const isAdmin = auth.isAuthenticated && auth.role === 'admin';

  // Client registration details
  const [clientName, setClientName] = useState(() => localStorage.getItem('edna_client_name') || '');
  const [clientTable, setClientTable] = useState(() => localStorage.getItem('edna_client_table') || '');
  const [rememberClient, setRememberClient] = useState(() => {
    const v = localStorage.getItem('edna_remember_client');
    return v === null ? true : v === 'true';
  });
  
  // Admin login details
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Client menu states
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [categories, setCategories] = useState<string[]>(['Lanches', 'Porções', 'Bebidas', 'Sobremesas']);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Crédito' | 'Débito' | 'Pix' | ''>('');
  const [amountPaid, setAmountPaid] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Delivery & Logistics states
  const [orderType, setOrderType] = useState<OrderType>('mesa');
  const [deliveryPhone, setDeliveryPhone] = useState(() => localStorage.getItem('edna_delivery_phone') || '');
  const [deliveryStreet, setDeliveryStreet] = useState(() => localStorage.getItem('edna_delivery_street') || '');
  const [deliveryNumber, setDeliveryNumber] = useState(() => localStorage.getItem('edna_delivery_number') || '');
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState(() => localStorage.getItem('edna_delivery_neighborhood') || '');
  const [deliveryComplement, setDeliveryComplement] = useState(() => localStorage.getItem('edna_delivery_complement') || '');
  const [deliveryReference, setDeliveryReference] = useState(() => localStorage.getItem('edna_delivery_reference') || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('Tocar campainha');
  const [deliveryPhotoFile, setDeliveryPhotoFile] = useState<File | null>(null);
  const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState<string | null>(null);
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string | null>(null);
  const deliveryFee = 5.00;

  // New product form states
  const [newProdName, setNewProdName] = useState('');
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // New category form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);

  // Search and edit product states
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [adminProductSearchTerm, setAdminProductSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Cart order confirmation state
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);

  // Auto reset confirmation if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      setShowOrderConfirmation(false);
    }
  }, [cart.length]);

  // Notification / Toast states
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'alert' }[]>([]);

  // Sound toggles
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Easter Egg states
  const [logoClicks, setLogoClicks] = useState(0);
  const [easterEggParticles, setEasterEggParticles] = useState<{ id: number; x: number; y: number; char: string }[]>([]);

  // Admin section sub-tab: 'orders' | 'products' | 'supabase' | 'reactnative'
  const [adminTab, setAdminTab] = useState<'orders' | 'products' | 'supabase' | 'reactnative'>('orders');

  // Order status filter in admin panel
  const [adminFilter, setAdminFilter] = useState<'Todos' | 'Pendente' | 'Em Preparo' | 'Pronto' | 'Saiu para Entrega' | 'Entregue'>('Todos');

  // Toast helper
  const showToast = (message: string, type: 'success' | 'info' | 'alert' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };
  // Fetch initial data
  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchCategories();
    fetchStoreStatus();
  }, []);

  const fetchStoreStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('loja_config')
        .select('aberta')
        .eq('id', 1)
        .single();
      if (error) throw error;
      setIsStoreOpen(data?.aberta ?? true);
    } catch (e) {
      console.error('Error fetching store status:', e);
    }
  };

  // Archive a delivered order (admin)
  const handleArchiveOrder = async (orderId: string) => {
    // Optimistic UI: mark archived locally and remove from visible orders
    setArchivedOrderIds(prev => prev.includes(orderId) ? prev : [...prev, orderId]);
    setOrders(prev => prev.filter(o => o.id !== orderId));

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ arquivado: true })
        .eq('id', orderId);
      if (error) {
        // If DB update fails, show message but keep local archive
        showToast('Falha ao arquivar no banco: ' + error.message, 'alert');
      } else {
        showToast('Pedido arquivado com sucesso.', 'success');
      }
    } catch (e: any) {
      console.error('Error archiving order:', e);
      showToast('Erro ao arquivar pedido: ' + e.message, 'alert');
    }
  };

  // Cancel order (Client - allowed only when status is 'Pendente')
  const handleCancelOrderClient = async (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder && targetOrder.status !== 'Pendente') {
      showToast('O pedido já está em preparo e não pode ser cancelado pelo app.', 'alert');
      return;
    }
    if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return;

    setOrders(prev => prev.filter(o => o.id !== orderId));

    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', orderId);
      if (error) throw error;
      showToast('Pedido cancelado com sucesso.', 'info');
    } catch (e: any) {
      console.error('Error canceling order:', e);
      showToast('Falha ao cancelar pedido: ' + e.message, 'alert');
      fetchOrders();
    }
  };

  // Delete all archived orders (admin)
  const handleClearArchived = async () => {
    if (archivedOrderIds.length === 0) {
      showToast('Não há pedidos arquivados para apagar.', 'info');
      return;
    }
    if (!window.confirm('Tem certeza que deseja apagar todos os pedidos arquivados? Essa ação é irreversível.')) return;

    // Optimistic UI: remove archived ids locally
    const idsToRemove = [...archivedOrderIds];
    setArchivedOrderIds([]);
    setOrders(prev => prev.filter(o => !idsToRemove.includes(o.id)));

    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .in('id', idsToRemove);
      if (error) throw error;
      showToast('Pedidos arquivados apagados com sucesso.', 'success');
    } catch (e: any) {
      console.error('Error deleting archived orders:', e);
      showToast('Falha ao apagar pedidos arquivados: ' + e.message, 'alert');
      // Refresh from server to recover state
      fetchOrders();
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('categoria');
      if (error) throw error;
      const distinct = Array.from(new Set((data || []).map((p: any) => p.categoria).filter(Boolean)));
      setCategories(distinct as string[]);
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        name: p.nome,
        description: p.descricao || '',
        price: Number(p.preco),
        category: p.categoria,
        image: p.imagem
      }));
      setProducts(mapped);
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const parseDeliveryFromOrderRow = (orderRow: any) => {
    let deliveryAddrParsed: DeliveryAddress | undefined = undefined;
    if (orderRow.deliveryAddress) {
      deliveryAddrParsed = orderRow.deliveryAddress;
    } else if (orderRow.endereco_entrega) {
      try {
        deliveryAddrParsed = typeof orderRow.endereco_entrega === 'string' 
          ? JSON.parse(orderRow.endereco_entrega) 
          : orderRow.endereco_entrega;
      } catch (e) {
        console.error('Error parsing endereco_entrega:', e);
      }
    }

    const mesaLower = (orderRow.mesa || '').toLowerCase();
    const parsedOrderType: OrderType = orderRow.tipo_pedido || (
      mesaLower.includes('delivery') ? 'delivery' :
      mesaLower.includes('balc') ? 'balcao' : 'mesa'
    );

    return {
      orderType: parsedOrderType,
      customerPhone: orderRow.cliente_telefone || deliveryAddrParsed?.phone || undefined,
      deliveryAddress: deliveryAddrParsed,
      deliveryFee: orderRow.taxa_entrega != null ? Number(orderRow.taxa_entrega) : (parsedOrderType === 'delivery' ? 5.00 : 0),
      deliveryPin: orderRow.pin_entrega || undefined
    };
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const fullOrders = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('pedido_itens')
            .select('quantidade, produtos(*)')
            .eq('pedido_id', order.id);
          if (itemsError) throw itemsError;

          const processedItems = (itemsData || []).map((item: any) => ({
            product: {
              id: item.produtos.id,
              name: item.produtos.nome,
              description: item.produtos.descricao || '',
              price: Number(item.produtos.preco),
              category: item.produtos.categoria,
              image: item.produtos.imagem
            },
            quantity: item.quantidade
          }));

          const delData = parseDeliveryFromOrderRow(order);

          return {
            id: order.id,
            code: order.codigo,
            table: order.mesa,
            customerName: order.cliente_nome,
            orderType: delData.orderType,
            customerPhone: delData.customerPhone,
            deliveryAddress: delData.deliveryAddress,
            deliveryFee: delData.deliveryFee,
            deliveryPin: delData.deliveryPin,
            items: processedItems,
            status: order.status,
            archived: Boolean(order.arquivado || order.archived),
            totalPrice: Number(order.preco_total),
            createdAt: order.created_at,
            notes: order.observacoes || '',
            paymentMethod: order.forma_pagamento || undefined,
            amountPaid: order.valor_pago != null ? Number(order.valor_pago) : undefined,
            cashChange: order.troco != null ? Number(order.troco) : undefined
          };
        })
      );
      setOrders(fullOrders);
      // populate archived ids for quick filtering
      setArchivedOrderIds(fullOrders.filter((o: any) => o.archived).map((o: any) => o.id));
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Real-time Event Handling via Supabase Realtime
  useEffect(() => {
    // 1. Listen to loja_config updates
    const configChannel = supabase
      .channel('loja-config-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'loja_config', filter: 'id=eq.1' },
        (payload) => {
          const isOpen = payload.new.aberta;
          setIsStoreOpen(isOpen);
          showToast(
            isOpen 
              ? '☀️ A Edna Lanches está aberta e recebendo novos pedidos!' 
              : '🌙 A Edna Lanches fechou temporariamente para novos pedidos.', 
            'info'
          );
        }
      )
      .subscribe();

    // 2. Listen to pedidos changes
    const pedidosChannel = supabase
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        async (payload) => {
          console.log('Real-time event received on pedidos:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            try {
              const { data: itemsData, error: itemsError } = await supabase
                .from('pedido_itens')
                .select('quantidade, produtos(*)')
                .eq('pedido_id', newOrder.id);
              if (itemsError) throw itemsError;

              const processedItems = (itemsData || []).map((item: any) => ({
                product: {
                  id: item.produtos.id,
                  name: item.produtos.nome,
                  description: item.produtos.descricao || '',
                  price: Number(item.produtos.preco),
                  category: item.produtos.categoria,
                  image: item.produtos.imagem
                },
                quantity: item.quantidade
              }));

              const delData = parseDeliveryFromOrderRow(newOrder);

              const completedOrder: Order = {
                id: newOrder.id,
                code: newOrder.codigo,
                table: newOrder.mesa,
                customerName: newOrder.cliente_nome,
                orderType: delData.orderType,
                customerPhone: delData.customerPhone,
                deliveryAddress: delData.deliveryAddress,
                deliveryFee: delData.deliveryFee,
                deliveryPin: delData.deliveryPin,
                items: processedItems,
                status: newOrder.status,
                totalPrice: Number(newOrder.preco_total),
                createdAt: newOrder.created_at,
                notes: newOrder.observacoes || '',
                paymentMethod: newOrder.forma_pagamento || undefined,
                amountPaid: newOrder.valor_pago != null ? Number(newOrder.valor_pago) : undefined,
                cashChange: newOrder.troco != null ? Number(newOrder.troco) : undefined
              };

              const savedClientName = localStorage.getItem('edna_client_name');
              const savedClientTable = localStorage.getItem('edna_client_table');
              const isOwnOrder =
                completedOrder.customerName === savedClientName &&
                (completedOrder.table === savedClientTable || completedOrder.orderType === 'delivery');

              if (isAdmin || isOwnOrder) {
                setOrders((prev) => {
                  if (prev.some(o => o.id === completedOrder.id)) return prev;
                  return [completedOrder, ...prev];
                });
              }

              if (isAdmin) {
                if (soundEnabled) {
                  playKitchenWhistle();
                }
                const labelMesa = completedOrder.orderType === 'delivery' ? '🛵 DELIVERY' : `Mesa ${completedOrder.table}`;
                showToast(`🔔 Novo pedido recebido: ${completedOrder.code} (${labelMesa})!`, 'info');
              }
            } catch (err) {
              console.error('Error handling new real-time order:', err);
            }
          }

          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            try {
              const { data: itemsData, error: itemsError } = await supabase
                .from('pedido_itens')
                .select('quantidade, produtos(*)')
                .eq('pedido_id', updatedOrder.id);
              if (itemsError) throw itemsError;

              const processedItems = (itemsData || []).map((item: any) => ({
                product: {
                  id: item.produtos.id,
                  name: item.produtos.nome,
                  description: item.produtos.descricao || '',
                  price: Number(item.produtos.preco),
                  category: item.produtos.categoria,
                  image: item.produtos.imagem
                },
                quantity: item.quantidade
              }));

              const delData = parseDeliveryFromOrderRow(updatedOrder);

              const completedOrder: Order = {
                id: updatedOrder.id,
                code: updatedOrder.codigo,
                table: updatedOrder.mesa,
                customerName: updatedOrder.cliente_nome,
                orderType: delData.orderType,
                customerPhone: delData.customerPhone,
                deliveryAddress: delData.deliveryAddress,
                deliveryFee: delData.deliveryFee,
                deliveryPin: delData.deliveryPin,
                items: processedItems,
                status: updatedOrder.status,
                totalPrice: Number(updatedOrder.preco_total),
                createdAt: updatedOrder.created_at,
                notes: updatedOrder.observacoes || '',
                paymentMethod: updatedOrder.forma_pagamento || undefined,
                amountPaid: updatedOrder.valor_pago != null ? Number(updatedOrder.valor_pago) : undefined,
                cashChange: updatedOrder.troco != null ? Number(updatedOrder.troco) : undefined
              };

              setOrders((prev) => prev.map((o) => (o.id === completedOrder.id ? completedOrder : o)));

              const savedClientName = localStorage.getItem('edna_client_name');

              if (completedOrder.customerName === savedClientName || completedOrder.orderType === 'delivery') {
                if (completedOrder.status === 'Em Preparo') {
                  showToast(`🍳 Edna está preparando o seu pedido ${completedOrder.code}!`, 'success');
                  if (soundEnabled) playOrderReadySound();
                } else if (completedOrder.status === 'Saiu para Entrega') {
                  showToast(`🛵 Seu pedido ${completedOrder.code} saiu para entrega com o motoboy!`, 'info');
                  if (soundEnabled) playOrderReadySound();
                  triggerNotification(`Seu lanche está a caminho! 🛵`, `O motoboy saiu com seu pedido ${completedOrder.code}. Prepare o código PIN ao receber!`);
                } else if (completedOrder.status === 'Pronto') {
                  showToast(`🎉 Pedido ${completedOrder.code} pronto! Venha ao balcão retirá-lo.`, 'success');
                  if (soundEnabled) playOrderReadySound();
                  triggerNotification(`Seu pedido ${completedOrder.code} está pronto!`, `Por favor, venha ao balcão para retirar o seu pedido.`);
                } else if (completedOrder.status === 'Entregue') {
                  showToast(`😋 Seu pedido ${completedOrder.code} foi entregue. Bom apetite!`, 'success');
                }
              }
            } catch (err) {
              console.error('Error handling updated real-time order:', err);
            }
          }

          if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    if ('Notification' in window && Notification.permission === 'default' && !isAdmin) {
      // Only ask non-admin clients for browser notification permission
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(pedidosChannel);
    };
  }, [soundEnabled, isAdmin]);

  const triggerNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '🍔'
      });
    }
  };

  // Client Authentication: Login (Offline / Local bypass)
  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performClientLogin(clientName, clientTable, rememberClient);
  };

  const performClientLogin = async (name: string, table: string, remember: boolean) => {
    if (!name.trim() || !table.trim()) {
      showToast('Por favor, informe seu Nome e o número da Mesa.', 'alert');
      return;
    }

    const mockToken = 'client-token-' + Date.now();
    setAuth({ token: mockToken, isAuthenticated: true, role: 'client' });
    localStorage.setItem('edna_token', mockToken);
    localStorage.setItem('edna_role', 'client');
    if (remember) {
      localStorage.setItem('edna_client_name', name);
      localStorage.setItem('edna_client_table', table);
      localStorage.setItem('edna_remember_client', 'true');
    } else {
      localStorage.removeItem('edna_client_name');
      localStorage.removeItem('edna_client_table');
      localStorage.setItem('edna_remember_client', 'false');
    }
    setClientTab('cardapio');
    showToast(`Bem-vindo(a) à mesa ${table}, ${name}!`, 'success');
  };

  // Admin Authentication: Login (Local check of fixed password)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (!adminPassword) {
      setAdminError('Digite a senha de administrador.');
      return;
    }

    if (adminPassword === 'desafio/app') {
      const mockToken = 'admin-token-' + Date.now();
      setAuth({
        token: mockToken,
        isAuthenticated: true,
        role: 'admin'
      });
      localStorage.setItem('edna_token', mockToken);
      localStorage.setItem('edna_role', 'admin');
      setAdminPassword('');
      showToast('Acesso de administrador autorizado!', 'success');
    } else {
      setAdminError('Senha incorreta para o Admin');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('edna_token');
    localStorage.removeItem('edna_role');
    setAuth({
      token: null,
      isAuthenticated: false,
      role: null
    });
    setClientTab('registro');
    showToast('Sessão encerrada com sucesso.', 'info');
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
    showToast(`${product.name} adicionado ao carrinho!`, 'success');
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removido do carrinho.', 'info');
  };

  const getCartTotal = () => {
    return cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  };

  const getGrandTotal = () => {
    const sub = getCartTotal();
    return sub + (orderType === 'delivery' ? deliveryFee : 0);
  };

  const getCashChange = () => {
    if (paymentMethod !== 'Dinheiro') return null;
    const total = getGrandTotal();
    const paid = Number(amountPaid);
    if (!Number.isFinite(paid) || paid < total) return null;
    return paid - total;
  };

  // Submit a new order to Supabase
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showToast('Seu carrinho está vazio!', 'alert');
      return;
    }

    if (orderType === 'delivery') {
      if (!deliveryPhone.trim()) {
        showToast('Por favor, informe seu telefone/WhatsApp para a entrega.', 'alert');
        return;
      }
      if (!deliveryStreet.trim() || !deliveryNumber.trim() || !deliveryNeighborhood.trim()) {
        showToast('Por favor, preencha o endereço completo (Rua, Número e Bairro).', 'alert');
        return;
      }
      if (!deliveryReference.trim()) {
        showToast('Por favor, inclua um ponto de referência para ajudar o motoboy!', 'alert');
        return;
      }

      // Persist delivery address in localStorage for future quick orders
      localStorage.setItem('edna_delivery_phone', deliveryPhone.trim());
      localStorage.setItem('edna_delivery_street', deliveryStreet.trim());
      localStorage.setItem('edna_delivery_number', deliveryNumber.trim());
      localStorage.setItem('edna_delivery_neighborhood', deliveryNeighborhood.trim());
      localStorage.setItem('edna_delivery_complement', deliveryComplement.trim());
      localStorage.setItem('edna_delivery_reference', deliveryReference.trim());
    }

    setSubmittingOrder(true);

    try {
      // Upload optional delivery location photo to Supabase Storage (non-blocking)
      let uploadedPhotoUrl: string | null = null;
      if (orderType === 'delivery' && deliveryPhotoFile) {
        try {
          const fileExt = deliveryPhotoFile.name.split('.').pop();
          const fileName = `delivery_${Date.now()}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('delivery-photos')
            .upload(fileName, deliveryPhotoFile, { upsert: false, contentType: deliveryPhotoFile.type });
          if (uploadErr) {
            console.warn('Foto não enviada (opcional):', uploadErr.message);
          } else if (uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('delivery-photos')
              .getPublicUrl(uploadData.path);
            uploadedPhotoUrl = publicUrlData.publicUrl;
          }
        } catch (photoErr) {
          console.warn('Erro ao fazer upload da foto (não crítico):', photoErr);
        }
      }

      let savedClientName = localStorage.getItem('edna_client_name') || '';
      let savedClientTable = localStorage.getItem('edna_client_table') || 'Mesa';

      if (!savedClientName && orderType === 'delivery') {
        savedClientName = `Cliente Delivery (${deliveryPhone.slice(-4)})`;
      } else if (!savedClientName) {
        savedClientName = 'Cliente';
      }

      // Auto authenticate guest as client if not authenticated
      if (!auth.isAuthenticated) {
        const guestToken = 'delivery_' + Date.now();
        localStorage.setItem('edna_token', guestToken);
        localStorage.setItem('edna_role', 'client');
        localStorage.setItem('edna_client_name', savedClientName);
        setAuth({ token: guestToken, isAuthenticated: true, role: 'client' });
        setClientName(savedClientName);
      }

      // 1. Verify if store is open
      const { data: config, error: configErr } = await supabase
        .from('loja_config')
        .select('aberta')
        .eq('id', 1)
        .single();
      if (configErr) throw configErr;
      if (config && !config.aberta) {
        showToast('A Edna Lanches está fechada no momento para novos pedidos.', 'alert');
        setSubmittingOrder(false);
        return;
      }

      // 2. Calculate grand total
      const total = getGrandTotal();

      if (paymentMethod === 'Dinheiro') {
        const paid = Number(amountPaid);
        if (!Number.isFinite(paid) || paid < total) {
          showToast(`Informe um valor em dinheiro maior ou igual ao total de R$ ${total.toFixed(2)}.`, 'alert');
          setSubmittingOrder(false);
          return;
        }
      }

      // 3. Generate unique sequential code & PIN
      const { data: ultimos, error: codeErr } = await supabase
        .from('pedidos')
        .select('codigo')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (codeErr) throw codeErr;
      const proxNum = ultimos && ultimos[0] 
        ? parseInt(ultimos[0].codigo.replace('#', ''), 10) + 1 
        : 1001;
      const codigo = '#' + proxNum;
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      const deliveryAddressObj: DeliveryAddress | undefined = orderType === 'delivery' ? {
        street: deliveryStreet.trim(),
        number: deliveryNumber.trim(),
        neighborhood: deliveryNeighborhood.trim(),
        complement: deliveryComplement.trim() || undefined,
        reference: deliveryReference.trim(),
        deliveryInstructions: deliveryInstructions || 'Tocar campainha',
        phone: deliveryPhone.trim(),
        locationPhotoUrl: uploadedPhotoUrl || undefined
      } : undefined;

      const mesaValue = orderType === 'delivery' ? 'Delivery' : (orderType === 'balcao' ? 'Balcão' : savedClientTable);

      const deliveryFormattedNotes = orderType === 'delivery'
        ? `[🛵 DELIVERY] Tel: ${deliveryPhone.trim()} | Endereço: ${deliveryStreet.trim()}, ${deliveryNumber.trim()} - ${deliveryNeighborhood.trim()}${deliveryComplement ? ' (' + deliveryComplement.trim() + ')' : ''} | Ref: ${deliveryReference.trim()} | Inst: ${deliveryInstructions} | PIN: ${pin}${uploadedPhotoUrl ? ' | Foto: ' + uploadedPhotoUrl : ''}${orderNotes ? ' | Obs: ' + orderNotes : ''}`
        : (orderNotes || '');

      // 4. Insert order header
      const baseOrderPayload = {
        codigo,
        mesa: mesaValue,
        cliente_nome: savedClientName,
        preco_total: total,
        observacoes: deliveryFormattedNotes,
        forma_pagamento: paymentMethod || 'Não informado',
        status: 'Pendente' as const
      };

      let newOrder: any = null;
      let insertSuccess = false;

      // --- Tentativa 1: payload completo (com colunas extras de delivery) ---
      try {
        const fullPayload = {
          ...baseOrderPayload,
          valor_pago: paymentMethod === 'Dinheiro' ? Number(amountPaid || 0) : null,
          troco: paymentMethod === 'Dinheiro' ? (getCashChange() ?? 0) : null,
          tipo_pedido: orderType,
          cliente_telefone: orderType === 'delivery' ? deliveryPhone.trim() : null,
          endereco_entrega: deliveryAddressObj ? JSON.stringify(deliveryAddressObj) : null,
          taxa_entrega: orderType === 'delivery' ? deliveryFee : 0,
          pin_entrega: orderType === 'delivery' ? pin : null
        };
        const r1 = await supabase.from('pedidos').insert([fullPayload]).select().single();
        if (!r1.error) { newOrder = r1.data; insertSuccess = true; }
        else { console.warn('[pedidos] Tentativa 1 falhou:', r1.error.message); }
      } catch (e: any) { console.warn('[pedidos] Tentativa 1 excecao:', e?.message); }

      // --- Tentativa 2: base + valor_pago/troco (sem colunas de delivery) ---
      if (!insertSuccess) {
        try {
          const midPayload = {
            ...baseOrderPayload,
            valor_pago: paymentMethod === 'Dinheiro' ? Number(amountPaid || 0) : null,
            troco: paymentMethod === 'Dinheiro' ? (getCashChange() ?? 0) : null
          };
          const r2 = await supabase.from('pedidos').insert([midPayload]).select().single();
          if (!r2.error) { newOrder = r2.data; insertSuccess = true; }
          else { console.warn('[pedidos] Tentativa 2 falhou:', r2.error.message); }
        } catch (e: any) { console.warn('[pedidos] Tentativa 2 excecao:', e?.message); }
      }

      // --- Tentativa 3: mínimo absoluto (colunas garantidas do schema original) ---
      if (!insertSuccess) {
        try {
          const r3 = await supabase.from('pedidos').insert([baseOrderPayload]).select().single();
          if (!r3.error) { newOrder = r3.data; insertSuccess = true; }
          else { console.warn('[pedidos] Tentativa 3 falhou:', r3.error.message); throw r3.error; }
        } catch (e: any) {
          console.error('[pedidos] Todas as tentativas falharam:', e?.message);
          throw e;
        }
      }

      if (!newOrder) throw new Error('Não foi possível criar o pedido no banco de dados.');


      // 5. Insert order items
      const itensParaInserir = cart.map(item => ({
        pedido_id: newOrder.id,
        produto_id: item.product.id,
        quantidade: item.quantity
      }));

      const { error: errItens } = await supabase
        .from('pedido_itens')
        .insert(itensParaInserir);

      if (errItens) throw errItens;

      setCart([]);
      setOrderNotes('');
      setPaymentMethod('');
      setAmountPaid('');
      setDeliveryPhotoFile(null);
      setDeliveryPhotoPreview(null);
      setDeliveryPhotoUrl(null);
      showToast('🎉 Pedido enviado para a cozinha da Edna!', 'success');
    } catch (e) {
      console.error('Error submitting order:', e);
      showToast('Falha ao enviar o pedido para o Supabase.', 'alert');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Update Order Status (Admin action)
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    // 1. Optimistically update local UI state immediately
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select();

      if (error) throw error;

      // If data is empty, it means RLS policy blocked the update (or the row doesn't exist)
      if (!data || data.length === 0) {
        showToast('Erro: Bloqueado por política RLS. É necessário habilitar a política de UPDATE para pedidos no Supabase.', 'alert');
        // Revert local state by fetching orders again
        fetchOrders();
        return;
      }

      showToast(`Status atualizado para: ${newStatus}`, 'success');
    } catch (e: any) {
      console.error('Error updating status:', e);
      showToast('Falha ao atualizar status no banco: ' + e.message, 'alert');
      // Revert local state
      fetchOrders();
    }
  };

  // Create a product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice || !newProdCategory || !newProdImage.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'alert');
      return;
    }
    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Por favor, insira um preço válido maior que zero.', 'alert');
      return;
    }
    setSubmittingProduct(true);
    try {
      const { error } = await supabase
        .from('produtos')
        .insert([{
          nome: newProdName.trim(),
          descricao: newProdDescription.trim(),
          preco: priceNum,
          categoria: newProdCategory,
          imagem: newProdImage.trim()
        }]);

      if (error) throw error;

      showToast('Produto adicionado ao cardápio com sucesso!', 'success');
      setNewProdName('');
      setNewProdDescription('');
      setNewProdPrice('');
      setNewProdCategory('');
      setNewProdImage('');
      fetchProducts(); // Refresh products
    } catch (err: any) {
      showToast(err.message || 'Erro ao adicionar produto', 'alert');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Delete a product
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este produto do cardápio?')) return;
    
    // Force immediate local deletion (optimistic UI update)
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (editingProduct?.id === productId) {
      cancelEditing();
    }
    
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', productId);
      if (error) throw error;
      showToast('Produto removido com sucesso.', 'success');
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast('Erro ao remover produto do banco.', 'alert');
    }
  };

  // Update a product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!newProdName.trim() || !newProdPrice || !newProdCategory || !newProdImage.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'alert');
      return;
    }
    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Por favor, insira um preço válido maior que zero.', 'alert');
      return;
    }
    setSubmittingProduct(true);
    try {
      const { error } = await supabase
        .from('produtos')
        .update({
          nome: newProdName.trim(),
          descricao: newProdDescription.trim(),
          preco: priceNum,
          categoria: newProdCategory,
          imagem: newProdImage.trim()
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      showToast('Produto atualizado com sucesso!', 'success');
      setNewProdName('');
      setNewProdDescription('');
      setNewProdPrice('');
      setNewProdCategory('');
      setNewProdImage('');
      setEditingProduct(null);
      fetchProducts(); // Refresh products
    } catch (err: any) {
      showToast(err.message || 'Erro ao atualizar produto', 'alert');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Start editing a product
  const startEditing = (prod: Product) => {
    setEditingProduct(prod);
    setNewProdName(prod.name);
    setNewProdDescription(prod.description || '');
    setNewProdPrice(prod.price.toString());
    setNewProdCategory(prod.category);
    setNewProdImage(prod.image);
    
    // Scroll form into view if needed
    const formElement = document.getElementById('product-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cancel editing a product
  const cancelEditing = () => {
    setEditingProduct(null);
    setNewProdName('');
    setNewProdDescription('');
    setNewProdPrice('');
    setNewProdCategory('');
    setNewProdImage('');
  };

  // Create a category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Insira um nome para a categoria.', 'alert');
      return;
    }
    setSubmittingCategory(true);
    try {
      const trimmed = newCategoryName.trim();
      setCategories((prev) => Array.from(new Set([...prev, trimmed])));
      showToast(`Categoria "${trimmed}" criada!`, 'success');
      setNewCategoryName('');
    } catch (err) {
      showToast('Erro ao criar categoria', 'alert');
    } finally {
      setSubmittingCategory(false);
    }
  };

  // Reset demo orders
  const handleResetOrders = async () => {
    if (!window.confirm('Deseja realmente resetar o histórico de pedidos de demonstração?')) return;
    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      setOrders([]);
      showToast('Histórico resetado.', 'success');
    } catch (e) {
      showToast('Falha ao resetar histórico.', 'alert');
    }
  };

  // Toggle store open/closed status
  const handleToggleStore = async () => {
    try {
      const nextStatus = !isStoreOpen;
      const { error } = await supabase
        .from('loja_config')
        .update({ aberta: nextStatus })
        .eq('id', 1);
      
      if (error) throw error;

      setIsStoreOpen(nextStatus);
      showToast(
        nextStatus 
          ? '🏪 Loja aberta com sucesso!' 
          : '🔒 Loja fechada temporariamente para novos pedidos!', 
        'success'
      );
    } catch (e) {
      showToast('Erro ao alterar status da loja.', 'alert');
    }
  };

  // Interactive logo click handler (Hidden trigger for Cozinha/Admin view)
  const handleLogoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Create subtle particles for visual feedback
    const emojis = ['🍔', '🍟', '🥤', '🍳'];
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: clickX,
      y: clickY,
      char: emojis[Math.floor(Math.random() * emojis.length)]
    }));

    setEasterEggParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setEasterEggParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1500);

    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);

    if (soundEnabled) {
      playEasterEggSound();
    }

    if (nextClicks >= 5) {
      setLogoClicks(0);
      const targetMode = viewMode === 'admin' ? 'client' : 'admin';
      
      // If leaving admin, clear admin auth credentials so returning always requires a password
      if (targetMode === 'client' && auth.role === 'admin') {
        localStorage.removeItem('edna_token');
        localStorage.removeItem('edna_role');
        setAuth({
          token: null,
          isAuthenticated: false,
          role: null
        });
      }
      
      setViewMode(targetMode);
      showToast(targetMode === 'admin' ? '🔐 Digite a senha para acessar a Cozinha!' : '🍔 Modo Cliente ativado!', 'info');
    }
  };

  // Filter products by category and search term
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesSearch = menuSearchTerm.trim() === '' || 
      p.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) || 
      p.description.toLowerCase().includes(menuSearchTerm.toLowerCase()) || 
      p.category.toLowerCase().includes(menuSearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter admin products list by search term
  const filteredAdminProducts = products.filter((p) => {
    if (!adminProductSearchTerm.trim()) return true;
    const search = adminProductSearchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search)
    );
  });

  // Filter orders by status for Admin view
  const filteredOrders = orders.filter((o) => {
    const isArchived = !!(o as any).archived;
    if (showArchivedOrders) {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }
    return adminFilter === 'Todos' || o.status === adminFilter;
  });

  // Active client orders
  const clientActiveOrders = orders.filter(
    (o) => o.customerName === clientName && o.table === clientTable
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-rose-200 selection:text-rose-950" id="edna-app-root">
      {/* Top Header Selector */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Edna Logo and Brand with interactive Hidden trigger */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer select-none active:scale-95 transition-transform relative group"
            id="brand-logo"
            title="Edna Lanches - Mesa Inteligente"
          >
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md border border-red-500 relative overflow-hidden group-hover:rotate-6 transition-transform">
              🍳
              {/* Subtle shining light across logo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-red-600 transition-colors">
                Edna Lanches
              </h1>
              <span className="text-[10px] font-mono uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold tracking-widest">
                Mesa Inteligente
              </span>
            </div>

            {/* Interactive particles for Easter Egg */}
            <AnimatePresence>
              {easterEggParticles.map((particle) => (
                <motion.span
                  key={particle.id}
                  initial={{ opacity: 1, scale: 0.5, x: particle.x - 20, y: particle.y - 20 }}
                  animate={{ 
                    opacity: 0, 
                    scale: 1.5, 
                    x: particle.x - 20 + (Math.random() * 120 - 60), 
                    y: particle.y - 20 + (Math.random() * -150 - 50) 
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute pointer-events-none text-lg select-none"
                >
                  {particle.char}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={() => {
                const targetTheme = theme === 'light' ? 'dark' : 'light';
                setTheme(targetTheme);
                showToast(
                  targetTheme === 'dark' 
                    ? '🌙 Modo escuro ativado!' 
                    : '☀️ Modo claro ativado!', 
                  'info'
                );
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Sound Toggle Button */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                showToast(soundEnabled ? 'Som silenciado' : 'Sons ativados!', 'info');
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
              title={soundEnabled ? 'Silenciar apito de cozinha' : 'Ativar apito de cozinha'}
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Admin / Cozinha Access Icon Button */}
            <button
              onClick={() => {
                // Clear any active admin auth session so entering always requests the password
                localStorage.removeItem('edna_token');
                localStorage.removeItem('edna_role');
                setAuth({
                  token: null,
                  isAuthenticated: false,
                  role: null
                });
                
                const targetMode = viewMode === 'admin' ? 'client' : 'admin';
                setViewMode(targetMode);
                showToast(
                  targetMode === 'admin' 
                    ? '🔐 Digite a senha para acessar a Cozinha!' 
                    : '🍔 Modo Cliente ativado!', 
                  'info'
                );
              }}
              className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                viewMode === 'admin'
                  ? 'bg-red-600 border-red-500 text-white hover:bg-red-700 active:scale-95'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 active:scale-95'
              }`}
              title={viewMode === 'admin' ? 'Voltar para o Cardápio do Cliente' : 'Acessar o Painel da Cozinha'}
              id="header-cozinha-btn"
            >
              <ChefHat className="w-4 h-4 animate-bounce" />
              <span className="hidden sm:inline font-extrabold uppercase tracking-wider text-[10px]">
                {viewMode === 'admin' ? 'Cardápio' : 'Cozinha'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-28" id="app-main-view">

        {/* -------------------------------------- */}
        {/* CLIENTE VIEW MODULE                    */}
        {/* -------------------------------------- */}
        {/* -------------------------------------- */}
        {/* CLIENTE VIEW MODULE                    */}
        {/* -------------------------------------- */}
        {viewMode === 'client' && (
          <div className="space-y-6" id="client-view">
            {/* Conditional Tab Rendering */}
            
            {/* 1. MESA / REGISTRO TAB */}
            {clientTab === 'registro' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-6"
                id="client-tab-registro"
              >
                {!auth.isAuthenticated || auth.role !== 'client' ? (
                  // Full register screen
                  <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 scale-150">
                      <ShoppingBag className="w-64 h-64" />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <span className="bg-white/20 text-white text-[10px] tracking-wider uppercase font-extrabold px-3 py-1 rounded-full border border-white/10">
                        Entrar na Mesa
                      </span>
                      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        Faça o seu pedido sem sair da mesa!
                      </h2>
                      <p className="text-red-100 text-sm leading-relaxed">
                        Informe o seu nome e o número da mesa em que está sentado. Edna preparará seu lanche fresquinho e enviaremos o sinal em tempo real!
                      </p>

                      <form onSubmit={handleClientLogin} className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Seu Nome (Ex: Carlos)"
                            className="w-full bg-white text-slate-800 placeholder:text-slate-400 font-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 shadow-inner"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={clientTable}
                            onChange={(e) => setClientTable(e.target.value)}
                            placeholder="Mesa (Ex: 04)"
                            className="w-full bg-white text-slate-800 placeholder:text-slate-400 font-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 shadow-inner"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-slate-900 text-white font-extrabold rounded-xl text-sm py-3 px-4 hover:bg-slate-950 transition-all flex items-center justify-center gap-1.5 shadow active:scale-98 cursor-pointer"
                        >
                          <Utensils className="w-4 h-4" />
                          Ver Cardápio
                        </button>
                      </form>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-white/90">
                          <input
                            type="checkbox"
                            checked={rememberClient}
                            onChange={(e) => setRememberClient(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-[13px]">Lembrar meus dados</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => performClientLogin('Balcão', '0', rememberClient)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-3 rounded-xl shadow"
                          >
                            Balcão
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Active logged in state screen with welcome card
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6" id="client-banner">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 font-extrabold text-xl shadow-inner shrink-0">
                          M{clientTable}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-rose-600 font-bold tracking-wider uppercase">Sua Mesa Está Ativa</p>
                          <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">
                            Mesa {clientTable} — <span className="text-rose-600">{clientName}</span>
                          </h3>
                          <p className="text-slate-500 text-xs">
                            Sua conexão com a cozinha está sincronizada em tempo real! ⚡
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-stretch md:self-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                          JWT Ativo 🔐
                        </span>
                        <button
                          onClick={handleLogout}
                          className="p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 border border-transparent transition-all shrink-0 cursor-pointer"
                          title="Sair da mesa"
                        >
                          <LogOut className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick helper board to guide the user */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-6 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        O que você deseja fazer agora?
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          onClick={() => setClientTab('cardapio')}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl transition-all shadow-sm text-left flex items-start gap-3 cursor-pointer"
                        >
                          <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                            <Utensils className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs block">Ver o Cardápio</span>
                            <span className="text-[10px] text-slate-400">Escolher hambúrgueres, porções e bebidas</span>
                          </div>
                        </button>

                        <button
                          onClick={() => setClientTab('carrinho')}
                          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl transition-all shadow-sm text-left flex items-start gap-3 cursor-pointer"
                        >
                          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs block">Ver Carrinho</span>
                            <span className="text-[10px] text-slate-400">Revisar e confirmar seu pedido atual ({cart.length} itens)</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. CARDAPIO TAB */}
            {clientTab === 'cardapio' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
                id="client-tab-cardapio"
              >
                {/* Store Closed Warning Banner */}
                {!isStoreOpen && (
                  <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏪</span>
                      <div>
                        <h4 className="font-extrabold text-xs">Loja Fechada Temporariamente</h4>
                        <p className="text-[10px] text-red-600 leading-relaxed mt-0.5">
                          A Edna Lanches está fechada no momento! Sinta-se à vontade para navegar pelo nosso cardápio, mas novos pedidos estão temporariamente desativados.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual Banner showing table context if authenticated */}
                {auth.isAuthenticated && auth.role === 'client' && (
                  <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Pedindo na <strong>Mesa {clientTable}</strong> para <strong>{clientName}</strong></span>
                    </div>
                    <button 
                      onClick={() => setClientTab('registro')}
                      className="text-slate-400 hover:text-white font-semibold text-[10px] hover:underline cursor-pointer"
                    >
                      Alterar Mesa
                    </button>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative" id="client-search-bar">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                    placeholder="Buscar no cardápio de lanches... (Ex: bacon, batata, x-tudo)"
                    className="w-full text-xs pl-10 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm transition-all"
                  />
                  {menuSearchTerm && (
                    <button
                      onClick={() => setMenuSearchTerm('')}
                      className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-3" id="categories-scroller">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Categorias de Lanches</h3>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scroll">
                    {['Todos', ...categories].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat === 'Todos' && '🌐 '}
                        {cat === 'Lanches' && '🍔 '}
                        {cat === 'Porções' && '🍟 '}
                        {cat === 'Bebidas' && '🥤 '}
                        {cat === 'Sobremesas' && '🍮 '}
                        {!['Todos', 'Lanches', 'Porções', 'Bebidas', 'Sobremesas'].includes(cat) && '⭐ '}
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visitor warning if not authenticated */}
                {(!auth.isAuthenticated || auth.role !== 'client') && (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Você está no <strong>modo visitante</strong>. Defina sua mesa para poder pedir!</span>
                    </div>
                    <button
                      onClick={() => setClientTab('registro')}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                    >
                      Definir Mesa
                    </button>
                  </div>
                )}

                {/* Products List Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="products-grid">
                  {loadingProducts ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                      Carregando cardápio Edna Lanches...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                      Nenhum produto nesta categoria.
                    </div>
                  ) : (
                    filteredProducts.map((prod) => (
                      <motion.div
                        layoutId={`prod_${prod.id}`}
                        key={prod.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-rose-200 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner overflow-hidden">
                            {prod.image && (prod.image.startsWith('http://') || prod.image.startsWith('https://') || prod.image.startsWith('/') || prod.image.startsWith('data:')) ? (
                              <img src={prod.image} alt={prod.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              prod.image || '🍔'
                            )}
                          </div>
                          <div className="space-y-1">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
                              {prod.category}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                              {prod.name}
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                              {prod.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                          <span className="font-extrabold text-red-600 text-base">
                            R$ {prod.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => addToCart(prod)}
                            className="bg-rose-50 border border-rose-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. CARRINHO TAB */}
            {clientTab === 'carrinho' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto space-y-6"
                id="client-tab-carrinho"
              >
                {/* Shopping Cart Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5" id="shopping-cart">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-red-600" />
                      <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Carrinho de Lanches</h3>
                    </div>
                    {cart.length > 0 && (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                        {cart.reduce((a, c) => a + c.quantity, 0)} itens
                      </span>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <span className="text-5xl animate-bounce">🛒</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">Seu carrinho está vazio</p>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Nenhum lanche foi adicionado ainda. Explore o cardápio da Edna e monte seu banquete!
                        </p>
                      </div>
                      <button
                        onClick={() => setClientTab('cardapio')}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Navegar pelo Cardápio
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Cart Items List */}
                      <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scroll pr-1">
                        {cart.map((item) => (
                          <div key={item.product.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-slate-800 text-xs truncate">
                                {item.product.name}
                              </h5>
                              <span className="text-xs text-slate-400 font-bold">
                                R$ {item.product.price.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Quantity control */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-extrabold text-xs text-slate-800 w-5 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.product.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all ml-1 cursor-pointer"
                                title="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Type Selector */}
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block flex items-center justify-between">
                          <span>Como você deseja receber o pedido?</span>
                          <span className="text-rose-600 font-bold">Escolha abaixo</span>
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setOrderType('mesa')}
                            className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              orderType === 'mesa'
                                ? 'bg-slate-900 text-white border-slate-900 shadow'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <span className="text-base">🪑</span>
                            <span className="text-[11px]">Na Mesa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderType('balcao')}
                            className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              orderType === 'balcao'
                                ? 'bg-slate-900 text-white border-slate-900 shadow'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            <span className="text-base">🛍️</span>
                            <span className="text-[11px]">Retirar Balcão</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderType('delivery')}
                            className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              orderType === 'delivery'
                                ? 'bg-rose-600 text-white border-rose-600 shadow ring-2 ring-rose-300'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-rose-400'
                            }`}
                          >
                            <span className="text-base animate-bounce">🛵</span>
                            <span className="text-[11px]">Delivery</span>
                          </button>
                        </div>
                      </div>

                      {/* Delivery Address Form */}
                      {orderType === 'delivery' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 space-y-3 shadow-inner"
                        >
                          <div className="flex items-center gap-2 border-b border-rose-200/50 pb-2 text-rose-900 font-extrabold text-xs">
                            <Bike className="w-4 h-4 text-rose-600" />
                            <span>Dados de Entrega a Domicílio</span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-600 block">
                              Telefone / WhatsApp <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                              <input
                                type="tel"
                                value={deliveryPhone}
                                onChange={(e) => setDeliveryPhone(e.target.value)}
                                placeholder="(11) 99999-9999"
                                className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600 block">
                                Rua / Avenida <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={deliveryStreet}
                                onChange={(e) => setDeliveryStreet(e.target.value)}
                                placeholder="Rua das Flores"
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600 block">
                                Número <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={deliveryNumber}
                                onChange={(e) => setDeliveryNumber(e.target.value)}
                                placeholder="123"
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600 block">
                                Bairro <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={deliveryNeighborhood}
                                onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                                placeholder="Centro"
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600 block">
                                Complemento
                              </label>
                              <input
                                type="text"
                                value={deliveryComplement}
                                onChange={(e) => setDeliveryComplement(e.target.value)}
                                placeholder="Apto 42 / Bloco B"
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-rose-800 block flex items-center gap-1">
                              <span>Ponto de Referência</span>
                              <span className="text-red-500">*</span>
                              <span className="text-[9px] text-rose-600 font-normal italic">(Ajuda o motoboy a te encontrar)</span>
                            </label>
                            <input
                              type="text"
                              value={deliveryReference}
                              onChange={(e) => setDeliveryReference(e.target.value)}
                              placeholder="Ex: Em frente à farmácia São João, portão azul"
                              className="w-full text-xs p-2.5 bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-600 block">
                              Instrução para o Motoboy ao Chegar
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                '🔔 Tocar campainha',
                                '📱 Ligar ao chegar',
                                '🚪 Chamar no portão',
                                '🏢 Deixar na portaria'
                              ].map((inst) => (
                                <button
                                  key={inst}
                                  type="button"
                                  onClick={() => setDeliveryInstructions(inst)}
                                  className={`p-2 rounded-xl text-[11px] font-semibold border transition-all text-left cursor-pointer ${
                                    deliveryInstructions === inst
                                      ? 'bg-rose-600 text-white border-rose-600 shadow'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
                                  }`}
                                >
                                  {inst}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Optional Location Photo Upload */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-600 block flex items-center gap-1.5">
                              <span>📷 Foto do Local</span>
                              <span className="text-[9px] text-slate-400 font-normal italic lowercase">(opcional — ajuda o motoboy a encontrar)</span>
                            </label>
                            {deliveryPhotoPreview ? (
                              <div className="relative">
                                <img
                                  src={deliveryPhotoPreview}
                                  alt="Prévia da foto do local"
                                  className="w-full h-32 object-cover rounded-xl border border-rose-200 shadow-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => { setDeliveryPhotoFile(null); setDeliveryPhotoPreview(null); }}
                                  className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-white border border-slate-200 text-slate-700 rounded-full p-1 shadow transition-all cursor-pointer"
                                  title="Remover foto"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <span className="absolute bottom-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                                  ✓ Foto selecionada
                                </span>
                              </div>
                            ) : (
                              <label
                                htmlFor="delivery-photo-upload"
                                className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-rose-200 rounded-xl bg-white hover:bg-rose-50/50 cursor-pointer transition-all"
                              >
                                <span className="text-2xl">📷</span>
                                <span className="text-[11px] text-slate-500 font-medium">Toque para tirar ou escolher foto</span>
                                <input
                                  id="delivery-photo-upload"
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setDeliveryPhotoFile(file);
                                      const reader = new FileReader();
                                      reader.onloadend = () => setDeliveryPhotoPreview(reader.result as string);
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Payment Method */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Forma de Pagamento <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['Pix', 'Dinheiro', 'Crédito', 'Débito'] as const).map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                paymentMethod === method
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                              }`}
                            >
                              {method === 'Pix' ? '💸 Pix' : method === 'Dinheiro' ? '💵 Dinheiro' : method === 'Crédito' ? '💳 Crédito' : '💳 Débito'}
                            </button>
                          ))}
                        </div>
                        {!paymentMethod && (
                          <p className="text-[10px] text-amber-600 font-medium">Selecione uma forma de pagamento para continuar.</p>
                        )}
                      </div>

                      {/* Order Notes */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Observações do Pedido</label>
                        <textarea
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="Ex: sem cebola, ponto da carne, gelo no copo..."
                          rows={2}
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400 transition-all resize-none"
                        />
                      </div>

                      {paymentMethod === 'Dinheiro' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Valor Pago em Dinheiro</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            placeholder={`Ex: ${Math.ceil(getGrandTotal() / 10) * 10}`}
                            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-slate-400 transition-all"
                          />
                          {amountPaid && Number(amountPaid) >= getGrandTotal() && (
                            <p className="text-[10px] font-semibold text-emerald-700">
                              Troco estimado: R$ {((Number(amountPaid) - getGrandTotal()) || 0).toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Total Summary */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Subtotal dos Lanches:</span>
                          <span>R$ {getCartTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>{orderType === 'delivery' ? 'Taxa de Entrega (Delivery):' : 'Taxa de Atendimento:'}</span>
                          <span className={orderType === 'delivery' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {orderType === 'delivery' ? `+ R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200">
                          <span className="font-bold text-slate-800 text-sm">Total Geral:</span>
                          <span className="font-extrabold text-red-600 text-xl">
                            R$ {getGrandTotal().toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Submit Button with Confirmation logic */}
                      {!isStoreOpen ? (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex flex-col gap-2 text-center">
                          <p className="text-xs font-bold text-red-800">
                            🏪 A Edna Lanches está Fechada no Momento
                          </p>
                          <p className="text-[11px] text-red-600 leading-relaxed">
                            No momento a cozinha está desativada para novos pedidos. Por favor, aguarde alguns instantes ou fale com o atendente.
                          </p>
                        </div>
                      ) : orderType === 'mesa' && (!auth.isAuthenticated || auth.role !== 'client') ? (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col gap-3">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Para consumo no local, informe sua mesa antes de enviar o pedido.
                            </p>
                          </div>
                          <button
                            onClick={() => setClientTab('registro')}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all text-center cursor-pointer active:scale-95"
                          >
                            Ir para Registro de Mesa
                          </button>
                        </div>
                      ) : showOrderConfirmation ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-3 shadow-inner"
                        >
                          <div className="flex items-center gap-2 text-emerald-800">
                            <AlertCircle className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                            <h4 className="font-bold text-xs">Revisar e Enviar Pedido?</h4>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {orderType === 'delivery' 
                              ? `Confirmar pedido com entrega no valor total de R$ ${getGrandTotal().toFixed(2)}?` 
                              : `Edna começará a preparar o seu pedido imediatamente na cozinha. Confirmar o envio de R$ ${getGrandTotal().toFixed(2)}?`}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowOrderConfirmation(false)}
                              className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all border border-slate-200 cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await handleSubmitOrder();
                                setShowOrderConfirmation(false);
                                setClientTab('pedidos'); // Redirect to tracking automatically!
                              }}
                              disabled={submittingOrder}
                              className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                            >
                              {submittingOrder ? 'Enviando...' : 'Confirmar'}
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <button
                          onClick={() => {
                            if (!paymentMethod) {
                              showToast('Por favor, selecione uma forma de pagamento.', 'alert');
                              return;
                            }
                            if (orderType === 'delivery') {
                              if (!deliveryPhone.trim() || !deliveryStreet.trim() || !deliveryNumber.trim() || !deliveryNeighborhood.trim() || !deliveryReference.trim()) {
                                showToast('Por favor, preencha todos os campos do endereço de entrega.', 'alert');
                                return;
                              }
                            }
                            setShowOrderConfirmation(true);
                          }}
                          disabled={submittingOrder}
                          className={`w-full text-white font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-[0.98] ${
                            orderType === 'delivery' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          {orderType === 'delivery' ? 'Enviar Pedido de Entrega 🛵' : 'Enviar Pedido para Cozinha'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 4. PEDIDOS TAB */}
            {clientTab === 'pedidos' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto space-y-6"
                id="client-tab-pedidos"
              >
                {/* Active Orders Track panel */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5" id="client-active-orders">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-red-600" />
                      <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Acompanhar Meus Pedidos</h3>
                    </div>
                    {clientActiveOrders.length > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                        {clientActiveOrders.length} ativos
                      </span>
                    )}
                  </div>

                  {!auth.isAuthenticated || auth.role !== 'client' ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <span className="text-5xl">🔒</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">Acesso Restrito</p>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Você precisa estar com um pedido realizado para ver o status dos seus lanches.
                        </p>
                      </div>
                      <button
                        onClick={() => setClientTab('cardapio')}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Fazer um Pedido
                      </button>
                    </div>
                  ) : clientActiveOrders.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <span className="text-5xl animate-pulse">📋</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">Nenhum pedido ativo</p>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Você ainda não tem nenhum pedido ativo na cozinha da Edna.
                        </p>
                      </div>
                      <button
                        onClick={() => setClientTab('cardapio')}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Fazer Meu Primeiro Pedido
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientActiveOrders.map((ord) => (
                        <div key={ord.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3 shadow-sm">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-800">{ord.code}</span>
                                {ord.orderType === 'delivery' ? (
                                  <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    🛵 Delivery
                                  </span>
                                ) : (
                                  <span className="bg-slate-200 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    Mesa {ord.table}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {ord.id.substring(0, 8)}</span>
                            </div>
                            <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                              ord.status === 'Pendente' && 'bg-amber-100 text-amber-800'
                            } ${
                              ord.status === 'Em Preparo' && 'bg-blue-100 text-blue-800 animate-pulse'
                            } ${
                              ord.status === 'Saiu para Entrega' && 'bg-purple-600 text-white shadow-lg animate-bounce'
                            } ${
                              ord.status === 'Pronto' && 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300 animate-bounce'
                            } ${
                              ord.status === 'Entregue' && 'bg-slate-200 text-slate-700'
                            }`}>
                              {ord.status === 'Saiu para Entrega' ? '🛵 Saiu para Entrega!' : ord.status}
                            </span>
                          </div>

                          {/* Status helper text */}
                          {ord.status === 'Pendente' && (
                            <p className="text-xs text-slate-500 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                              ⌛ Aguardando confirmação da Edna. Logo começará a ser preparado!
                            </p>
                          )}
                          {ord.status === 'Em Preparo' && (
                            <p className="text-xs text-blue-700 font-semibold leading-relaxed bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">
                              🍳 O lanche está na chapa! O cheiro está incrível!
                            </p>
                          )}
                          {ord.status === 'Saiu para Entrega' && (
                            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl space-y-1">
                              <p className="text-xs text-purple-900 font-extrabold flex items-center gap-1.5">
                                <Bike className="w-4 h-4 text-purple-600 animate-bounce" />
                                <span>O motoboy já está a caminho da sua casa!</span>
                              </p>
                              <p className="text-[11px] text-purple-700">Fique atento ao portão/interfone e esteja com o código PIN em mãos.</p>
                            </div>
                          )}
                          {ord.status === 'Pronto' && (
                            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                              <p className="text-xs text-emerald-800 font-extrabold">🎉 Pronto! Seu pedido está pronto. Venha ao balcão para retirar!</p>
                            </div>
                          )}
                          {ord.status === 'Entregue' && (
                            <p className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-xl">
                              😋 Pedido entregue! Bom apetite! Esperamos que goste.
                            </p>
                          )}

                          {/* PIN display for delivery orders */}
                          {ord.orderType === 'delivery' && ord.deliveryPin && ord.status !== 'Entregue' && (
                            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between shadow-inner">
                              <div>
                                <span className="text-[10px] uppercase font-extrabold text-rose-800 block flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                                  <span>PIN de Segurança de Entrega</span>
                                </span>
                                <span className="text-[10px] text-rose-600 font-medium">Informe este código ao motoboy:</span>
                              </div>
                              <span className="font-mono text-xl font-black bg-white px-3 py-1 rounded-xl border border-rose-300 text-rose-700 tracking-widest shadow">
                                {ord.deliveryPin}
                              </span>
                            </div>
                          )}

                          <div className="text-xs text-slate-600 font-medium border-t border-slate-100 pt-3 mt-1 space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">Itens do Pedido:</span>
                            <div>{ord.items.map(item => `${item.quantity}x ${item.product.name}`).join(', ')}</div>
                            <div className="font-bold text-slate-800 text-xs pt-1">
                              Total: R$ {ord.totalPrice.toFixed(2)}
                            </div>
                          </div>

                          {ord.notes && (
                            <div className="bg-white/80 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-500 font-mono italic">
                              <strong className="text-[9px] uppercase font-bold tracking-wider not-italic block text-slate-400">Obs / Endereço:</strong>
                              "{ord.notes}"
                            </div>
                          )}

                          {/* Client Cancellation Action / Lock */}
                          {ord.status === 'Pendente' ? (
                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => handleCancelOrderClient(ord.id)}
                                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all border border-red-200 cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Cancelar Pedido
                              </button>
                            </div>
                          ) : ord.status !== 'Entregue' ? (
                            <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-1.5">
                                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                                <span className="font-medium">Pedido em preparo/entrega (Trava Anti-Cancelamento ativada).</span>
                              </div>
                              <a
                                href={`https://wa.me/55${(ord.customerPhone || deliveryPhone || '11999999999').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá Edna Lanches! Preciso de ajuda com meu pedido ${ord.code}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shrink-0 shadow"
                              >
                                <Phone className="w-3 h-3" />
                                Falar no WhatsApp
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* -------------------------------------- */}
        {/* ADMIN / COZINHA VIEW MODULE            */}
        {/* -------------------------------------- */}
        {viewMode === 'admin' && (
          <div className="space-y-6" id="admin-view">
            
            {/* Admin Login Gate */}
            {!auth.isAuthenticated || auth.role !== 'admin' ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl space-y-6" id="admin-auth-gate">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto shadow">
                    🔐
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    Acesso da Cozinha & Admin
                  </h2>
                  <p className="text-slate-500 text-xs">
                    Insira a senha de desenvolvimento para gerenciar os pedidos em tempo real.
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Senha de Administrador
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-inner placeholder:text-slate-400"
                    />
                  </div>

                  {adminError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-2 rounded-lg text-xs font-semibold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {adminError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold rounded-xl text-sm py-3 px-4 hover:bg-slate-950 transition-all flex items-center justify-center gap-1.5 shadow"
                  >
                    Entrar no Painel
                  </button>
                </form>
              </div>
            ) : (
              // Logged in Admin Panel
              <div className="space-y-6" id="admin-panel">
                
                {/* Admin Toolbar / Header */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                      👩‍🍳
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-slate-900 text-base">Painel Edna Administrador</h2>
                        <button
                          onClick={handleToggleStore}
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            isStoreOpen 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                          }`}
                          title="Clique para alternar o status de funcionamento da loja"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          <span>{isStoreOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Real-time Order Dashboard & Tech Suite</p>
                    </div>
                  </div>

                  {/* Tab switches */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAdminTab('orders')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        adminTab === 'orders' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      Pedidos ({orders.length})
                    </button>
                    <button
                      onClick={() => setAdminTab('products')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        adminTab === 'products' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      Produtos ({products.length})
                    </button>
                    <button
                      onClick={() => setAdminTab('supabase')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        adminTab === 'supabase' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      Guia Supabase
                    </button>
                    <button
                      onClick={() => setAdminTab('reactnative')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        adminTab === 'reactnative' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Código React Native
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetOrders}
                      className="text-xs text-slate-400 hover:text-red-500 px-2 py-1.5 rounded transition-colors"
                      title="Resetar banco de dados de demonstração"
                    >
                      Resetar Demo
                    </button>
                    <button
                      onClick={() => setShowArchivedOrders((s) => !s)}
                      className={`text-xs px-2 py-1.5 rounded transition-colors ${showArchivedOrders ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}`}
                      title="Alternar visualização de pedidos arquivados"
                    >
                      {showArchivedOrders ? 'Exibir Ativos' : 'Exibir Arquivados'}
                    </button>
                    <button
                      onClick={handleClearArchived}
                      className="text-xs text-slate-400 hover:text-red-500 px-2 py-1.5 rounded transition-colors"
                      title="Apagar todos os pedidos arquivados"
                    >
                      Apagar Arquivados
                    </button>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Sair do Administrador"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ----------------- ADMIN SUBTAB: ORDERS ----------------- */}
                {adminTab === 'orders' && (
                  <div className="space-y-6">
                    {/* Filter counters */}
                    <div className="flex flex-wrap items-center gap-2">
                      {(['Todos', 'Pendente', 'Em Preparo', 'Saiu para Entrega', 'Pronto', 'Entregue'] as const).map((filter) => {
                        const count = filter === 'Todos' 
                          ? orders.length 
                          : orders.filter(o => o.status === filter).length;
                        return (
                          <button
                            key={filter}
                            onClick={() => setAdminFilter(filter)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              adminFilter === filter
                                ? filter === 'Saiu para Entrega'
                                  ? 'bg-purple-600 text-white shadow ring-2 ring-purple-300'
                                  : 'bg-slate-900 text-white shadow'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {filter === 'Saiu para Entrega' && <span>🛵</span>}
                            <span>{filter}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              adminFilter === filter ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Orders Real-time Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="kitchen-orders-panel">
                      {loadingOrders ? (
                        <div className="col-span-full py-16 text-center text-slate-400 font-semibold">
                          Carregando pedidos ativos...
                        </div>
                      ) : filteredOrders.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2 shadow-sm">
                          <ChefHat className="w-12 h-12 text-slate-300 mx-auto animate-bounce" />
                          <h4 className="font-bold text-slate-700 text-sm">Nenhum pedido encontrado</h4>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                            No momento não há nenhum pedido cadastrado com o status: <span className="font-semibold">{adminFilter}</span>.
                          </p>
                        </div>
                      ) : (
                        filteredOrders.map((ord) => {
                          const isDelivery = ord.orderType === 'delivery' || ord.table === 'Delivery' || !!ord.deliveryAddress;
                          const del = ord.deliveryAddress;
                          const phone = ord.customerPhone || del?.phone;
                          const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
                          const fullAddress = del ? `${del.street}, ${del.number} - ${del.neighborhood}${del.complement ? ' (' + del.complement + ')' : ''}` : '';

                          return (
                            <motion.div
                              key={ord.id}
                              layout
                              className={`bg-white rounded-2xl border hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                                isDelivery ? 'border-rose-200/90 ring-1 ring-rose-100' : 'border-slate-200'
                              }`}
                            >
                              {/* Card Header */}
                              <div className={`p-4 border-b flex items-center justify-between ${
                                isDelivery ? 'bg-rose-50/70 border-rose-100' : 'bg-slate-50 border-slate-100'
                              }`}>
                                <div>
                                  <span className="font-mono text-slate-500 text-xs font-bold">{ord.code}</span>
                                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                    <span>{ord.customerName}</span>
                                  </h4>
                                </div>
                                <div className={`font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-inner ${
                                  isDelivery ? 'bg-rose-600 text-white' : ord.table === 'Balcão' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'
                                }`}>
                                  {isDelivery ? '🛵 Delivery' : ord.table === 'Balcão' ? '🛍️ Balcão' : `Mesa ${ord.table}`}
                                </div>
                              </div>

                              {/* Card Content */}
                              <div className="p-4 flex-1 space-y-4">
                                {/* Delivery Address Box */}
                                {isDelivery && (
                                  <div className="bg-rose-50/60 border border-rose-200/80 p-3 rounded-xl space-y-2 text-xs text-rose-950 shadow-inner">
                                    <div className="flex items-center justify-between border-b border-rose-200/50 pb-1.5">
                                      <span className="font-extrabold text-[10px] uppercase text-rose-800 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-rose-600" />
                                        Endereço de Entrega
                                      </span>
                                      {cleanPhone && (
                                        <a
                                          href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${ord.customerName}! Seu pedido ${ord.code} da Edna Lanches já está sendo preparado!`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                          title="Abrir conversa no WhatsApp"
                                        >
                                          <Phone className="w-2.5 h-2.5" />
                                          WhatsApp
                                        </a>
                                      )}
                                    </div>

                                    {del ? (
                                      <div className="space-y-1 text-slate-700">
                                        <p className="font-bold text-xs leading-snug">
                                          {fullAddress}
                                        </p>
                                        <div className="bg-amber-100/80 border border-amber-200 text-amber-900 p-1.5 rounded-lg text-[11px] font-medium">
                                          <strong>📍 Ref:</strong> {del.reference}
                                        </div>
                                        {del.deliveryInstructions && (
                                          <p className="text-[11px] text-slate-600 italic">
                                            <strong>Instrução:</strong> {del.deliveryInstructions}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-600 italic">
                                        {ord.notes.startsWith('[🛵 DELIVERY]') ? ord.notes : 'Ver observações abaixo.'}
                                      </p>
                                    )}

                                    {fullAddress && (
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-blue-600 font-extrabold hover:underline inline-flex items-center gap-1 pt-1"
                                      >
                                        <Navigation className="w-3 h-3 text-blue-500" />
                                        Abrir Rota no Google Maps <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}

                                    {/* Location Photo from client */}
                                    {del?.locationPhotoUrl && (
                                      <div className="pt-2 space-y-1">
                                        <span className="text-[10px] uppercase font-bold text-rose-800 block">📷 Foto do Local:</span>
                                        <a href={del.locationPhotoUrl} target="_blank" rel="noopener noreferrer">
                                          <img
                                            src={del.locationPhotoUrl}
                                            alt="Foto do local de entrega"
                                            className="w-full h-28 object-cover rounded-lg border border-rose-200 shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                                          />
                                        </a>
                                        <p className="text-[9px] text-slate-400 italic">Clique para ampliar a foto</p>
                                      </div>
                                    )}

                                    {ord.deliveryPin && (
                                      <div className="pt-1 border-t border-rose-200/50 flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-rose-800">PIN de Confirmação:</span>
                                        <span className="font-mono font-black text-xs bg-white px-2 py-0.5 rounded border border-rose-300 text-rose-700 tracking-wider">
                                          {ord.deliveryPin}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Items list */}
                                <div className="space-y-2">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Produtos do Pedido</span>
                                  <div className="space-y-1">
                                    {ord.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-700 font-medium">
                                          <strong className="text-slate-950">{item.quantity}x</strong> {item.product.name}
                                        </span>
                                        <span className="text-slate-400 font-bold">
                                          R$ {(item.product.price * item.quantity).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Payment Method */}
                                {(ord.paymentMethod || (ord as any).forma_pagamento) && (
                                  <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-xs text-emerald-800 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[10px] uppercase text-emerald-700 shrink-0">Pagamento:</span>
                                        <span className="font-semibold">{ord.paymentMethod || (ord as any).forma_pagamento}</span>
                                      </div>
                                      {ord.deliveryFee ? (
                                        <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                                          + Taxa R$ {ord.deliveryFee.toFixed(2)}
                                        </span>
                                      ) : null}
                                    </div>
                                    {ord.amountPaid != null && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[10px] uppercase text-emerald-700 shrink-0">Pago:</span>
                                        <span className="font-semibold">R$ {ord.amountPaid.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {ord.cashChange != null && (
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[10px] uppercase text-emerald-700 shrink-0">Troco:</span>
                                        <span className="font-semibold">R$ {ord.cashChange.toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Order Notes */}
                                {ord.notes && !ord.notes.startsWith('[🛵 DELIVERY]') && (
                                  <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-xs text-red-800 space-y-0.5">
                                    <span className="font-bold text-[10px] uppercase text-red-600 block">Observação:</span>
                                    <p className="italic leading-relaxed">{ord.notes}</p>
                                  </div>
                                )}

                                {/* Total and Date info */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                  <span className="text-slate-400 text-xs font-medium">
                                    {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="font-extrabold text-slate-900 text-sm">
                                    Total: R$ {ord.totalPrice.toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Card Footer controls */}
                              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                                {ord.status === 'Pendente' && (
                                  <button
                                    onClick={() => handleUpdateStatus(ord.id, 'Em Preparo')}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors cursor-pointer"
                                  >
                                    Começar Preparo
                                  </button>
                                )}
                                {ord.status === 'Em Preparo' && (
                                  isDelivery ? (
                                    <button
                                      onClick={() => handleUpdateStatus(ord.id, 'Saiu para Entrega')}
                                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors animate-pulse flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Bike className="w-3.5 h-3.5" />
                                      Saiu para Entrega
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateStatus(ord.id, 'Pronto')}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors animate-pulse cursor-pointer"
                                    >
                                      Pronto (Chamar Cliente)
                                    </button>
                                  )
                                )}
                                {ord.status === 'Saiu para Entrega' && (
                                  <button
                                    onClick={() => {
                                      if (ord.deliveryPin) {
                                        const inputPin = window.prompt(`🔒 Confirmação de Entrega:\nPor favor, digite o PIN de 4 dígitos informado pelo cliente ou entregador:`);
                                        if (inputPin === null) return;
                                        if (inputPin.trim() === ord.deliveryPin.trim()) {
                                          handleUpdateStatus(ord.id, 'Entregue');
                                          showToast(`✅ PIN de entrega (${ord.deliveryPin}) verificado com sucesso!`, 'success');
                                        } else {
                                          showToast('❌ PIN incorreto! Verifique o código com o cliente/entregador.', 'alert');
                                        }
                                      } else {
                                        handleUpdateStatus(ord.id, 'Entregue');
                                      }
                                    }}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Validar PIN & Finalizar
                                  </button>
                                )}
                                {ord.status === 'Pronto' && (
                                  <button
                                    onClick={() => handleUpdateStatus(ord.id, 'Entregue')}
                                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors cursor-pointer"
                                  >
                                    Marcar Entregue
                                  </button>
                                )}
                                {ord.status === 'Entregue' && (
                                  <>
                                    <div className="flex-1 bg-slate-100 text-slate-500 font-bold text-xs py-2.5 rounded-xl text-center border border-slate-200">
                                      ✓ Finalizado
                                    </div>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleArchiveOrder(ord.id)}
                                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors cursor-pointer"
                                      >
                                        Arquivar
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* ----------------- ADMIN SUBTAB: PRODUCTS CATALOG MANAGEMENT ----------------- */}
                {adminTab === 'products' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="admin-products-manager">
                    {/* Left Column: Forms (Col 5) */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* Product Creation/Editing Form */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4" id="product-form-container">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          {editingProduct ? (
                            <>
                              <Edit className="w-5 h-5 text-amber-500" />
                              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Editar Produto</h3>
                            </>
                          ) : (
                            <>
                              <Plus className="w-5 h-5 text-red-600" />
                              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Adicionar Novo Produto</h3>
                            </>
                          )}
                        </div>

                        <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
                          {/* Product Name */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome do Produto *</label>
                            <input
                              type="text"
                              required
                              value={newProdName}
                              onChange={(e) => setNewProdName(e.target.value)}
                              placeholder="Ex: X-Bacon Supremo"
                              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>

                          {/* Description */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Descrição (Ingredientes, Tamanho)</label>
                            <textarea
                              value={newProdDescription}
                              onChange={(e) => setNewProdDescription(e.target.value)}
                              placeholder="Ex: Pão de brioche, carne de 150g, muito bacon crocante, cheddar derretido..."
                              rows={3}
                              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>

                          {/* Price & Category in same row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preço (R$) *</label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={newProdPrice}
                                onChange={(e) => setNewProdPrice(e.target.value)}
                                placeholder="Ex: 24.90"
                                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categoria *</label>
                              <select
                                required
                                value={newProdCategory}
                                onChange={(e) => setNewProdCategory(e.target.value)}
                                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                              >
                                <option value="">Selecione...</option>
                                {categories.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Image URL or Emoji */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Imagem (URL ou Emoji) *</label>
                            <input
                              type="text"
                              required
                              value={newProdImage}
                              onChange={(e) => setNewProdImage(e.target.value)}
                              placeholder="Insira um emoji 🍔 ou URL https://..."
                              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Dica: Você pode usar emojis ou colar qualquer link de imagem da internet.
                            </span>
                          </div>

                          <div className="flex gap-2">
                            {editingProduct && (
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all border border-slate-200 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={submittingProduct}
                              className={`${editingProduct ? 'w-2/3 bg-amber-500 hover:bg-amber-600 text-slate-950' : 'w-full bg-slate-900 hover:bg-slate-950 text-white'} font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer`}
                            >
                              {submittingProduct 
                                ? (editingProduct ? 'Salvando...' : 'Adicionando...') 
                                : (editingProduct ? 'Salvar Alterações' : 'Adicionar ao Cardápio')
                              }
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Category Creation Form */}
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Sparkles className="w-5 h-5 text-amber-500" />
                          <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Criar Nova Categoria</h3>
                        </div>

                        <form onSubmit={handleCreateCategory} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome da Categoria *</label>
                            <input
                              type="text"
                              required
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Ex: Combos, Sucos, Doces"
                              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingCategory}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer"
                          >
                            {submittingCategory ? 'Criando...' : 'Criar Categoria'}
                          </button>
                        </form>
                      </div>

                    </div>

                    {/* Right Column: Existing Products List (Col 7) */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm min-h-[400px]">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-red-600" />
                            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Produtos no Cardápio</h3>
                          </div>
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                            {filteredAdminProducts.length} itens
                          </span>
                        </div>

                        {/* Search Bar for Admin View */}
                        <div className="relative mb-4">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={adminProductSearchTerm}
                            onChange={(e) => setAdminProductSearchTerm(e.target.value)}
                            placeholder="Buscar por nome, ingrediente ou categoria..."
                            className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                          />
                          {adminProductSearchTerm && (
                            <button
                              onClick={() => setAdminProductSearchTerm('')}
                              className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full hover:bg-slate-200 transition-all cursor-pointer"
                              title="Limpar busca"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {loadingProducts ? (
                          <div className="py-16 text-center text-slate-400 font-semibold">
                            Carregando cardápio...
                          </div>
                        ) : filteredAdminProducts.length === 0 ? (
                          <div className="py-16 text-center text-slate-400 space-y-2">
                            <Utensils className="w-12 h-12 text-slate-200 mx-auto" />
                            <h4 className="font-bold text-slate-700 text-sm">Nenhum produto encontrado</h4>
                            <p className="text-xs text-slate-400">Experimente alterar a busca ou adicionar um novo produto.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scroll pr-2">
                            {filteredAdminProducts.map((prod) => (
                              <div key={prod.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Thumbnail */}
                                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-inner overflow-hidden border border-slate-100">
                                    {prod.image && (prod.image.startsWith('http://') || prod.image.startsWith('https://') || prod.image.startsWith('/') || prod.image.startsWith('data:')) ? (
                                      <img src={prod.image} alt={prod.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                    ) : (
                                      prod.image || '🍔'
                                    )}
                                  </div>
                                  
                                  {/* Name, Category and Price */}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-slate-900 text-xs truncate">{prod.name}</h4>
                                      <span className="bg-slate-100 text-slate-500 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                                        {prod.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate max-w-sm">{prod.description || 'Sem descrição.'}</p>
                                    <span className="text-xs font-extrabold text-red-600 mt-0.5 block">
                                      R$ {prod.price.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Actions: Edit & Delete */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Edit Button */}
                                  <button
                                    onClick={() => startEditing(prod)}
                                    className={`p-2 rounded-lg transition-all cursor-pointer ${
                                      editingProduct?.id === prod.id
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                    }`}
                                    title="Editar produto"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="Excluir produto"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------- ADMIN SUBTAB: SUPABASE CONNECTIVITY ----------------- */}
                {adminTab === 'supabase' && (
                  <SupabaseGuide />
                )}

                {/* ----------------- ADMIN SUBTAB: REACT NATIVE CODE ----------------- */}
                {adminTab === 'reactnative' && (
                  <ReactNativeCode />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Toast Notification Handler */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full" id="global-toasts">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`p-4 rounded-xl shadow-lg border text-xs font-semibold pointer-events-auto flex gap-2.5 items-start ${
                toast.type === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800'
              } ${
                toast.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-800'
              } ${
                toast.type === 'alert' && 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              {toast.type === 'info' && <Bell className="w-4 h-4 text-blue-600 shrink-0" />}
              {toast.type === 'alert' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              <p className="leading-relaxed">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Navigation Bar */}
      {viewMode === 'client' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-md animate-fade-in" id="floating-bottom-nav">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-3xl shadow-2xl border border-slate-800 flex items-center justify-around gap-1">
            {/* Registro/Mesa Button */}
            <button
              onClick={() => {
                setViewMode('client');
                setClientTab('registro');
              }}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'client' && clientTab === 'registro' ? 'text-rose-500 scale-105 font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
              title="Identificar Mesa"
            >
              <User className="w-5 h-5" />
              <span className="text-[9px] tracking-tight">Mesa</span>
            </button>

            {/* Menu Button */}
            <button
              onClick={() => {
                setViewMode('client');
                setClientTab('cardapio');
              }}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'client' && clientTab === 'cardapio' ? 'text-rose-500 scale-105 font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
              title="Ver Cardápio"
            >
              <Utensils className="w-5 h-5" />
              <span className="text-[9px] tracking-tight">Cardápio</span>
            </button>

            {/* Carrinho Button */}
            <button
              onClick={() => {
                setViewMode('client');
                setClientTab('carrinho');
              }}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer relative ${
                viewMode === 'client' && clientTab === 'carrinho' ? 'text-emerald-400 scale-105 font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
              title="Ver Carrinho"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[8px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
                    {cart.reduce((a, c) => a + c.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="text-[9px] tracking-tight">Carrinho</span>
            </button>

            {/* Meus Pedidos Button */}
            <button
              onClick={() => {
                setViewMode('client');
                setClientTab('pedidos');
              }}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all cursor-pointer relative ${
                viewMode === 'client' && clientTab === 'pedidos' ? 'text-amber-400 scale-105 font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
              title="Meus Pedidos na Mesa"
            >
              <div className="relative">
                <Clock className="w-5 h-5" />
                {clientActiveOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[8px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900">
                    {clientActiveOrders.length}
                  </span>
                )}
              </div>
              <span className="text-[9px] tracking-tight">Pedidos</span>
            </button>
          </div>
        </div>
      )}

      {/* Humble Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-400 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Edna Lanches Ltda. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 cursor-pointer">Termos</span>
            <span className="hover:text-slate-600 cursor-pointer">Privacidade</span>
            <span className="hover:text-slate-600 cursor-pointer">Suporte Técnico</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
