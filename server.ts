/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
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

// In-memory databases
let isStoreOpen = true;
let categories = ['Lanches', 'Porções', 'Bebidas', 'Sobremesas'];

let products = [
  {
    id: 'p1',
    name: 'X-Tudo Edna',
    description: 'Hambúrguer artesanal, queijo, presunto, bacon, ovo, alface, tomate e maionese da casa.',
    price: 25.0,
    category: 'Lanches',
    image: '🍔'
  },
  {
    id: 'p2',
    name: 'X-Salada',
    description: 'Pão brioche, carne de 120g, queijo prato derretido, alface, tomate e maionese verde.',
    price: 18.0,
    category: 'Lanches',
    image: '🍔'
  },
  {
    id: 'p3',
    name: 'Misto Quente',
    description: 'Pão de forma tostado com muita muçarela e presunto na chapa.',
    price: 10.0,
    category: 'Lanches',
    image: '🥪'
  },
  {
    id: 'p4',
    name: 'Batata Especial',
    description: 'Batata frita crocante com porção generosa de cheddar e farofa de bacon.',
    price: 22.0,
    category: 'Porções',
    image: '🍟'
  },
  {
    id: 'p5',
    name: 'Pastel de Queijo',
    description: 'Pastel frito na hora com recheio de muçarela derretida.',
    price: 8.0,
    category: 'Porções',
    image: '🥟'
  },
  {
    id: 'p6',
    name: 'Guaraná Caneca',
    description: 'Copo de 500ml de Guaraná Antarctica trincando de gelado com rodela de limão.',
    price: 6.0,
    category: 'Bebidas',
    image: '🥤'
  },
  {
    id: 'p7',
    name: 'Suco de Laranja',
    description: 'Suco de laranja natural espremido na hora de 400ml.',
    price: 8.0,
    category: 'Bebidas',
    image: '🍊'
  },
  {
    id: 'p8',
    name: 'Pudim de Leite',
    description: 'Fatia de pudim de leite condensado super cremoso com calda de caramelo.',
    price: 9.0,
    category: 'Sobremesas',
    image: '🍮'
  }
];

let orders = [
  {
    id: 'o1',
    code: '#1001',
    table: '04',
    customerName: 'Carlos Silva',
    items: [
      { product: products[0], quantity: 2 },
      { product: products[5], quantity: 2 }
    ],
    status: 'Pendente' as const,
    totalPrice: 62.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    notes: 'Sem cebola no hambúrguer, por favor.'
  },
  {
    id: 'o2',
    code: '#1002',
    table: '08',
    customerName: 'Amanda Oliveira',
    items: [
      { product: products[1], quantity: 1 },
      { product: products[3], quantity: 1 },
      { product: products[6], quantity: 1 }
    ],
    status: 'Em Preparo' as const,
    totalPrice: 48.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(), // 8 min ago
    notes: 'Suco sem açúcar.'
  }
];

// Active SSE client connections
let sseClients: any[] = [];

// Helper to broadcast event to all SSE clients
function broadcastEvent(type: string, data: any) {
  sseClients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });
}

// REST Endpoints

// Authentication Middleware
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

// Auth API
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

  // Se não for admin, faz login como cliente apenas com nome e mesa
  const { table, name } = req.body;
  if (!table || !name) {
    return res.status(400).json({ error: 'Nome e Mesa são obrigatórios para clientes' });
  }

  const token = jwt.sign({ name, table, role: 'client' }, JWT_SECRET, { expiresIn: '12h' });
  return res.json({ token, role: 'client', name, table });
});

// Store Status API
app.get('/api/store/status', (req, res) => {
  res.json({ isOpen: isStoreOpen });
});

app.post('/api/store/toggle', authenticateToken, (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  isStoreOpen = !isStoreOpen;
  broadcastEvent('STORE_STATUS_UPDATED', { isOpen: isStoreOpen });
  res.json({ success: true, isOpen: isStoreOpen });
});

// Products API
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', authenticateToken, (req: any, res: any) => {
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
  const newProduct = {
    id: 'p_' + Date.now(),
    name,
    description: description || '',
    price: parsedPrice,
    category,
    image
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.delete('/api/products/:id', (req: any, res: any) => {
  const { id } = req.params;
  products = products.filter(p => p.id !== id);
  res.json({ success: true, message: 'Produto deletado com sucesso' });
});

app.put('/api/products/:id', authenticateToken, (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin pode editar produtos.' });
  }
  const { id } = req.params;
  const { name, description, price, category, image } = req.body;
  
  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  if (!name || price === undefined || !category || !image) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice)) {
    return res.status(400).json({ error: 'Preço deve ser um número válido' });
  }

  products[productIndex] = {
    ...products[productIndex],
    name,
    description: description || '',
    price: parsedPrice,
    category,
    image
  };

  res.json(products[productIndex]);
});

// Categories API
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.post('/api/categories', authenticateToken, (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin pode gerenciar categorias.' });
  }
  const { category } = req.body;
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Nome da categoria inválido' });
  }
  const trimmed = category.trim();
  if (!categories.includes(trimmed)) {
    categories.push(trimmed);
  }
  res.json({ success: true, categories });
});

// Orders APIs
app.get('/api/orders', (req, res) => {
  // Ordenado por criação descendente
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sortedOrders);
});

// Submit a new order
app.post('/api/orders', (req, res) => {
  if (!isStoreOpen) {
    return res.status(403).json({ error: 'A loja está fechada no momento para novos pedidos.' });
  }

  const { customerName, table, items, notes } = req.body;

  if (!customerName || !table || !items || items.length === 0) {
    return res.status(400).json({ error: 'Dados do pedido inválidos' });
  }

  // Calculate code and total
  const nextNumber = orders.length + 1001;
  const code = `#${nextNumber}`;
  const id = `o_${Date.now()}`;

  let total = 0;
  const processedItems = items.map((item: any) => {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) {
      throw new Error(`Produto não encontrado: ${item.productId}`);
    }
    total += prod.price * item.quantity;
    return {
      product: prod,
      quantity: item.quantity
    };
  });

  const newOrder = {
    id,
    code,
    table,
    customerName,
    items: processedItems,
    status: 'Pendente' as const,
    totalPrice: total,
    createdAt: new Date().toISOString(),
    notes
  };

  orders.push(newOrder);

  // Broadcast to kitchen / active tabs
  broadcastEvent('NEW_ORDER', newOrder);

  res.status(201).json(newOrder);
});

// Update order status (Admin only)
app.patch('/api/orders/:id/status', authenticateToken, (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin pode atualizar status.' });
  }

  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pendente', 'Em Preparo', 'Pronto', 'Entregue'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const orderIndex = orders.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }

  orders[orderIndex].status = status;
  const updatedOrder = orders[orderIndex];

  // Broadcast the update in real-time
  broadcastEvent('STATUS_UPDATED', updatedOrder);

  res.json(updatedOrder);
});

// Clean up old orders/reset (for development testing in admin panel)
app.post('/api/orders/reset', authenticateToken, (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  orders = [
    {
      id: 'o1',
      code: '#1001',
      table: '04',
      customerName: 'Carlos Silva',
      items: [
        { product: products[0], quantity: 2 },
        { product: products[5], quantity: 2 }
      ],
      status: 'Pendente' as const,
      totalPrice: 62.0,
      createdAt: new Date().toISOString(),
      notes: 'Sem cebola no hambúrguer, por favor.'
    }
  ];

  broadcastEvent('ORDERS_RESET', orders);
  res.json({ success: true, orders });
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
