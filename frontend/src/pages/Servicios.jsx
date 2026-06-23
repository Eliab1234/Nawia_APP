import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('user');

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingServicio, setEditingServicio] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoleAndServicios = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get session & role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setRole(user.user_metadata?.role || 'user');
      }

      // Fetch services
      const { data, error: fetchErr } = await supabase
        .from('servicios')
        .select('*')
        .order('nombre', { ascending: true });

      if (fetchErr) throw fetchErr;
      setServicios(data || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los servicios clínicos. Asegúrate de ejecutar el script SQL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleAndServicios();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingServicio(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (srv) => {
    setEditingServicio(srv);
    setNombre(srv.nombre);
    setDescripcion(srv.descripcion || '');
    setPrecio(srv.precio.toString());
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveServicio = async (e) => {
    e.preventDefault();
    setFormError(null);
    
    if (!nombre.trim() || !precio.trim()) {
      setFormError('El nombre y el precio son requeridos.');
      return;
    }

    const priceNum = parseFloat(precio);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('El precio debe ser un número positivo.');
      return;
    }

    setSaving(true);
    try {
      if (editingServicio) {
        // Update
        const { error: err } = await supabase
          .from('servicios')
          .update({ nombre, descripcion, precio: priceNum })
          .eq('id', editingServicio.id);
        if (err) throw err;
      } else {
        // Insert
        const { error: err } = await supabase
          .from('servicios')
          .insert([{ nombre, descripcion, precio: priceNum }]);
        if (err) throw err;
      }

      setShowModal(false);
      fetchRoleAndServicios();
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error al guardar el servicio clínico.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteServicio = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este servicio?')) return;
    try {
      const { error: err } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id);
      if (err) throw err;
      fetchRoleAndServicios();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el servicio clínico. Es posible que esté asociado a alguna cita registrada.');
    }
  };

  const filteredServicios = servicios.filter(s =>
    s.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.descripcion && s.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="dashboard-header-bar flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Servicios Clínicos</h1>
          <p className="page-subtitle">Gestiona el catálogo de servicios clínicos y precios oficiales de la clínica NawIA.</p>
        </div>
        {role === 'admin' && (
          <button onClick={handleOpenCreateModal} className="btn btn-primary flex items-center gap-2 py-2 px-4 shadow-md font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo Servicio
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="module-container">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input max-w-md"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-secondary text-sm">Cargando servicios clínicos...</div>
        ) : filteredServicios.length === 0 ? (
          <div className="text-center py-12 text-secondary text-sm">No se encontraron servicios registrados.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Costo</th>
                  {role === 'admin' && <th className="text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredServicios.map((srv) => (
                  <tr key={srv.id}>
                    <td className="font-semibold text-accent">#{srv.id}</td>
                    <td className="font-bold text-primary">{srv.nombre}</td>
                    <td className="text-sm text-secondary max-w-sm truncate">{srv.descripcion || 'Sin descripción'}</td>
                    <td className="font-semibold text-emerald-600">S/. {parseFloat(srv.precio).toFixed(2)}</td>
                    {role === 'admin' && (
                      <td className="table-actions">
                        <button
                          onClick={() => handleOpenEditModal(srv)}
                          className="btn btn-secondary btn-sm py-1 px-3 text-xs mr-2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteServicio(srv.id)}
                          className="btn btn-danger-sm py-1 px-3 text-xs"
                          style={{
                            backgroundColor: '#fef2f2',
                            color: 'var(--color-danger)',
                            border: '1px solid #fca5a5',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingServicio ? 'Editar Servicio Clínico' : 'Nuevo Servicio Clínico'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveServicio}>
              <div className="modal-body space-y-4">
                {formError && <div className="alert alert-danger">{formError}</div>}
                
                <div className="form-group">
                  <label className="form-label" htmlFor="srv-nombre">Nombre del Servicio</label>
                  <input
                    type="text"
                    id="srv-nombre"
                    className="form-input"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Consulta Oftalmológica Especializada"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="srv-precio">Precio (Costo Oficial)</label>
                  <input
                    type="number"
                    step="0.01"
                    id="srv-precio"
                    className="form-input"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="Ej. 120.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="srv-desc">Descripción</label>
                  <textarea
                    id="srv-desc"
                    rows={3}
                    className="form-input"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe brevemente las condiciones del servicio..."
                  />
                </div>
              </div>
              <div className="form-actions-modal">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Servicios;
