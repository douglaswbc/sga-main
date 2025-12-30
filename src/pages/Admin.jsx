import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShieldAlert, Users, Plus, Edit, 
  Search, Loader2, Key, UserCheck, 
  UserX, Mail
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserModal from '../components/UserModal';

const Admin = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Proteção de rota interna: apenas super_admin
    if (profile?.role === 'admin') fetchUsers();
  }, [profile]);

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success("Status atualizado!");
      fetchUsers();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-white">Acesso Negado</h2>
        <p className="text-slate-500">Apenas Super Administradores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
            <p className="text-slate-400 text-sm">Controle de acessos e permissões do sistema.</p>
          </div>
        </div>
        <button 
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="bg-accent hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} /> Novo Usuário
        </button>
      </div>

      <div className="bg-card rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-input border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:border-accent outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest">
            <Users size={14} /> {users.length} Usuários Cadastrados
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-accent" size={40} /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Usuário</th>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Cargo</th>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest">Status</th>
                  <th className="p-4 text-slate-400 font-bold text-xs uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.nome_completo || 'Sem Nome'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail size={12} /> {u.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                        u.role === 'super_admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => toggleUserStatus(u.id, u.ativo)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                          u.ativo ? 'text-emerald-500 hover:text-emerald-400' : 'text-red-500 hover:text-red-400'
                        }`}
                      >
                        {u.ativo ? <UserCheck size={16} /> : <UserX size={16} />}
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                        className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                        title="Editar Perfil"
                      >
                        <Edit size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchUsers}
        userToEdit={selectedUser}
      />
    </div>
  );
};

export default Admin;