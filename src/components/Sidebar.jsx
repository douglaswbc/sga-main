import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Users, Car, FileText, 
  DollarSign, MessageSquareText, ClipboardCheck, 
  Settings, ShieldAlert, LogOut // Substituído UserShield por ShieldAlert
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { profile, signOut } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/locatarios', label: 'Locatários', icon: Users },
    { path: '/veiculos', label: 'Veículos', icon: Car },
    { path: '/contratos', label: 'Contratos', icon: FileText },
    { path: '/cobrancas', label: 'Cobranças', icon: DollarSign },
    { path: '/mensagens', label: 'Mensagens', icon: MessageSquareText },
    { path: '/triagem', label: 'Triagem', icon: ClipboardCheck },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-[#1e293b] transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-0
    `}>
      <div className="flex flex-col h-full border-r border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-xl font-bold text-white">Painel SGA</h3>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => window.innerWidth < 768 && toggleSidebar()}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}

            {profile?.role === 'super_admin' && (
              <li className="mt-4 pt-4 border-t border-slate-700">
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg text-amber-400 hover:bg-slate-800 transition-colors
                    ${isActive ? 'bg-slate-800 ring-1 ring-amber-400/50' : ''}
                  `}
                >
                  <ShieldAlert size={20} /> {/* Atualizado aqui também */}
                  <span className="font-medium">Painel Admin</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-white truncate">{profile?.nome_completo || 'Usuário'}</span>
              <span className="text-xs text-slate-500 truncate">{profile?.email}</span>
            </div>
            <button 
              onClick={signOut}
              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;