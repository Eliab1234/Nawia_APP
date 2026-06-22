import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabaseClient';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import Consultas from './pages/Consultas';
import GestionPersonal from './pages/GestionPersonal';

// Guard para rutas protegidas generales (Cualquier usuario autenticado)
const PrivateRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-secondary text-secondary text-sm">
        Cargando sesión...
      </div>
    );
  }

  return session ? children : <Navigate to="/login" replace />;
};

// Guard exclusivo para Administradores
const AdminRoute = ({ children }) => {
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata?.role === 'admin') {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
      setLoading(false);
    };

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-secondary text-secondary text-sm">
        Verificando permisos...
      </div>
    );
  }

  return authorized ? children : <Navigate to="/dashboard" replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Ruta de Login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas Protegidas del Personal Médico */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/pacientes"
          element={
            <PrivateRoute>
              <Pacientes />
            </PrivateRoute>
          }
        />
        <Route
          path="/consultas"
          element={
            <PrivateRoute>
              <Consultas />
            </PrivateRoute>
          }
        />

        {/* Rutas Protegidas de Administración */}
        <Route
          path="/personal"
          element={
            <AdminRoute>
              <GestionPersonal />
            </AdminRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
