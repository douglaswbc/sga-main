import React, { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, Search, MapPin, 
  Phone, Mail, ToggleLeft, ToggleRight, X, Loader2,
  ExternalLink, UserCheck, ShieldAlert, Globe
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { formatWhatsAppToAPI } from '../utils/formatters'; // Importando seu utilitário

const Locatarios = () => {
  const { profile } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    nome_completo: '',
    whatsapp: '',
    email: '',
    documento: 'CPF',
    cpf: '',
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    ativo: true
  });

  const portalBaseUrl = `${window.location.origin}/portal`;

  useEffect(() => {
    if (profile?.id) fetchTenants();
  }, [profile]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locatarios')
        .select('*')
        .eq('id_usuario', profile.id)
        .order('nome_completo');
      
      if (error) throw error;
      setTenants(data || []);
    } catch (err) {
      toast.error('Erro ao buscar locatários');
    } finally {
      setLoading(false);
    }
  };

  // --- MÁSCARAS VISUAIS ---
  const maskWhatsApp = (value) => {
  let v = value.replace(/\D/g, '').slice(0, 13);

  // País + DDD + número (8)
  if (v.length <= 12) {
    return v
      .replace(/^(\d{2})(\d{2})(\d{4})(\d{0,4})$/, '+$1 ($2) $3-$4')
      .replace(/-$/, '');
  }

  // País + DDD + 9 + número (9)
  return v
    .replace(/^(\d{2})(\d{2})(\d{5})(\d{0,4})$/, '+$1 ($2) $3-$4')
    .replace(/-$/, '');
};

  const maskCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  const maskCNPJ = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  const maskCEP = (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');

  const handleInputChange = (field, value) => {
    let masked = value;
    if (field === 'whatsapp') masked = maskWhatsApp(value);
    if (field === 'cpf') masked = formData.documento === 'CPF' ? maskCPF(value) : maskCNPJ(value);
    if (field === 'cep') masked = maskCEP(value);
    setFormData({ ...formData, [field]: masked });
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: null });
  };

  // --- INTEGRAÇÃO VIACEP ---
  const handleCepBlur = async (cepValue) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          rua: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf
        }));
      }
    } catch (err) { console.error('Erro ao buscar CEP'); }
  };

  // --- FORMATAÇÃO WHATSAPP VIA UTILS ---
  const handleWhatsAppBlur = () => {
    if (!formData.whatsapp) return;
    // Usa o seu utilitário para garantir o formato 55...
    const formatted = formatWhatsAppToAPI(formData.whatsapp);
    setFormData(prev => ({ ...prev, whatsapp: maskWhatsApp(formatted) }));
  };

  // --- SALVAR (LIMPA MÁSCARAS) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    
    // Garantimos que apenas NÚMEROS vão para o banco
    const dataToSave = {
      ...formData,
      id_usuario: profile.id,
      whatsapp: formData.whatsapp.replace(/\D/g, ''),
      cpf: formData.cpf.replace(/\D/g, ''),
      cep: formData.cep.replace(/\D/g, '')
    };

    try {
      let error;
      if (editingTenant) {
        const { error: err } = await supabase.from('locatarios').update(dataToSave).eq('id', editingTenant.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('locatarios').insert([dataToSave]);
        error = err;
      }

      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('cpf')) setFieldErrors({ cpf: 'Documento já cadastrado para outro cliente.' });
          else if (error.message.includes('whatsapp')) setFieldErrors({ whatsapp: 'WhatsApp já cadastrado para outro cliente.' });
          return;
        }
        throw error;
      }

      toast.success(editingTenant ? 'Dados atualizados!' : 'Locatário cadastrado!');
      setShowModal(false);
      fetchTenants();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // --- DELETAR ---
  const deleteTenant = async (id) => {
    if (!window.confirm('Excluir este locatário? Esta ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase.from('locatarios').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') throw new Error("Não é possível excluir: este locatário possui contratos vinculados.");
        throw error;
      }
      toast.success('Locatário removido');
      fetchTenants();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // --- STATUS ---
  const toggleStatus = async (tenant) => {
    const { error } = await supabase.from('locatarios').update({ ativo: !tenant.ativo }).eq('id', tenant.id);
    if (!error) fetchTenants();
  };

  const handleCopyPortalLink = (token) => {
    if (!token) return toast.error("Token não gerado.");
    navigator.clipboard.writeText(`${portalBaseUrl}/${token}`);
    toast.success("Link do Portal copiado!");
  };

  const filteredTenants = tenants.filter(t => 
    t.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.cpf?.includes(searchTerm.replace(/\D/g, ''))
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="text-indigo-500" /> Locatários
          </h2>
          <p className="text-sm text-zinc-500 font-medium">Gestão de clientes e acesso ao Portal do Locatário.</p>
        </div>
        <button 
          onClick={() => { setEditingTenant(null); setFormData({ documento: 'CPF', ativo: true, nome_completo: '', whatsapp: '', email: '', cpf: '', cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '' }); setFieldErrors({}); setShowModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <Plus size={20} /> Novo Locatário
        </button>
      </div>

      {/* SEARCH E TABELA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou documento..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-indigo-500 transition-all" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase bg-zinc-950/50 text-zinc-500 border-b border-zinc-800 font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Locatário / Doc</th>
                <th className="px-6 py-4">Contato Principal</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32} /></td></tr>
              ) : filteredTenants.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-100">{item.nome_completo}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.cpf}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs"><Phone size={14} className="text-indigo-500" /> {item.whatsapp}</div>
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] mt-1"><Mail size={14} /> {item.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 text-zinc-400 text-xs italic"><MapPin size={14} className="text-red-500 shrink-0" /> {item.cidade}/{item.estado}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleStatus(item)} className={item.ativo ? 'text-emerald-500' : 'text-zinc-600'}>
                      {item.ativo ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => handleCopyPortalLink(item.portal_token)} className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all" title="Link do Portal"><ExternalLink size={18} /></button>
                    <button onClick={() => { setEditingTenant(item); setFormData(item); setFieldErrors({}); setShowModal(true); }} className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-xl transition-all"><Pencil size={18} /></button>
                    <button onClick={() => deleteTenant(item.id)} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><UserCheck className="text-indigo-500"/> {editingTenant ? 'Editar Perfil' : 'Novo Cadastro'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-8">
              {/* DADOS PESSOAIS */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-3">Dados de Identificação</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome Completo</label>
                    <input required type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={formData.nome_completo} onChange={e => setFormData({...formData, nome_completo: e.target.value})} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">WhatsApp</label>
                    <input required type="text" placeholder="(00) 00000-0000" onBlur={handleWhatsAppBlur} className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-zinc-100 outline-none transition-all ${fieldErrors.whatsapp ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-800 focus:border-indigo-500'}`} value={formData.whatsapp} onChange={e => handleInputChange('whatsapp', e.target.value)} />
                    {fieldErrors.whatsapp && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 uppercase mt-1"><ShieldAlert size={10}/> {fieldErrors.whatsapp}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">E-mail</label>
                    <input type="email" placeholder="cliente@exemplo.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tipo Doc.</label>
                    <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none" value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value, cpf: ''})}>
                      <option value="CPF">Pessoa Física (CPF)</option>
                      <option value="CNPJ">Pessoa Jurídica (CNPJ)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Número do {formData.documento}</label>
                    <input required type="text" className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-zinc-100 outline-none transition-all ${fieldErrors.cpf ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-800 focus:border-indigo-500'}`} value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                    {fieldErrors.cpf && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 uppercase mt-1"><ShieldAlert size={10}/> {fieldErrors.cpf}</p>}
                  </div>
                </div>
              </div>

              {/* ENDEREÇO */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] border-l-2 border-indigo-500 pl-3">Localização</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">CEP</label>
                    <input required type="text" placeholder="00000-000" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500" value={formData.cep} onBlur={e => handleCepBlur(e.target.value)} onChange={e => handleInputChange('cep', e.target.value)} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Rua / Logradouro</label>
                    <input required type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500" value={formData.rua} onChange={e => setFormData({...formData, rua: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nº</label>
                    <input required type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Bairro</label>
                    <input required type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cidade/UF</label>
                    <div className="flex gap-2">
                       <input required type="text" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
                       <input required type="text" maxLength={2} className="w-14 bg-zinc-950 border border-zinc-800 rounded-xl py-3 text-center text-zinc-100 uppercase outline-none focus:border-indigo-500 font-bold" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value.toUpperCase()})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÕES */}
              <div className="pt-8 border-t border-zinc-800 flex justify-end gap-4 sticky bottom-0 bg-zinc-900 pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl text-zinc-500 hover:text-white font-bold transition-all">DESCARTAR</button>
                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-xl shadow-indigo-600/30 active:scale-95 transition-all uppercase text-xs tracking-widest">SALVAR DADOS</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locatarios;