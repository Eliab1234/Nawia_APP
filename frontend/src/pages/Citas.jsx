import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [medicosList, setMedicosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('user');
  const [currentUserId, setCurrentUserId] = useState('');

  // Form modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [selectedServicio, setSelectedServicio] = useState('');
  const [selectedMedico, setSelectedMedico] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get current logged in user & role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const userRole = user.user_metadata?.role || 'user';
        setRole(userRole);
        if (userRole !== 'admin') {
          setSelectedMedico(user.id);
        }
      }

      // 2. Fetch Services
      const { data: srvData, error: srvErr } = await supabase
        .from('servicios')
        .select('*')
        .order('nombre', { ascending: true });
      if (srvErr) throw srvErr;
      setServicios(srvData || []);

      // 3. Fetch Patients
      const { data: pacData, error: pacErr } = await supabase
        .from('pacientes')
        .select('dni, nombres_apellidos')
        .order('nombres_apellidos', { ascending: true });
      if (pacErr) throw pacErr;
      setPacientes(pacData || []);

      // 4. Fetch Doctors
      const { data: medData, error: medErr } = await supabase.rpc('get_medicos_public');
      if (!medErr && medData) {
        setMedicosList(medData || []);
      }

      // 5. Fetch appointments
      const { data: citData, error: citErr } = await supabase
        .from('citas')
        .select('*, pacientes(nombres_apellidos), servicios(nombre, precio)')
        .order('fecha_hora', { ascending: false });
      if (citErr) throw citErr;
      setCitas(citData || []);

    } catch (err) {
      console.error(err);
      setError('Error al inicializar la base de datos de citas. Asegúrate de ejecutar el script SQL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedPaciente('');
    setSelectedServicio('');
    if (role === 'admin') {
      setSelectedMedico('');
    }
    setFechaHora('');
    setMotivo('');
    setFormError(null);
    setShowModal(true);
  };

  const handleScheduleCita = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPaciente || !selectedServicio || !selectedMedico || !fechaHora) {
      setFormError('Todos los campos marcados con asterisco son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      const { error: insErr } = await supabase
        .from('citas')
        .insert([{
          dni_paciente: selectedPaciente,
          id_medico: selectedMedico,
          id_servicio: parseInt(selectedServicio),
          fecha_hora: new Date(fechaHora).toISOString(),
          estado: 'Pendiente',
          motivo_consulta: motivo || null
        }]);

      if (insErr) throw insErr;

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error al programar la cita clínica.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error: updErr } = await supabase
        .from('citas')
        .update({ estado: newStatus })
        .eq('id', id);

      if (updErr) throw updErr;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado de la cita.');
    }
  };

  const handleDeleteCita = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta cita de la agenda?')) return;
    try {
      const { error: delErr } = await supabase
        .from('citas')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar la cita de la agenda.');
    }
  };

  // Filter logic
  const filteredCitas = citas.filter((c) => {
    const matchesStatus = statusFilter === 'All' || c.estado === statusFilter;
    const matchesSearch =
      c.pacientes?.nombres_apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dni_paciente.includes(searchQuery) ||
      c.servicios?.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getMedicoNombre = (id) => {
    const matched = medicosList.find((m) => m.id === id);
    return matched ? matched.nombre_completo : 'Médico de la Clínica';
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Completada') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Cancelada') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <Layout>
      <div className="dashboard-header-bar flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Agenda de Citas</h1>
          <p className="page-subtitle">Gestiona y planifica los turnos de atención y consultas médicas en el sistema NawIA.</p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary flex items-center gap-2 py-2 px-4 shadow-md font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Agendar Cita
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="module-container">
        {/* Filters and search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por paciente, DNI o servicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="flex gap-2">
            {['All', 'Pendiente', 'Completada', 'Cancelada'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`py-1.5 px-4 rounded text-xs font-bold border transition-all ${
                  statusFilter === status
                    ? 'bg-accent border-accent text-white shadow-sm'
                    : 'bg-white border-slate-200 text-secondary hover:bg-slate-50'
                }`}
              >
                {status === 'All' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-secondary text-sm">Cargando agenda de citas...</div>
        ) : filteredCitas.length === 0 ? (
          <div className="text-center py-12 text-secondary text-sm">No hay citas agendadas con los filtros seleccionados.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Servicio contratado</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCitas.map((cita) => {
                  const dateStr = new Date(cita.fecha_hora).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                  return (
                    <tr key={cita.id}>
                      <td className="font-semibold text-accent">{dateStr}</td>
                      <td>
                        <div className="font-bold text-primary">{cita.pacientes?.nombres_apellidos}</div>
                        <div className="text-xs text-secondary">DNI: {cita.dni_paciente}</div>
                      </td>
                      <td className="text-sm text-primary font-semibold">
                        {getMedicoNombre(cita.id_medico)}
                      </td>
                      <td>
                        <div className="text-sm font-bold text-primary">{cita.servicios?.nombre}</div>
                        <div className="text-xs text-emerald-600 font-semibold">S/. {parseFloat(cita.servicios?.precio).toFixed(2)}</div>
                      </td>
                      <td>
                        <span className={`inline-block border px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeClass(cita.estado)}`}>
                          {cita.estado}
                        </span>
                      </td>
                      <td className="table-actions text-right space-x-1">
                        {cita.estado === 'Pendiente' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(cita.id, 'Completada')}
                              className="btn btn-sm"
                              style={{ backgroundColor: '#ecfdf5', color: '#10b981', borderColor: '#a7f3d0', border: '1px solid', fontSize: '11px', fontWeight: 700 }}
                            >
                              Completar
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(cita.id, 'Cancelada')}
                              className="btn btn-sm"
                              style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fca5a5', border: '1px solid', fontSize: '11px', fontWeight: 700 }}
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {role === 'admin' && (
                          <button
                            onClick={() => handleDeleteCita(cita.id)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#f8fafc', color: '#64748b', borderColor: '#cbd5e1', border: '1px solid', fontSize: '11px', fontWeight: 700 }}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Agendar Nueva Cita</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleScheduleCita}>
              <div className="modal-body space-y-4">
                {formError && <div className="alert alert-danger">{formError}</div>}
                
                <div className="form-group">
                  <label className="form-label" htmlFor="cita-paciente">Paciente *</label>
                  <select
                    id="cita-paciente"
                    className="form-input"
                    value={selectedPaciente}
                    onChange={(e) => setSelectedPaciente(e.target.value)}
                    required
                  >
                    <option value="">-- Selecciona un paciente --</option>
                    {pacientes.map((p) => (
                      <option key={p.dni} value={p.dni}>
                        {p.nombres_apellidos} (DNI: {p.dni})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cita-servicio">Servicio *</label>
                  <select
                    id="cita-servicio"
                    className="form-input"
                    value={selectedServicio}
                    onChange={(e) => setSelectedServicio(e.target.value)}
                    required
                  >
                    <option value="">-- Selecciona el tipo de servicio --</option>
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} (S/. {parseFloat(s.precio).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {role === 'admin' ? (
                  <div className="form-group">
                    <label className="form-label" htmlFor="cita-medico">Médico Asignado *</label>
                    <select
                      id="cita-medico"
                      className="form-input"
                      value={selectedMedico}
                      onChange={(e) => setSelectedMedico(e.target.value)}
                      required
                    >
                      <option value="">-- Selecciona un médico --</option>
                      {medicosList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre_completo} ({m.especialidad})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Médico Asignado</label>
                    <input
                      type="text"
                      className="form-input bg-slate-100 cursor-not-allowed"
                      value={getMedicoNombre(currentUserId)}
                      disabled
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="cita-fecha">Fecha y Hora de la Cita *</label>
                  <input
                    type="datetime-local"
                    id="cita-fecha"
                    className="form-input"
                    value={fechaHora}
                    onChange={(e) => setFechaHora(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cita-motivo">Motivo de la Cita</label>
                  <textarea
                    id="cita-motivo"
                    rows={3}
                    className="form-input"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Escribe brevemente por qué el paciente solicita la consulta..."
                  />
                </div>
              </div>
              <div className="form-actions-modal">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Registrando...' : 'Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Citas;
