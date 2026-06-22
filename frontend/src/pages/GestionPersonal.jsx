import React, { useState } from 'react';
import { supabaseRegister } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const GestionPersonal = () => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [dni, setDni] = useState('');
  const [especialidad, setEspecialidad] = useState('Oftalmología General');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default: Médico ('user')
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Validación de DNI (8 dígitos)
    if (!/^\d{8}$/.test(dni)) {
      setError('El DNI debe contener exactamente 8 dígitos numéricos.');
      setLoading(false);
      return;
    }

    // Validación de contraseña mínima
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Registrar al nuevo médico usando la instancia secundaria sin persistencia de sesión
      const { data, error: signUpError } = await supabaseRegister.auth.signUp({
        email: correo,
        password: password,
        options: {
          data: {
            nombre_completo: nombreCompleto,
            dni: dni,
            especialidad: especialidad,
            role: role // 'admin' o 'user'
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess(`Médico registrado con éxito. Se ha enviado un correo de confirmación a ${correo}.`);
      
      // Limpiar formulario
      setNombreCompleto('');
      setDni('');
      setEspecialidad('Oftalmología General');
      setCorreo('');
      setPassword('');
      setRole('user');

    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al registrar el nuevo médico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="dashboard-header-bar">
        <div>
          <h1 className="page-title">Gestión de Personal</h1>
          <p className="page-subtitle">Registra nuevas cuentas de médicos e inyecta roles y especialidades en sus metadatos.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="module-container">
          <h2 className="text-lg font-bold text-primary mb-6">Registrar Nuevo Médico / Administrador</h2>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="doc-nombre">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="doc-nombre"
                  placeholder="Ej. Dr. Carlos Mendoza"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="doc-dni">
                  DNI (8 dígitos)
                </label>
                <input
                  type="text"
                  id="doc-dni"
                  maxLength={8}
                  placeholder="Ej. 76543210"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} // Solo números
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="doc-especialidad">
                  Especialidad Médica
                </label>
                <input
                  type="text"
                  id="doc-especialidad"
                  placeholder="Ej. Retinología, Oftalmología General"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="doc-rol">
                  Rol del Sistema
                </label>
                <select
                  id="doc-rol"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="user">Médico (User)</option>
                  <option value="admin">Administrador (Admin)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4 pt-4"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="doc-email">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="doc-email"
                  placeholder="doctor@ocuvision.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="doc-pass">
                  Contraseña de Acceso
                </label>
                <input
                  type="password"
                  id="doc-pass"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-6"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta Médica'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default GestionPersonal;
