import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [stats, setStats] = useState({
    pacientesCount: 0,
    consultasCount: 0,
    casosRiesgoCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDataAndStats = async () => {
      try {
        // 1. Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          setRole(user.user_metadata?.role || 'user');
        }

        // 2. Cargar estadísticas de Supabase
        const [pacientesRes, consultasRes, riesgoRes] = await Promise.all([
          supabase.from('pacientes').select('*', { count: 'exact', head: true }),
          supabase.from('consultas').select('*', { count: 'exact', head: true }),
          supabase.from('consultas')
            .select('*', { count: 'exact', head: true })
            .or('prob_glaucoma.gt.0.5,prob_catarata.gt.0.5,prob_retinopatia_diabetica.gt.0.5,prob_degeneracion_macular.gt.0.5,prob_retinopatia_hipertensiva.gt.0.5,prob_miopia.gt.0.5')
        ]);

        setStats({
          pacientesCount: pacientesRes.count || 0,
          consultasCount: consultasRes.count || 0,
          casosRiesgoCount: riesgoRes.count || 0
        });
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndStats();
  }, []);

  return (
    <Layout>
      <div className="dashboard-header-bar">
        <div>
          <h1 className="page-title">Panel de Control</h1>
          <p className="page-subtitle">Sistema de gestión clínica integral con Inteligencia Artificial NawIA.</p>
        </div>
      </div>

      <div className="welcome-banner">
        <div className="welcome-banner-text">
          <h2>¡Hola de nuevo, {user?.user_metadata?.nombre_completo || user?.email || 'Médico'}! 👋</h2>
          <p>Has iniciado sesión con el rol de <strong>{role === 'admin' ? 'Administrador' : 'Médico (User)'}</strong>. Desde este panel puedes registrar pacientes, cargar imágenes de retina para inferencia de IA y guardar las consultas.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-secondary text-sm py-4">Cargando estadísticas del sistema...</div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-color)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="stat-info">
              <h3 className="text-xl font-bold">{stats.pacientesCount}</h3>
              <p className="stat-desc">Pacientes registrados</p>
            </div>
            <Link to="/pacientes" class="stat-link">Ver todos &rarr;</Link>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08" />
              </svg>
            </div>
            <div className="stat-info">
              <h3 className="text-xl font-bold">{stats.consultasCount}</h3>
              <p className="stat-desc">Consultas oftálmicas</p>
            </div>
            <Link to="/consultas" class="stat-link">Analizar &rarr;</Link>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="stat-info">
              <h3 className="text-xl font-bold">{stats.casosRiesgoCount}</h3>
              <p className="stat-desc">Patologías detectadas (&gt;50%)</p>
            </div>
            <span className="absolute right-6 text-xs font-semibold px-2 py-1 rounded bg-rose-50 text-rose-600">Alerta IA</span>
          </div>
        </div>
      )}

      <div className="quick-actions-section mt-8">
        <h3 className="section-title">Accesos Rápidos</h3>
        <div className="quick-actions-grid">
          <Link to="/consultas" className="action-card">
            <h4>Nueva Consulta IA</h4>
            <p>Sube imágenes de retina y ejecuta inferencia del modelo.</p>
          </Link>
          <Link to="/pacientes" className="action-card">
            <h4>Registro de Pacientes</h4>
            <p>Añade nuevos pacientes y consulta antecedentes médicos.</p>
          </Link>
          {role === 'admin' && (
            <Link to="/personal" className="action-card">
              <h4>Gestión de Personal</h4>
              <p>Configura cuentas y accesos para nuevos médicos.</p>
            </Link>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
