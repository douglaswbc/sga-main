import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase'; // Ajustado para o caminho do seu projeto
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  Trophy, Star, Phone, CheckCircle, 
  ShieldCheck, UserMinus, Loader2, Zap, 
  CreditCard 
} from 'lucide-react';
import PixModal from '../components/PixModal';

const Triagem = () => {
  const { profile } = useAuth();
  const [candidatos, setCandidatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) fetchCandidatos();
  }, [profile]);

  const fetchCandidatos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidatos')
        .select('*')
        .eq('id_usuario', profile.id)
        .order('score_formulario', { ascending: false });
      
      if (error) throw error;
      setCandidatos(data || []);
    } catch (err) {
      toast.error('Erro ao buscar fila de triagem');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('candidatos')
        .update({ 
          status: newStatus,
          // Se for confirmação de reserva, define a data
          reserva_confirmada_em: newStatus === 'Reserva Confirmada' ? new Date().toISOString() : null 
        })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Candidato: ${newStatus}`);
      fetchCandidatos();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleReservarVaga = async (candidatoId) => {
    setProcessingId(candidatoId);
    try {
      const { data, error } = await supabase.functions.invoke('create-reservation-pix', {
        body: { candidatoId },
      });

      if (error) throw error;

      setPixData(data);
      setIsPixModalOpen(true);
      fetchCandidatos();
    } catch (error) {
      toast.error("Erro ao gerar reserva: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Fila de Prioridade</h2>
          <p className="text-sm text-slate-500">Ranqueamento baseado no perfil e potencial dos candidatos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {candidatos.map((c, index) => (
          <div key={c.id} className="bg-card border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 group transition-all hover:border-indigo-500/30 shadow-lg hover:shadow-indigo-500/5">
            
            {/* RANKING */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
                index === 0 ? 'bg-amber-500 text-amber-950' : 
                index === 1 ? 'bg-slate-300 text-slate-800' : 
                index === 2 ? 'bg-orange-400 text-orange-950' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {index + 1}º
              </div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-tighter text-slate-500">RANKING</div>
            </div>

            {/* INFO */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
                {c.nome}
                {index === 0 && <Star size={16} fill="currentColor" className="text-amber-500" />}
              </h3>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-500" /> {c.telefone}</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-slate-500" /> CPF: {c.cpf}</span>
              </div>
            </div>

            {/* SCORE */}
            <div className="px-6 border-x border-slate-800 hidden lg:flex flex-col items-center justify-center">
               <div className="text-2xl font-black text-indigo-500 flex items-center gap-1">
                 <Zap size={20} className="fill-indigo-500/20" />
                 {c.score_formulario}
               </div>
               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SCORE</div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col md:flex-row items-center gap-4">
               <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                 c.status === 'Pré-aprovado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                 c.status === 'Aguardando Reserva' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                 c.status === 'Reserva Confirmada' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                 'bg-slate-800 text-slate-400 border-slate-700'
               }`}>
                 {c.status}
               </span>

               <div className="flex items-center gap-2">
                  {/* Aprovar Perfil (Move para Pré-aprovado) */}
                  {c.status !== 'Pré-aprovado' && c.status !== 'Aguardando Reserva' && c.status !== 'Reserva Confirmada' && (
                    <button 
                      onClick={() => handleAction(c.id, 'Pré-aprovado')}
                      className="p-2.5 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                      title="Aprovar Perfil"
                    >
                      <CheckCircle size={22} />
                    </button>
                  )}

                  {/* Gerar Reserva PIX Automática */}
                  {c.status === 'Pré-aprovado' && (
                    <button 
                      onClick={() => handleReservarVaga(c.id)}
                      disabled={processingId === c.id}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all"
                    >
                      {processingId === c.id ? <Loader2 size={14} className="animate-spin" /> : 'Gerar PIX Reserva'}
                    </button>
                  )}

                  {/* Aprovação Manual de Reserva (Pula o PIX ou confirma pagamento manual) */}
                  {c.status === 'Aguardando Reserva' && (
                    <button 
                      onClick={() => handleAction(c.id, 'Reserva Confirmada')}
                      className="p-2.5 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                      title="Confirmar Pagamento Manualmente"
                    >
                      <ShieldCheck size={22} />
                    </button>
                  )}

                  {/* Reprovar/Excluir */}
                  <button 
                    onClick={() => handleAction(c.id, 'Reprovado')}
                    className="p-2.5 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                    title="Reprovar Candidato"
                  >
                    <UserMinus size={22} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <PixModal 
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        pixData={pixData}
      />
    </div>
  );
};

export default Triagem;