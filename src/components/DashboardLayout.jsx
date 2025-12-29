import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-[#121829] overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[#1e293b] border-b border-slate-700 flex items-center px-4 md:px-8 shadow-md">
          <button 
            className="md:hidden text-white mr-4"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-semibold text-white">Sistema de Gestão</h2>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          <Outlet /> {/* Aqui serão renderizadas as páginas (Dashboard, Locatários, etc) */}
        </main>
      </div>

      {/* Overlay para mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;