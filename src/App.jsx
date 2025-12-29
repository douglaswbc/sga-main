import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';

// Componente temporário para teste
const Placeholder = ({ title }) => <h1 className="text-2xl text-white font-bold">{title}</h1>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#121829]">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Rotas Protegidas pelo DashboardLayout */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
              <Route path="/locatarios" element={<Placeholder title="Gestão de Locatários" />} />
              <Route path="/veiculos" element={<Placeholder title="Gestão de Veículos" />} />
              <Route path="/contratos" element={<Placeholder title="Contratos" />} />
              <Route path="/cobrancas" element={<Placeholder title="Histórico de Cobranças" />} />
              <Route path="/mensagens" element={<Placeholder title="Templates de Mensagem" />} />
              <Route path="/triagem" element={<Placeholder title="Triagem de Candidatos" />} />
              <Route path="/configuracoes" element={<Placeholder title="Configurações" />} />
              <Route path="/admin" element={<Placeholder title="Painel Administrativo" />} />
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