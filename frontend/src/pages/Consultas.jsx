import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase, IA_API_URL } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const Consultas = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Estados del paciente
  const [dni, setDni] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [pacienteError, setPacienteError] = useState('');

  // Estados de la imagen
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Notas del médico
  const [diagnostico, setDiagnostico] = useState('');

  // Estados de Carga y Resultados
  const [loading, setLoading] = useState(false);
  const [probabilidades, setProbabilidades] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fileInputRef = useRef(null);

  // Leer DNI de la URL si se transfirió desde la tabla de pacientes
  useEffect(() => {
    const dniParam = searchParams.get('dni');
    if (dniParam) {
      setDni(dniParam);
      verificarPaciente(dniParam);
    }
  }, [searchParams]);

  // Verificar si el DNI del paciente existe en la base de datos
  const verificarPaciente = async (valDni) => {
    if (!valDni || valDni.length !== 8) {
      setPaciente(null);
      setPacienteError('El DNI debe contener exactamente 8 dígitos.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('nombres_apellidos')
        .eq('dni', valDni)
        .single();

      if (error || !data) {
        setPaciente(null);
        setPacienteError('Paciente no registrado en el sistema.');
      } else {
        setPaciente(data);
        setPacienteError('');
      }
    } catch (err) {
      setPaciente(null);
      setPacienteError('Error al validar el DNI del paciente.');
    }
  };

  const handleDniChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 8); // Solo números, max 8
    setDni(val);
    if (val.length === 8) {
      verificarPaciente(val);
    } else {
      setPaciente(null);
      setPacienteError('');
    }
  };

  // Eventos de Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    resetFeedback();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setPreviewUrl(URL.createObjectURL(droppedFile));
      } else {
        setError('Por favor, selecciona un archivo de imagen válido (PNG, JPG, JPEG).');
      }
    }
  };

  const handleFileChange = (e) => {
    resetFeedback();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
    setProbabilidades(null);
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // =========================================================================
  // LOGICA PRINCIPAL: EJECUTAR ANÁLISIS IA Y GUARDAR CONSULTA (ORDEN ESTRICTO)
  // =========================================================================
  const handleExecuteAnalysisAndSave = async (e) => {
    e.preventDefault();
    
    // Validaciones previas
    if (!paciente) {
      setError('Debes ingresar un DNI de paciente válido y verificado.');
      return;
    }
    if (!file) {
      setError('Debes seleccionar o arrastrar una imagen de retina.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProbabilidades(null);

    try {
      // 1. Subir la imagen de la retina a Supabase Storage
      const timestamp = Math.floor(Date.now() / 1000);
      const fileExt = file.name.split('.').pop() || 'png';
      const nombreUnico = `${dni}_${timestamp}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('retinas')
        .upload(nombreUnico, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir la imagen a Supabase Storage: ${uploadError.message}`);
      }

      // 2. Obtener la URL pública de la imagen
      const { data: publicUrlData } = supabase.storage
        .from('retinas')
        .getPublicUrl(nombreUnico);

      const publicImageUrl = publicUrlData?.publicUrl;
      if (!publicImageUrl) {
        throw new Error('No se pudo obtener la URL pública de la imagen cargada.');
      }

      // 3. Enviar la imagen física mediante FormData a la API de IA externa
      const formData = new FormData();
      formData.append('file', file); // El parámetro esperado es exactamente 'file'

      const predictResponse = await fetch(`${IA_API_URL}/api/predecir`, {
        method: 'POST',
        body: formData,
      });

      if (!predictResponse.ok) {
        const errDetail = await predictResponse.json().catch(() => ({}));
        throw new Error(errDetail?.detail || 'Error en la llamada de inferencia a la API de IA.');
      }

      // 4. Recibir el JSON con las probabilidades de las 7 enfermedades
      const resJson = await predictResponse.json();

      // Guardar localmente para visualización gráfica
      const probsMapped = {
        Normal: resJson.Normal !== undefined ? resJson.Normal : 0,
        Glaucoma: resJson.Glaucoma !== undefined ? resJson.Glaucoma : 0,
        Catarata: resJson.Catarata !== undefined ? resJson.Catarata : 0,
        Retinopatia_Diabetica: resJson.Retinopatia_Diabetica !== undefined ? resJson.Retinopatia_Diabetica : 0,
        Degeneracion_Macular: resJson.Degeneracion_Macular !== undefined ? resJson.Degeneracion_Macular : 0,
        Retinopatia_Hipertensiva: resJson.Retinopatia_Hipertensiva !== undefined ? resJson.Retinopatia_Hipertensiva : 0,
        Miopia: resJson.Miopia !== undefined ? resJson.Miopia : 0
      };
      setProbabilidades(probsMapped);

      // 5. Obtener usuario médico autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Médico no autenticado en Supabase.');
      }

      // 6. Insertar el nuevo registro en la tabla 'consultas'
      const { error: insertError } = await supabase
        .from('consultas')
        .insert([
          {
            dni_paciente: dni,
            id_medico: user.id,
            ruta_imagen: publicImageUrl,
            prob_normal: probsMapped.Normal,
            prob_glaucoma: probsMapped.Glaucoma,
            prob_catarata: probsMapped.Catarata,
            prob_retinopatia_diabetica: probsMapped.Retinopatia_Diabetica,
            prob_degeneracion_macular: probsMapped.Degeneracion_Macular,
            prob_retinopatia_hipertensiva: probsMapped.Retinopatia_Hipertensiva,
            prob_miopia: probsMapped.Miopia,
            diagnostico: diagnostico || null
          }
        ]);

      if (insertError) {
        throw new Error(`Error al guardar en base de datos: ${insertError.message}`);
      }

      setSuccess('Análisis completado y consulta guardada con éxito.');

      // Redirigir al Dashboard después de 4 segundos (para que el médico observe las barras de progreso)
      setTimeout(() => {
        navigate('/dashboard');
      }, 4000);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado durante el procesamiento.');
    } finally {
      setLoading(false);
    }
  };

  // Helper para pintar colores en las barras de progreso
  const getProgressColorClass = (pathology, value) => {
    if (pathology === 'Normal') return 'bg-sky-500'; // Azul Nawi
    if (value >= 0.5) return 'bg-red-500';           // Alerta de riesgo alto
    if (value >= 0.15) return 'bg-amber-500';        // Alerta de riesgo moderado
    return 'bg-slate-400';                           // Riesgo bajo
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

  return (
    <Layout>
      <div className="dashboard-header-bar">
        <div>
          <h1 className="page-title">Nueva Consulta IA</h1>
          <p className="page-subtitle">Sube una retinografía para inferencia automática y registra el dictamen en un solo paso.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Lado Izquierdo: DNI del Paciente y Carga de Imagen */}
        <div className="space-y-6">
          <div className="module-container">
            <h2 className="text-lg font-bold text-primary mb-4">Paso 1: Identificar Paciente</h2>
            
            <div className="form-group">
              <label className="form-label" htmlFor="patient-dni">
                DNI del Paciente (8 dígitos)
              </label>
              <input
                type="text"
                id="patient-dni"
                maxLength={8}
                placeholder="Ingresa DNI para buscar..."
                value={dni}
                onChange={handleDniChange}
                className="form-input"
                disabled={loading}
              />
              
              {paciente && (
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 p-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Paciente verificado: {paciente.nombres_apellidos}
                </div>
              )}

              {pacienteError && (
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-600 bg-rose-50 p-2 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {pacienteError}
                </div>
              )}
            </div>
          </div>

          <div className="module-container">
            <h2 className="text-lg font-bold text-primary mb-4">Paso 2: Imagen de Retina</h2>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={loading}
            />

            <div
              onDragOver={!loading ? handleDragOver : undefined}
              onDragLeave={!loading ? handleDragLeave : undefined}
              onDrop={!loading ? handleDrop : undefined}
              onClick={!loading ? triggerFileSelect : undefined}
              className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-accent bg-sky-50' 
                  : previewUrl 
                    ? 'border-slate-300 hover:border-accent bg-slate-50' 
                    : 'border-slate-300 hover:border-accent bg-white'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Retinografía"
                    className="max-h-64 mx-auto rounded shadow-sm border border-slate-200 object-cover"
                  />
                  {!loading && (
                    <p className="text-xs text-secondary">
                      Hacer clic para cambiar la imagen - {file?.name}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-8">
                  <div className="text-accent flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '48px', height: '48px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">Arrastra y suelta tu archivo aquí</p>
                    <p className="text-xs text-secondary mt-1">O haz clic para explorar tus archivos (PNG, JPG o JPEG)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Análisis y Guardado */}
        <div className="space-y-6">
          <div className="module-container">
            <h2 className="text-lg font-bold text-primary mb-4">Paso 3: Dictamen y Procesamiento</h2>
            
            <div className="form-group mb-6">
              <label className="form-label" htmlFor="doctor-notes">
                Diagnóstico / Notas Clínicas Finales
              </label>
              <textarea
                id="doctor-notes"
                rows={4}
                placeholder="Escribe las notas clínicas finales y prescripciones..."
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                className="form-input"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleExecuteAnalysisAndSave}
              disabled={loading || !file || !paciente}
              className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando Análisis e Insertando en BD...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ejecutar Análisis y Guardar
                </>
              )}
            </button>
          </div>

          {/* Panel de Resultados de Inferencia */}
          <div className="module-container">
            <h2 className="text-lg font-bold text-primary mb-4">Resultado del Análisis Inteligente</h2>
            
            {probabilidades ? (
              <div className="space-y-4">
                {Object.entries(probabilidades).map(([key, val]) => {
                  const percentage = (val * 100).toFixed(2);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-primary">{traducirPatologia(key)}</span>
                        <span className={val >= 0.5 && key !== 'Normal' ? 'text-rose-600 font-bold' : 'text-secondary'}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${getProgressColorClass(key, val)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-6 border-t border-slate-100 pt-4 flex gap-4 text-xs font-semibold text-secondary">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Normal
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Alerta Alta (&gt;50%)
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Alerta Media
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-secondary text-sm border border-dashed border-slate-200 rounded-md">
                {loading ? 'Analizando retinografía mediante el modelo de Deep Learning...' : 'Los resultados de la inferencia médica se mostrarán aquí una vez inicies el análisis.'}
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Consultas;
