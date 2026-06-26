import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const HistoriasClinicas = () => {
  const [historias, setHistorias] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [citasList, setCitasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('user');
  const [medicosMap, setMedicosMap] = useState({});

  // Historias Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [selectedCita, setSelectedCita] = useState('');
  const [agudezaOD, setAgudezaOD] = useState('');
  const [agudezaOI, setAgudezaOI] = useState('');
  const [presionOD, setPresionOD] = useState('');
  const [presionOI, setPresionOI] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Recetas Modals
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [odEsfera, setOdEsfera] = useState('');
  const [odCilindro, setOdCilindro] = useState('');
  const [odEje, setOdEje] = useState('');
  const [oiEsfera, setOiEsfera] = useState('');
  const [oiCilindro, setOiCilindro] = useState('');
  const [oiEje, setOiEje] = useState('');
  const [adicion, setAdicion] = useState('');
  const [distanciaPupilar, setDistanciaPupilar] = useState('');
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState(null);

  // View Recipe Modal
  const [showViewRecipeModal, setShowViewRecipeModal] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setRole(user.user_metadata?.role || 'user');
      }

      // 2. Fetch doctors mapping
      const { data: medData } = await supabase.rpc('get_medicos_public');
      if (medData) {
        const mapping = {};
        medData.forEach((m) => {
          mapping[m.id] = m.nombre_completo;
        });
        setMedicosMap(mapping);
      }

      // 3. Fetch patients
      const { data: pacData } = await supabase
        .from('pacientes')
        .select('dni, nombres_apellidos')
        .order('nombres_apellidos', { ascending: true });
      setPacientes(pacData || []);

      // 4. Fetch completed or pending appointments that don't have a history yet
      const { data: citData } = await supabase
        .from('citas')
        .select('id, dni_paciente, fecha_hora, pacientes(nombres_apellidos), servicios(nombre)')
        .in('estado', ['Pendiente', 'Completada']);
      
      // 5. Fetch histories
      const { data: histData, error: histErr } = await supabase
        .from('historias_clinicas')
        .select('*, pacientes(nombres_apellidos), citas(id_medico, fecha_hora, servicios(nombre)), recetas_lentes(*)')
        .order('fecha_registro', { ascending: false });

      if (histErr) throw histErr;

      setHistorias(histData || []);

      // Filter appointments that don't have an associated history in histData
      const historiesCitaIds = new Set(histData.map(h => h.id_cita).filter(Boolean));
      const unassignedCitas = (citData || []).filter(c => !historiesCitaIds.has(c.id));
      setCitasList(unassignedCitas);

    } catch (err) {
      console.error(err);
      setError('Error al inicializar las historias clínicas. Asegúrate de ejecutar el script SQL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initFromParams = async () => {
      await fetchData();
      const params = new URLSearchParams(window.location.search);
      const dniParam = params.get('dni');
      const citaIdParam = params.get('citaId');
      if (dniParam) {
        setSelectedPaciente(dniParam);
        if (citaIdParam) {
          setSelectedCita(citaIdParam);
        }
        setAgudezaOD('20/20');
        setAgudezaOI('20/20');
        setPresionOD('15 mmHg');
        setPresionOI('15 mmHg');
        setDiagnostico('');
        setObservaciones('');
        setHistoryError(null);
        setShowHistoryModal(true);
      }
    };
    initFromParams();
  }, []);

  const handleOpenHistoryModal = () => {
    setSelectedPaciente('');
    setSelectedCita('');
    setAgudezaOD('20/20');
    setAgudezaOI('20/20');
    setPresionOD('15 mmHg');
    setPresionOI('15 mmHg');
    setDiagnostico('');
    setObservaciones('');
    setHistoryError(null);
    setShowHistoryModal(true);
  };

  const handleSaveHistory = async (e) => {
    e.preventDefault();
    setHistoryError(null);

    if (!selectedPaciente || !diagnostico.trim()) {
      setHistoryError('El paciente y el diagnóstico son campos obligatorios.');
      return;
    }

    setSavingHistory(true);
    try {
      const { error: insErr } = await supabase
        .from('historias_clinicas')
        .insert([{
          dni_paciente: selectedPaciente,
          id_cita: selectedCita ? parseInt(selectedCita) : null,
          agudeza_visual_od: agudezaOD || null,
          agudeza_visual_oi: agudezaOI || null,
          presion_intraocular_od: presionOD || null,
          presion_intraocular_oi: presionOI || null,
          diagnostico,
          observaciones: observaciones || null
        }]);

      if (insErr) throw insErr;

      setShowHistoryModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setHistoryError(err.message || 'Error al guardar la historia clínica.');
    } finally {
      setSavingHistory(false);
    }
  };

  // Recipe creation modal
  const handleOpenRecipeModal = (hist) => {
    setSelectedHistory(hist);
    setOdEsfera('0.00');
    setOdCilindro('0.00');
    setOdEje('0');
    setOiEsfera('0.00');
    setOiCilindro('0.00');
    setOiEje('0');
    setAdicion('0.00');
    setDistanciaPupilar('62');
    setRecipeError(null);
    setShowRecipeModal(true);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    setRecipeError(null);

    setSavingRecipe(true);
    try {
      const { error: recErr } = await supabase
        .from('recetas_lentes')
        .insert([{
          id_historia: selectedHistory.id,
          od_esfera: odEsfera ? parseFloat(odEsfera) : null,
          od_cilindro: odCilindro ? parseFloat(odCilindro) : null,
          od_eje: odEje ? parseInt(odEje) : null,
          oi_esfera: oiEsfera ? parseFloat(oiEsfera) : null,
          oi_cilindro: oiCilindro ? parseFloat(oiCilindro) : null,
          oi_eje: oiEje ? parseInt(oiEje) : null,
          adicion: adicion ? parseFloat(adicion) : null,
          distancia_pupilar: distanciaPupilar ? parseFloat(distanciaPupilar) : null
        }]);

      if (recErr) throw recErr;

      setShowRecipeModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setRecipeError(err.message || 'Error al guardar la receta de lentes.');
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleOpenViewRecipe = (receta, historia) => {
    setActiveRecipe({ receta, historia });
    setShowViewRecipeModal(true);
  };

  const filteredHistorias = historias.filter(h =>
    h.pacientes?.nombres_apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.dni_paciente.includes(searchQuery) ||
    (h.diagnostico && h.diagnostico.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="dashboard-header-bar flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Historias Clínicas</h1>
          <p className="page-subtitle">Visualiza y registra las historias clínicas y mediciones ópticas de los pacientes de NawIA.</p>
        </div>
        <button onClick={handleOpenHistoryModal} className="btn btn-primary flex items-center gap-2 py-2 px-4 shadow-md font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Nueva Historia Ocular
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="module-container">
        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <input
            type="text"
            placeholder="Buscar por paciente, DNI o diagnóstico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-secondary text-sm">Cargando historias clínicas...</div>
        ) : filteredHistorias.length === 0 ? (
          <div className="text-center py-12 text-secondary text-sm">No se encontraron historias registradas.</div>
        ) : (
          <div className="space-y-6">
            {filteredHistorias.map((hist) => {
              const medId = hist.citas?.id_medico;
              const doctorName = medId ? medicosMap[medId] : 'Médico General';
              const dateStr = new Date(hist.fecha_registro).toLocaleString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });

              return (
                <div key={hist.id} className="w-full border border-slate-200 rounded-xl p-6 bg-white space-y-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all border-l-4 border-l-sky-500 box-border">
                  {/* Cabecera de la Historia */}
                  <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">Paciente</span>
                        <span className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-md font-semibold">DNI: {hist.dni_paciente}</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-primary">{hist.pacientes?.nombres_apellidos}</h3>
                      <p className="text-xs text-secondary mt-1 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        Fecha de Registro: {dateStr}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 py-2 px-3.5 rounded-lg text-right sm:text-right flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Atendido por</span>
                        <span className="text-sm font-bold text-primary">{doctorName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Parámetros Visuales (Estructurado por ojo OD / OI) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ojo Derecho */}
                    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
                        <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider">Ojo Derecho (OD)</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Agudeza Visual</span>
                          <span className="text-sm font-extrabold text-primary">{hist.agudeza_visual_od || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Presión Intraocular</span>
                          <span className="text-sm font-extrabold text-primary">{hist.presion_intraocular_od || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ojo Izquierdo */}
                    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ojo Izquierdo (OI)</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Agudeza Visual</span>
                          <span className="text-sm font-extrabold text-primary">{hist.agudeza_visual_oi || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Presión Intraocular</span>
                          <span className="text-sm font-extrabold text-primary">{hist.presion_intraocular_oi || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnóstico y Tratamiento */}
                  <div className="bg-slate-50/35 border border-slate-100 rounded-xl p-5 space-y-4">
                    <div>
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Diagnóstico</span>
                      <p className="text-sm text-slate-800 leading-relaxed font-bold">{hist.diagnostico}</p>
                    </div>
                    {hist.observaciones && (
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Observaciones / Tratamiento</span>
                        <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-line">{hist.observaciones}</p>
                      </div>
                    )}
                  </div>

                  {/* Sección de Receta */}
                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    {hist.recetas_lentes ? (
                      <button
                        onClick={() => handleOpenViewRecipe(hist.recetas_lentes, hist)}
                        className="btn btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs font-bold transition-all hover:bg-sky-50/50"
                        style={{ border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', color: 'var(--accent-color)' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Ver Receta de Lentes
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenRecipeModal(hist)}
                        className="btn btn-primary flex items-center gap-1.5 py-2 px-4 text-xs font-bold transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Recetar Lentes
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal History Form */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Historia Clínica Ocular</h2>
              <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveHistory}>
              <div className="modal-body space-y-4">
                {historyError && <div className="alert alert-danger">{historyError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="hist-paciente">Paciente *</label>
                  <select
                    id="hist-paciente"
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
                  <label className="form-label" htmlFor="hist-cita">Cita completada asociada (Opcional)</label>
                  <select
                    id="hist-cita"
                    className="form-input"
                    value={selectedCita}
                    onChange={(e) => {
                      setSelectedCita(e.target.value);
                      if (e.target.value) {
                        const matched = citasList.find(c => c.id.toString() === e.target.value);
                        if (matched) {
                          setSelectedPaciente(matched.dni_paciente);
                        }
                      }
                    }}
                  >
                    <option value="">-- Sin cita vinculada o selecciona una --</option>
                    {citasList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.pacientes?.nombres_apellidos} - {c.servicios?.nombre} ({new Date(c.fecha_hora).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="od-visual">Agudeza Visual OD</label>
                    <input
                      type="text"
                      id="od-visual"
                      className="form-input"
                      value={agudezaOD}
                      onChange={(e) => setAgudezaOD(e.target.value)}
                      placeholder="Ej. 20/20"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="oi-visual">Agudeza Visual OI</label>
                    <input
                      type="text"
                      id="oi-visual"
                      className="form-input"
                      value={agudezaOI}
                      onChange={(e) => setAgudezaOI(e.target.value)}
                      placeholder="Ej. 20/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="od-presion">Presión Intraocular OD</label>
                    <input
                      type="text"
                      id="od-presion"
                      className="form-input"
                      value={presionOD}
                      onChange={(e) => setPresionOD(e.target.value)}
                      placeholder="Ej. 15 mmHg"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="oi-presion">Presión Intraocular OI</label>
                    <input
                      type="text"
                      id="oi-presion"
                      className="form-input"
                      value={presionOI}
                      onChange={(e) => setPresionOI(e.target.value)}
                      placeholder="Ej. 15 mmHg"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="hist-diag">Diagnóstico Clínico *</label>
                  <textarea
                    id="hist-diag"
                    rows={3}
                    className="form-input"
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    placeholder="Describe los hallazgos y el diagnóstico oftálmico..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="hist-obs">Observaciones / Tratamiento</label>
                  <textarea
                    id="hist-obs"
                    rows={2}
                    className="form-input"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Tratamiento farmacológico o indicaciones..."
                  />
                </div>
              </div>
              <div className="form-actions-modal">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingHistory}>
                  {savingHistory ? 'Guardando...' : 'Guardar Historia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Receta Form */}
      {showRecipeModal && selectedHistory && (
        <div className="modal-overlay" onClick={() => setShowRecipeModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Registrar Receta de Lentes</h2>
              <button className="modal-close-btn" onClick={() => setShowRecipeModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveRecipe}>
              <div className="modal-body space-y-4">
                {recipeError && <div className="alert alert-danger">{recipeError}</div>}
                
                <p className="text-sm text-secondary mb-2">
                  Paciente: <strong>{selectedHistory.pacientes?.nombres_apellidos}</strong>
                </p>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ojo Derecho (OD)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Esfera</label>
                      <input type="number" step="0.25" className="form-input py-1.5 px-2" value={odEsfera} onChange={(e) => setOdEsfera(e.target.value)} placeholder="Ej. -1.75"/>
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Cilindro</label>
                      <input type="number" step="0.25" className="form-input py-1.5 px-2" value={odCilindro} onChange={(e) => setOdCilindro(e.target.value)} placeholder="Ej. -0.50"/>
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Eje (Grade)</label>
                      <input type="number" className="form-input py-1.5 px-2" value={odEje} onChange={(e) => setOdEje(e.target.value)} placeholder="Ej. 180"/>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ojo Izquierdo (OI)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Esfera</label>
                      <input type="number" step="0.25" className="form-input py-1.5 px-2" value={oiEsfera} onChange={(e) => setOiEsfera(e.target.value)} placeholder="Ej. -1.25"/>
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Cilindro</label>
                      <input type="number" step="0.25" className="form-input py-1.5 px-2" value={oiCilindro} onChange={(e) => setOiCilindro(e.target.value)} placeholder="Ej. -0.75"/>
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Eje (Grade)</label>
                      <input type="number" className="form-input py-1.5 px-2" value={oiEje} onChange={(e) => setOiEje(e.target.value)} placeholder="Ej. 175"/>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="adicion">Adición</label>
                    <input
                      type="number"
                      step="0.25"
                      id="adicion"
                      className="form-input"
                      value={adicion}
                      onChange={(e) => setAdicion(e.target.value)}
                      placeholder="Ej. +1.50"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="dp">Distancia Pupilar (mm)</label>
                    <input
                      type="number"
                      id="dp"
                      className="form-input"
                      value={distanciaPupilar}
                      onChange={(e) => setDistanciaPupilar(e.target.value)}
                      placeholder="Ej. 63"
                    />
                  </div>
                </div>
              </div>
              <div className="form-actions-modal">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecipeModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingRecipe}>
                  {savingRecipe ? 'Registrando...' : 'Emitir Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Recipe Modal */}
      {showViewRecipeModal && activeRecipe && (
        <div className="modal-overlay" onClick={() => setShowViewRecipeModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '22px', height: '22px', color: 'var(--accent-color)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
                </svg>
                Receta Oftálmica Oficial
              </h2>
              <button className="modal-close-btn" onClick={() => setShowViewRecipeModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 space-y-6" id="printable-recipe">
              {/* Receipt Header */}
              <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-4">
                <div>
                  <span className="font-extrabold text-xl tracking-tight text-primary">Naw<span className="text-accent">IA</span></span>
                  <p className="text-xs text-secondary">Clínica Oftalmológica de Inferencia</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400">FECHA EMISIÓN</p>
                  <p className="text-sm font-bold text-primary">{new Date(activeRecipe.receta.fecha_emision).toLocaleDateString('es-PE')}</p>
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm text-primary">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">PACIENTE</span>
                  <span className="font-bold">{activeRecipe.historia.pacientes?.nombres_apellidos}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block">DNI</span>
                  <span className="font-bold">{activeRecipe.historia.dni_paciente}</span>
                </div>
              </div>

              {/* Formula Grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Fórmula de Medida de Vista</span>
                <table className="w-full text-sm border-collapse text-left" style={{ border: '1px solid #cbd5e1' }}>
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b text-primary" style={{ borderColor: '#cbd5e1' }}>
                      <th className="p-3 border-r" style={{ borderColor: '#cbd5e1' }}>Ojo</th>
                      <th className="p-3 border-r" style={{ borderColor: '#cbd5e1' }}>Esfera (SPH)</th>
                      <th className="p-3 border-r" style={{ borderColor: '#cbd5e1' }}>Cilindro (CYL)</th>
                      <th className="p-3" style={{ borderColor: '#cbd5e1' }}>Eje (AXIS)</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    <tr className="border-b" style={{ borderColor: '#cbd5e1' }}>
                      <td className="p-3 font-bold bg-slate-50 border-r" style={{ borderColor: '#cbd5e1' }}>Derecho (OD)</td>
                      <td className="p-3 border-r" style={{ borderColor: '#cbd5e1' }}>{activeRecipe.receta.od_esfera !== null ? (activeRecipe.receta.od_esfera > 0 ? '+' : '') + parseFloat(activeRecipe.receta.od_esfera).toFixed(2) : '0.00'}</td>
                      <td className="p-3 border-r" style={{ borderColor: '#cbd5e1' }}>{activeRecipe.receta.od_cilindro !== null ? (activeRecipe.receta.od_cilindro > 0 ? '+' : '') + parseFloat(activeRecipe.receta.od_cilindro).toFixed(2) : '0.00'}</td>
                      <td className="p-3">{activeRecipe.receta.od_eje !== null ? activeRecipe.receta.od_eje + '°' : '0°'}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold bg-slate-50 border-r" style={{ borderColor: '#cbd5e1' }}>Izquierdo (OI)</td>
                      <td className="p-3 border-r" style={{ borderColor: '#cbd5e1' }}>{activeRecipe.receta.oi_esfera !== null ? (activeRecipe.receta.oi_esfera > 0 ? '+' : '') + parseFloat(activeRecipe.receta.oi_esfera).toFixed(2) : '0.00'}</td>
                      <td className="p-3 border-r" style={{ borderColor: '#cbd5e1' }}>{activeRecipe.receta.oi_cilindro !== null ? (activeRecipe.receta.oi_cilindro > 0 ? '+' : '') + parseFloat(activeRecipe.receta.oi_cilindro).toFixed(2) : '0.00'}</td>
                      <td className="p-3">{activeRecipe.receta.oi_eje !== null ? activeRecipe.receta.oi_eje + '°' : '0°'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Addition & DP */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-100 rounded-lg p-4 text-sm text-primary">
                <div>
                  <span className="text-xs font-bold text-slate-400 block">ADICIÓN</span>
                  <span className="font-bold text-base">{activeRecipe.receta.adicion !== null ? '+' + parseFloat(activeRecipe.receta.adicion).toFixed(2) : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 block">DISTANCIA PUPILAR (DP)</span>
                  <span className="font-bold text-base">{activeRecipe.receta.distancia_pupilar !== null ? activeRecipe.receta.distancia_pupilar + ' mm' : 'N/A'}</span>
                </div>
              </div>

              {/* Warning signature */}
              <div className="pt-10 flex justify-between items-end">
                <p className="text-xs text-secondary max-w-xs leading-relaxed">
                  * Válido por un año. Se recomienda control anual preventivo oftálmico para la detección de glaucoma y patologías retinianas.
                </p>
                <div className="text-center border-t border-slate-300 pt-2 px-6">
                  <p className="text-xs font-bold text-primary">Firma del Especialista</p>
                  <p className="text-xs text-secondary">NawIA Medical Staff</p>
                </div>
              </div>
            </div>
            <div className="form-actions-modal">
              <button className="btn btn-secondary" onClick={() => setShowViewRecipeModal(false)}>
                Cerrar
              </button>
              <button className="btn btn-primary flex items-center gap-1 font-bold" onClick={() => window.print()}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.844l-.248-1.5c-.097-.585-.602-1.02-1.194-1.02h-3.14a1.2 1.2 0 00-1.195 1.295c.046.54.498.966 1.04 1.02l2.368.237c.504.05.9.432.97.933l.435 3.044c.084.587.592 1.018 1.184 1.018h2.9c.732 0 1.293-.65 1.184-1.37l-.872-5.748M21.75 12c0 5.385-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25 21.75 6.615 21.75 12z" />
                </svg>
                Imprimir Receta
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HistoriasClinicas;
