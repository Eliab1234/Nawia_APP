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

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('pacientes').select('*').order('fecha_registro', { ascending: false });
      
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

    try {
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

      setSuccess('Paciente registrado correctamente.');
      // Limpiar formulario
      setDni('');
      setNombresApellidos('');
      setFechaNacimiento('');
      setGenero('M');
      setAntecedentes('');
      
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
                      <th>Edad</th>
                      <th>Género</th>
                      <th className="text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacientes.map((p) => (
                      <tr key={p.dni}>
                        <td className="font-semibold text-accent">{p.dni}</td>
                        <td>{p.nombres_apellidos}</td>
                        <td>{calcularEdad(p.fecha_nacimiento)}</td>
                        <td>
                          <span className={`badge ${p.genero === 'M' ? 'badge-success' : p.genero === 'F' ? 'badge-warning' : 'badge-danger'}`}>
                            {p.genero === 'M' ? 'Masculino' : p.genero === 'F' ? 'Femenino' : 'Otro'}
                          </span>
                        </td>
                        <td className="table-actions">
                          <button
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
    </Layout>
  );
};

export default Pacientes;
