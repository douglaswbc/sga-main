import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Loader2, MessageSquareQuote, Info } from 'lucide-react';
import { toast } from 'react-toastify';

const Mensagens = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);

  // Modelos padrão caso o banco esteja vazio
  const defaultTemplates = [
    { ordem: 1, titulo: '1º Lembrete (20:00)', conteudo: 'Sua cobrança do aluguel de HOJE foi gerada.' },
    { ordem: 2, titulo: '2º Lembrete (20:30)', conteudo: 'Oi, Tudo bem? Sua fatura ainda está aguardando pagamento.' },
    { ordem: 3, titulo: '3º Lembrete (21:00)', conteudo: 'Atenção sua fatura ainda está pendente.' },
    { ordem: 4, titulo: '4º Lembrete (21:30)', conteudo: 'Continuamos aguardando o pagamento da sua fatura.' },
    { ordem: 5, titulo: '5º Lembrete (22:00)', conteudo: 'AVISO: Sua fatura não foi paga. O não pagamento resultará no bloqueio.' },
    { ordem: 6, titulo: '6º Lembrete (22:30)', conteudo: 'Este é um dos últimos avisos sobre sua fatura.' },
    { ordem: 7, titulo: 'ÚLTIMO AVISO (23:00)', conteudo: 'ÚLTIMO AVISO! Sua fatura não foi paga. O bloqueio do serviço é iminente.' }
  ];

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mensagens_template')
        .select('*')
        .eq('id_usuario', profile.id)
        .order('ordem', { ascending: true });

      if (error) throw error;

      // Se não houver dados, usa os padrões
      if (data && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates(defaultTemplates);
      }
    } catch (error) {
      toast.error("Erro ao carregar modelos de mensagem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) fetchTemplates();
  }, [profile]);

  const handleContentChange = (index, value) => {
    const updated = [...templates];
    updated[index].conteudo = value;
    setTemplates(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepara os dados para o upsert
      const templatesToSave = templates.map(t => ({
        id_usuario: profile.id,
        ordem: t.ordem,
        titulo: t.titulo,
        conteudo: t.conteudo
      }));

      const { error } = await supabase
        .from('mensagens_template')
        .upsert(templatesToSave, { onConflict: 'id_usuario, ordem' });

      if (error) throw error;
      toast.success("Modelos de mensagem atualizados!");
    } catch (error) {
      toast.error("Erro ao salvar alterações: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquareQuote className="text-accent" />
            Modelos de Mensagem
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Personalize as notificações enviadas automaticamente aos locatários.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Alterações
        </button>
      </div>

      <div className="bg-amber-400/10 border border-amber-400/20 p-4 rounded-lg flex items-start gap-3">
        <Info className="text-amber-400 shrink-0" size={20} />
        <p className="text-sm text-amber-200/80">
          As mensagens são enviadas sequencialmente conforme o horário definido no sistema de automação. 
          Use uma linguagem clara para evitar bloqueios.
        </p>
      </div>

      <div className="grid gap-6">
        {templates.map((template, index) => (
          <div key={template.ordem} className="bg-card border border-slate-700 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
              {template.titulo}
            </label>
            <textarea
              className="w-full bg-input border border-slate-600 rounded-lg p-4 text-white text-sm focus:border-accent outline-none min-h-[100px] transition-colors"
              placeholder="Digite a mensagem aqui..."
              value={template.conteudo}
              onChange={(e) => handleContentChange(index, e.target.value)}
            />
          </div>
        ))}
      </div>
      
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Salvar Todas as Alterações
        </button>
      </div>
    </div>
  );
};

export default Mensagens;