import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';

const ContratoModal = ({ isOpen, onClose, onSuccess, contrato = null, userId }) => {
  const [loading, setLoading] = useState(false);
  const [dataOptions, setDataOptions] = useState({ locatarios: [], veiculos: [] });
  const [formData, setFormData] = useState({
    id_locatario: '',
    id_veiculo: '',
    valor: '',
    recorrencia: 'semanal',
    data_inicio: new Date().toISOString().split('T')[0],
    status: 'ativo'
  });

  // Carrega opções de seleção ao abrir o modal
  useEffect(() => {
    const fetchOptions = async () => {
      const [resLoc, resVei] = await Promise.all([
        supabase.from('locatarios').select('id, nome_completo').eq('id_usuario', userId).eq('ativo', true),
        supabase.from('veiculos').select('id, modelo, placa').eq('id_usuario', userId).eq('ativo', true)
      ]);
      setDataOptions({ locatarios: resLoc.data || [], veiculos: resVei.data || [] });
    };

    if (isOpen) {
      fetchOptions();
      if (contrato) {
        setFormData(contrato);
      } else {
        setFormData({
          id_locatario: '', id_veiculo: '', valor: '',
          recorrencia: 'semanal', data_inicio: new Date().toISOString().split('T')[0],
          status: 'ativo'
        });
      }
    }
  }, [isOpen, contrato, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calcula a primeira cobrança (simplificado: igual à data de início)
      const payload = { 
        ...formData, 
        id_usuario: userId, 
        valor: parseFloat(formData.valor),
        proxima_cobranca: new Date(formData.data_inicio).toISOString()
      };
      
      let error;
      if (contrato?.id) {
        const { error: err } = await supabase.from('contratos').update(payload).eq('id', contrato.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('contratos').insert([payload]);
        error = err;
      }

      if (error) throw error;
      toast.success("Contrato salvo com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar contrato: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-white">{contrato ? 'Editar Contrato' : 'Novo Contrato'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Locatário</label>
            <select 
              required
              className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none"
              value={formData.id_locatario}
              onChange={e => setFormData({...formData, id_locatario: e.target.value})}
            >
              <option value="">Selecionar Cliente</option>
              {dataOptions.locatarios.map(l => <option key={l.id} value={l.id}>{l.nome_completo}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Veículo</label>
            <select 
              required
              className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none"
              value={formData.id_veiculo}
              onChange={e => setFormData({...formData, id_veiculo: e.target.value})}
            >
              <option value="">Selecionar Veículo</option>
              {dataOptions.veiculos.map(v => <option key={v.id} value={v.id}>{v.modelo} ({v.placa})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Valor (R$)</label>
              <input 
                type="number" step="0.01" required
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none"
                value={formData.valor}
                onChange={e => setFormData({...formData, valor: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Recorrência</label>
              <select 
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none"
                value={formData.recorrencia}
                onChange={e => setFormData({...formData, recorrencia: e.target.value})}
              >
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Data de Início</label>
            <input 
              type="date" required
              className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none"
              value={formData.data_inicio}
              onChange={e => setFormData({...formData, data_inicio: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
              {loading && <Loader2 className="animate-spin" size={18} />} Salvar Contrato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContratoModal;