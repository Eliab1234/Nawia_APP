import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

export const Facturacion = () => {
  const [facturas, setFacturas] = useState([]);
  const [citasSinFactura, setCitasSinFactura] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('user');

  // Stats states
  const [totalRecaudado, setTotalRecaudado] = useState(0);
  const [efectivoTotal, setEfectivoTotal] = useState(0);
  const [tarjetaTotal, setTarjetaTotal] = useState(0);
  const [transferenciaTotal, setTransferenciaTotal] = useState(0);

  // Form modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedCitaId, setSelectedCitaId] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [estadoPago, setEstadoPago] = useState('Pagado');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Search filter
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

      // 2. Fetch invoices
      const { data: factData, error: factErr } = await supabase
        .from('facturacion')
        .select('*, citas(*, pacientes(nombres_apellidos), servicios(nombre, precio))')
        .order('fecha_emision', { ascending: false });

      if (factErr) throw factErr;
      setFacturas(factData || []);

      // Calculate stats
      let total = 0;
      let cash = 0;
      let card = 0;
      let trans = 0;

      (factData || []).forEach((f) => {
        if (f.estado_pago === 'Pagado') {
          const val = parseFloat(f.monto_total);
          total += val;
          if (f.metodo_pago === 'Efectivo') cash += val;
          else if (f.metodo_pago === 'Tarjeta') card += val;
          else if (f.metodo_pago === 'Transferencia') trans += val;
        }
      });

      setTotalRecaudado(total);
      setEfectivoTotal(cash);
      setTarjetaTotal(card);
      setTransferenciaTotal(trans);

      // 3. Fetch completed appointments that don't have an invoice yet
      const { data: citasData } = await supabase
        .from('citas')
        .select('*, pacientes(nombres_apellidos), servicios(nombre, precio)')
        .eq('estado', 'Completada');

      const invoicedCitaIds = new Set((factData || []).map((f) => f.id_cita));
      const uninvoiced = (citasData || []).filter((c) => !invoicedCitaIds.has(c.id));
      setCitasSinFactura(uninvoiced);

    } catch (err) {
      console.error(err);
      setError('Error al inicializar la base de datos de facturación. Asegúrate de ejecutar el script SQL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setSelectedCitaId('');
    setMonto('');
    setMetodoPago('Efectivo');
    setEstadoPago('Pagado');
    setFormError(null);
    setShowModal(true);
  };

  const handleCitaChange = (e) => {
    const citaId = e.target.value;
    setSelectedCitaId(citaId);
    if (citaId) {
      const match = citasSinFactura.find(c => c.id.toString() === citaId);
      if (match) {
        setMonto(match.servicios?.precio.toString());
      }
    } else {
      setMonto('');
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCitaId || !monto || !metodoPago || !estadoPago) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }

    const montoVal = parseFloat(monto);
    if (isNaN(montoVal) || montoVal <= 0) {
      setFormError('El monto total debe ser un número positivo.');
      return;
    }

    setSaving(true);
    try {
      const { error: insErr } = await supabase
        .from('facturacion')
        .insert([{
          id_cita: parseInt(selectedCitaId),
          monto_total: montoVal,
          metodo_pago: metodoPago,
          estado_pago: estadoPago
        }]);

      if (insErr) throw insErr;

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error al emitir el cobro clínico.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error: updErr } = await supabase
        .from('facturacion')
        .update({ estado_pago: newStatus })
        .eq('id', id);

      if (updErr) throw updErr;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado de pago.');
    }
  };

  const getPaymentStatusBadgeClass = (status) => {
    if (status === 'Pagado') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Anulado') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const filteredFacturas = facturas.filter(f =>
    f.citas?.pacientes?.nombres_apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.citas?.dni_paciente.includes(searchQuery) ||
    f.citas?.servicios?.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="dashboard-header-bar flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Facturación y Caja</h1>
          <p className="page-subtitle">Gestiona cobros, formas de pago, ingresos y estado de cuentas de NawIA.</p>
        </div>
        <button onClick={handleOpenCreateModal} className="btn btn-primary flex items-center gap-2 py-2 px-4 shadow-md font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Registrar Cobro
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Caja Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="module-container border-l-4 border-l-sky-500 relative overflow-hidden" style={{ minHeight: '110px' }}>
          <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider mb-1">Caja Total (Ingresos)</span>
          <h3 className="text-2xl font-extrabold text-primary">S/. {totalRecaudado.toFixed(2)}</h3>
          <p className="text-xs text-secondary mt-1">Suma de cobros Pagados</p>
        </div>
        <div className="module-container border-l-4 border-l-emerald-500 relative overflow-hidden" style={{ minHeight: '110px' }}>
          <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider mb-1">Recaudación Efectivo</span>
          <h3 className="text-xl font-extrabold text-slate-800">S/. {efectivoTotal.toFixed(2)}</h3>
          <p className="text-xs text-secondary mt-1">Cobrado en efectivo físico</p>
        </div>
        <div className="module-container border-l-4 border-l-amber-500 relative overflow-hidden" style={{ minHeight: '110px' }}>
          <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider mb-1">Recaudación Tarjeta</span>
          <h3 className="text-xl font-extrabold text-slate-800">S/. {tarjetaTotal.toFixed(2)}</h3>
          <p className="text-xs text-secondary mt-1">Tarjeta de crédito / débito</p>
        </div>
        <div className="module-container border-l-4 border-l-indigo-500 relative overflow-hidden" style={{ minHeight: '110px' }}>
          <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider mb-1">Transferencias</span>
          <h3 className="text-xl font-extrabold text-slate-800">S/. {transferenciaTotal.toFixed(2)}</h3>
          <p className="text-xs text-secondary mt-1">Depósitos y Yape/Plin</p>
        </div>
      </div>

      <div className="module-container">
        <h2 className="text-lg font-bold text-primary mb-4">Registro Histórico de Boletas</h2>
        
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por paciente, DNI o servicio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input max-w-md"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-secondary text-sm">Cargando comprobantes de facturación...</div>
        ) : filteredFacturas.length === 0 ? (
          <div className="text-center py-12 text-secondary text-sm">No se encontraron facturas o cobros.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Boleta ID</th>
                  <th>Paciente</th>
                  <th>Fecha de Emisión</th>
                  <th>Servicio Clínico</th>
                  <th>Método</th>
                  <th>Monto Cobrado</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacturas.map((fact) => {
                  const dateStr = new Date(fact.fecha_emision).toLocaleString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  return (
                    <tr key={fact.id}>
                      <td className="font-semibold text-accent">#B-{fact.id}</td>
                      <td>
                        <div className="font-bold text-primary">{fact.citas?.pacientes?.nombres_apellidos}</div>
                        <div className="text-xs text-secondary">DNI: {fact.citas?.dni_paciente}</div>
                      </td>
                      <td className="text-sm text-secondary">{dateStr}</td>
                      <td className="text-sm font-semibold text-primary">{fact.citas?.servicios?.nombre}</td>
                      <td className="text-sm font-semibold text-secondary">{fact.metodo_pago}</td>
                      <td className="font-bold text-primary">S/. {parseFloat(fact.monto_total).toFixed(2)}</td>
                      <td>
                        <span className={`inline-block border px-2.5 py-0.5 rounded-full text-xs font-bold ${getPaymentStatusBadgeClass(fact.estado_pago)}`}>
                          {fact.estado_pago}
                        </span>
                      </td>
                      <td className="table-actions text-right space-x-1">
                        {fact.estado_pago === 'Pendiente' && (
                          <button
                            onClick={() => handleUpdateStatus(fact.id, 'Pagado')}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#ecfdf5', color: '#10b981', borderColor: '#a7f3d0', border: '1px solid', fontSize: '11px', fontWeight: 700 }}
                          >
                            Marcar Pagado
                          </button>
                        )}
                        {fact.estado_pago !== 'Anulado' && (
                          <button
                            onClick={() => handleUpdateStatus(fact.id, 'Anulado')}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fca5a5', border: '1px solid', fontSize: '11px', fontWeight: 700 }}
                          >
                            Anular
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
              <h2>Registrar Cobro Clínico</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body space-y-4">
                {formError && <div className="alert alert-danger">{formError}</div>}

                <div className="form-group">
                  <label className="form-label" htmlFor="fact-cita">Seleccionar Cita Médica Completada *</label>
                  <select
                    id="fact-cita"
                    className="form-input"
                    value={selectedCitaId}
                    onChange={handleCitaChange}
                    required
                  >
                    <option value="">-- Elige una cita médica pendiente de cobro --</option>
                    {citasSinFactura.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.pacientes?.nombres_apellidos} - {c.servicios?.nombre} ({new Date(c.fecha_hora).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="fact-monto">Monto a Cobrar (S/.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    id="fact-monto"
                    className="form-input"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label" htmlFor="fact-metodo">Método de Pago *</label>
                    <select
                      id="fact-metodo"
                      className="form-input"
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      required
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta (Crédito/Débito)</option>
                      <option value="Transferencia">Transferencia Bancaria / Yape</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="fact-estado">Estado del Pago *</label>
                    <select
                      id="fact-estado"
                      className="form-input"
                      value={estadoPago}
                      onChange={(e) => setEstadoPago(e.target.value)}
                      required
                    >
                      <option value="Pagado">Pagado (Completado)</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-actions-modal">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Registrando...' : 'Emitir Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Facturacion;
