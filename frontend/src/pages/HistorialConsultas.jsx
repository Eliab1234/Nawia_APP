import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const HistorialConsultas = () => {
  const [consultas, setConsultas] = useState([]);
  const [medicosMap, setMedicosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para el Modal de Detalle de Consulta
  const [selectedConsulta, setSelectedConsulta] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchMedicos = async () => {
    try {
      const { data, error } = await supabase.rpc('get_medicos_public');
      if (!error && data) {
        const mapping = {};
        data.forEach((m) => {
          mapping[m.id] = m.nombre_completo;
        });
        setMedicosMap(mapping);
      }
    } catch (err) {
      console.error('Error al mapear médicos:', err);
    }
  };

  const fetchConsultas = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('consultas')
        .select('*, pacientes(nombres_apellidos)')
        .order('fecha_hora', { ascending: false });

      if (fetchErr) throw fetchErr;
      setConsultas(data || []);
    } catch (err) {
      console.error('Error al cargar consultas:', err);
      setError('No se pudo cargar el historial general de exámenes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicos();
    fetchConsultas();
  }, []);

  const handleOpenDetailModal = (consulta) => {
    setSelectedConsulta(consulta);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setSelectedConsulta(null);
    setShowDetailModal(false);
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

  // Helper para verificar si hay alguna patología en alerta alta (>50%)
  const obtenerAlertasAltas = (c) => {
    const alertas = [];
    if (c.prob_glaucoma >= 0.5) alertas.push('Glaucoma');
    if (c.prob_catarata >= 0.5) alertas.push('Cataratas');
    if (c.prob_retinopatia_diabetica >= 0.5) alertas.push('Ret. Diabética');
    if (c.prob_degeneracion_macular >= 0.5) alertas.push('Deg. Macular');
    if (c.prob_retinopatia_hipertensiva >= 0.5) alertas.push('Ret. Hipertensiva');
    if (c.prob_miopia >= 0.5) alertas.push('Miopía');
    return alertas;
  };

  return (
    <Layout>
      <div className="dashboard-header-bar">
        <div>
          <h1 className="page-title">Historial Clínico de Exámenes</h1>
          <p className="page-subtitle">Visualiza todas las consultas y diagnósticos con inferencia de IA registrados en el sistema.</p>
        </div>
      </div>

      <div className="module-container">
        <h2 className="text-lg font-bold text-primary mb-6">Exámenes de Retina Registrados</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-center py-12 text-secondary text-sm">Cargando historial de exámenes...</div>
        ) : consultas.length === 0 ? (
          <div className="text-center py-12 text-secondary text-sm">No se registran exámenes en el sistema.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Fecha y Hora</th>
                  <th>Alertas IA</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {consultas.map((c) => {
                  const fecha = new Date(c.fecha_hora).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                  const alertas = obtenerAlertasAltas(c);

                  return (
                    <tr key={c.id}>
                      <td className="font-semibold text-accent">#{c.id}</td>
                      <td>
                        <div className="font-bold text-primary">{c.pacientes?.nombres_apellidos || 'No registrado'}</div>
                        <div className="text-xs text-secondary">DNI: {c.dni_paciente}</div>
                      </td>
                      <td className="text-sm font-semibold text-primary">
                        {medicosMap[c.id_medico] || 'Médico de la Clínica'}
                      </td>
                      <td className="text-sm text-secondary">{fecha}</td>
                      <td>
                        {alertas.length === 0 ? (
                          <span className="badge badge-success">Sin riesgo alto</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {alertas.map((alerta) => (
                              <span key={alerta} className="badge badge-danger text-xs px-2 py-0.5">
                                {alerta}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="table-actions">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(c)}
                          className="btn btn-secondary btn-sm flex items-center gap-1 py-1 px-3 text-xs"
                          title="Ver detalle del examen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Ver Resultados
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Consulta */}
      {showDetailModal && selectedConsulta && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalle del Examen #{selectedConsulta.id}</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body space-y-4" style={{ maxHeight: 'calc(90vh - 70px)', overflowY: 'auto' }}>
              
              {/* Resumen del Examen */}
              <div className="bg-slate-100 rounded-lg p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary">
                <div><strong>Paciente:</strong> {selectedConsulta.pacientes?.nombres_apellidos} (DNI: {selectedConsulta.dni_paciente})</div>
                <div><strong>Médico a cargo:</strong> {medicosMap[selectedConsulta.id_medico] || 'Médico de la Clínica'}</div>
                <div><strong>Fecha:</strong> {new Date(selectedConsulta.fecha_hora).toLocaleString('es-PE')}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Imagen */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Retinografía</span>
                  <a href={selectedConsulta.ruta_imagen} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-slate-200 bg-black">
                    <img
                      src={selectedConsulta.ruta_imagen}
                      alt={`Retina Consulta #${selectedConsulta.id}`}
                      className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                      </svg>
                      Ver imagen completa
                    </div>
                  </a>
                </div>

                {/* Probabilidades */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Resultados de Inferencia IA</span>
                  <div className="space-y-2">
                    {[
                      { key: 'Normal', val: selectedConsulta.prob_normal },
                      { key: 'Glaucoma', val: selectedConsulta.prob_glaucoma },
                      { key: 'Catarata', val: selectedConsulta.prob_catarata },
                      { key: 'Retinopatia_Diabetica', val: selectedConsulta.prob_retinopatia_diabetica },
                      { key: 'Degeneracion_Macular', val: selectedConsulta.prob_degeneracion_macular },
                      { key: 'Retinopatia_Hipertensiva', val: selectedConsulta.prob_retinopatia_hipertensiva },
                      { key: 'Miopia', val: selectedConsulta.prob_miopia }
                    ].map(({ key, val }) => {
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

              {/* Notas de diagnóstico */}
              <div className="bg-white border border-slate-200 rounded p-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Diagnóstico / Notas Clínicas</span>
                <p className="text-sm text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                  {selectedConsulta.diagnostico || 'Sin observaciones o notas clínicas registradas.'}
                </p>
              </div>
            </div>

            <div className="form-actions-modal" style={{ padding: '16px 24px', margin: 0, borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HistorialConsultas;
