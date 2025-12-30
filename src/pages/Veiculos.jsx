import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Search, Loader2, Car } from 'lucide-react';
import { toast } from 'react-toastify';
import VeiculoModal from '../components/VeiculoModal';

const Veiculos = () => {
  const { profile } = useAuth();
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState(null);

  const fetchVeiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('id_usuario', profile.id)
        .order('modelo');

      if (error) throw error;
      setVeiculos(data);
    } catch (error) {
      toast.error("Erro ao carregar veículos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) fetchVeiculos();
  }, [profile]);

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este veículo? Verifique se não há contratos ativos.")) return;

    try {
      const { error } = await supabase.from('veiculos').delete().eq('id', id);
      if (error) throw error;
      toast.success("Veículo removido com sucesso!");
      fetchVeiculos();
    } catch (error) {
      toast.error("Erro ao excluir: Veículo pode estar vinculado a um contrato.");
    }
  };

  const filteredVeiculos = veiculos.filter(v => 
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Frota de Veículos</h1>
          <p className="text-slate-400 text-sm">Gerencie os carros disponíveis para locação.</p>
        </div>
        <button 
          onClick={() => { setSelectedVeiculo(null); setIsModalOpen(true); }}
          className="bg-accent hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all w-fit"
        >
          <Plus size={20} /> Adicionar Veículo
        </button>
      </div>

      <div className="bg-card rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por placa ou modelo..."
              className="w-full bg-input border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:border-accent outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent" size={40} /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="p-4 text-slate-400 font-medium text-sm">Veículo</th>
                  <th className="p-4 text-slate-400 font-medium text-sm">Placa</th>
                  <th className="p-4 text-slate-400 font-medium text-sm">Cor/Ano</th>
                  <th className="p-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="p-4 text-slate-400 font-medium text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredVeiculos.length > 0 ? filteredVeiculos.map(v => (
                  <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700 rounded-lg text-slate-300">
                          <Car size={20} />
                        </div>
                        <div>
                          <div className="text-white font-medium">{v.modelo}</div>
                          <div className="text-xs text-slate-500 uppercase">{v.marca}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-900 text-white border border-slate-600 px-2 py-1 rounded font-mono text-sm font-bold uppercase tracking-wider">
                        {v.placa}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      <div className="text-sm">{v.cor || '-'}</div>
                      <div className="text-xs text-slate-500">{v.ano || '-'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        v.ativo ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                      }`}>
                        {v.ativo ? 'Disponível' : 'Indisponível'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => { setSelectedVeiculo(v); setIsModalOpen(true); }}
                        className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-slate-500">Nenhum veículo encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <VeiculoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchVeiculos}
        veiculo={selectedVeiculo}
        userId={profile?.id}
      />
    </div>
  );
};

export default Veiculos;