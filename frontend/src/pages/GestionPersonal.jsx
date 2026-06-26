import React, { useState, useEffect } from 'react';
import { supabase, supabaseRegister } from '../config/supabaseClient';
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

  // Estados para listar médicos
  const [medicos, setMedicos] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState(null);

  // Estados para editar médico
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editEspecialidad, setEditEspecialidad] = useState('Oftalmología General');
  const [editRole, setEditRole] = useState('user');
  const [editPassword, setEditPassword] = useState('');
  const [editIsDisabled, setEditIsDisabled] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState(null);

  const fetchMedicos = async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const { data, error } = await supabase.rpc('get_users');
      if (error) throw error;
      setMedicos(data || []);
    } catch (err) {
      console.error('Error al cargar médicos:', err);
      setListError('No se pudo cargar la lista de personal médico. Asegúrate de haber ejecutado el script SQL en el editor de Supabase.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchMedicos();
  }, []);

  const handleOpenEditModal = (medico) => {
    setSelectedMedico(medico);
    setEditNombre(medico.nombre_completo || '');
    setEditCorreo(medico.email || '');
    setEditDni(medico.dni || '');
    setEditEspecialidad(medico.especialidad || 'Oftalmología General');
    setEditRole(medico.role || 'user');
    setEditPassword('');
    setEditIsDisabled(medico.banned_until !== null && medico.banned_until !== undefined);
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateMedico = async (e) => {
    e.preventDefault();
    setEditError(null);
    setUpdating(true);

    if (editPassword && editPassword.length < 6) {
      setEditError('La contraseña debe tener al menos 6 caracteres.');
      setUpdating(false);
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_update_user', {
        user_id: selectedMedico.id,
        new_email: editCorreo,
        new_password: editPassword || null,
        new_nombre_completo: editNombre,
        new_dni: editDni,
        new_especialidad: editEspecialidad,
        new_role: editRole,
        is_disabled: editIsDisabled
      });

      if (error) throw error;

      setShowEditModal(false);
      fetchMedicos();
    } catch (err) {
      console.error('Error al actualizar médico:', err);
      setEditError(err.message || 'No se pudo actualizar la cuenta del médico.');
    } finally {
      setUpdating(false);
    }
  };

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

      // Recargar lista
      fetchMedicos();

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Panel Izquierdo: Lista de médicos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="module-container">
            <h2 className="text-lg font-bold text-primary mb-6">Personal Médico Registrado</h2>

            {listError && <div className="alert alert-danger">{listError}</div>}

            {loadingList ? (
              <div className="text-center py-8 text-secondary text-sm">Cargando personal...</div>
            ) : medicos.length === 0 ? (
              <div className="text-center py-8 text-secondary text-sm">No hay personal registrado en el sistema.</div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Especialidad</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicos.map((m) => (
                      <tr key={m.id}>
                        <td className="font-semibold text-primary">
                          <div>{m.nombre_completo}</div>
                          <div className="text-xs text-secondary font-normal">{m.email}</div>
                        </td>
                        <td>{m.especialidad}</td>
                        <td>
                          <span className={`badge ${
                            m.role === 'admin' ? 'badge-danger' : 
                            m.role === 'asistente' ? 'badge-warning' : 
                            m.role === 'enfermero' ? 'badge-info' : 'badge-success'
                          }`} style={
                            m.role === 'asistente' ? { backgroundColor: '#fef3c7', color: '#d97706' } :
                            m.role === 'enfermero' ? { backgroundColor: '#e0f2fe', color: '#0369a1' } : {}
                          }>
                            {m.role === 'admin' ? 'Admin' : 
                             m.role === 'asistente' ? 'Asistente' : 
                             m.role === 'enfermero' ? 'Enfermero' : 'Médico'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${m.banned_until ? 'badge-danger' : 'badge-success'}`} style={m.banned_until ? {backgroundColor: '#ffe4e6', color: '#e11d48'} : {}}>
                            {m.banned_until ? 'Deshabilitado' : 'Activo'}
                          </span>
                        </td>
                        <td className="table-actions">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(m)}
                            className="btn btn-secondary btn-sm flex items-center gap-1 py-1 px-3 text-xs"
                            title="Editar datos del médico"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Registrar nuevo */}
        <div>
          <div className="module-container">
            <h2 className="text-lg font-bold text-primary mb-6">Registrar Nuevo Personal</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="form-group">
                <label className="form-label" htmlFor="doc-especialidad">
                  Especialidad Médica
                </label>
                <input
                  type="text"
                  id="doc-especialidad"
                  placeholder="Ej. Dr. Carlos Mendoza"
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
                  <option value="asistente">Asistente Administrativo</option>
                  <option value="enfermero">Enfermero (Triaje)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="doc-email">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="doc-email"
                  placeholder="doctor@nawia.com"
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

              <button
                type="submit"
                className="btn btn-primary w-full mt-4"
                disabled={loading}
              >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Edición de Médico */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Médico / Administrador</h2>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateMedico}>
              <div className="modal-body space-y-4">
                {editError && <div className="alert alert-danger">{editError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-nombre">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="edit-nombre"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-dni">
                      DNI (8 dígitos)
                    </label>
                    <input
                      type="text"
                      id="edit-dni"
                      maxLength={8}
                      value={editDni}
                      onChange={(e) => setEditDni(e.target.value.replace(/\D/g, ''))}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-rol">
                      Rol del Sistema
                    </label>
                    <select
                      id="edit-rol"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="form-input"
                      required
                    >
                      <option value="user">Médico (User)</option>
                      <option value="admin">Administrador (Admin)</option>
                      <option value="asistente">Asistente Administrativo</option>
                      <option value="enfermero">Enfermero (Triaje)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-especialidad">
                    Especialidad Médica
                  </label>
                  <input
                    type="text"
                    id="edit-especialidad"
                    value={editEspecialidad}
                    onChange={(e) => setEditEspecialidad(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-email">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    id="edit-email"
                    value={editCorreo}
                    onChange={(e) => setEditCorreo(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-pass">
                    Nueva Contraseña de Acceso (Opcional)
                  </label>
                  <input
                    type="password"
                    id="edit-pass"
                    placeholder="Dejar en blanco para conservar la actual"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 border border-slate-200 rounded">
                  <input
                    type="checkbox"
                    id="edit-disabled"
                    checked={editIsDisabled}
                    onChange={(e) => setEditIsDisabled(e.target.checked)}
                    className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="edit-disabled" className="text-sm font-semibold text-primary cursor-pointer select-none">
                    Deshabilitar cuenta (Bloquear inicio de sesión)
                  </label>
                </div>
              </div>

              <div className="form-actions-modal">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GestionPersonal;
