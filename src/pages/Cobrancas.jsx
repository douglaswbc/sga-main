import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckCircle, Ban, Search, Loader2, Calendar, 
  Play, RefreshCcw, Plus, X, DollarSign, Tag, Info
} from 'lucide-react';
import { toast } from 'react-toastify';

const Cobrancas = () => {
  const { profile } = useAuth();
  const [cobrancas, setCobrancas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Estados para o Lançamento Manual
  const [locatarios, setLocatarios] = useState([]);
  const [manualData, setManualData] = useState({
    id_locatario: '',
    valor: '',
    categoria: 'manutencao',
    tipo: 'receita', // receita ou despesa
    destino: 'separado', // separado ou somar_fatura
    data_vencimento: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cobsRes, locsRes] = await Promise.all([
        supabase.from('cobrancas').select(`*, contratos (*, locatarios (nome_completo), veiculos (placa))`).eq('id_usuario', profile.id).order('data_vencimento', { ascending: false }),
        supabase.from('locatarios').select('id, nome_completo').eq('id_usuario', profile.id).eq('ativo', true)
      ]);
      setCobrancas(cobsRes.data || []);
      setLocatarios(locsRes.data || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (profile?.id) fetchData(); }, [profile]);

  // --- LÓGICA DE SALVAMENTO MANUAL ---
  const handleSaveManual = async (e) => {
    e.preventDefault();
    try {
      // 1. Se for DESPESA do locador, apenas inserimos o registro negativo para o financeiro
      if (manualData.tipo === 'despesa') {
        const { error } = await supabase.from('cobrancas').insert([{
          id_usuario: profile.id,
          valor: manualData.valor,
          categoria: manualData.categoria,
          tipo: 'despesa',
          status: 'pago', // Despesa paga pelo locador morre aqui
          data_vencimento: manualData.data_vencimento
        }]);
        if (error) throw error;
        toast.success("Despesa registrada com sucesso!");
      } 
      
      // 2. Se for RECEITA e o usuário quer SOMAR na fatura pendente
      else if (manualData.tipo === 'receita' && manualData.destino === 'somar_fatura') {
        // Busca a cobrança "pendente" mais recente deste locatário
        const { data: pendente, error: pErr } = await supabase
          .from('cobrancas')
          .select('id, valor, status')
          .eq('status', 'pendente')
          .innerJoin('contratos', 'cobrancas.id_contrato', 'contratos.id')
          .eq('contratos.id_locatario', manualData.id_locatario)
          .order('data_vencimento', { ascending: true })
          .limit(1)
          .single();

        if (pErr || !pendente) {
          throw new Error("Não encontramos nenhuma fatura PENDENTE para este locatário para somar o valor.");
        }

        const novoValor = Number(pendente.valor) + Number(manualData.valor);

        // Atualiza o valor e limpa o payment_link para forçar um novo PIX com valor correto
        const { error: upErr } = await supabase
          .from('cobrancas')
          .update({ 
            valor: novoValor,
            payment_link: null, // Força regerar PIX
            mercado_pago_id: null 
          })
          .eq('id', pendente.id);

        if (upErr) throw upErr;
        toast.success(`Valor somado à fatura pendente! Novo total: R$ ${novoValor.toFixed(2)}`);
      } 
      
      // 3. Se for RECEITA e o usuário quer cobrança SEPARADA
      else {
        // Precisamos encontrar um contrato ativo desse locatario para vincular (opcional mas recomendado)
        const { data: contrato } = await supabase.from('contratos').select('id').eq('id_locatario', manualData.id_locatario).eq('status', 'ativo').limit(1).single();

        const { error } = await supabase.from('cobrancas').insert([{
          id_usuario: profile.id,
          id_contrato: contrato?.id || null,
          valor: manualData.valor,
          categoria: manualData.categoria,
          tipo: 'receita',
          status: 'pendente',
          data_vencimento: manualData.data_vencimento
        }]);
        if (error) throw error;
        toast.success("Nova cobrança avulsa gerada!");
      }

      setShowManualModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Funções de Automação (Mesmas anteriores)
  const handleRunAutomatedCharges = async () => {
    if (!window.confirm('Executar faturamento de hoje?')) return;
    setGenerating(true);
    try {
      await supabase.functions.invoke('gerar-cobrancas-diarias');
      toast.success("Faturamento processado!");
      fetchData();
    } catch (error) { toast.error(error.message); } finally { setGenerating(false); }
  };

  const handleMarcarPago = async (id) => {
    const { error } = await supabase.from('cobrancas').update({ status: 'pago', data_pagamento: new Date().toISOString() }).eq('id', id);
    if (!error) { toast.success("Baixa realizada!"); fetchData(); }
  };

  const filteredData = cobrancas.filter(c => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = c.contratos?.locatarios?.nome_completo.toLowerCase().includes(search) ||
                         c.categoria?.toLowerCase().includes(search);
    const matchesFilter = filterStatus === 'todos' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Fluxo de Caixa</h1>
            <p className="text-sm text-slate-500 font-medium italic">Gestão de receitas recorrentes e lançamentos manuais.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowManualModal(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 border border-zinc-700 transition-all"
          >
            <Plus size={16} /> Lançamento Manual
          </button>

          <button
            onClick={handleRunAutomatedCharges}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {generating ? <RefreshCcw className="animate-spin" size={16} /> : <Play size={16} />}
            Faturamento Diário
          </button>

          <div className="h-8 w-[1px] bg-slate-800 mx-2 hidden md:block"></div>
          
          <select 
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-400 text-xs font-bold outline-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="todos">Todos Status</option>
            <option value="pendente">Pendentes</option>
            <option value="pago">Pagos</option>
            <option value="despesa">Despesas</option>
          </select>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/50">
              <tr className="text-[10px] uppercase font-black text-zinc-600 tracking-widest border-b border-zinc-800">
                <th className="p-4">Descrição / Locatário</th>
                <th className="p-4 text-center">Vencimento</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Valor</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32} /></td></tr>
              ) : filteredData.map(c => (
                <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4">
                    <div className="text-white font-bold text-sm">
                      {c.contratos?.locatarios?.nome_completo || "Lançamento Avulso"}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
                      {c.contratos?.veiculos?.placa || "N/A"}
                    </div>
                  </td>
                  <td className="p-4 text-center text-xs font-mono text-zinc-400">
                    {new Date(c.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-zinc-800 ${c.tipo === 'despesa' ? 'text-red-400' : 'text-indigo-400'}`}>
                      {c.categoria}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-black text-sm ${c.tipo === 'despesa' ? 'text-red-500' : 'text-emerald-400'}`}>
                      {c.tipo === 'despesa' ? '-' : ''} R$ {Number(c.valor).toFixed(2).replace('.', ',')}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${
                      c.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {c.status === 'pendente' && (
                      <button onClick={() => handleMarcarPago(c.id)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Dar Baixa"><CheckCircle size={18} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE LANÇAMENTO MANUAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-sm"><Tag className="text-indigo-400" size={18}/> Novo Lançamento Manual</h3>
              <button onClick={() => setShowManualModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveManual} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* TIPO DE LANÇAMENTO */}
                <div className="col-span-2 space-y-2">
                   <label className="text-[10px] font-black text-zinc-500 uppercase">Natureza da Operação</label>
                   <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setManualData({...manualData, tipo: 'receita'})} className={`py-3 rounded-xl text-xs font-bold transition-all border ${manualData.tipo === 'receita' ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>ENTRADA (Receber)</button>
                      <button type="button" onClick={() => setManualData({...manualData, tipo: 'despesa'})} className={`py-3 rounded-xl text-xs font-bold transition-all border ${manualData.tipo === 'despesa' ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>SAÍDA (Gasto)</button>
                   </div>
                </div>

                {/* LOCATÁRIO (Apenas se for Receita) */}
                {manualData.tipo === 'receita' && (
                  <div className="col-span-2 space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Locatário Responsável</label>
                    <select required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none" value={manualData.id_locatario} onChange={e => setManualData({...manualData, id_locatario: e.target.value})}>
                       <option value="">Selecione o locatário...</option>
                       {locatarios.map(l => <option key={l.id} value={l.id}>{l.nome_completo}</option>)}
                    </select>
                  </div>
                )}

                {/* DESTINO DO VALOR (Apenas se for Receita) */}
                {manualData.tipo === 'receita' && (
                  <div className="col-span-2 bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl space-y-3">
                    <label className="text-[10px] font-black text-indigo-400 uppercase flex items-center gap-2"><Info size={12}/> Como cobrar esse valor?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="destino" value="somar_fatura" checked={manualData.destino === 'somar_fatura'} onChange={e => setManualData({...manualData, destino: e.target.value})} className="text-indigo-600 focus:ring-0 bg-zinc-900 border-zinc-700" />
                        <span className="text-xs text-zinc-300 font-bold">Somar no boleto de hoje</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="destino" value="separado" checked={manualData.destino === 'separado'} onChange={e => setManualData({...manualData, destino: e.target.value})} className="text-indigo-600 focus:ring-0 bg-zinc-900 border-zinc-700" />
                        <span className="text-xs text-zinc-300 font-bold">Cobrar separado agora</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Valor (R$)</label>
                  <input required type="number" step="0.01" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500" value={manualData.valor} onChange={e => setManualData({...manualData, valor: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Data Referência</label>
                  <input required type="date" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500" value={manualData.data_vencimento} onChange={e => setManualData({...manualData, data_vencimento: e.target.value})} />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Categoria</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none" value={manualData.categoria} onChange={e => setManualData({...manualData, categoria: e.target.value})}>
                     <option value="aluguel">Aluguel (Ajuste)</option>
                     <option value="manutencao">Manutenção / Peças</option>
                     <option value="multa">Multa de Trânsito</option>
                     <option value="bonus">Bônus / Crédito</option>
                     <option value="limpeza">Limpeza / Estética</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all uppercase tracking-widest text-xs">
                Confirmar Lançamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cobrancas;