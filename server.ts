/*
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import { supabase } from './src/lib/supabase';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'edna-lanches-jwt-secret-desafio-app';

app.use(express.json());

// ---------- SSE clients ----------
let sseClients: any[] = [];

// Helper to broadcast event to all SSE clients
function broadcastEvent(type: string, data: any) {
  sseClients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });
}

// ---------- Helper Functions for Supabase ----------
async function getStoreOpen(): Promise<boolean> {
  const { data, error } = await supabase
    .from('loja_config')
    .select('aberta')
    .eq('id', 1)
    .single();
  if (error) {
    console.error('Erro ao buscar status da loja no Supabase:', error);
    throw error;
  }
  return data?.aberta ?? true;
}

async function toggleStoreOpen(): Promise<boolean> {
  const current = await getStoreOpen();
  const { error } = await supabase
    .from('loja_config')
    .update({ aberta: !current })
    .eq('id', 1);
  if (error) {
    console.error('Erro ao atualizar status da loja no Supabase:', error);
    throw error;
  }
  return !current;
}

// ---------- Auth Middleware ----------
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
};

// ---------- Auth API ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin') {
    if (password === 'desafio/app') {
      const token = jwt.sign({ username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token, role: 'admin', name: 'Administrador Edna' });
    } else {
      return res.status(401).json({ error: 'Senha incorreta para o Admin' });
    }
  }

  const { table, name } = req.body;
  if (!table || !name) {
    return res.status(400).json({ error: 'Nome e Mesa são obrigatórios para clientes' });
  }

  const token = jwt.sign({ name, table, role: 'client' }, JWT_SECRET, { expiresIn: '12h' });
  return res.json({ token, role: 'client', name, table });
});

// ---------- Store Status API ----------
app.get('/api/store/status', async (req, res) => {
  try {
    const isOpen = await getStoreOpen();
    res.json({ isOpen });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar funcionamento da loja', details: err.message });
  }
});

app.post('/api/store/toggle', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  try {
    const isOpen = await toggleStoreOpen();
    broadcastEvent('STORE_STATUS_UPDATED', { isOpen });
    res.json({ success: true, isOpen });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao alterar funcionamento da loja', details: err.message });
  }
});

// ---------- Products API ----------
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    
    // Mapear propriedades do banco de dados para o modelo do front-end
    const products = data.map((p: any) => ({
      id: p.id,
      name: p.nome,
      description: p.descricao || '',
      price: Number(p.preco),
      category: p.categoria,
      image: p.imagem
    }));
    
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar produtos', details: err.message });
  }
});

app.post('/api/products', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin pode criar produtos.' });
  }
  const { name, description, price, category, image } = req.body;
  if (!name || price === undefined || !category || !image) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice)) {
    return res.status(400).json({ error: 'Preço deve ser um número válido' });
  }

  try {
    const { data, error } = await supabase
      .from('produtos')
      .insert([{
        nome: name,
        descricao: description || '',
        preco: parsedPrice,
        categoria: category,
        imagem: image
      }])
      .select()
      .single();

    if (error) throw error;

    const newProduct = {
      id: data.id,
      name: data.nome,
      description: data.descricao || '',
      price: Number(data.preco),
      category: data.categoria,
      image: data.imagem
    };

    res.status(201).json(newProduct);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao criar produto', details: err.message });
  }
});

app.delete('/api/products/:id', async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Produto deletado com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao deletar produto', details: err.message });
  }
});

app.put('/api/products/:id', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin pode editar produtos.' });
  }
  const { id } = req.params;
  const { name, description, price, category, image } = req.body;
  
  if (!name || price === undefined || !category || !image) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice)) {
    return res.status(400).json({ error: 'Preço deve ser um número válido' });
  }

  try {
    const { data, error } = await supabase
      .from('produtos')
      .update({
        nome: name,
        descricao: description || '',
        preco: parsedPrice,
        categoria: category,
        imagem: image
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const updatedProduct = {
      id: data.id,
      name: data.nome,
      description: data.descricao || '',
      price: Number(data.preco),
      category: data.categoria,
      image: data.imagem
    };

    res.json(updatedProduct);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar produto', details: err.message });
  }
});

// ---------- Categories API ----------
app.get('/api/categories', async (req, res) => {
  try {
    // Busca categorias distintas a partir dos produtos cadastrados
    const { data, error } = await supabase
      .from('produtos')
      .select('categoria');
    
    if (error) throw error;

    const categories = Array.from(
      new Set(data.map((p: any) => p.categoria).filter(Boolean))
    );

    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar categorias', details: err.message });
  }
});

app.post('/api/categories', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin pode gerenciar categorias.' });
  }
  const { category } = req.body;
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Nome da categoria inválido' });
  }
  // Como as categorias são dinamicamente lidas dos produtos cadastrados na tabela 'produtos',
  // retornamos a lista atual acrescida da nova categoria temporariamente.
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('categoria');
    
    if (error) throw error;

    const categoriesSet = new Set(data.map((p: any) => p.categoria).filter(Boolean));
    categoriesSet.add(category.trim());

    res.json({ success: true, categories: Array.from(categoriesSet) });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao criar categoria', details: err.message });
  }
});

// ---------- Orders APIs ----------
app.get('/api/orders', async (req, res) => {
  try {
    // Busca pedidos ordenados pelo mais recente
    const { data: ordersData, error: ordersError } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Para cada pedido, busca os itens associados
    const fullOrders = await Promise.all(
      ordersData.map(async (order: any) => {
        const { data: itemsData, error: itemsError } = await supabase
          .from('pedido_itens')
          .select('quantidade, produtos(*)')
          .eq('pedido_id', order.id);

        if (itemsError) throw itemsError;

        const processedItems = itemsData.map((item: any) => ({
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

    res.json(fullOrders);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar pedidos', details: err.message });
  }
});

// Submit a new order
app.post('/api/orders', async (req, res) => {
  try {
    const isOpen = await getStoreOpen();
    if (!isOpen) {
      return res.status(403).json({ error: 'A loja está fechada no momento para novos pedidos.' });
    }

    const { customerName, table, items, notes } = req.body;

    if (!customerName || !table || !items || items.length === 0) {
      return res.status(400).json({ error: 'Dados do pedido inválidos' });
    }

    // Busca os produtos informados para calcular o preço correto
    const productIds = items.map((i: any) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from('produtos')
      .select('*')
      .in('id', productIds);

    if (prodErr) throw prodErr;

    let total = 0;
    const processedItems = items.map((item: any) => {
      const prod = dbProducts.find((p: any) => p.id === item.productId);
      if (!prod) {
        throw new Error(`Produto não encontrado: ${item.productId}`);
      }
      total += Number(prod.preco) * item.quantity;
      return {
        product: {
          id: prod.id,
          name: prod.nome,
          description: prod.descricao || '',
          price: Number(prod.preco),
          category: prod.categoria,
          image: prod.imagem
        },
        quantity: item.quantity
      };
    });

    // Determina o próximo código sequencial de pedido
    const { data: lastOrder, error: codeErr } = await supabase
      .from('pedidos')
      .select('codigo')
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1001;
    if (codeErr && codeErr.code !== 'PGRST116') {
      // Ignora erro de registro não encontrado se for o primeiro pedido
      throw codeErr;
    }
    if (lastOrder && lastOrder.length > 0) {
      const lastCodeStr = lastOrder[0].codigo.replace('#', '');
      const lastNum = parseInt(lastCodeStr, 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }
    const code = `#${nextNumber}`;

    // Insere o pedido principal
    const { data: newOrderData, error: insertOrderErr } = await supabase
      .from('pedidos')
      .insert([{
        codigo: code,
        mesa: table,
        cliente_nome: customerName,
        status: 'Pendente',
        preco_total: total,
        observacoes: notes || ''
      }])
      .select()
      .single();

    if (insertOrderErr) throw insertOrderErr;

    // Insere os itens vinculados ao pedido
    const itemsPayload = items.map((item: any) => ({
      pedido_id: newOrderData.id,
      produto_id: item.productId,
      quantidade: item.quantity
    }));

    const { error: insertItemsErr } = await supabase
      .from('pedido_itens')
      .insert(itemsPayload);

    if (insertItemsErr) throw insertItemsErr;

    const completedOrder = {
      id: newOrderData.id,
      code: newOrderData.codigo,
      table: newOrderData.mesa,
      customerName: newOrderData.cliente_nome,
      items: processedItems,
      status: newOrderData.status,
      totalPrice: Number(newOrderData.preco_total),
      createdAt: newOrderData.created_at,
      notes: newOrderData.observacoes || ''
    };

    // Notifica os clientes SSE ativos sobre o novo pedido
    broadcastEvent('NEW_ORDER', completedOrder);

    res.status(201).json(completedOrder);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao registrar pedido', details: err.message });
  }
});

// Update order status (Admin only)
app.patch('/api/orders/:id/status', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin pode atualizar status.' });
  }

  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pendente', 'Em Preparo', 'Pronto', 'Entregue'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  try {
    const { data: updatedOrderData, error: updateErr } = await supabase
      .from('pedidos')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Recupera os itens da ordem para retornar o objeto completo atualizado
    const { data: itemsData, error: itemsError } = await supabase
      .from('pedido_itens')
      .select('quantidade, produtos(*)')
      .eq('pedido_id', updatedOrderData.id);

    if (itemsError) throw itemsError;

    const processedItems = itemsData.map((item: any) => ({
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
      id: updatedOrderData.id,
      code: updatedOrderData.codigo,
      table: updatedOrderData.mesa,
      customerName: updatedOrderData.cliente_nome,
      items: processedItems,
      status: updatedOrderData.status,
      totalPrice: Number(updatedOrderData.preco_total),
      createdAt: updatedOrderData.created_at,
      notes: updatedOrderData.observacoes || ''
    };

    // Broadcast the update in real-time
    broadcastEvent('STATUS_UPDATED', completedOrder);

    res.json(completedOrder);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar status do pedido', details: err.message });
  }
});

// Clean up old orders/reset (for development testing in admin panel)
app.post('/api/orders/reset', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    // Como pedido_itens tem "on delete cascade" para pedidos no DB, deletar de 'pedidos' limpa os itens.
    const { error: deleteErr } = await supabase
      .from('pedidos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (deleteErr) throw deleteErr;

    broadcastEvent('ORDERS_RESET', []);
    res.json({ success: true, orders: [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao reiniciar pedidos', details: err.message });
  }
});

// Real-time Event Stream (SSE)
app.get('/api/orders/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client.id !== clientId);
  });
});

// Integrate Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Edna Lanches running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
