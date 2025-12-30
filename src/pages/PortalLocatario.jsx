import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ExpirationTimer from '../components/ExpirationTimer';
import { 
  CreditCard, Copy, Car, Calendar, Loader2, 
  CheckCircle, X, ChevronLeft, ChevronRight, Filter, Search
} from 'lucide-react';
import { toast } from 'react-toastify';

const PortalLocatario = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [locatario, setLocatario] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  
  // Estados de Filtro e Paginação
  const [filterType, setFilterType] = useState('tudo'); // tudo, hoje, semana, mes, personalizado
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (token) fetchPortalData();
  }, [token]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const { data: loc, error: locError } = await supabase
        .from('locatarios')
        .select('id, nome_completo, whatsapp')
        .eq('portal_token', token)
        .single();

      if (locError || !loc) throw new Error("Link de acesso inválido.");
      setLocatario(loc);

      const { data: cobs, error: cobError } = await supabase
        .from('cobrancas')
        .select(`
          *,
          contratos!inner (
            id_locatario,
            veiculos ( modelo, placa )
          )
        `)
        .eq('contratos.id_locatario', loc.id)
        .order('data_vencimento', { ascending: false });

      if (cobError) throw cobError;
      setCobrancas(cobs || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTRAGEM ---
  const filteredCobrancas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return cobrancas.filter(cob => {
      const dataCob = new Date(cob.data_vencimento + 'T00:00:00');
      
      if (filterType === 'hoje') {
        return dataCob.getTime() === hoje.getTime();
      }
      
      if (filterType === 'semana') {
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(hoje.getDate() - 7);
        return dataCob >= seteDiasAtras && dataCob <= hoje;
      }
      
      if (filterType === 'mes') {
        return dataCob.getMonth() === hoje.getMonth() && dataCob.getFullYear() === hoje.getFullYear();
      }
      
      if (filterType === 'personalizado' && customDates.start && customDates.end) {
        const start = new Date(customDates.start + 'T00:00:00');
        const end = new Date(customDates.end + 'T00:00:00');
        return dataCob >= start && dataCob <= end;
      }

      return true; // 'tudo'
    });
  }, [cobrancas, filterType, customDates]);

  // --- LÓGICA DE PAGINAÇÃO ---
  const totalPages = Math.ceil(filteredCobrancas.length / itemsPerPage);
  const paginatedData = filteredCobrancas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCopyPix = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Código PIX copiado!");
  };

  if (loading) return (
    <div className="h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="text-center space-y-2 py-4">
          <div className="inline-block p-4 bg-indigo-600/20 rounded-3xl mb-2 shadow-2xl">
            <Car className="text-indigo-500" size={40} />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Olá, {locatario?.nome_completo.split(' ')[0]}!</h1>
          <p className="text-zinc-500 font-medium italic">Histórico de faturas e pagamentos</p>
        </header>

        {/* Barra de Filtros */}
        <div className="bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800 flex flex-wrap gap-2 justify-center">
          {['tudo', 'hoje', 'semana', 'mes', 'personalizado'].map((type) => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Datas Personalizadas */}
        {filterType === 'personalizado' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <input 
              type="date" 
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
              onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
            />
            <input 
              type="date" 
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500"
              onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
            />
          </div>
        )}

        {/* Lista de Cobranças */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Resultados ({filteredCobrancas.length})</h2>
          </div>
          
          {paginatedData.map((cob) => (
            <div key={cob.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl transition-all hover:border-zinc-700 animate-in fade-in duration-500">
              {/* Conteúdo do Card (Mantido conforme anterior) */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500 font-black uppercase">Vencimento</div>
                  <div className="text-lg font-mono font-bold flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-500" />
                    {new Date(cob.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-[10px] text-zinc-600 font-bold uppercase italic">{cob.contratos?.veiculos?.modelo}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 font-black uppercase">Valor</div>
                  <div className="text-2xl font-black text-emerald-400">R$ {Number(cob.valor).toFixed(2).replace('.', ',')}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800/50 pt-5">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${
                  cob.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {cob.status}
                </span>
                <ExpirationTimer dataVencimento={cob.data_vencimento} status={cob.status} />
              </div>

              {['pendente', 'atrasado'].includes(cob.status) && cob.payment_link && (
                <div className="mt-8 grid grid-cols-1 gap-3">
                  <a href={cob.payment_link} target="_blank" rel="noreferrer" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                    <CreditCard size={20} /> PAGAR VIA PIX
                  </a>
                  <button onClick={() => handleCopyPix(cob.payment_link)} className="w-full bg-zinc-800 text-zinc-300 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2">
                    <Copy size={16} /> COPIAR CÓDIGO
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredCobrancas.length === 0 && (
            <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
              <p className="text-zinc-600 font-bold italic uppercase text-xs tracking-widest">Nenhuma fatura encontrada neste período.</p>
            </div>
          )}
        </div>

        {/* Paginação Controles */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <footer className="text-center py-8">
          <p className="text-[9px] text-zinc-700 uppercase font-black tracking-[0.4em]">SGA • 2025</p>
        </footer>
      </div>
    </div>
  );
};

export default PortalLocatario;