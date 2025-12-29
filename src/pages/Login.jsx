import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';
import { Mail, Lock, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Verifica se o usuário já está logado ao carregar a página
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/dashboard');
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Autenticação no Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error("E-mail ou senha inválidos.");

      // 2. Verificação de status na tabela 'usuarios'
      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('ativo')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile.ativo) {
        await supabase.auth.signOut();
        throw new Error("Usuário inativo. Entre em contato com o suporte.");
      }

      toast.success("Login realizado com sucesso!");
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121829] p-4">
      <div className="w-full max-w-md bg-[#1e293b] rounded-xl shadow-2xl p-8 border border-slate-700/50">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Acessar Painel</h2>
          <p className="text-slate-400">Bem-vindo de volta! Faça login para continuar.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="email"
              placeholder="Seu e-mail"
              className="w-full bg-[#2d3748] border border-slate-600 rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="password"
              placeholder="Sua senha"
              className="w-full bg-[#2d3748] border border-slate-600 rounded-lg py-3 pl-11 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;