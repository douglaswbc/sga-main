import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';

const LocatarioModal = ({ isOpen, onClose, onSuccess, locatario = null, userId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    whatsapp: '',
    email: '',
    cpf: '',
    ativo: true
  });

  useEffect(() => {
    if (locatario) {
      setFormData(locatario);
    } else {
      setFormData({ nome_completo: '', whatsapp: '', email: '', cpf: '', ativo: true });
    }
  }, [locatario, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData, id_usuario: userId };
      
      let error;
      if (locatario?.id) {
        const { error: err } = await supabase
          .from('locatarios')
          .update(payload)
          .eq('id', locatario.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('locatarios')
          .insert([payload]);
        error = err;
      }

      if (error) throw error;

      toast.success(locatario ? "Locatário atualizado!" : "Locatário cadastrado!");
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
            {locatario ? 'Editar Locatário' : 'Novo Locatário'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
            <input
              required
              className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
              value={formData.nome_completo}
              onChange={e => setFormData({...formData, nome_completo: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">WhatsApp</label>
              <input
                required
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">CPF</label>
              <input
                className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
                value={formData.cpf}
                onChange={e => setFormData({...formData, cpf: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">E-mail</label>
            <input
              type="email"
              className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-accent outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
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
            <label htmlFor="ativo" className="text-sm text-slate-300">Locatário Ativo</label>
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
              Salvar Locatário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocatarioModal;