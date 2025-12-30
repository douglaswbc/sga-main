import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  Settings, User, Key, Link, 
  QrCode, LogOut, RefreshCw, Loader2,
  ShieldCheck, AlertCircle
} from 'lucide-react';

const Configuracoes = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connLoading, setConnLoading] = useState(false);
  const [connectionState, setConnectionState] = useState('desconhecido');
  const [qrCode, setQrCode] = useState({ image: '', code: '', visible: false });

  const [formData, setFormData] = useState({
    nome_completo: '',
    whatsapp: '',
    access_token_mercado_pago: '',
    evolution_url: '',
    evolution_instance: '',
    evolution_apikey: ''
  });

  // Carrega dados iniciais do perfil
  useEffect(() => {
    if (profile) {
      setFormData({
        nome_completo: profile.nome_completo || '',
        whatsapp: profile.whatsapp || '',
        access_token_mercado_pago: profile.access_token_mercado_pago || '',
        evolution_url: profile.evolution_url || '',
        evolution_instance: profile.evolution_instance || '',
        evolution_apikey: profile.evolution_apikey || ''
      });
      setLoading(false);
    }
  }, [profile]);

  // Função para verificar status da conexão Evolution
  const checkConnection = useCallback(async (showToast = false) => {
    if (!formData.evolution_url || !formData.evolution_instance) return;

    try {
      const response = await fetch(`${formData.evolution_url}/instance/connectionState/${formData.evolution_instance}`, {
        headers: { 'apikey': formData.evolution_apikey }
      });
      const result = await response.json();
      const state = result.instance?.state || 'close';
      setConnectionState(state);
      
      if (state === 'open') {
        setQrCode(prev => ({ ...prev, visible: false }));
        if (showToast) toast.success("WhatsApp conectado!");
      }
      return state;
    } catch (error) {
      setConnectionState('erro');
      console.error("Erro na Evolution API:", error);
    }
  }, [formData]);

  // Polling para o QR Code
  useEffect(() => {
    let interval;
    if (qrCode.visible && connectionState !== 'open') {
      interval = setInterval(() => checkConnection(), 5000);
    }
    return () => clearInterval(interval);
  }, [qrCode.visible, connectionState, checkConnection]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQR = async () => {
    setConnLoading(true);
    try {
      const response = await fetch(`${formData.evolution_url}/instance/connect/${formData.evolution_instance}`, {
        headers: { 'apikey': formData.evolution_apikey }
      });
      const result = await response.json();
      if (result.base64) {
        setQrCode({ image: result.base64, code: result.pairingCode, visible: true });
        toast.info("QR Code gerado. Escaneie no seu WhatsApp.");
      }
    } catch (error) {
      toast.error("Erro ao gerar QR Code");
    } finally {
      setConnLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Deseja desconectar o WhatsApp?")) return;
    setConnLoading(true);
    try {
      await fetch(`${formData.evolution_url}/instance/logout/${formData.evolution_instance}`, {
        method: 'DELETE',
        headers: { 'apikey': formData.evolution_apikey }
      });
      setConnectionState('close');
      setQrCode({ image: '', code: '', visible: false });
      toast.warning("Instância desconectada.");
    } catch (error) {
      toast.error("Erro ao desconectar");
    } finally {
      setConnLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm("Enviar e-mail de recuperação de senha?")) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) throw error;
      toast.success("E-mail enviado!");
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  if (loading) return <div className="flex p-20 justify-center"><Loader2 className="animate-spin text-accent" size={40} /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="text-accent" /> Configurações do Sistema
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário de Credenciais */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-card border border-slate-700 rounded-xl p-6 shadow-lg space-y-6">
            <section>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User size={16} /> Perfil e Pagamentos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nome Completo</label>
                  <input 
                    className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
                    value={formData.nome_completo}
                    onChange={e => setFormData({...formData, nome_completo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">WhatsApp de Contato</label>
                  <input 
                    className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs text-slate-500 mb-1">Mercado Pago Access Token</label>
                <input 
                  type="password"
                  className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-accent font-mono text-sm"
                  value={formData.access_token_mercado_pago}
                  onChange={e => setFormData({...formData, access_token_mercado_pago: e.target.value})}
                />
              </div>
            </section>

            <section className="pt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Link size={16} /> Evolution API
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">URL da API</label>
                  <input 
                    className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
                    value={formData.evolution_url}
                    onChange={e => setFormData({...formData, evolution_url: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Instância</label>
                    <input 
                      className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
                      value={formData.evolution_instance}
                      onChange={e => setFormData({...formData, evolution_instance: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">API Key</label>
                    <input 
                      type="password"
                      className="w-full bg-input border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-accent font-mono text-sm"
                      value={formData.evolution_apikey}
                      onChange={e => setFormData({...formData, evolution_apikey: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-between items-center pt-4">
              <button 
                type="button" 
                onClick={handleResetPassword}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
              >
                <Key size={16} /> Alterar Minha Senha
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="bg-accent hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        {/* Status da Conexão WhatsApp */}
        <div className="space-y-6">
          <div className="bg-card border border-slate-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Conexão WhatsApp</h3>
            
            <div className="flex items-center justify-between mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status Atual</span>
                <span className={`text-lg font-black uppercase ${
                  connectionState === 'open' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {connectionState === 'open' ? 'Conectado' : connectionState === 'desconhecido' ? '---' : 'Desconectado'}
                </span>
              </div>
              <button 
                onClick={() => checkConnection(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                title="Atualizar Status"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {connectionState !== 'open' ? (
              <button 
                onClick={handleGenerateQR}
                disabled={connLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/10"
              >
                {connLoading ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
                Gerar QR Code / Reconectar
              </button>
            ) : (
              <button 
                onClick={handleDisconnect}
                disabled={connLoading}
                className="w-full bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20"
              >
                {connLoading ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
                Desconectar Instância
              </button>
            )}

            {/* Exibição do QR Code */}
            {qrCode.visible && (
              <div className="mt-8 p-6 bg-white rounded-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                <p className="text-zinc-900 font-bold text-sm">Escaneie com o WhatsApp</p>
                <img src={qrCode.image} alt="QR Code Evolution" className="w-48 h-48 rounded-lg shadow-inner" />
                <div className="w-full bg-zinc-100 p-3 rounded-lg border border-zinc-200">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase text-center mb-1 tracking-tighter">Código de Emparelhamento</p>
                  <code className="block text-center text-zinc-800 font-black text-xl tracking-widest">{qrCode.code}</code>
                </div>
              </div>
            )}
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
            <p className="text-[11px] text-emerald-200/70 leading-relaxed">
              As suas credenciais de API são criptografadas e utilizadas apenas para automatizar as suas cobranças. 
              Mantenha o seu token do Mercado Pago atualizado para evitar falhas no checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;