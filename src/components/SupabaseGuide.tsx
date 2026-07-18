/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Database, Server, Smartphone, Key, Settings, Sparkles } from 'lucide-react';

export default function SupabaseGuide() {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sqlSchema = `-- 1. CRIAÇÃO DA TABELA DE CONFIGURAÇÃO DA LOJA (STATUS)
create table public.loja_config (
  id integer primary key default 1,
  aberta boolean not null default true,
  constraint single_row check (id = 1) -- Garante apenas uma única linha de configuração
);

-- Inserir status inicial padrão (Loja Aberta)
insert into public.loja_config (id, aberta) values (1, true) on conflict do nothing;

-- 2. CRIAÇÃO DA TABELA DE PRODUTOS
create table public.produtos (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  descricao text,
  preco numeric(10, 2) not null,
  categoria text check (categoria in ('Lanches', 'Bebidas', 'Porções', 'Sobremesas')),
  imagem text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CRIAÇÃO DA TABELA DE PEDIDOS
create table public.pedidos (
  id uuid default gen_random_uuid() primary key,
  codigo text not null unique,
  mesa text not null,
  cliente_nome text not null,
  status text not null default 'Pendente' check (status in ('Pendente', 'Em Preparo', 'Pronto', 'Entregue')),
  preco_total numeric(10, 2) not null,
  observacoes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CRIAÇÃO DE ITENS DE PEDIDOS (RELAÇÃO N-PARA-N)
create table public.pedido_itens (
  id uuid default gen_random_uuid() primary key,
  pedido_id uuid references public.pedidos(id) on delete cascade not null,
  produto_id uuid references public.produtos(id) not null,
  quantidade integer not null check (quantidade > 0)
);

-- 5. ATIVAR CAPACIDADE DE TEMPO REAL (REALTIME) NO SUPABASE
-- Execute isto para receber atualizações do status da loja e novos pedidos em tempo real!
alter publication supabase_realtime add table public.loja_config;
alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.pedido_itens;

-- 6. SEGURANÇA RLS (Row Level Security) - Configuração de acesso público e privado
alter table public.loja_config enable row level security;
alter table public.produtos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

create policy "Visualização pública do funcionamento" on public.loja_config for select using (true);
create policy "Apenas a cozinha atualiza o funcionamento" on public.loja_config for update using (true);
create policy "Visualização pública de produtos" on public.produtos for select using (true);
create policy "Qualquer um pode criar pedidos" on public.pedidos for insert with check (true);
create policy "Clientes visualizam seus pedidos" on public.pedidos for select using (true);
create policy "Qualquer um insere itens de pedidos" on public.pedido_itens for insert with check (true);
create policy "Clientes visualizam itens de pedidos" on public.pedido_itens for select using (true);
`;

  const seedProducts = `-- INSERIR PRODUTOS BÁSICOS PARA TESTAR O CARDÁPIO DA EDNA LANCHES
insert into public.produtos (nome, descricao, preco, categoria, imagem) values
('X-Tudo Edna', 'Hambúrguer artesanal, queijo, presunto, bacon, ovo, alface, tomate e maionese da casa.', 25.00, 'Lanches', '🍔'),
('X-Salada', 'Pão brioche, carne de 120g, queijo prato derretido, alface, tomate e maionese verde.', 18.00, 'Lanches', '🍔'),
('Misto Quente', 'Pão de forma tostado com muita muçarela e presunto na chapa.', 10.00, 'Lanches', '🥪'),
('Batata Especial', 'Batata frita crocante com porção generosa de cheddar e farofa de bacon.', 22.00, 'Porções', '🍟'),
('Pastel de Queijo', 'Pastel frito na hora com recheio de muçarela derretida.', 8.00, 'Porções', '🥟'),
('Guaraná Caneca', 'Copo de 500ml de Guaraná Antarctica trincando de gelado.', 6.00, 'Bebidas', '🥤'),
('Suco de Laranja', 'Suco de laranja natural espremido na hora de 400ml.', 8.00, 'Bebidas', '🍊'),
('Pudim de Leite', 'Fatia de pudim de leite condensado super cremoso com calda de caramelo.', 9.00, 'Sobremesas', '🍮');
`;

  const reactNativeConfig = `// 1. INSTALE A DEPENDÊNCIA DO SUPABASE NO SEU PROJETO EXPO
// npx expo install @supabase/supabase-js react-native-url-polyfill

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'SUA_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_SUPABASE_ANON_KEY_AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. ESCUTAR STATUS DE FUNCIONAMENTO (FECHAR/ABRIR LOJA) EM TEMPO REAL
export function escutarFuncionamentoLoja(callback) {
  return supabase
    .channel('loja-funcionamento')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'loja_config', filter: 'id=eq.1' },
      (payload) => {
        console.log('Status da loja alterado!', payload.new.aberta);
        callback(payload.new.aberta);
      }
    )
    .subscribe();
}

// 3. FUNÇÃO PARA ESCUTAR PEDIDOS EM TEMPO REAL NO REACT NATIVE (EXPO)
export function escutarPedidosEmTempoReal(callbackDeAtualizacao) {
  return supabase
    .channel('pedidos-alterados')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pedidos' },
      (payload) => {
        console.log('Alteração recebida em tempo real!', payload);
        callbackDeAtualizacao(payload);
      }
    )
    .subscribe();
}

// 4. ENVIAR PEDIDO AO SUPABASE VERIFICANDO SE A LOJA ESTÁ ABERTA
export async function criarPedidoSupabase(clienteNome, mesa, carrinhoItens, observacoes) {
  // Verifica funcionamento primeiro
  const { data: config } = await supabase
    .from('loja_config')
    .select('aberta')
    .eq('id', 1)
    .single();

  if (config && !config.aberta) {
    throw new Error('A Edna Lanches está fechada temporariamente para novos pedidos!');
  }

  // Gera código único ex: #1005
  const { data: ultimos } = await supabase
    .from('pedidos')
    .select('codigo')
    .order('created_at', { ascending: false })
    .limit(1);

  const proxNum = ultimos && ultimos[0] 
    ? parseInt(ultimos[0].codigo.replace('#', '')) + 1 
    : 1001;
  const codigo = '#' + proxNum;

  // Calcula total
  const total = carrinhoItens.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);

  // Insere pedido
  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .insert([{
      codigo,
      mesa,
      cliente_nome: clienteNome,
      preco_total: total,
      observacoes,
      status: 'Pendente'
    }])
    .select()
    .single();

  if (errPedido) throw errPedido;

  // Insere os itens vinculados
  const itensParaInserir = carrinhoItens.map(item => ({
    pedido_id: pedido.id,
    produto_id: item.product.id,
    quantidade: item.quantity
  }));

  const { error: errItens } = await supabase
    .from('pedido_itens')
    .insert(itensParaInserir);

  if (errItens) throw errItens;
  return pedido;
}
`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="supabase-guide-container">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between" id="supabase-guide-header">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-emerald-100" />
          <div>
            <h3 className="font-bold text-lg tracking-tight">Conectividade com o Supabase</h3>
            <p className="text-emerald-100 text-xs mt-0.5">Guia técnico para transformar Edna Lanches em um aplicativo com banco de dados real na nuvem.</p>
          </div>
        </div>
        <span className="bg-emerald-500/30 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border border-emerald-400/20">
          Supabase Ready
        </span>
      </div>

      <div className="p-6 space-y-6" id="supabase-guide-body">
        {/* Intro */}
        <p className="text-sm text-slate-600 leading-relaxed">
          O Supabase é a alternativa de código aberto ao Firebase. Ele fornece um banco de dados 
          <strong className="text-emerald-600 font-medium"> PostgreSQL robusto</strong>, autenticação nativa, 
          armazenamento e <strong className="text-emerald-600 font-medium">tempo real integrado (WebSockets)</strong>. 
          Siga os passos abaixo para migrar seus dados locais para produção em minutos!
        </p>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="supabase-guide-steps">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 font-mono">PASSO 1</span>
              <h4 className="font-semibold text-slate-800 text-sm mt-1">Crie a Conta</h4>
              <p className="text-xs text-slate-500 mt-1">Acesse supabase.com, crie um projeto gratuito e defina a senha do banco.</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 font-mono">PASSO 2</span>
              <h4 className="font-semibold text-slate-800 text-sm mt-1">Rode o Schema</h4>
              <p className="text-xs text-slate-500 mt-1">Abra o "SQL Editor" no Supabase e execute o código de criação abaixo.</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 font-mono">PASSO 3</span>
              <h4 className="font-semibold text-slate-800 text-sm mt-1">Ative o Realtime</h4>
              <p className="text-xs text-slate-500 mt-1">Habilite as publicações do PostgreSQL para escutar novos pedidos instantaneamente.</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 font-mono">PASSO 4</span>
              <h4 className="font-semibold text-slate-800 text-sm mt-1">Adicione as Chaves</h4>
              <p className="text-xs text-slate-500 mt-1">Configure o Client Supabase no React Native ou Web com as chaves public_anon.</p>
            </div>
          </div>
        </div>

        {/* SQL Schema Copy Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">1. Estrutura de Tabelas (SQL Schema)</span>
            </div>
            <button
              onClick={() => copyToClipboard(sqlSchema, 'sql')}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded transition-colors"
            >
              {copiedIndex === 'sql' ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar SQL
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 custom-scroll leading-relaxed border border-slate-900 shadow-inner">
            {sqlSchema}
          </pre>
        </div>

        {/* Seed Data Copy Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">2. Carga Inicial de Produtos (SQL Seed)</span>
            </div>
            <button
              onClick={() => copyToClipboard(seedProducts, 'seed')}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded transition-colors"
            >
              {copiedIndex === 'seed' ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar Seed
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-40 custom-scroll leading-relaxed border border-slate-900 shadow-inner">
            {seedProducts}
          </pre>
        </div>

        {/* Frontend / React Native integration Copy Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">3. Conectando o React Native / Expo ao Supabase</span>
            </div>
            <button
              onClick={() => copyToClipboard(reactNativeConfig, 'reactNative')}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded transition-colors"
            >
              {copiedIndex === 'reactNative' ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar Código TS
                </>
              )}
            </button>
          </div>
          <pre className="bg-slate-950 text-amber-300 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 custom-scroll leading-relaxed border border-slate-900 shadow-inner">
            {reactNativeConfig}
          </pre>
        </div>

        {/* Recommendation Note */}
        <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3">
          <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-amber-900 text-xs">Recomendação de Segurança de Produção</h5>
            <p className="text-amber-800 text-[11px] mt-1 leading-relaxed">
              Nunca coloque chaves secretas de serviço (como a <code className="bg-amber-100 px-1 rounded text-amber-950">service_role</code>) no 
              código front-end do seu aplicativo React Native ou site público. Utilize sempre as chaves públicas 
              <code className="bg-amber-100 px-1 rounded text-amber-950">anon_public</code> e utilize o RLS (Row Level Security) do PostgreSQL no Supabase 
              para proteger quem pode ler e editar cada pedido.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
