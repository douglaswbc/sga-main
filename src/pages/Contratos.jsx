import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Pencil, Trash2, X, CheckCircle2, 
  Pause, User, Car, Loader2, DollarSign, Calendar, AlertTriangle 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Contratos = () => {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [locatarios, setLocatarios] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [formData, setFormData] = useState({
    recorrencia: 'weekly@mon@20:00',
    status: 'ativo',
    valor: '',
    data_inicio: '',
    id_locatario: '',
    id_veiculo: ''
  });

  useEffect(() => {
    if (profile?.id) fetchData();
  }, [profile]);

  // 1. BUSCA DE DADOS COMPLETA
  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsRes, locatariosRes, veiculosRes] = await Promise.all([
        supabase
          .from('contratos')
          .select(`*, locatarios(nome_completo), veiculos(placa, modelo)`)
          .eq('id_usuario', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('locatarios')
          .select('id, nome_completo')
          .eq('id_usuario', profile.id)
          .eq('ativo', true),
        supabase
          .from('veiculos')
          .select('id, placa, modelo')
          .eq('id_usuario', profile.id)
          .eq('ativo', true)
      ]);

      if (contractsRes.error) throw contractsRes.error;
      
      setContracts(contractsRes.data || []);
      setLocatarios(locatariosRes.data || []);
      setVeiculos(veiculosRes.data || []);
    } catch (err) {
      toast.error('Erro ao buscar dados dos contratos');
    } finally {
      setLoading(false);
    }
  };

  // 2. LÓGICA DE FILTRAGEM: VEÍCULOS DISPONÍVEIS
  const availableVehicles = useMemo(() => {
    // Pegamos IDs de carros que estão em contratos ATIVOS
    // Se estivermos editando, o carro do contrato atual NÃO deve ser bloqueado
    const occupiedVehicleIds = contracts
      .filter(c => c.status === 'ativo' && (!editingContract || c.id !== editingContract.id))
      .map(c => c.id_veiculo);

    return veiculos.filter(v => !occupiedVehicleIds.includes(v.id));
  }, [veiculos, contracts, editingContract]);

  // 3. SALVAR / EDITAR COM TIMESTAMP ISO E COBRANÇA INICIAL
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Cálculo do Timestamp ISO para proxima_cobranca (Brasília)
      const horarioRecorrencia = formData.recorrencia.split('@')[2] || '20:00';
      const dataLocal = `${formData.data_inicio}T${horarioRecorrencia}:00`;
      const proximaCobrancaISO = new Date(dataLocal).toISOString();

      const payload = { 
        ...formData, 
        id_usuario: profile.id,
        proxima_cobranca: proximaCobrancaISO 
      };

      if (editingContract) {
        const { error } = await supabase
          .from('contratos')
          .update(payload)
          .eq('id', editingContract.id);
        
        if (error) throw error;
        toast.success('Contrato atualizado');
      } else {
        // Cria Contrato + Primeira Cobrança
        const { data: novoContrato, error: contratoError } = await supabase
          .from('contratos')
          .insert([payload])
          .select()
          .single();

        if (contratoError) throw contratoError;
        
        const { error: cobrancaError } = await supabase
          .from('cobrancas')
          .insert([{
             id_contrato: novoContrato.id,
             id_usuario: profile.id,
             valor: novoContrato.valor,
             data_vencimento: formData.data_inicio,
             status: 'pendente'
          }]);
        
        if (cobrancaError) throw cobrancaError;
        toast.success('Contrato e primeira cobrança gerados!');
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.code === '23505' ? 'Este veículo já possui um contrato ativo!' : err.message);
    }
  };

  // 4. ALTERAR STATUS (ATIVO / PAUSADO)
  const toggleContractStatus = async (contract) => {
    const newStatus = contract.status === 'ativo' ? 'pausado' : 'ativo';
    try {
      const { error } = await supabase
        .from('contratos')
        .update({ status: newStatus })
        .eq('id', contract.id);
      
      if (error) throw error;
      toast.success(`Contrato ${newStatus === 'ativo' ? 'ativado' : 'pausado'}`);
      fetchData();
    } catch (err) {
      toast.error('Erro ao atualizar status. Verifique se o veículo está disponível.');
    }
  };

  // 5. EXCLUSÃO
  const deleteContract = async (id) => {
    if (!confirm('Deseja excluir este contrato? As cobranças vinculadas podem ser afetadas.')) return;
    try {
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Contrato removido');
      fetchData();
    } catch (err) {
      toast.error('Erro ao excluir contrato.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Contratos</h2>
          <p className="text-sm text-zinc-500 font-medium">Controle de frotas e recorrências.</p>
        </div>
        <button 
          onClick={() => {
            setEditingContract(null);
            setFormData({ recorrencia: 'weekly@mon@20:00', status: 'ativo', valor: '', data_inicio: '', id_locatario: '', id_veiculo: '' });
            setShowModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Novo Contrato
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-zinc-950/50 text-zinc-500 border-b border-zinc-800 font-bold tracking-widest">
              <tr>
                <th className="px-6 py-5">Locatário / Veículo</th>
                <th className="px-6 py-5">Valor Semanal</th>
                <th className="px-6 py-5">Recorrência</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32} /></td></tr>
              ) : contracts.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-zinc-100 font-bold">
                        <User size={14} className="text-indigo-400" />
                        {item.locatarios?.nome_completo}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                        <Car size={14} className="text-zinc-600" />
                        {item.veiculos?.modelo} • <span className="text-indigo-500 font-mono font-bold">{item.veiculos?.placa}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-400 font-black text-base">R$ {Number(item.valor).toFixed(2).replace('.', ',')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-zinc-300 text-xs flex flex-col gap-0.5">
                       <span className="capitalize font-semibold">{item.recorrencia.split('@')[0]}</span>
                       <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                         <Calendar size={10} /> {item.recorrencia.split('@')[1] || 'N/A'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleContractStatus(item)}
                      className={`mx-auto px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border transition-all ${
                        item.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}
                    >
                      {item.status === 'ativo' ? <CheckCircle2 size={12} /> : <Pause size={12} />}
                      {item.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button onClick={() => { setEditingContract(item); setFormData(item); setShowModal(true); }} className="p-2.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all"><Pencil size={18} /></button>
                    <button onClick={() => deleteContract(item.id)} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h3 className="text-xl font-bold text-white">{editingContract ? 'Editar Contrato' : 'Assinar Novo Contrato'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
               <div className="grid grid-cols-1 gap-6">
                  {/* SELECT LOCATARIO */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Locatário (Cliente)</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                      <select required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-100 focus:border-indigo-500 outline-none appearance-none" value={formData.id_locatario || ''} onChange={e => setFormData({...formData, id_locatario: e.target.value})}>
                        <option value="">Selecione um locatário...</option>
                        {locatarios.map(l => <option key={l.id} value={l.id}>{l.nome_completo}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* SELECT VEICULO DISPONÍVEL */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Veículo Disponível</label>
                    <div className="relative">
                      <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                      <select 
                        required 
                        disabled={availableVehicles.length === 0 && !editingContract}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-100 focus:border-indigo-500 outline-none appearance-none disabled:opacity-50" 
                        value={formData.id_veiculo || ''} 
                        onChange={e => setFormData({...formData, id_veiculo: e.target.value})}
                      >
                        <option value="">
                          {availableVehicles.length === 0 && !editingContract ? "Nenhum veículo livre no momento" : "Selecione um veículo..."}
                        </option>
                        {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                      </select>
                    </div>
                    {availableVehicles.length === 0 && !editingContract && (
                      <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-1">
                        <AlertTriangle size={12} /> Não há veículos ativos livres na frota.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Valor Semanal</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                        <input required type="number" step="0.01" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-100 focus:border-indigo-500 outline-none font-bold" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Início</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                        <input required type="date" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-100 focus:border-indigo-500 outline-none" value={formData.data_inicio || ''} onChange={e => setFormData({...formData, data_inicio: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Recorrência</label>
                    <select required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:border-indigo-500 outline-none" value={formData.recorrencia || 'weekly@mon@20:00'} onChange={e => setFormData({...formData, recorrencia: e.target.value})}>
                      <optgroup label="Diário">
                        <option value="daily@20:00">Todo dia (20:00)</option>
                      </optgroup>
                      <optgroup label="Semanal (20:00)">
                        <option value="weekly@mon@20:00">Segunda-feira</option>
                        <option value="weekly@tue@20:00">Terça-feira</option>
                        <option value="weekly@wed@20:00">Quarta-feira</option>
                        <option value="weekly@thu@20:00">Quinta-feira</option>
                        <option value="weekly@fri@20:00">Sexta-feira</option>
                        <option value="weekly@sat@20:00">Sábado</option>
                        <option value="weekly@sun@20:00">Domingo</option>
                      </optgroup>
                    </select>
                  </div>
               </div>

               <div className="pt-8 flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl text-zinc-500 hover:text-white font-bold transition-all">Cancelar</button>
                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-all">Confirmar Contrato</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contratos;