/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Smartphone, Code, FileCode, CheckCircle, SmartphoneIcon } from 'lucide-react';

export default function ReactNativeCode() {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(rnCodeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rnCodeString = `// ==========================================
// EDNA LANCHES - APP CLIENTE EM REACT NATIVE / EXPO
// ==========================================
// Instale no seu projeto Expo:
// npx expo install react-native-safe-area-context lucide-react-native
// npm install nativewind

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert, 
  SafeAreaView, 
  Vibration 
} from 'react-native';
import { ShoppingCart, Table, Award, RefreshCw, ChevronRight, User } from 'lucide-react-native';

// Lista básica de produtos recomendada (id, nome, preco, imagem, categoria)
const PRODUTOS = [
  { id: 'p1', name: 'X-Tudo Edna', price: 25.0, category: 'Lanches', image: '🍔', description: 'Artesanal com queijo, bacon e ovo.' },
  { id: 'p2', name: 'X-Salada', price: 18.0, category: 'Lanches', image: '🍔', description: 'Queijo prato derretido, alface e tomate.' },
  { id: 'p3', name: 'Misto Quente', price: 10.0, category: 'Lanches', image: '🥪', description: 'Queijo e presunto derretidos na chapa.' },
  { id: 'p4', name: 'Batata Especial', price: 22.0, category: 'Porções', image: '🍟', description: 'Cheddar cremoso e pedaços de bacon.' },
  { id: 'p5', name: 'Pastel de Queijo', price: 8.0, category: 'Porções', image: '🥟', description: 'Recheio generoso e frito na hora.' },
  { id: 'p6', name: 'Guaraná Caneca', price: 6.0, category: 'Bebidas', image: '🥤', description: '500ml trincando de gelado.' },
];

export default function AppCliente() {
  // Estados do app
  const [nome, setNome] = useState('');
  const [mesa, setMesa] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [categoria, setCategoria] = useState('Todos');
  const [carrinho, setCarrinho] = useState([]);
  const [pedidoAtivo, setPedidoAtivo] = useState(null);
  const [observacoes, setObservacoes] = useState('');

  // Login do cliente
  const realizarAcesso = () => {
    if (!nome.trim() || !mesa.trim()) {
      Alert.alert('Dados incompletos', 'Por favor, informe seu nome e o número da mesa.');
      return;
    }
    setAutenticado(true);
  };

  // Carrinho de compras
  const adicionarAoCarrinho = (produto) => {
    const existeIndex = carrinho.findIndex(item => item.product.id === produto.id);
    if (existeIndex > -1) {
      const novoCarrinho = [...carrinho];
      novoCarrinho[existeIndex].quantity += 1;
      setCarrinho(novoCarrinho);
    } else {
      setCarrinho([...carrinho, { product: produto, quantity: 1 }]);
    }
  };

  const alterarQuantidade = (produtoId, delta) => {
    const existeIndex = carrinho.findIndex(item => item.product.id === produtoId);
    if (existeIndex === -1) return;

    const novoCarrinho = [...carrinho];
    novoCarrinho[existeIndex].quantity += delta;
    if (novoCarrinho[existeIndex].quantity <= 0) {
      novoCarrinho.splice(existeIndex, 1);
    }
    setCarrinho(novoCarrinho);
  };

  // Calcular preço total do carrinho
  const precoTotal = carrinho.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);

  // Simular envio de pedido ao servidor
  const enviarPedido = () => {
    if (carrinho.length === 0) {
      Alert.alert('Carrinho Vazio', 'Adicione itens ao carrinho antes de enviar.');
      return;
    }

    const novoPedido = {
      id: 'pedido_' + Date.now(),
      code: '#' + Math.floor(1000 + Math.random() * 9000),
      table: mesa,
      customerName: nome,
      items: carrinho,
      status: 'Pendente',
      totalPrice: precoTotal,
      notes: observacoes,
    };

    setPedidoAtivo(novoPedido);
    setCarrinho([]);
    setObservacoes('');
    Vibration.vibrate([0, 100, 100, 200]);
    Alert.alert('Sucesso!', 'Pedido enviado com sucesso para a cozinha da Edna!');
  };

  // Simulação de alteração de status em tempo real do pedido ativo
  useEffect(() => {
    if (!pedidoAtivo) return;

    // Atualização de status automática simulada para testes
    const t1 = setTimeout(() => {
      setPedidoAtivo(prev => prev ? { ...prev, status: 'Em Preparo' } : null);
    }, 15000); // 15s -> Preparando

    const t2 = setTimeout(() => {
      setPedidoAtivo(prev => {
        if (prev) {
          Vibration.vibrate(500);
          Alert.alert('Seu Pedido está Pronto!', 'Seu pedido já está vindo à mesa!');
          return { ...prev, status: 'Pronto' };
        }
        return null;
      });
    }, 35000); // 35s -> Pronto

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pedidoAtivo?.id]);

  if (!autenticado) {
    return (
      <SafeAreaView style={styles.containerCentrado}>
        <View style={styles.cardLogin}>
          <Text style={styles.tituloLogo}>🍔 Edna Lanches</Text>
          <Text style={styles.subtituloLogin}>Insira seus dados para ver o cardápio e fazer seu pedido rápido à mesa.</Text>
          
          <Text style={styles.label}>Seu Nome</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ex: Amanda Silva"
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.label}>Número da Mesa</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ex: 05"
            keyboardType="numeric"
            value={mesa}
            onChangeText={setMesa}
          />

          <TouchableOpacity style={styles.botaoAcesso} onPress={realizarAcesso}>
            <Text style={styles.textoBotaoAcesso}>Acessar Cardápio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoHeader}>Edna Lanches</Text>
          <Text style={styles.subHeader}>Mesa {mesa} • Cliente: {nome}</Text>
        </View>
        <TouchableOpacity style={styles.botaoSair} onPress={() => setAutenticado(false)}>
          <Text style={styles.textSair}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Painel de Acompanhamento de Pedido Ativo */}
        {pedidoAtivo && (
          <View style={styles.cardAcompanhamento}>
            <View style={styles.rowJustified}>
              <Text style={styles.tituloAcompanhamento}>Pedido Ativo {pedidoAtivo.code}</Text>
              <View style={[
                styles.badgeStatus,
                pedidoAtivo.status === 'Pendente' && { backgroundColor: '#fef3c7' },
                pedidoAtivo.status === 'Em Preparo' && { backgroundColor: '#dbeafe' },
                pedidoAtivo.status === 'Pronto' && { backgroundColor: '#d1fae5' },
              ]}>
                <Text style={[
                  styles.textoBadge,
                  pedidoAtivo.status === 'Pendente' && { color: '#b45309' },
                  pedidoAtivo.status === 'Em Preparo' && { color: '#1d4ed8' },
                  pedidoAtivo.status === 'Pronto' && { color: '#047857' },
                ]}>
                  {pedidoAtivo.status}
                </Text>
              </View>
            </View>

            {pedidoAtivo.status === 'Pronto' && (
              <Text style={styles.textoAlertaPronto}>🎉 Seu pedido já está vindo à mesa!</Text>
            )}

            <Text style={styles.tempoEstimado}>
              {pedidoAtivo.status === 'Pendente' && 'Aguardando confirmação na cozinha...'}
              {pedidoAtivo.status === 'Em Preparo' && 'A cozinha está preparando seus lanches fresquinhos!'}
              {pedidoAtivo.status === 'Pronto' && 'Pronto! O garçom está a caminho.'}
            </Text>
          </View>
        )}

        {/* Categorias */}
        <Text style={styles.secaoTitulo}>Cardápio Rápido</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosContainer}>
          {['Todos', 'Lanches', 'Porções', 'Bebidas'].map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.chipFiltro, categoria === cat && styles.chipFiltroAtivo]}
              onPress={() => setCategoria(cat)}
            >
              <Text style={[styles.textoChip, categoria === cat && styles.textoChipAtivo]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Lista de Produtos */}
        <View style={styles.listaProdutos}>
          {PRODUTOS.filter(p => categoria === 'Todos' || p.category === categoria).map(produto => (
            <View key={produto.id} style={styles.cardProduto}>
              <Text style={styles.emojiProduto}>{produto.image}</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.nomeProduto}>{produto.name}</Text>
                <Text style={styles.descProduto}>{produto.description}</Text>
                <Text style={styles.precoProduto}>R$ {produto.price.toFixed(2)}</Text>
              </View>
              <TouchableOpacity 
                style={styles.botaoAdicionar}
                onPress={() => adicionarAoCarrinho(produto)}
              >
                <Text style={styles.textoBotaoAdicionar}>+ Add</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Carrinho de Compras */}
        {carrinho.length > 0 && (
          <View style={styles.cardCarrinho}>
            <Text style={styles.tituloCarrinho}>Meu Carrinho 🛒</Text>
            
            {carrinho.map(item => (
              <View key={item.product.id} style={styles.itemCarrinho}>
                <Text style={styles.nomeItemCarrinho}>{item.product.name}</Text>
                <View style={styles.controlesQuantidade}>
                  <TouchableOpacity 
                    style={styles.botaoQtd}
                    onPress={() => alterarQuantidade(item.product.id, -1)}
                  >
                    <Text style={styles.textoQtd}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.valorQtd}>{item.quantity}</Text>
                  <TouchableOpacity 
                    style={styles.botaoQtd}
                    onPress={() => alterarQuantidade(item.product.id, 1)}
                  >
                    <Text style={styles.textoQtd}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.precoItemCarrinho}>R$ {(item.product.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}

            <TextInput 
              style={styles.inputObservacoes}
              placeholder="Ex: Tirar cebola, refrigerante com gelo..."
              value={observacoes}
              onChangeText={setObservacoes}
            />

            <View style={styles.rowJustified}>
              <Text style={styles.totalLabel}>Total do Pedido:</Text>
              <Text style={styles.totalValor}>R$ {precoTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.botaoFinalizar} onPress={enviarPedido}>
              <Text style={styles.textoFinalizar}>Enviar Pedido para a Cozinha</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  containerCentrado: { flex: 1, backgroundColor: '#faf9f6', justifyContent: 'center', alignItems: 'center' },
  cardLogin: { width: '90%', padding: 24, backgroundColor: '#ffffff', borderRadius: 16, borderWith: 1, borderColor: '#f1f1f1', elevation: 4 },
  tituloLogo: { fontSize: 28, fontWeight: 'bold', color: '#dc2626', textAlign: 'center', marginBottom: 8 },
  subtituloLogin: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, fontSize: 15, marginBottom: 16 },
  botaoAcesso: { backgroundColor: '#dc2626', padding: 14, borderRadius: 8, alignItems: 'center' },
  textoBotaoAcesso: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  
  container: { flex: 1, backgroundColor: '#faf9f6' },
  header: { padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  logoHeader: { fontSize: 20, fontWeight: 'bold', color: '#dc2626' },
  subHeader: { fontSize: 12, color: '#6b7280' },
  botaoSair: { padding: 6 },
  textSair: { color: '#ef4444', fontSize: 13 },
  scrollView: { flex: 1 },

  cardAcompanhamento: { margin: 16, padding: 16, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  rowJustified: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tituloAcompanhamento: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  badgeStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  textoBadge: { fontSize: 11, fontWeight: 'bold' },
  tempoEstimado: { fontSize: 12, color: '#4b5563', lineHeight: 18 },
  textoAlertaPronto: { fontSize: 14, fontWeight: 'bold', color: '#059669', marginBottom: 8 },

  secaoTitulo: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 16, marginTop: 12, color: '#1f2937' },
  filtrosContainer: { paddingHorizontal: 12, marginVertical: 8 },
  chipFiltro: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ffffff', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  chipFiltroAtivo: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  textoChip: { fontSize: 13, color: '#4b5563' },
  textoChipAtivo: { color: '#ffffff', fontWeight: 'bold' },

  listaProdutos: { padding: 16 },
  cardProduto: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWith: 1, borderColor: '#e5e7eb' },
  emojiProduto: { fontSize: 32 },
  nomeProduto: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  descProduto: { fontSize: 12, color: '#6b7280', marginVertical: 2 },
  precoProduto: { fontSize: 14, fontWeight: 'bold', color: '#dc2626' },
  botaoAdicionar: { backgroundColor: '#fef2f2', borderWith: 1, borderColor: '#fca5a5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  textoBotaoAdicionar: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },

  cardCarrinho: { margin: 16, padding: 16, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  tituloCarrinho: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  itemCarrinho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  nomeItemCarrinho: { flex: 1, fontSize: 13 },
  controlesQuantidade: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  botaoQtd: { backgroundColor: '#e5e7eb', padding: 6, borderRadius: 4 },
  textoQtd: { fontSize: 14, fontWeight: 'bold' },
  valorQtd: { marginHorizontal: 8, fontSize: 14 },
  precoItemCarrinho: { fontSize: 13, fontWeight: 'bold', minWidth: 60, textAlign: 'right' },
  inputObservacoes: { backgroundColor: '#f9fafb', borderWith: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 13, marginVertical: 12 },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalValor: { fontSize: 18, fontWeight: 'bold', color: '#dc2626' },
  botaoFinalizar: { backgroundColor: '#059669', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  textoFinalizar: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' }
});
`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="react-native-code-container">
      {/* Header */}
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between" id="react-native-code-header">
        <div className="flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-amber-400" />
          <div>
            <h3 className="font-bold text-lg tracking-tight">Código Front-End React Native</h3>
            <p className="text-slate-400 text-xs mt-0.5">Versão nativa mobile compatível com Expo e prontamente convertível para produção.</p>
          </div>
        </div>
        <button
          onClick={copyCode}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" /> Copiado!
            </>
          ) : (
            <>
              <Code className="w-4 h-4" /> Copiar Código Expo
            </>
          )}
        </button>
      </div>

      <div className="p-6 space-y-4" id="react-native-code-body">
        <p className="text-sm text-slate-600 leading-relaxed">
          Para atender à sua solicitação de <strong className="text-slate-900 font-semibold">React Native</strong>, construímos esse código template 
          100% completo, que reproduz fielmente as regras do cardápio, carrinho com observações, mesa do cliente e a atualização automática do pedido ativo. 
          Basta copiar o código acima e colá-lo no arquivo <code className="bg-slate-100 text-rose-600 px-1 rounded font-mono">App.tsx</code> do seu projeto Expo!
        </p>

        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-3" id="react-native-info">
          <SmartphoneIcon className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-800 text-xs">Vantagens deste modelo Expo</h4>
            <ul className="list-disc list-inside text-[11px] text-slate-500 mt-1 space-y-1">
              <li>Usa <strong className="text-slate-700">StyleSheet</strong> puro para máxima compatibilidade sem precisar instalar dependências pesadas de CSS.</li>
              <li>Apoia-se no motor de <strong className="text-slate-700">Vibration</strong> do celular para avisar quando o lanche está pronto.</li>
              <li>Estruturado com as mesas e o fluxo de login idênticos aos da versão web.</li>
            </ul>
          </div>
        </div>

        <div className="relative">
          <pre className="bg-slate-950 text-amber-300 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-80 custom-scroll leading-relaxed border border-slate-900 shadow-inner">
            {rnCodeString}
          </pre>
          <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur text-[10px] text-amber-400 font-bold px-2 py-1 rounded">
            TypeScript (TSX)
          </div>
        </div>
      </div>
    </div>
  );
}
