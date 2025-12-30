import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Locatarios from './pages/Locatarios';
import Veiculos from './pages/Veiculos';
import Contratos from './pages/Contratos';
import Cobrancas from './pages/Cobrancas';
import Mensagens from './pages/Mensagens';
import Triagem from './pages/Triagem';
import Configuracoes from './pages/Configuracoes';
import Admin from './pages/Admin';
import PortalLocatario from './pages/PortalLocatario';

// Componente temporário para teste
const Placeholder = ({ title }) => <h1 className="text-2xl text-white font-bold">{title}</h1>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#121829]">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/portal/:token" element={<PortalLocatario />} />
            
            {/* Rotas Protegidas pelo DashboardLayout */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/locatarios" element={<Locatarios />} />
              <Route path="/veiculos" element={<Veiculos />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/cobrancas" element={<Cobrancas />} />
              <Route path="/mensagens" element={<Mensagens />} />
              <Route path="/triagem" element={<Triagem />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/admin" element={<Admin />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          <ToastContainer theme="dark" position="top-right" autoClose={3000} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;