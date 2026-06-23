import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const Pacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [searchDni, setSearchDni] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Campos del formulario de registro
  const [dni, setDni] = useState('');
  const [nombresApellidos, setNombresApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState('M');
  const [antecedentes, setAntecedentes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // Estados para el Modal de Historial
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [consultas, setConsultas] = useState([]);
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [consultasError, setConsultasError] = useState(null);

  // Nuevos estados para asignaciones de médicos
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState('user');
  const [medicosList, setMedicosList] = useState([]);
  const [medicoPrimarioId, setMedicoPrimarioId] = useState('');

  // Estados para el Modal de Asignación de Médicos
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignedMedicos, setAssignedMedicos] = useState([]);
  const [newAssignMedicoId, setNewAssignMedicoId] = useState('');
  const [newAssignIsSpecial, setNewAssignIsSpecial] = useState(true);
  const [newAssignReason, setNewAssignReason] = useState('');
  const [assignmentError, setAssignmentError] = useState(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const fetchCurrentUserAndMedicos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const role = user.user_metadata?.role || 'user';
        setCurrentRole(role);
        if (role !== 'admin') {
          setMedicoPrimarioId(user.id);
        }
      }

      const { data, error } = await supabase.rpc('get_medicos_public');
      if (!error && data) {
        setMedicosList(data);
      }
    } catch (err) {
      console.error('Error al inicializar datos:', err);
    }
  };

  useEffect(() => {
    fetchCurrentUserAndMedicos();
  }, []);

  const handleOpenAssignmentModal = (paciente) => {
    setSelectedPaciente(paciente);
    setAssignedMedicos(paciente.paciente_medicos || []);
    setNewAssignMedicoId('');
    setNewAssignIsSpecial(true);
    setNewAssignReason('');
    setAssignmentError(null);
    setAssignmentSuccess(null);
    setShowAssignmentModal(true);
  };

  const handleFetchAssignments = async (pacienteDni) => {
    try {
      const { data, error } = await supabase
        .from('paciente_medicos')
        .select('*')
        .eq('dni_paciente', pacienteDni);
      if (error) throw error;
      setAssignedMedicos(data || []);
      
      // Actualizar también en el estado local de pacientes
      setPacientes((prev) =>
        prev.map((p) => (p.dni === pacienteDni ? { ...p, paciente_medicos: data } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    setAssignmentError(null);
    setAssignmentSuccess(null);
    setAssigning(true);

    if (!newAssignMedicoId) {
      setAssignmentError('Selecciona un médico.');
      setAssigning(false);
      return;
    }

    if (newAssignIsSpecial && !newAssignReason.trim()) {
      setAssignmentError('Para casos especiales, debes ingresar una justificación / motivo.');
      setAssigning(false);
      return;
    }

    try {
      if (!newAssignIsSpecial) {
        // Cambiar médico primario (utilizando la función change_primary_doctor)
        const { error } = await supabase.rpc('change_primary_doctor', {
          p_dni: selectedPaciente.dni,
          p_new_medico_id: newAssignMedicoId
        });
        if (error) throw error;
        setAssignmentSuccess('Médico primario actualizado con éxito.');
      } else {
        // Agregar caso especial
        const { error } = await supabase.from('paciente_medicos').insert([
          {
            dni_paciente: selectedPaciente.dni,
            id_medico: newAssignMedicoId,
            es_medico_primario: false,
            es_caso_especial: true,
            motivo_caso_especial: newAssignReason.trim()
          }
        ]);
        if (error) throw error;
        setAssignmentSuccess('Médico agregado como caso especial con éxito.');
      }

      setNewAssignMedicoId('');
      setNewAssignReason('');
      handleFetchAssignments(selectedPaciente.dni);
    } catch (err) {
      console.error(err);
      setAssignmentError(err.message || 'Error al guardar la asignación médica.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (medicoId, esPrimario) => {
    if (esPrimario) {
      setAssignmentError('No puedes eliminar al médico primario. Debes cambiarlo por otro médico.');
      return;
    }

    setAssignmentError(null);
    setAssignmentSuccess(null);

    try {
      const { error } = await supabase
        .from('paciente_medicos')
        .delete()
        .eq('dni_paciente', selectedPaciente.dni)
        .eq('id_medico', medicoId);

      if (error) throw error;
      setAssignmentSuccess('Médico desvinculado con éxito.');
      handleFetchAssignments(selectedPaciente.dni);
    } catch (err) {
      console.error(err);
      setAssignmentError('Error al desvincular el médico.');
    }
  };

  const handleVerHistorial = async (paciente) => {
    setSelectedPaciente(paciente);
    setShowHistoryModal(true);
    setLoadingConsultas(true);
    setConsultasError(null);
    setConsultas([]);

    try {
      const { data, error } = await supabase
        .from('consultas')
        .select('*')
        .eq('dni_paciente', paciente.dni)
        .order('fecha_hora', { ascending: false });

      if (error) throw error;
      setConsultas(data || []);
    } catch (err) {
      console.error('Error al cargar consultas:', err);
      setConsultasError('No se pudo obtener el historial de consultas del paciente.');
    } finally {
      setLoadingConsultas(false);
    }
  };

  const handleCloseModal = () => {
    setShowHistoryModal(false);
    setSelectedPaciente(null);
    setConsultas([]);
    setConsultasError(null);
  };

  const getProgressColorClass = (pathology, value) => {
    if (pathology === 'Normal') return 'bg-sky-500';
    if (value >= 0.5) return 'bg-red-500';
    if (value >= 0.15) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const traducirPatologia = (name) => {
    const traducciones = {
      Normal: 'Normal',
      Glaucoma: 'Glaucoma',
      Catarata: 'Cataratas',
      Retinopatia_Diabetica: 'Retinopatía Diabética',
      Degeneracion_Macular: 'Degeneración Macular',
      Retinopatia_Hipertensiva: 'Retinopatía Hipertensiva',
      Miopia: 'Miopía'
    };
    return traducciones[name] || name;
  };

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('pacientes')
        .select('*, paciente_medicos(id_medico, es_medico_primario, es_caso_especial, motivo_caso_especial)')
        .order('fecha_registro', { ascending: false });
      
      if (searchDni.trim()) {
        query = query.ilike('dni', `%${searchDni.trim()}%`);
      }

      const { data, error: selectError } = await query;
      if (selectError) throw selectError;
      setPacientes(data || []);
    } catch (err) {
      console.error(err);
      setError('Error al obtener la lista de pacientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacientes();
  }, [searchDni]);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    // Validación básica del DNI peruano (8 dígitos)
    if (!/^\d{8}$/.test(dni)) {
      setError('El DNI debe contener exactamente 8 caracteres numéricos.');
      setSubmitting(false);
      return;
    }

    if (!medicoPrimarioId) {
      setError('Debes seleccionar un médico primario para asignar al paciente.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Insertar paciente
      const { error: insertError } = await supabase.from('pacientes').insert([
        {
          dni,
          nombres_apellidos: nombresApellidos,
          fecha_nacimiento: fechaNacimiento,
          genero,
          antecedentes_medicos: antecedentes || null
        }
      ]);

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Ya existe un paciente registrado con este DNI.');
        }
        throw insertError;
      }

      // 2. Insertar asignación del médico primario
      const { error: assignError } = await supabase.from('paciente_medicos').insert([
        {
          dni_paciente: dni,
          id_medico: medicoPrimarioId,
          es_medico_primario: true,
          es_caso_especial: false
        }
      ]);

      if (assignError) {
        throw assignError;
      }

      setSuccess('Paciente registrado correctamente.');
      setDni('');
      setNombresApellidos('');
      setFechaNacimiento('');
      setGenero('M');
      setAntecedentes('');
      if (currentRole === 'admin') {
        setMedicoPrimarioId('');
      }
      
      // Recargar lista
      fetchPacientes();
    } catch (err) {
      setError(err.message || 'Error al registrar el paciente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular la edad a partir de la fecha de nacimiento
  const calcularEdad = (fecha) => {
    if (!fecha) return '-';
    const cumple = new Date(fecha);
    const hoy = new Date();
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  return (
    <Layout>
      <div className="dashboard-header-bar">
        <div>
          <h1 className="page-title">Gestión de Pacientes</h1>
          <p className="page-subtitle">Busca expedientes existentes o registra nuevos pacientes en la clínica.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Lista y Buscador (2 columnas en pantallas grandes) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="module-container">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-primary">Buscar Paciente</h2>
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Buscar por DNI..."
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                  className="form-input pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                  </svg>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-secondary text-sm">Cargando pacientes...</div>
            ) : pacientes.length === 0 ? (
              <div className="text-center py-8 text-secondary text-sm">No se encontraron pacientes.</div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DNI</th>
                      <th>Nombres y Apellidos</th>
                      <th>Edad / Género</th>
                      <th>Médico(s) Asignado(s)</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacientes.map((p) => (
                      <tr key={p.dni}>
                        <td className="font-semibold text-accent">{p.dni}</td>
                        <td>
                          <div className="font-bold text-primary">{p.nombres_apellidos}</div>
                        </td>
                        <td>
                          <div className="text-sm font-semibold">{calcularEdad(p.fecha_nacimiento)}</div>
                          <span className={`badge ${p.genero === 'M' ? 'badge-success' : p.genero === 'F' ? 'badge-warning' : 'badge-danger'} mt-1`}>
                            {p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Otro'}
                          </span>
                        </td>
                        <td>
                          <div className="space-y-1">
                            {(p.paciente_medicos || []).map((pm) => {
                              const doc = medicosList.find((m) => m.id === pm.id_medico);
                              const docName = doc ? doc.nombre_completo : 'Médico de la clínica';
                              return (
                                <div key={pm.id_medico} className="text-xs">
                                  {pm.es_medico_primario ? (
                                    <span className="font-semibold text-sky-700">★ {docName} (Primario)</span>
                                  ) : (
                                    <span className="text-slate-600 block">
                                      ✚ {docName} 
                                      <span className="italic text-slate-400 block ml-3">
                                        Motivo: {pm.motivo_caso_especial}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {(!p.paciente_medicos || p.paciente_medicos.length === 0) && (
                              <span className="text-xs text-rose-500 font-semibold italic">Sin médico asignado</span>
                            )}
                          </div>
                        </td>
                        <td className="table-actions flex-wrap gap-y-1">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignmentModal(p)}
                            className="btn btn-secondary btn-sm flex items-center gap-1 py-1 px-3 text-xs"
                            style={{ backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}
                            title="Asignar o cambiar médicos"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.97 5.97 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.771m.002 0.001A5.97 5.97 0 006 18.72m0 0a9.094 9.094 0 01-3.741-.479 3 3 0 014.682-2.72m.94 3.198l-.001.031c0 .225.012.447.037.666A11.944 11.944 0 0012 21c2.17 0 4.207-.576 5.963-1.584A6.062 6.062 0 0018 18.72m-12 0a5.97 5.97 0 01.94-3.197m0 0A5.995 5.995 0 0112 12.75a5.995 5.995 0 015.058 2.771M12 12.75a3 3 0 100-6 3 3 0 000 6z" />
                            </svg>
                            Médicos
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerHistorial(p)}
                            className="btn btn-secondary btn-sm flex items-center gap-1 py-1 px-3 text-xs"
                            title="Ver historial de consultas"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Historial
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/consultas?dni=${p.dni}`)}
                            className="btn btn-primary btn-sm flex items-center gap-1 py-1 px-3 text-xs"
                            title="Iniciar diagnóstico inteligente"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Consulta IA
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

        {/* Panel Derecho: Formulario de Registro (1 columna en pantallas grandes) */}
        <div>
          <div className="module-container">
            <h2 className="text-lg font-bold text-primary mb-6">Registrar Paciente</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleRegisterPatient} className="space-y-4">
              {currentRole === 'admin' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-medico-primario">
                    Médico Primario Asignado
                  </label>
                  <select
                    id="reg-medico-primario"
                    value={medicoPrimarioId}
                    onChange={(e) => setMedicoPrimarioId(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">Selecciona un médico...</option>
                    {medicosList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre_completo} ({m.especialidad})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="reg-dni">
                  DNI (8 dígitos)
                </label>
                <input
                  type="text"
                  id="reg-dni"
                  maxLength={8}
                  placeholder="Ej. 12345678"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} // Solo números
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-nombres">
                  Nombres y Apellidos
                </label>
                <input
                  type="text"
                  id="reg-nombres"
                  placeholder="Ej. Juan Pérez García"
                  value={nombresApellidos}
                  onChange={(e) => setNombresApellidos(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-nacimiento">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  id="reg-nacimiento"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-genero">
                  Género
                </label>
                <select
                  id="reg-genero"
                  value={genero}
                  onChange={(e) => setGenero(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-antecedentes">
                  Antecedentes Médicos (Opcional)
                </label>
                <textarea
                  id="reg-antecedentes"
                  placeholder="Ej. Glaucoma familiar, diabetes mellitus..."
                  value={antecedentes}
                  onChange={(e) => setAntecedentes(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full mt-4"
                disabled={submitting}
              >
                {submitting ? 'Registrando...' : 'Registrar Paciente'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Historial */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Historial Clínico: {selectedPaciente?.nombres_apellidos}</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 70px)' }}>
              {/* Información del paciente */}
              <div className="bg-slate-100 rounded-lg p-4 mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary">
                <div><strong>DNI:</strong> {selectedPaciente?.dni}</div>
                <div><strong>Género:</strong> {selectedPaciente?.genero === 'M' ? 'Masculino' : selectedPaciente?.genero === 'F' ? 'Femenino' : 'Otro'}</div>
                <div><strong>Edad:</strong> {calcularEdad(selectedPaciente?.fecha_nacimiento)}</div>
                {selectedPaciente?.antecedentes_medicos && (
                  <div className="w-full mt-1 pt-1 border-t border-slate-200">
                    <strong>Antecedentes:</strong> {selectedPaciente.antecedentes_medicos}
                  </div>
                )}
              </div>

              {loadingConsultas ? (
                <div className="text-center py-12 text-secondary text-sm flex flex-col items-center justify-center gap-3">
                  <svg className="animate-spin h-8 w-8 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando consultas e imágenes...
                </div>
              ) : consultasError ? (
                <div className="alert alert-danger text-center">{consultasError}</div>
              ) : consultas.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <p className="text-secondary text-sm mb-4">No se han registrado consultas ni predicciones de IA para este paciente.</p>
                  <button
                    onClick={() => {
                      handleCloseModal();
                      navigate(`/consultas?dni=${selectedPaciente.dni}`);
                    }}
                    className="btn btn-primary btn-sm py-2 px-4"
                  >
                    Iniciar Primera Consulta IA
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {consultas.map((c) => {
                    const fecha = new Date(c.fecha_hora).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });

                    const probsMapped = {
                      Normal: c.prob_normal,
                      Glaucoma: c.prob_glaucoma,
                      Catarata: c.prob_catarata,
                      Retinopatia_Diabetica: c.prob_retinopatia_diabetica,
                      Degeneracion_Macular: c.prob_degeneracion_macular,
                      Retinopatia_Hipertensiva: c.prob_retinopatia_hipertensiva,
                      Miopia: c.prob_miopia
                    };

                    return (
                      <div key={c.id} className="border border-slate-200 rounded-lg p-5 mb-6 bg-slate-50 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de Consulta</span>
                            <p className="text-sm font-semibold text-primary">{fecha}</p>
                          </div>
                          <div className="bg-sky-50 text-sky-700 px-3 py-1 rounded text-xs font-bold border border-sky-100">
                            ID Consulta: #{c.id}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Retinografía</span>
                            <a href={c.ruta_imagen} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-slate-200 bg-black">
                              <img
                                src={c.ruta_imagen}
                                alt={`Retina Consulta #${c.id}`}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                                </svg>
                                Ver imagen completa
                              </div>
                            </a>
                          </div>

                          <div className="space-y-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Resultados de Inferencia</span>
                            <div className="space-y-2">
                              {Object.entries(probsMapped).map(([key, val]) => {
                                const percentage = (val * 100).toFixed(2);
                                return (
                                  <div key={key} className="space-y-0.5">
                                    <div className="flex justify-between text-xs font-semibold">
                                      <span className="text-primary">{traducirPatologia(key)}</span>
                                      <span className={val >= 0.5 && key !== 'Normal' ? 'text-rose-600 font-bold' : 'text-secondary'}>
                                        {percentage}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColorClass(key, val)}`}
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded p-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Diagnóstico / Notas Clínicas</span>
                          <p className="text-sm text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                            {c.diagnostico || 'Sin observaciones o notas clínicas registradas.'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="form-actions-modal" style={{ padding: '16px 24px', margin: 0, borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Asignación de Médicos */}
      {showAssignmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssignmentModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Gestionar Médicos: {selectedPaciente?.nombres_apellidos}</h2>
              <button className="modal-close-btn" onClick={() => setShowAssignmentModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body space-y-6" style={{ maxHeight: 'calc(90vh - 70px)', overflowY: 'auto' }}>
              {assignmentError && <div className="alert alert-danger">{assignmentError}</div>}
              {assignmentSuccess && <div className="alert alert-success">{assignmentSuccess}</div>}

              {/* Lista de médicos actualmente asignados */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-primary">Médicos Vinculados</h3>
                <div className="space-y-2">
                  {assignedMedicos.map((pm) => {
                    const doc = medicosList.find((m) => m.id === pm.id_medico);
                    const docName = doc ? doc.nombre_completo : 'Médico de la clínica';
                    const docSpec = doc ? doc.especialidad : '';

                    return (
                      <div key={pm.id_medico} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded p-3 text-sm">
                        <div>
                          <div className="font-bold text-primary">
                            {docName} {pm.es_medico_primario && <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded ml-2">Primario</span>}
                            {pm.es_caso_especial && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded ml-2">Caso Especial</span>}
                          </div>
                          {docSpec && <div className="text-xs text-secondary">{docSpec}</div>}
                          {pm.es_caso_especial && pm.motivo_caso_especial && (
                            <div className="text-xs text-slate-500 mt-1 bg-white p-1 rounded border border-slate-100 italic">
                              Motivo: {pm.motivo_caso_especial}
                            </div>
                          )}
                        </div>
                        {!pm.es_medico_primario && currentRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignment(pm.id_medico, pm.es_medico_primario)}
                            className="btn-icon btn-delete"
                            title="Desvincular médico"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-16.5 0M6 8.25l0 10.5A2.25 2.25 0 008.25 21h7.5A2.25 2.25 0 0018 18.75V8.25m-12 0V6a2.25 2.25 0 012.25-2.25h3.5A2.25 2.25 0 0116 6v2.25" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formulario para agregar una nueva asignación */}
              {currentRole === 'admin' && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-bold text-primary mb-3">Asignar Médico Adicional</h3>
                  
                  <form onSubmit={handleAddAssignment} className="space-y-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-assign-medico">
                        Seleccionar Médico
                      </label>
                      <select
                        id="new-assign-medico"
                        value={newAssignMedicoId}
                        onChange={(e) => setNewAssignMedicoId(e.target.value)}
                        className="form-input"
                        required
                      >
                        <option value="">Selecciona un médico...</option>
                        {medicosList
                          .filter((m) => !assignedMedicos.some((pm) => pm.id_medico === m.id))
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre_completo} ({m.especialidad})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="assign-type">
                        Tipo de Asignación
                      </label>
                      <select
                        id="assign-type"
                        value={newAssignIsSpecial ? 'special' : 'primary'}
                        onChange={(e) => {
                          const isSpecial = e.target.value === 'special';
                          setNewAssignIsSpecial(isSpecial);
                          if (!isSpecial) {
                            setNewAssignReason('');
                          }
                        }}
                        className="form-input"
                        disabled={currentRole !== 'admin'}
                        required
                      >
                        <option value="special">Caso Especial (Asociar adicionalmente)</option>
                        <option value="primary">Médico Primario (Reemplazar actual)</option>
                      </select>
                      {currentRole !== 'admin' && (
                        <span className="text-xs text-secondary mt-1 block">Solo administradores pueden cambiar el médico primario.</span>
                      )}
                    </div>

                    {newAssignIsSpecial && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="assign-reason">
                          Motivo / Justificación del Caso Especial
                        </label>
                        <textarea
                          id="assign-reason"
                          rows={3}
                          placeholder="Ej. Derivación para segunda opinión, especialista en retinopatía diabética, etc..."
                          value={newAssignReason}
                          onChange={(e) => setNewAssignReason(e.target.value)}
                          className="form-input"
                          required
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      disabled={assigning}
                    >
                      {assigning ? 'Asignando...' : 'Guardar Nueva Asignación'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="form-actions-modal" style={{ padding: '16px 24px', margin: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAssignmentModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Pacientes;
