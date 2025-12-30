import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import ExpirationTimer from '../components/ExpirationTimer';
import { toast } from 'react-toastify';
import { 
  CircleDollarSign, 
  HandCoins, 
  FileStack, 
  MessageCircle, 
  Loader2,
  Zap,
  Copy,
  ExternalLink,
  X,
  Check,
  TrendingDown
} from 'lucide-react';

const Dashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activeLink, setActiveLink] = useState("");
  const [copied, setCopied] = useState(false);

  const [stats, setStats] = useState({
    lucroLiquido: 0,
    receitaPendente: 0,
    contratosAtivos: 0,
    proximasCobrancas: []
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cobrancas')
        .select(`
          id, valor, status, tipo, categoria, data_vencimento, 
          payment_link, tentativas_envio,
          contratos (
            id, status, 
            locatarios ( nome_completo ),
            veiculos ( placa )
          )
        `)
        .eq('id_usuario', profile.id)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      // --- LÓGICA DE CÁLCULO FINANCEIRO ---
      
      // 1. Receita Realizada (Entradas já pagas)
      const totalReceitaPaga = data
        .filter(c => c.status === 'pago' && c.tipo === 'receita')
        .reduce((sum, c) => sum + Number(c.valor), 0);

      // 2. Despesas Totais (Saídas registradas)
      const totalDespesas = data
        .filter(c => c.tipo === 'despesa')
        .reduce((sum, c) => sum + Number(c.valor), 0);

      // 3. Lucro Líquido (Receita Paga - Despesas)
      const lucroLiquido = totalReceitaPaga - totalDespesas;

      // 4. Receita Pendente (Apenas o que é 'receita' e não foi pago ainda)
      const receitaPendente = data
        .filter(c => ['pendente', 'atrasado'].includes(c.status) && c.tipo === 'receita')
        .reduce((sum, c) => sum + Number(c.valor), 0);

      const contratosAtivos = new Set(
        data.filter(c => c.contratos?.status === 'ativo').map(c => c.contratos.id)
      ).size;

      // 5. Fila de Cobrança (Apenas 'receita' pendente/atrasada)
      const proximasCobrancas = data
        .filter(c => ['pendente', 'atrasado'].includes(c.status) && c.tipo === 'receita')
        .slice(0, 8);

      setStats({ lucroLiquido, receitaPendente, contratosAtivos, proximasCobrancas });
    } catch (error) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) fetchDashboardData();
  }, [profile]);

  const handleGerarCobrancaPix = async (cobrancaId) => {
    setProcessingId(cobrancaId);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-cobranca-pix', {
        body: { cobrancaId },
      });
      if (error) throw error;
      if (data.success) {
        toast.success("PIX gerado e enviado ao WhatsApp!");
        await fetchDashboardData();
      }
    } catch (error) {
      toast.error("Falha ao processar PIX: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openLinkModal = (link) => {
    setActiveLink(link);
    setShowLinkModal(true);
    setCopied(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeLink);
    setCopied(true);
    toast.info("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          title="Saldo Líquido (Realizado)" 
          value={`R$ ${stats.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<CircleDollarSign className="text-emerald-400" />} 
          bgIcon="bg-emerald-400/10"
          desc="Receitas pagas - Despesas"
        />
        <KpiCard 
          title="Previsão de Recebimento" 
          value={`R$ ${stats.receitaPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<HandCoins className="text-amber-400" />} 
          bgIcon="bg-amber-400/10"
          desc="Total pendente/atrasado"
        />
        <KpiCard 
          title="Contratos Ativos" 
          value={stats.contratosAtivos} 
          icon={<FileStack className="text-indigo-400" />} 
          bgIcon="bg-indigo-400/10"
          desc="Aluguéis em vigência"
        />
      </div>

      {/* Tabela de Próximas Cobranças */}
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="text-amber-400" size={20} />
            Fila de Cobrança Prioritária
          </h3>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {stats.proximasCobrancas.length} Pendentes
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {stats.proximasCobrancas.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Locatário / Placa</th>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Vencimento</th>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Valor</th>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest text-center">Status</th>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
              {stats.proximasCobrancas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="text-white font-semibold">
                      {item.contratos?.locatarios?.nome_completo || "Cobrança Avulsa"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase">
                      {item.contratos?.veiculos?.placa || "N/A"}
                    </div>

                    <div className="flex items-center gap-1 mt-2">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className={`h-1 w-3 rounded-full ${i < (item.tentativas_envio || 0) ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                      ))}
                      <span className="text-[9px] text-slate-500 font-bold ml-1">{item.tentativas_envio || 0}/8</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="text-slate-300 font-mono text-sm">
                      {new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                    <ExpirationTimer dataVencimento={item.data_vencimento} status={item.status} />
                  </td>

                  <td className="p-4">
                    <div className="text-white font-bold">R$ {Number(item.valor).toFixed(2).replace('.', ',')}</div>
                    <div className="text-[9px] text-indigo-400 font-bold uppercase">{item.categoria}</div>
                  </td>

                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'atrasado' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    {item.payment_link && (
                      <button onClick={() => openLinkModal(item.payment_link)} className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-lg">
                        <ExternalLink size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleGerarCobrancaPix(item.id)}
                      disabled={processingId === item.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs ${
                        processingId === item.id ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                      }`}
                    >
                      {processingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <><MessageCircle size={16} /> COBRAR</>}
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          ) : (
            <div className="p-20 text-center">
              <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CircleDollarSign className="text-slate-600" size={32} />
              </div>
              <p className="text-slate-500 font-medium">Nenhuma cobrança pendente para exibir.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Link de Pagamento */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-white font-bold flex items-center gap-2">
                <ExternalLink size={18} className="text-indigo-400" /> Link de Pagamento
              </h3>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input readOnly value={activeLink} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-xs text-indigo-300 font-mono outline-none" />
                <button onClick={handleCopyLink} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-all">
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <a href={activeLink} target="_blank" rel="noreferrer" className="block text-center text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest">Abrir no Navegador</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Card com descrição
const KpiCard = ({ title, value, icon, bgIcon, desc }) => (
  <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-5 group hover:border-indigo-500/30 transition-all duration-300">
    <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300 ${bgIcon}`}>
      {React.cloneElement(icon, { size: 32 })}
    </div>
    <div>
      <div className="text-3xl font-black text-white tracking-tight leading-none">{value}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{title}</div>
      <div className="text-[9px] text-slate-600 font-bold mt-1 uppercase italic">{desc}</div>
    </div>
  </div>
);

export default Dashboard;