import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';

const VeiculoModal = ({ isOpen, onClose, onSuccess, veiculo = null, userId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    placa: '',
    modelo: '',
    marca: '',
    cor: '',
    ano: '',
    ativo: true
  });

  useEffect(() => {
    if (veiculo) {
      setFormData({
        ...veiculo,
        ano: veiculo.ano || ''
      });
    } else {
      setFormData({ placa: '', modelo: '', marca: '', cor: '', ano: '', ativo: true });
    }
  }, [veiculo, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { 
        ...formData, 
        id_usuario: userId,
        ano: formData.ano ? parseInt(formData.ano) : null 
      };
      
      let error;
      if (veiculo?.id) {
        const { error: err } = await supabase
          .from('veiculos')
          .update(payload)
          .eq('id', veiculo.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('veiculos')
          .insert([payload]);
        error = err;
      }

      if (error) throw error;

      toast.success(veiculo ? "Veículo atualizado!" : "Veículo cadastrado!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-white">
            {veiculo ? 'Editar Veículo' : 'Novo Veículo'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Placa</label>
              <input
                required
                placeholder="ABC1D23"
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none uppercase"
                value={formData.placa}
                onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Ano</label>
              <input
                type="number"
                placeholder="Ex: 2023"
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
                value={formData.ano}
                onChange={e => setFormData({...formData, ano: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Marca</label>
              <input
                required
                placeholder="Ex: Toyota"
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
                value={formData.marca}
                onChange={e => setFormData({...formData, marca: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Modelo</label>
              <input
                required
                placeholder="Ex: Corolla"
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
                value={formData.modelo}
                onChange={e => setFormData({...formData, modelo: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Cor</label>
            <input
              placeholder="Ex: Prata"
              className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
              value={formData.cor}
              onChange={e => setFormData({...formData, cor: e.target.value})}
            />
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="ativo"
              className="w-4 h-4 rounded bg-input border-slate-600 text-accent focus:ring-accent"
              checked={formData.ativo}
              onChange={e => setFormData({...formData, ativo: e.target.checked})}
            />
            <label htmlFor="ativo" className="text-sm text-slate-300">Veículo Ativo na Frota</label>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-accent hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              Salvar Veículo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VeiculoModal;