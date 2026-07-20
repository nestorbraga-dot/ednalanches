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
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SupabaseGuide from './components/SupabaseGuide';
import ReactNativeCode from './components/ReactNativeCode';
import { playKitchenWhistle, playOrderReadySound, playEasterEggSound } from './components/Buzzer';
import { Product, Order, OrderItem, AuthState, OrderStatus } from './types';
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
  
  // Admin login details
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Client menu states
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [categories, setCategories] = useState<string[]>(['Lanches', 'Porções', 'Bebidas', 'Sobremesas']);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Crédito' | 'Débito' | 'Pix' | ''>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

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
  const [adminFilter, setAdminFilter] = useState<'Todos' | 'Pendente' | 'Em Preparo' | 'Pronto' | 'Entregue'>('Todos');

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

          return {
            id: order.id,
            code: order.codigo,
            table: order.mesa,
            customerName: order.cliente_nome,
            items: processedItems,
            status: order.status,
            totalPrice: Number(order.preco_total),
            createdAt: order.created_at,
            notes: order.observacoes || ''
          };
        })
      );
      setOrders(fullOrders);
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

              const completedOrder = {
                id: newOrder.id,
                code: newOrder.codigo,
                table: newOrder.mesa,
                customerName: newOrder.cliente_nome,
                items: processedItems,
                status: newOrder.status,
                totalPrice: Number(newOrder.preco_total),
                createdAt: newOrder.created_at,
                notes: newOrder.observacoes || ''
              };

              const savedClientName = localStorage.getItem('edna_client_name');
              const savedClientTable = localStorage.getItem('edna_client_table');
              const isOwnOrder =
                completedOrder.customerName === savedClientName &&
                completedOrder.table === savedClientTable;

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
                showToast(`🔔 Novo pedido recebido: ${completedOrder.code} da Mesa ${completedOrder.table}!`, 'info');
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

              const completedOrder = {
                id: updatedOrder.id,
                code: updatedOrder.codigo,
                table: updatedOrder.mesa,
                customerName: updatedOrder.cliente_nome,
                items: processedItems,
                status: updatedOrder.status,
                totalPrice: Number(updatedOrder.preco_total),
                createdAt: updatedOrder.created_at,
                notes: updatedOrder.observacoes || ''
              };

              setOrders((prev) => prev.map((o) => (o.id === completedOrder.id ? completedOrder : o)));

              const savedClientName = localStorage.getItem('edna_client_name');
              const savedClientTable = localStorage.getItem('edna_client_table');

              if (
                completedOrder.customerName === savedClientName &&
                completedOrder.table === savedClientTable
              ) {
                if (completedOrder.status === 'Em Preparo') {
                  showToast(`🍳 Edna está preparando o seu pedido ${completedOrder.code}!`, 'success');
                  if (soundEnabled) playOrderReadySound();
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
    if (!clientName.trim() || !clientTable.trim()) {
      showToast('Por favor, informe seu Nome e o número da Mesa.', 'alert');
      return;
    }

    const mockToken = 'client-token-' + Date.now();
    setAuth({
      token: mockToken,
      isAuthenticated: true,
      role: 'client'
    });
    localStorage.setItem('edna_token', mockToken);
    localStorage.setItem('edna_role', 'client');
    localStorage.setItem('edna_client_name', clientName);
    localStorage.setItem('edna_client_table', clientTable);
    setClientTab('cardapio');
    showToast(`Bem-vindo(a) à mesa ${clientTable}, ${clientName}!`, 'success');
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

  // Submit a new order to Supabase
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showToast('Seu carrinho está vazio!', 'alert');
      return;
    }

    setSubmittingOrder(true);
    try {
      const savedClientName = localStorage.getItem('edna_client_name') || 'Cliente';
      const savedClientTable = localStorage.getItem('edna_client_table') || 'Mesa';

      // 1. Verify if store is open
      const { data: config, error: configErr } = await supabase
        .from('loja_config')
        .select('aberta')
        .eq('id', 1)
        .single();
      if (configErr) throw configErr;
      if (config && !config.aberta) {
        showToast('A Edna Lanches está fechada no momento para novos pedidos.', 'alert');
        return;
      }

      // 2. Calculate total price from products in cart
      const total = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);

      // 3. Generate unique sequential code
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

      // 4. Insert order header
      const { data: newOrder, error: errPedido } = await supabase
        .from('pedidos')
        .insert([{
          codigo,
          mesa: savedClientTable,
          cliente_nome: savedClientName,
          preco_total: total,
          observacoes: orderNotes || '',
          forma_pagamento: paymentMethod || 'Não informado',
          status: 'Pendente'
        }])
        .select()
        .single();

      if (errPedido) throw errPedido;

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
  const filteredOrders = orders.filter(
    (o) => adminFilter === 'Todos' || o.status === adminFilter
  );

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

                      {/* Total Summary */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Subtotal:</span>
                          <span>R$ {getCartTotal().toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Taxa de Mesa:</span>
                          <span className="text-emerald-600 font-bold">Grátis</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200">
                          <span className="font-bold text-slate-800 text-sm">Total Geral:</span>
                          <span className="font-extrabold text-red-600 text-xl">
                            R$ {getCartTotal().toFixed(2)}
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
                      ) : !auth.isAuthenticated || auth.role !== 'client' ? (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col gap-3">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Você precisa registrar a sua mesa antes de enviar o pedido para a cozinha!
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
                            Edna começará a preparar o seu pedido imediatamente na cozinha. Confirmar o envio de <strong>R$ {getCartTotal().toFixed(2)}</strong>?
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
                                setClientTab('pedidos'); // Redirect to tracking automatically! Amazing!
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
                            setShowOrderConfirmation(true);
                          }}
                          disabled={submittingOrder}
                          className="w-full bg-emerald-600 text-white font-extrabold text-xs py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          Enviar Pedido para Cozinha
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
                      <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Meus Pedidos na Mesa</h3>
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
                          Você precisa estar autenticado em uma mesa para poder ver os pedidos ativos.
                        </p>
                      </div>
                      <button
                        onClick={() => setClientTab('registro')}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Identificar Minha Mesa
                      </button>
                    </div>
                  ) : clientActiveOrders.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <span className="text-5xl animate-pulse">📋</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-700">Nenhum pedido ativo</p>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Você ainda não fez nenhum pedido nesta mesa para a cozinha de Edna.
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
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-sm text-slate-800 block">{ord.code}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {ord.id.substring(0, 8)}</span>
                            </div>
                            <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                              ord.status === 'Pendente' && 'bg-amber-100 text-amber-800'
                            } ${
                              ord.status === 'Em Preparo' && 'bg-blue-100 text-blue-800 animate-pulse'
                            } ${
                              ord.status === 'Pronto' && 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300 animate-bounce'
                            } ${
                              ord.status === 'Entregue' && 'bg-slate-200 text-slate-700'
                            }`}>
                              {ord.status}
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
                              🍳 O lanche está no fogo! A frigideira está quente e o cheiro está ótimo!
                            </p>
                          )}
                          {ord.status === 'Pronto' && (
                            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                              <p className="text-xs text-emerald-800 font-extrabold">🎉 Pronto! Seu pedido está pronto. Venha ao balcão para retirar!</p>
                            </div>
                          )}
                          {ord.status === 'Entregue' && (
                            <p className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-xl">
                              😋 Pedido retirado! Bom apetite! Esperamos que goste.
                            </p>
                          )}

                          <div className="text-xs text-slate-600 font-medium border-t border-slate-100 pt-3 mt-1">
                            <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">Itens do Pedido:</span>
                            {ord.items.map(item => `${item.quantity}x ${item.product.name}`).join(', ')}
                          </div>
                          {ord.notes && (
                            <div className="bg-white/80 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-500 font-mono italic">
                              <strong className="text-[9px] uppercase font-bold tracking-wider not-italic block text-slate-400">Obs:</strong>
                              "{ord.notes}"
                            </div>
                          )}
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
                      {(['Todos', 'Pendente', 'Em Preparo', 'Pronto', 'Entregue'] as const).map((filter) => {
                        const count = filter === 'Todos' 
                          ? orders.length 
                          : orders.filter(o => o.status === filter).length;
                        return (
                          <button
                            key={filter}
                            onClick={() => setAdminFilter(filter)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              adminFilter === filter
                                ? 'bg-slate-900 text-white shadow'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {filter} ({count})
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
                        filteredOrders.map((ord) => (
                          <motion.div
                            key={ord.id}
                            layout
                            className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm overflow-hidden flex flex-col justify-between"
                          >
                            {/* Card Header */}
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="font-mono text-slate-500 text-xs font-bold">{ord.code}</span>
                                <h4 className="font-bold text-slate-900 text-sm">{ord.customerName}</h4>
                              </div>
                              <div className="bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-inner">
                                Mesa {ord.table}
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-4 flex-1 space-y-4">
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
                              {(ord as any).forma_pagamento && (
                                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                                  <span className="font-bold text-[10px] uppercase text-emerald-700 shrink-0">Pagamento:</span>
                                  <span className="font-semibold">{(ord as any).forma_pagamento}</span>
                                </div>
                              )}

                              {/* Order Notes */}
                              {ord.notes && (
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
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-xl shadow transition-colors"
                                >
                                  Começar Preparo
                                </button>
                              )}
                              {ord.status === 'Em Preparo' && (
                                <button
                                  onClick={() => handleUpdateStatus(ord.id, 'Pronto')}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl shadow transition-colors animate-pulse"
                                >
                                  Pronto (Chamar Cliente)
                                </button>
                              )}
                              {ord.status === 'Pronto' && (
                                <button
                                  onClick={() => handleUpdateStatus(ord.id, 'Entregue')}
                                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-xl shadow transition-colors"
                                >
                                  Marcar Entregue
                                </button>
                              )}
                              {ord.status === 'Entregue' && (
                                <div className="flex-1 bg-slate-100 text-slate-500 font-bold text-xs py-2 rounded-xl text-center border border-slate-200">
                                  ✓ Finalizado
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))
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
