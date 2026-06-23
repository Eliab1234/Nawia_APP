import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { Layout } from '../components/ui/Layout';

// Subcomponente: Gráfico de Tendencia de Consultas o Citas (Área Lineal SVG)
const ConsultasTrendChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-slate-400 text-xs py-10">Sin datos de tendencia</div>;

  const maxVal = Math.max(...data.map(d => d.count), 5); // Asegura un mínimo de 5 para escalar
  const width = 450;
  const height = 150;
  const paddingX = 40;
  const paddingY = 20;

  // Mapear datos a coordenadas del plano SVG
  const points = data.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / (data.length - 1);
    const y = height - paddingY - (d.count * (height - 2 * paddingY)) / maxVal;
    return { x, y, label: d.name, val: d.count };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Guías del eje horizontal */}
      <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeDasharray="3 3" />
      <line x1={paddingX} y1={(paddingY + height - paddingY) / 2} x2={width - paddingX} y2={(paddingY + height - paddingY) / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
      <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#cbd5e1" strokeWidth="1.5" />

      {/* Dibujar Área y Línea */}
      {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
      {linePath && <path d={linePath} fill="none" stroke="var(--accent-color)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

      {/* Puntos de datos y etiquetas */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="var(--accent-color)" strokeWidth="2.5" className="cursor-pointer hover:scale-125 transition-transform" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--text-primary)">
            {p.val}
          </text>
          <text x={p.x} y={height - 2} textAnchor="middle" fontSize="10" fill="var(--text-secondary)" fontWeight="600">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

// Subcomponente: Distribución de Patologías (Gráfico Donut SVG)
const PathologyDonutChart = ({ pathologyCounts }) => {
  const entries = Object.entries(pathologyCounts).filter(([_, count]) => count > 0);
  if (entries.length === 0) {
    return <div className="text-slate-400 text-xs py-10">Sin patologías registradas</div>;
  }

  const total = entries.reduce((sum, [_, count]) => sum + count, 0);
  const colorMap = {
    'Glaucoma': '#ef4444',
    'Catarata': '#f59e0b',
    'Retinopatía Diabética': '#10b981',
    'Degeneración Macular': '#3b82f6',
    'Retinopatía Hipertensiva': '#8b5cf6',
    'Miopía': '#ec4899',
    'Normal': '#0284c7'
  };

  let accumulatedPercent = 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159

  const slices = entries.map(([name, count]) => {
    const percent = count / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      name,
      count,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      color: colorMap[name] || '#cbd5e1'
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center">
      <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
        <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="10"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
              className="donut-segment"
              title={`${slice.name}: ${slice.count} (${slice.percent}%)`}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'block', lineHeight: 1.1 }}>{total}</span>
          <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--text-secondary)' }}>Casos</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 w-full">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color, display: 'inline-block', flexShrink: 0 }}></span>
              <span className="font-semibold text-slate-700 text-left">{slice.name}</span>
            </div>
            <span className="font-bold text-slate-600">{slice.count} ({slice.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Subcomponente: Balance de Facturación (Gráfico de Barras SVG)
const BillingBarChart = ({ billingMethods }) => {
  const entries = Object.entries(billingMethods);
  const totalRecaudado = entries.reduce((sum, [_, val]) => sum + val, 0);
  
  if (totalRecaudado === 0) {
    return <div className="text-slate-400 text-xs py-10">Sin recaudación registrada</div>;
  }

  const maxVal = Math.max(...entries.map(([_, val]) => val), 100); 
  const colorMap = {
    Efectivo: '#10b981',
    Tarjeta: '#3b82f6',
    Transferencia: '#f59e0b'
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {entries.map(([method, val], idx) => {
        const percent = (val / maxVal) * 100;
        const color = colorMap[method] || '#cbd5e1';
        return (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-700">{method}</span>
              <span className="text-slate-900 font-bold">S/. {val.toFixed(2)}</span>
            </div>
            <div style={{ height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(percent, 4)}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '4px',
                  transition: 'width 0.8s ease-in-out',
                }}
                className="svg-bar"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Subcomponente: Distribución del Estado de Citas (Donut SVG)
const CitasStatusChart = ({ statusCounts, customLabels }) => {
  const entries = Object.entries(statusCounts).filter(([_, count]) => count > 0);
  if (entries.length === 0) {
    return <div className="text-slate-400 text-xs py-10">Sin citas registradas en la agenda</div>;
  }

  const total = entries.reduce((sum, [_, count]) => sum + count, 0);
  const colorMap = {
    Completada: '#10b981', // Completada o Triado
    Pendiente: '#0284c7',  // Pendiente o Por Triar
    Cancelada: '#ef4444'
  };

  let accumulatedPercent = 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const slices = entries.map(([name, count]) => {
    const percent = count / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      name: customLabels?.[name] || name,
      count,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      color: colorMap[name] || '#cbd5e1'
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center">
      <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
        <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="10"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
              className="donut-segment"
              title={`${slice.name}: ${slice.count} (${slice.percent}%)`}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'block', lineHeight: 1.1 }}>{total}</span>
          <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--text-secondary)' }}>Total</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 w-full">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color, display: 'inline-block', flexShrink: 0 }}></span>
              <span className="font-semibold text-slate-700 text-left">{slice.name}</span>
            </div>
            <span className="font-bold text-slate-600">{slice.count} ({slice.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Subcomponente: Distribución de Pacientes por Género (Donut SVG para Asistentes)
const GenderDonutChart = ({ genderCounts }) => {
  const entries = Object.entries(genderCounts).filter(([_, count]) => count > 0);
  if (entries.length === 0) {
    return <div className="text-slate-400 text-xs py-10">Sin datos demográficos de género</div>;
  }

  const total = entries.reduce((sum, [_, count]) => sum + count, 0);
  const colorMap = {
    M: '#0284c7', // Masculino - Celeste
    F: '#ec4899', // Femenino - Rosa
    O: '#8b5cf6'  // Otro - Violeta
  };
  const labelMap = {
    M: 'Masculino',
    F: 'Femenino',
    O: 'Otro'
  };

  let accumulatedPercent = 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const slices = entries.map(([name, count]) => {
    const percent = count / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      name: labelMap[name] || name,
      count,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      color: colorMap[name] || '#cbd5e1'
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 w-full justify-center">
      <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
        <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="10"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
              className="donut-segment"
              title={`${slice.name}: ${slice.count} (${slice.percent}%)`}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'block', lineHeight: 1.1 }}>{total}</span>
          <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--text-secondary)' }}>Pacientes</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 w-full">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slice.color, display: 'inline-block', flexShrink: 0 }}></span>
              <span className="font-semibold text-slate-700 text-left">{slice.name}</span>
            </div>
            <span className="font-bold text-slate-600">{slice.count} ({slice.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// COMPONENTE PRINCIPAL
export const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [medicosList, setMedicosList] = useState([]);
  const [stats, setStats] = useState({
    pacientesCount: 0,
    consultasCount: 0,
    casosRiesgoCount: 0,
    totalCaja: 0,
    pathologyCounts: {},
    last6Months: [],
    billingMethods: {},
    citasStatusCounts: {},
    genderCounts: {},
    recentCitas: [],
    recentFacturas: [],
    recentPacientes: []
  });
  const [loading, setLoading] = useState(true);

  // Auxiliares de procesamiento de datos
  const getPathologyCounts = (consultas) => {
    const pathologyCounts = {
      Glaucoma: 0,
      Catarata: 0,
      'Retinopatía Diabética': 0,
      'Degeneración Macular': 0,
      'Retinopatía Hipertensiva': 0,
      Miopía: 0,
      Normal: 0
    };

    consultas.forEach(c => {
      const probs = [
        { name: 'Glaucoma', val: parseFloat(c.prob_glaucoma || 0) },
        { name: 'Catarata', val: parseFloat(c.prob_catarata || 0) },
        { name: 'Retinopatía Diabética', val: parseFloat(c.prob_retinopatia_diabetica || 0) },
        { name: 'Degeneración Macular', val: parseFloat(c.prob_degeneracion_macular || 0) },
        { name: 'Retinopatía Hipertensiva', val: parseFloat(c.prob_retinopatia_hipertensiva || 0) },
        { name: 'Miopía', val: parseFloat(c.prob_miopia || 0) },
        { name: 'Normal', val: parseFloat(c.prob_normal || 0) }
      ];
      const maxProb = probs.reduce((max, p) => p.val > max.val ? p : max, { name: 'Normal', val: 0 });
      if (maxProb.val > 0.5) {
        pathologyCounts[maxProb.name]++;
      } else {
        pathologyCounts['Normal']++;
      }
    });
    return pathologyCounts;
  };

  const getTrendData = (consultas) => {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonth - i);
      last6Months.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        name: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        count: 0
      });
    }

    consultas.forEach(c => {
      const cDate = new Date(c.fecha_hora);
      const cMonth = cDate.getMonth();
      const cYear = cDate.getFullYear();
      const match = last6Months.find(m => m.monthIndex === cMonth && m.year === cYear);
      if (match) {
        match.count++;
      }
    });
    return last6Months;
  };

  const getBillingMethods = (facturas) => {
    const billingMethods = {
      Efectivo: 0,
      Tarjeta: 0,
      Transferencia: 0
    };
    facturas.forEach(f => {
      if (f.estado_pago === 'Pagado') {
        const val = parseFloat(f.monto_total || 0);
        let method = 'Efectivo';
        const rawMethod = (f.metodo_pago || '').toLowerCase();
        if (rawMethod.includes('tarjeta') || rawMethod.includes('crédito') || rawMethod.includes('debito')) {
          method = 'Tarjeta';
        } else if (rawMethod.includes('transferencia') || rawMethod.includes('banco') || rawMethod.includes('yape') || rawMethod.includes('plin')) {
          method = 'Transferencia';
        }
        billingMethods[method] += val;
      }
    });
    return billingMethods;
  };

  const getTotalCaja = (facturas) => {
    let total = 0;
    facturas.forEach(f => {
      if (f.estado_pago === 'Pagado') {
        total += parseFloat(f.monto_total || 0);
      }
    });
    return total;
  };

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return 'N/A';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} años`;
  };

  const fetchUserDataAndStats = async () => {
    try {
      setLoading(true);
      // 1. Obtener usuario actual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      setUser(currentUser);
      const currentRole = currentUser.user_metadata?.role || 'user';
      setRole(currentRole);

      // Cargar lista de médicos públicos para mapear IDs a nombres
      const { data: medData } = await supabase.rpc('get_medicos_public');
      if (medData) {
        setMedicosList(medData);
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      if (currentRole === 'admin') {
        // --- VISTA ADMINISTRATIVA (EMPRESA) ---
        const [pacientesRes, consultasRes, facturasRes, recentFacturasRes, recentCitasRes] = await Promise.all([
          supabase.from('pacientes').select('dni', { count: 'exact', head: true }),
          supabase.from('consultas').select('*'),
          supabase.from('facturacion').select('monto_total, metodo_pago, estado_pago'),
          supabase.from('facturacion').select(`
            id,
            monto_total,
            fecha_emision,
            metodo_pago,
            estado_pago,
            citas (
              dni_paciente,
              pacientes (
                nombres_apellidos
              )
            )
          `).order('fecha_emision', { ascending: false }).limit(5),
          supabase.from('citas').select(`
            id,
            fecha_hora,
            estado,
            motivo_consulta,
            pacientes (
              nombres_apellidos
            ),
            id_medico
          `).order('fecha_hora', { ascending: false }).limit(5)
        ]);

        const pacientesCount = pacientesRes.count || 0;
        const consultas = consultasRes.data || [];
        const facturas = facturasRes.data || [];
        const recentFacturas = recentFacturasRes.data || [];
        const recentCitas = recentCitasRes.data || [];

        setStats({
          pacientesCount,
          consultasCount: consultas.length,
          casosRiesgoCount: consultas.filter(c => 
            c.prob_glaucoma > 0.5 || c.prob_catarata > 0.5 || c.prob_retinopatia_diabetica > 0.5 || 
            c.prob_degeneracion_macular > 0.5 || c.prob_retinopatia_hipertensiva > 0.5 || c.prob_miopia > 0.5
          ).length,
          totalCaja: getTotalCaja(facturas),
          pathologyCounts: getPathologyCounts(consultas),
          last6Months: getTrendData(consultas),
          billingMethods: getBillingMethods(facturas),
          recentFacturas,
          recentCitas
        });

      } else if (currentRole === 'asistente') {
        // --- VISTA ASISTENTE (ADMINISTRATIVO) ---
        const [pacientesHoyRes, citasHoyRes, citasPendientesRes, recentPacientesRes, recentCitasRes, allCitasRes, allPacientesRes] = await Promise.all([
          supabase.from('pacientes').select('dni', { count: 'exact', head: true }).gte('fecha_registro', todayStart.toISOString()),
          supabase.from('citas').select('id', { count: 'exact', head: true }).gte('fecha_hora', todayStart.toISOString()).lte('fecha_hora', todayEnd.toISOString()),
          supabase.from('citas').select('id', { count: 'exact', head: true }).eq('estado', 'Pendiente'),
          supabase.from('pacientes').select('dni, nombres_apellidos, genero, fecha_nacimiento, fecha_registro').order('fecha_registro', { ascending: false }).limit(5),
          supabase.from('citas').select(`
            id,
            fecha_hora,
            estado,
            motivo_consulta,
            pacientes (
              nombres_apellidos
            ),
            id_medico
          `).gte('fecha_hora', todayStart.toISOString()).lte('fecha_hora', todayEnd.toISOString()).order('fecha_hora', { ascending: true }),
          supabase.from('citas').select('*'),
          supabase.from('pacientes').select('genero')
        ]);

        const pacientesHoyCount = pacientesHoyRes.count || 0;
        const citasHoyCount = citasHoyRes.count || 0;
        const citasPendientesCount = citasPendientesRes.count || 0;
        const recentPacientes = recentPacientesRes.data || [];
        const recentCitas = recentCitasRes.data || [];
        const allCitas = allCitasRes.data || [];
        const allPacientes = allPacientesRes.data || [];

        // Generar estados de citas globales
        const citasStatusCounts = {
          Pendiente: 0,
          Completada: 0,
          Cancelada: 0
        };
        allCitas.forEach(c => {
          if (citasStatusCounts[c.estado] !== undefined) {
            citasStatusCounts[c.estado]++;
          }
        });

        // Generar distribución de géneros
        const genderCounts = {
          M: 0,
          F: 0,
          O: 0
        };
        allPacientes.forEach(p => {
          if (genderCounts[p.genero] !== undefined) {
            genderCounts[p.genero]++;
          }
        });

        // Tendencia de citas (últimos 6 meses)
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const currentMonth = new Date().getMonth();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(currentMonth - i);
          last6Months.push({
            monthIndex: d.getMonth(),
            year: d.getFullYear(),
            name: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
            count: 0
          });
        }
        allCitas.forEach(c => {
          const cDate = new Date(c.fecha_hora);
          const cMonth = cDate.getMonth();
          const cYear = cDate.getFullYear();
          const match = last6Months.find(m => m.monthIndex === cMonth && m.year === cYear);
          if (match) {
            match.count++;
          }
        });

        setStats({
          pacientesCount: pacientesHoyCount, // Registrados hoy
          citasCount: citasHoyCount, // Citas hoy
          citasPendientesCount, // Citas pendientes totales
          recentPacientes,
          recentCitas,
          citasStatusCounts,
          genderCounts,
          last6Months
        });

      } else if (currentRole === 'enfermero') {
        // --- VISTA ENFERMERO (TRIAJE) ---
        // Obtener citas pendientes de hoy y triajes del día
        const [citasHoyRes, todayHistoriesRes, consultasRes, totalPacientesRes] = await Promise.all([
          supabase.from('citas').select(`
            id,
            dni_paciente,
            fecha_hora,
            estado,
            motivo_consulta,
            pacientes (
              nombres_apellidos,
              genero,
              fecha_nacimiento
            ),
            servicios (
              nombre
            )
          `).eq('estado', 'Pendiente').gte('fecha_hora', todayStart.toISOString()).lte('fecha_hora', todayEnd.toISOString()).order('fecha_hora', { ascending: true }),
          supabase.from('historias_clinicas').select(`
            id,
            id_cita,
            dni_paciente,
            fecha_registro,
            pacientes (
              nombres_apellidos
            ),
            agudeza_visual_od,
            presion_intraocular_od
          `).gte('fecha_registro', todayStart.toISOString()).lte('fecha_registro', todayEnd.toISOString()).order('fecha_registro', { ascending: false }),
          supabase.from('consultas').select('*'),
          supabase.from('pacientes').select('dni', { count: 'exact', head: true })
        ]);

        const pendingToday = citasHoyRes.data || [];
        const todayHistories = todayHistoriesRes.data || [];
        const totalPatients = totalPacientesRes.count || 0;
        const consultas = consultasRes.data || [];

        // Identificar citas ya atendidas en triaje
        const historiesCitaIds = new Set(todayHistories.map(h => h.id_cita).filter(Boolean));
        
        // Filtrar citas pendientes hoy que no cuentan con historia clínica (Aún sin Triaje)
        const citasAunSinTriaje = pendingToday.filter(c => !historiesCitaIds.has(c.id));
        const triajesPendientesCount = citasAunSinTriaje.length;
        const triajesCompletadosCount = todayHistories.length;

        // Estructurar distribución de triaje hoy
        const triageProgressCounts = {
          Completada: triajesCompletadosCount, // Representa "Triados hoy"
          Pendiente: triajesPendientesCount // Representa "Pendientes hoy"
        };

        setStats({
          pacientesCount: totalPatients,
          triajesPendientesCount,
          triajesCompletadosCount,
          recentCitas: citasAunSinTriaje, // Espera de triaje
          recentPacientes: todayHistories, // Completados hoy
          citasStatusCounts: triageProgressCounts,
          pathologyCounts: getPathologyCounts(consultas)
        });

      } else {
        // --- VISTA PERSONALIZADA DE MÉDICO ---
        const [pacientesAsignadosRes, consultasMedRes, citasMedRes, recentCitasMedRes, recentPacientesRes] = await Promise.all([
          supabase.from('paciente_medicos').select('dni_paciente', { count: 'exact', head: true }).eq('id_medico', currentUser.id),
          supabase.from('consultas').select('*').eq('id_medico', currentUser.id),
          supabase.from('citas').select('*').eq('id_medico', currentUser.id),
          supabase.from('citas').select(`
            id,
            fecha_hora,
            estado,
            motivo_consulta,
            pacientes (
              nombres_apellidos
            ),
            servicios (
              nombre
            )
          `).eq('id_medico', currentUser.id).order('fecha_hora', { ascending: false }).limit(5),
          supabase.from('paciente_medicos').select(`
            dni_paciente,
            fecha_asignacion,
            pacientes (
              nombres_apellidos,
              genero,
              fecha_nacimiento
            )
          `).eq('id_medico', currentUser.id).order('fecha_asignacion', { ascending: false }).limit(5)
        ]);

        const pacientesCount = pacientesAsignadosRes.count || 0;
        const consultas = consultasMedRes.data || [];
        const citas = citasMedRes.data || [];
        const recentCitas = recentCitasMedRes.data || [];
        const recentPacientes = recentPacientesRes.data || [];

        // Calcular estados de sus citas
        const citasStatusCounts = {
          Pendiente: 0,
          Completada: 0,
          Cancelada: 0
        };
        citas.forEach(c => {
          if (citasStatusCounts[c.estado] !== undefined) {
            citasStatusCounts[c.estado]++;
          }
        });

        // Contar citas pendientes del médico
        const citasPendientesCount = citas.filter(c => c.estado === 'Pendiente').length;

        setStats({
          pacientesCount,
          citasPendientesCount,
          consultasCount: consultas.length,
          casosRiesgoCount: consultas.filter(c => 
            c.prob_glaucoma > 0.5 || c.prob_catarata > 0.5 || c.prob_retinopatia_diabetica > 0.5 || 
            c.prob_degeneracion_macular > 0.5 || c.prob_retinopatia_hipertensiva > 0.5 || c.prob_miopia > 0.5
          ).length,
          pathologyCounts: getPathologyCounts(consultas),
          last6Months: getTrendData(consultas),
          citasStatusCounts,
          recentCitas,
          recentPacientes
        });
      }
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error: updErr } = await supabase
        .from('citas')
        .update({ estado: newStatus })
        .eq('id', id);

      if (updErr) throw updErr;
      
      // Volver a cargar las estadísticas
      fetchUserDataAndStats();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado de la cita.');
    }
  };

  useEffect(() => {
    fetchUserDataAndStats();
  }, []);

  const getMedicoNombre = (id) => {
    const matched = medicosList.find((m) => m.id === id);
    return matched ? matched.nombre_completo : 'Médico de la clínica';
  };

  return (
    <Layout>
      <div className="dashboard-header-bar">
        <div>
          <h1 className="page-title">Panel de Control</h1>
          <p className="page-subtitle">
            {role === 'admin' && 'Información general y analíticas globales de la clínica NawIA.'}
            {role === 'asistente' && 'Módulo de recepción: Registro de pacientes, control de citas y check-in.'}
            {role === 'enfermero' && 'Módulo de triaje clínico ocular: Registro de agudeza visual y presión intraocular.'}
            {role === 'user' && 'Gestión de tu agenda, pacientes asignados y consultas del día.'}
          </p>
        </div>
      </div>

      <div className="welcome-banner">
        <div className="welcome-banner-text">
          <h2>¡Hola de nuevo, {user?.user_metadata?.nombre_completo || user?.email || 'Colega'}!</h2>
          <p>
            Has iniciado sesión con el rol de{' '}
            <strong>
              {role === 'admin' && 'Administrador'}
              {role === 'asistente' && 'Asistente Administrativo'}
              {role === 'enfermero' && 'Enfermero (Triaje)'}
              {role === 'user' && 'Médico (Especialista)'}
            </strong>
            .
            {role === 'admin' && ' Revisa los ingresos, el flujo de pacientes y el rendimiento general.'}
            {role === 'asistente' && ' Gestiona el ingreso de nuevos expedientes a la clínica y coordina la agenda de citas del día.'}
            {role === 'enfermero' && ' Revisa la lista de espera de pacientes citados hoy y registra sus parámetros físicos de triaje ocular.'}
            {role === 'user' && ' Visualiza tu agenda personal de citas, reportes de diagnósticos y tus pacientes asignados.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-secondary text-sm py-4">Cargando estadísticas del sistema...</div>
      ) : (
        <>
          {/* ==========================================
              1. TARJETAS DE MÉTRICAS RÁPIDAS
             ========================================== */}
          <div className="stats-grid">
            {role === 'admin' && (
              <>
                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-color)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.pacientesCount}</h3>
                    <p className="stat-desc">Pacientes totales de la clínica</p>
                  </div>
                  <Link to="/pacientes" className="stat-link">Ver pacientes &rarr;</Link>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.consultasCount}</h3>
                    <p className="stat-desc">Consultas totales (Clínica)</p>
                  </div>
                  <Link to="/historial-consultas" className="stat-link">Ver exámenes &rarr;</Link>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.214.074a8.374 8.374 0 001.762.243c1.554 0 2.802-.6 2.802-1.748c0-1.123-1.077-1.472-2.115-1.847c-1.036-.376-2.162-.727-2.162-1.898c0-1.017 1.054-1.678 2.522-1.678c.83 0 1.66.117 2.41.306l.15.038M16.5 7.5c0-.621-.504-1.125-1.125-1.125H9.75v-4.875" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">S/. {stats.totalCaja.toFixed(2)}</h3>
                    <p className="stat-desc">Caja acumulada (Total)</p>
                  </div>
                  <Link to="/facturacion" className="stat-link">Ir a Caja &rarr;</Link>
                </div>
              </>
            )}

            {role === 'asistente' && (
              <>
                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-color)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235A8.902 8.902 0 019 18a8.902 8.902 0 015 1.236m-7.997-.072A11.944 11.944 0 019 19c2.17 0 4.207-.576 5.963-1.584M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.pacientesCount}</h3>
                    <p className="stat-desc">Pacientes registrados hoy</p>
                  </div>
                  <Link to="/pacientes" className="stat-link">Nuevo paciente &rarr;</Link>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.citasCount}</h3>
                    <p className="stat-desc">Citas programadas hoy</p>
                  </div>
                  <Link to="/citas" className="stat-link">Agendar cita &rarr;</Link>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.citasPendientesCount}</h3>
                    <p className="stat-desc">Citas pendientes en el sistema</p>
                  </div>
                  <span className="absolute right-6 text-xs font-semibold px-2 py-1 rounded bg-amber-50 text-amber-700">Por Atender</span>
                </div>
              </>
            )}

            {role === 'enfermero' && (
              <>
                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.triajesPendientesCount}</h3>
                    <p className="stat-desc">Pacientes por triar hoy</p>
                  </div>
                  <span className="absolute right-6 text-xs font-semibold px-2 py-1 rounded bg-rose-50 text-rose-600">Espera de Triaje</span>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.triajesCompletadosCount}</h3>
                    <p className="stat-desc">Triajes completados hoy</p>
                  </div>
                  <Link to="/historias" className="stat-link">Ver historias &rarr;</Link>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-color)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.pacientesCount}</h3>
                    <p className="stat-desc">Total pacientes en NawIA</p>
                  </div>
                  <Link to="/pacientes" className="stat-link">Ver historial &rarr;</Link>
                </div>
              </>
            )}

            {role === 'user' && (
              <>
                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-color)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.pacientesCount}</h3>
                    <p className="stat-desc">Mis pacientes asignados</p>
                  </div>
                  <Link to="/pacientes" className="stat-link">Mi lista &rarr;</Link>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.citasPendientesCount}</h3>
                    <p className="stat-desc">Mis citas pendientes</p>
                  </div>
                  <Link to="/citas" className="stat-link">Ver agenda &rarr;</Link>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <h3 className="text-xl font-bold">{stats.consultasCount}</h3>
                    <p className="stat-desc">Mis consultas realizadas</p>
                  </div>
                  <Link to="/historial-consultas" className="stat-link">Mis diagnósticos &rarr;</Link>
                </div>
              </>
            )}
          </div>

          {/* ==========================================
              2. GRÁFICOS ANALÍTICOS
             ========================================== */}
          <div className="dashboard-charts-grid mt-6">
            {role === 'admin' && (
              <>
                <div className="chart-card">
                  <h3 className="chart-title">Tendencia de Consultas (Últimos 6 Meses)</h3>
                  <div className="chart-container">
                    <ConsultasTrendChart data={stats.last6Months} />
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Distribución de Patologías por IA</h3>
                  <div className="chart-container">
                    <PathologyDonutChart pathologyCounts={stats.pathologyCounts} />
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Recaudación por Método de Pago</h3>
                  <div className="chart-container">
                    <BillingBarChart billingMethods={stats.billingMethods} />
                  </div>
                  <div className="text-center font-bold text-sm text-slate-800 border-t border-slate-100 pt-3 mt-auto">
                    Caja Total Recaudada: S/. {stats.totalCaja.toFixed(2)}
                  </div>
                </div>
              </>
            )}

            {role === 'asistente' && (
              <>
                <div className="chart-card">
                  <h3 className="chart-title">Volumen de Citas Programadas (6 Meses)</h3>
                  <div className="chart-container">
                    <ConsultasTrendChart data={stats.last6Months} />
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Pacientes por Género (Demografía)</h3>
                  <div className="chart-container">
                    <GenderDonutChart genderCounts={stats.genderCounts} />
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Estado General de Citas</h3>
                  <div className="chart-container">
                    <CitasStatusChart statusCounts={stats.citasStatusCounts} />
                  </div>
                </div>
              </>
            )}

            {role === 'enfermero' && (
              <>
                <div className="chart-card">
                  <h3 className="chart-title">Avance del Triaje del Día</h3>
                  <div className="chart-container">
                    <CitasStatusChart 
                      statusCounts={stats.citasStatusCounts} 
                      customLabels={{ Completada: 'Triados Hoy', Pendiente: 'Por Triar Hoy' }}
                    />
                  </div>
                </div>

                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                  <h3 className="chart-title">Distribución de Patologías (Clínica)</h3>
                  <div className="chart-container">
                    <PathologyDonutChart pathologyCounts={stats.pathologyCounts} />
                  </div>
                </div>
              </>
            )}

            {role === 'user' && (
              <>
                <div className="chart-card">
                  <h3 className="chart-title">Tendencia de Mis Consultas (6 Meses)</h3>
                  <div className="chart-container">
                    <ConsultasTrendChart data={stats.last6Months} />
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Estado de Mis Citas Clínicas</h3>
                  <div className="chart-container">
                    <CitasStatusChart statusCounts={stats.citasStatusCounts} />
                  </div>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Patologías en Mis Pacientes</h3>
                  <div className="chart-container">
                    <PathologyDonutChart pathologyCounts={stats.pathologyCounts} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ==========================================
              3. TABLAS Y LISTADOS DETALLADOS
             ========================================== */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {role === 'admin' && (
              <>
                {/* Tabla 1: Últimos Ingresos de Caja */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Últimas Transacciones de Caja
                  </h3>
                  {stats.recentFacturas.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">No hay ingresos registrados en caja.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Paciente</th>
                            <th>Método</th>
                            <th>Monto</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentFacturas.map((fac) => (
                            <tr key={fac.id}>
                              <td>{new Date(fac.fecha_emision).toLocaleDateString('es-PE')}</td>
                              <td className="font-semibold text-slate-700">
                                {fac.citas?.pacientes?.nombres_apellidos || 'Paciente clínico'}
                              </td>
                              <td>{fac.metodo_pago}</td>
                              <td className="font-bold text-emerald-600">S/. {parseFloat(fac.monto_total).toFixed(2)}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                                  fac.estado_pago === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {fac.estado_pago}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 text-right">
                    <Link to="/facturacion" className="text-xs text-sky-600 font-bold hover:underline">Ver facturación completa &rarr;</Link>
                  </div>
                </div>

                {/* Tabla 2: Últimas Citas Agendadas */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Últimas Citas Registradas en el Sistema
                  </h3>
                  {stats.recentCitas.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">No hay citas programadas en el sistema.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>Fecha y Hora</th>
                            <th>Paciente</th>
                            <th>Médico</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentCitas.map((cita) => (
                            <tr key={cita.id}>
                              <td>{new Date(cita.fecha_hora).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                              <td className="font-semibold text-slate-700">
                                {cita.pacientes?.nombres_apellidos || 'Paciente clínico'}
                              </td>
                              <td className="text-xs text-slate-600">{getMedicoNombre(cita.id_medico)}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                                  cita.estado === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                  cita.estado === 'Cancelada' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {cita.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 text-right">
                    <Link to="/citas" className="text-xs text-sky-600 font-bold hover:underline">Ver agenda completa &rarr;</Link>
                  </div>
                </div>
              </>
            )}

            {role === 'asistente' && (
              <>
                {/* Tabla 1: Agenda de Citas de Hoy (Asistente) */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Agenda y Recepción del Día de Hoy
                  </h3>
                  {stats.recentCitas.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">No hay citas agendadas para el día de hoy.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Paciente</th>
                            <th>Especialista</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentCitas.map((cita) => (
                            <tr key={cita.id}>
                              <td className="font-semibold text-slate-800">
                                {new Date(cita.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="font-semibold text-slate-700">
                                {cita.pacientes?.nombres_apellidos}
                              </td>
                              <td className="text-slate-500">{getMedicoNombre(cita.id_medico)}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                                  cita.estado === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                  cita.estado === 'Cancelada' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {cita.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 text-right">
                    <Link to="/citas" className="text-xs text-sky-600 font-bold hover:underline">Gestionar Agenda completa &rarr;</Link>
                  </div>
                </div>

                {/* Tabla 2: Pacientes Registrados Recientemente */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Pacientes Ingresados Recientemente
                  </h3>
                  {stats.recentPacientes.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">No hay pacientes registrados recientemente.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>DNI</th>
                            <th>Paciente</th>
                            <th>Edad / Género</th>
                            <th>F. Registro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentPacientes.map((p) => (
                            <tr key={p.dni}>
                              <td className="font-mono text-xs font-semibold">{p.dni}</td>
                              <td className="font-semibold text-slate-700">{p.nombres_apellidos}</td>
                              <td>
                                {calculateAge(p.fecha_nacimiento)} / {p.genero === 'M' ? 'Masc' : p.genero === 'F' ? 'Fem' : 'Otro'}
                              </td>
                              <td className="text-slate-500">
                                {new Date(p.fecha_registro).toLocaleDateString('es-PE')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 text-right">
                    <Link to="/pacientes" className="text-xs text-sky-600 font-bold hover:underline">Registrar Nuevo Paciente &rarr;</Link>
                  </div>
                </div>
              </>
            )}

            {role === 'enfermero' && (
              <>
                {/* Tabla 1: Lista de Espera de Triaje */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Lista de Espera: Citas Pendientes de Triaje (Hoy)
                  </h3>
                  {stats.recentCitas.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">No hay pacientes en espera de triaje el día de hoy.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Paciente</th>
                            <th>DNI</th>
                            <th>Servicio</th>
                            <th className="text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentCitas.map((cita) => (
                            <tr key={cita.id}>
                              <td className="font-bold text-slate-800">
                                {new Date(cita.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="font-semibold text-slate-700">
                                {cita.pacientes?.nombres_apellidos}
                              </td>
                              <td className="font-mono text-xs">{cita.dni_paciente}</td>
                              <td className="text-xs text-slate-500">{cita.servicios?.nombre || 'Consulta'}</td>
                              <td className="text-right">
                                <Link 
                                  to={`/historias?dni=${cita.dni_paciente}&citaId=${cita.id}`}
                                  className="btn btn-primary btn-sm inline-flex items-center gap-1 py-0.5 px-2.5 text-xxs font-bold shadow-sm"
                                  style={{ padding: '4px 10px', fontSize: '11px', textDecoration: 'none' }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '12px', height: '12px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192" />
                                  </svg>
                                  Iniciar Triaje
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tabla 2: Últimos Triajes Completados (Hoy) */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Triajes Completados el Día de Hoy
                  </h3>
                  {stats.recentPacientes.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">Aún no se han completado triajes hoy.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>Hora Registro</th>
                            <th>Paciente</th>
                            <th>Agudeza Visual (OD)</th>
                            <th>Presión (OD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentPacientes.map((h) => (
                            <tr key={h.id}>
                              <td className="text-slate-500">
                                {new Date(h.fecha_registro).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="font-semibold text-slate-700">
                                {h.pacientes?.nombres_apellidos}
                              </td>
                              <td className="font-semibold text-slate-800">{h.agudeza_visual_od || 'N/A'}</td>
                              <td className="font-semibold text-slate-800">{h.presion_intraocular_od || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 text-right">
                    <Link to="/historias" className="text-xs text-sky-600 font-bold hover:underline">Ver todas las historias &rarr;</Link>
                  </div>
                </div>
              </>
            )}

            {role === 'user' && (
              <>
                {/* Tabla 1: Mi Agenda de Próximas Citas */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Mi Agenda: Citas Recientes y Pendientes
                  </h3>
                  {stats.recentCitas.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">No tienes citas programadas en tu agenda.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>Fecha y Hora</th>
                            <th>Paciente</th>
                            <th>Servicio</th>
                            <th>Estado</th>
                            <th className="text-right">Acción rápida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentCitas.map((cita) => (
                            <tr key={cita.id}>
                              <td>{new Date(cita.fecha_hora).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                              <td className="font-semibold text-slate-700">
                                {cita.pacientes?.nombres_apellidos || 'Paciente'}
                              </td>
                              <td>{cita.servicios?.nombre || 'Consulta'}</td>
                              <td>
                                <span className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                                  cita.estado === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                  cita.estado === 'Cancelada' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                                  'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}>
                                  {cita.estado}
                                </span>
                              </td>
                              <td className="text-right">
                                {cita.estado === 'Pendiente' && (
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => handleUpdateStatus(cita.id, 'Completada')}
                                      className="px-2 py-0.5 bg-emerald-550 text-white rounded text-xxs font-bold hover:bg-emerald-600 transition-colors"
                                      style={{ backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                      title="Completar cita"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateStatus(cita.id, 'Cancelada')}
                                      className="px-2 py-0.5 bg-rose-550 text-white rounded text-xxs font-bold hover:bg-rose-600 transition-colors"
                                      style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                      title="Cancelar cita"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 text-right">
                    <Link to="/citas" className="text-xs text-sky-600 font-bold hover:underline">Ir a mi agenda completa &rarr;</Link>
                  </div>
                </div>

                {/* Tabla 2: Mis Pacientes Recientes */}
                <div className="module-container" style={{ margin: 0, padding: '20px' }}>
                  <h3 className="section-title mb-4" style={{ fontSize: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    Mis Pacientes Asignados Recientemente
                  </h3>
                  {stats.recentPacientes.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center">Aún no tienes pacientes asignados en el sistema.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ fontSize: '12.5px' }}>
                        <thead>
                          <tr>
                            <th>DNI</th>
                            <th>Paciente</th>
                            <th>Edad / Género</th>
                            <th>F. Asignación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentPacientes.map((pm) => (
                            <tr key={pm.dni_paciente}>
                              <td className="font-mono text-xs">{pm.dni_paciente}</td>
                              <td className="font-semibold text-slate-700">
                                {pm.pacientes?.nombres_apellidos || 'Paciente clínico'}
                              </td>
                              <td>
                                {calculateAge(pm.pacientes?.fecha_nacimiento)} / {pm.pacientes?.genero === 'M' ? 'Masc' : pm.pacientes?.genero === 'F' ? 'Fem' : 'Otro'}
                              </td>
                              <td className="text-slate-500">
                                {new Date(pm.fecha_asignacion).toLocaleDateString('es-PE')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-3 text-right">
                    <Link to="/pacientes" className="text-xs text-sky-600 font-bold hover:underline">Ver mis pacientes &rarr;</Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Accesos Rápidos */}
      <div className="quick-actions-section mt-8">
        <h3 className="section-title">Accesos Rápidos</h3>
        <div className="quick-actions-grid">
          {(role === 'admin' || role === 'user') && (
            <Link to="/consultas" className="action-card">
              <h4>Nueva Consulta IA</h4>
              <p>Sube imágenes de retina y ejecuta inferencia del modelo.</p>
            </Link>
          )}
          {(role === 'admin' || role === 'asistente' || role === 'enfermero') && (
            <Link to="/pacientes" className="action-card">
              <h4>Registro de Pacientes</h4>
              <p>Añade nuevos pacientes y consulta antecedentes médicos.</p>
            </Link>
          )}
          {(role === 'admin' || role === 'asistente') && (
            <Link to="/citas" className="action-card">
              <h4>Programar Cita</h4>
              <p>Reserva un espacio en la agenda para un paciente.</p>
            </Link>
          )}
          {role === 'enfermero' && (
            <Link to="/historias" className="action-card">
              <h4>Ficha de Triaje</h4>
              <p>Registra las variables ópticas e historias clínicas.</p>
            </Link>
          )}
          {role === 'admin' && (
            <Link to="/personal" className="action-card">
              <h4>Gestión de Personal</h4>
              <p>Configura cuentas y accesos para nuevos médicos.</p>
            </Link>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
