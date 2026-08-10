import React, { useState, useEffect, useMemo } from 'react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, 
  Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Calendar, Download, Store, User, TrendingUp, DollarSign, ShoppingBag, PieChart, Globe, Truck, Factory, ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, getWcConfig, fetchCustomStatuses } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

const DashboardAnalytics = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCashier, setSelectedCashier] = useState('all');
  
  // States para datos reales
  const [orders, setOrders] = useState([]);
  const [customStatuses, setCustomStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si es custom pero no han llenado ambas fechas, no cargar aún
    if (dateRange === 'custom' && (!customStart || !customEnd)) return;
    loadDashboardData();
  }, [dateRange, customStart, customEnd]);

  const loadDashboardData = async () => {
    if (!getWcConfig()) {
      setError("No hay conexión configurada. Ve a Conexión API.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let after = null;
      let before = null;
      const today = new Date();

      if (dateRange === 'today') {
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        after = start.toISOString();
      } else if (dateRange === 'week') {
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        after = start.toISOString();
      } else if (dateRange === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        after = start.toISOString();
      } else if (dateRange === 'custom') {
        if (customStart) {
          after = new Date(customStart).toISOString();
        }
        if (customEnd) {
          const endObj = new Date(customEnd);
          endObj.setHours(23, 59, 59, 999);
          before = endObj.toISOString();
        }
      }

      // Traemos pedidos y estados personalizados
      const [realOrders, dbCustomStatuses] = await Promise.all([
        fetchOrders({ perPage: 100, after, before }),
        fetchCustomStatuses()
      ]);
      setOrders(realOrders);
      setCustomStatuses(Array.isArray(dbCustomStatuses) ? dbCustomStatuses : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cálculos dinámicos basados en la API
  const metrics = useMemo(() => {
    if (orders.length === 0) return null;

    let webTotal = 0;
    let posTotal = 0;
    let webCount = 0;
    let posCount = 0;
    let prodCount = 0;
    let shippingReady = 0;
    let shippingDelivered = 0;
    const paymentsCount = {};

    let ordersToCalculate = orders;
    
    // Aplicar filtros locales de UI
    if (selectedStore === 'web') {
      ordersToCalculate = ordersToCalculate.filter(o => o.type === 'web');
    } else if (selectedStore === 'pos') {
      ordersToCalculate = ordersToCalculate.filter(o => o.type === 'pos');
    } else if (selectedStore !== 'all') {
      // Filtrar por nombre específico de sucursal
      ordersToCalculate = ordersToCalculate.filter(o => o.store === selectedStore);
    }

    if (selectedCashier !== 'all') {
      ordersToCalculate = ordersToCalculate.filter(o => o.cashier === selectedCashier);
    }

    ordersToCalculate.forEach(o => {
      const val = parseFloat(o.total.replace(/[^0-9.-]+/g,"")) || 0;
      
      if (o.type === 'web') {
        webTotal += val;
        webCount++;
      } else {
        posTotal += val;
        posCount++;
      }

      if (o.productionStatus === 'in_progress') prodCount++;
      
      if (o.requiresDelivery) {
        if (o.deliveryStatus === 'pending') shippingReady++;
        if (o.deliveryStatus === 'delivered') shippingDelivered++;
      }

      // Count Payment Methods
      const method = o.paymentMethod || 'Desconocido';
      paymentsCount[method] = (paymentsCount[method] || 0) + 1;
    });

    const totalSales = webTotal + posTotal;

    return {
      totalSales, webTotal, posTotal,
      webCount, posCount, totalCount: webCount + posCount,
      prodCount, shippingReady, shippingDelivered,
      paymentsCount
    };
  }, [orders, selectedStore, selectedCashier]);

  // Count orders per WooCommerce status
  const statusCounts = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const WC_STATUS_META = [
    { value: 'pending',    label: 'Pendiente',  color: '#94a3b8' },
    { value: 'processing', label: 'Procesando', color: '#6366f1' },
    { value: 'on-hold',   label: 'En Espera',   color: '#f59e0b' },
    { value: 'completed', label: 'Completado',  color: '#10b981' },
    { value: 'cancelled', label: 'Cancelado',   color: '#ef4444' },
    { value: 'refunded',  label: 'Reembolsado', color: '#8b5cf6' },
    { value: 'failed',    label: 'Fallido',     color: '#dc2626' },
  ];

  const allStatusMeta = useMemo(() => {
    return [...WC_STATUS_META, ...customStatuses];
  }, [customStatuses]);

  // Extraer cajeros y sucursales únicos
  const { uniqueCashiers, uniqueStores } = useMemo(() => {
    const cashiers = new Set();
    const stores = new Set();
    orders.forEach(o => {
      if (o.type === 'pos') {
        if (o.cashier && o.cashier !== '-' && o.cashier !== 'Cajero POS') cashiers.add(o.cashier);
        if (o.store && o.store !== 'Tienda Web' && o.store !== 'Sucursal Física') stores.add(o.store);
      }
    });
    return { uniqueCashiers: Array.from(cashiers), uniqueStores: Array.from(stores) };
  }, [orders]);

  // Datos para gráfico de Dona de Canales
  const channelData = useMemo(() => ({
    labels: ['Ventas Web (Online)', 'Ventas POS (Tienda)'],
    datasets: [{
      data: metrics ? [metrics.webTotal, metrics.posTotal] : [0, 0],
      backgroundColor: ['#6366f1', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  }), [metrics]);

  // Datos para gráfico de Métodos de Pago
  const paymentData = useMemo(() => {
    if (!metrics || !metrics.paymentsCount) return null;
    const labels = Object.keys(metrics.paymentsCount);
    const data = Object.values(metrics.paymentsCount);
    // Generar colores
    const bgColors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [metrics]);

  // Dummy line is removed — status chart is now real data

  return (
    <div className="page-content animate-fade-in">
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={28} color="var(--primary)" />
            Centro de Control (Dashboard)
          </h1>
          <p className="subtitle">Resumen global en tiempo real sincronizado con WooCommerce</p>
        </div>
        
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button onClick={loadDashboardData} disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', borderRadius: '12px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* FILTROS GLOBALES */}
      <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '16px', padding: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="filter-item" style={{ flex: 1, minWidth: '250px' }}>
          <label style={labelStyle}><Calendar size={14} /> Fechas de Reporte</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{...selectStyle, flex: 1}}>
              <option value="today">Hoy</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Este Mes</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{...selectStyle, padding: '8px 12px'}} title="Fecha inicio" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{...selectStyle, padding: '8px 12px'}} title="Fecha fin" />
            </div>
          )}
        </div>
        <div className="filter-item" style={{ flex: 1, minWidth: '200px' }}>
          <label style={labelStyle}><Store size={14} /> Canal / Sucursal</label>
          <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} style={selectStyle}>
            <option value="all">Global (Web + Sucursales)</option>
            <option value="web">Online (Web)</option>
            <option value="pos">Todas las Sucursales POS</option>
            <optgroup label="Sucursales Específicas">
              {uniqueStores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="filter-item" style={{ flex: 1, minWidth: '200px' }}>
          <label style={labelStyle}><User size={14} /> Cajero (Solo POS)</label>
          <select value={selectedCashier} onChange={e => setSelectedCashier(e.target.value)} style={selectStyle} disabled={selectedStore === 'web'}>
            <option value="all">Todos los Cajeros</option>
            {uniqueCashiers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
         <div style={{ textAlign: 'center', padding: '60px', color: 'var(--primary)' }}>
           <RefreshCw size={48} className="spin" style={{ margin: '0 auto 20px', display: 'block' }} />
           <h2>Calculando analíticas...</h2>
         </div>
      ) : metrics ? (
        <>
          {/* SECCIÓN 1: RESUMEN DE VENTAS GENERALES */}
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Métricas de Ingresos (Tiempo Real)</h2>
          <div className="stats-grid" style={{ marginBottom: '32px' }}>
            <div onClick={() => navigate('/orders')} className="stat-card glass-panel interactive-card" style={{ borderTop: '3px solid var(--primary)', cursor: 'pointer' }}>
              <h3 style={cardTitleStyle}><DollarSign size={16} /> Ventas Totales</h3>
              <div className="stat-value">${metrics.totalSales.toLocaleString('es-MX', {minimumFractionDigits: 2})}</div>
              <div className="stat-trend positive">Clic para ver todos los pedidos</div>
            </div>
            
            <div className="stat-card glass-panel" style={{ borderTop: '3px solid var(--secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={cardTitleStyle}><Globe size={16} /> Online vs <Store size={16} /> POS</h3>
              <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                <div onClick={() => navigate('/orders?filter=web')} className="interactive-card" style={{ flex: 1, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ventas Web</div>
                  <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>${metrics.webTotal.toLocaleString('es-MX')}</div>
                </div>
                <div onClick={() => navigate('/orders?filter=pos')} className="interactive-card" style={{ flex: 1, cursor: 'pointer', background: 'rgba(236,72,153,0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(236,72,153,0.3)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ventas POS</div>
                  <div style={{ color: 'var(--secondary)', fontSize: '1.2rem', fontWeight: 'bold' }}>${metrics.posTotal.toLocaleString('es-MX')}</div>
                </div>
              </div>
            </div>

            <div className="stat-card glass-panel" style={{ borderTop: '3px solid var(--accent-success)' }}>
              <h3 style={cardTitleStyle}><PieChart size={16} /> Ticket Promedio</h3>
              <div className="stat-value">${(metrics.totalSales / (metrics.totalCount || 1)).toLocaleString('es-MX', {maximumFractionDigits:0})}</div>
              <div className="stat-trend positive">Por pedido promedio</div>
            </div>
          </div>

          {/* SECCIÓN 2: ESTADO OPERATIVO */}
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Resumen Operativo (Haz clic para gestionar)</h2>
          <div className="stats-grid" style={{ marginBottom: '32px' }}>
            
            <div onClick={() => navigate('/orders')} className="stat-card glass-panel interactive-card" style={{ borderTop: '3px solid var(--primary)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={cardTitleStyle}><ShoppingBag size={16} /> Total de Pedidos</h3>
                <ArrowRight size={16} color="var(--primary)" />
              </div>
              <div className="stat-value">{metrics.totalCount}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                <strong>{metrics.webCount}</strong> Web | <strong>{metrics.posCount}</strong> POS
              </div>
            </div>

            <div onClick={() => navigate('/production')} className="stat-card glass-panel interactive-card" style={{ borderTop: '3px solid var(--accent-warning)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={cardTitleStyle}><Factory size={16} /> En Producción</h3>
                <ArrowRight size={16} color="var(--primary)" />
              </div>
              <div className="stat-value">{metrics.prodCount}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Activos ahora mismo
              </div>
            </div>

            <div onClick={() => navigate('/delivery')} className="stat-card glass-panel interactive-card" style={{ borderTop: '3px solid var(--accent-success)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={cardTitleStyle}><Truck size={16} /> Envíos</h3>
                <ArrowRight size={16} color="var(--primary)" />
              </div>
              <div className="stat-value">{metrics.shippingReady + metrics.shippingDelivered}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                <strong>{metrics.shippingReady}</strong> Pendientes | <strong>{metrics.shippingDelivered}</strong> Entregados
              </div>
            </div>

          </div>

          {/* GRAFICOS */}
          <div className="charts-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Resumen de estados de pedidos WooCommerce */}
            <div className="chart-container glass-panel">
              <h3 style={{ marginBottom: '20px', color: 'var(--text-main)', fontSize: '1rem' }}>Resumen por Estado de Pedido</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {allStatusMeta.filter(s => (statusCounts[s.value] || 0) > 0).map(s => (
                  <div
                    key={s.value}
                    onClick={() => navigate('/orders')}
                    className="interactive-card"
                    style={{
                      padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                      background: `${s.color}12`, border: `1px solid ${s.color}30`,
                      display: 'flex', alignItems: 'center', gap: '10px'
                    }}
                  >
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: s.color }}>{statusCounts[s.value] || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-container glass-panel">
              <h3 style={{ marginBottom: '20px', color: 'var(--text-main)', fontSize: '1rem' }}>Canales de Venta (Ingresos)</h3>
              <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={channelData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }} />
              </div>
            </div>
            {paymentData && paymentData.labels.length > 0 && (
              <div className="chart-container glass-panel">
                <h3 style={{ marginBottom: '20px', color: 'var(--text-main)', fontSize: '1rem' }}>Métodos de Pago (Transacciones)</h3>
                <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
                  <Doughnut data={paymentData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }} />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>No se encontraron datos para calcular.</div>
      )}

      <style>{`
        .interactive-card { transition: all 0.2s ease; }
        .interactive-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.2); border-color: var(--primary); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const labelStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' };
const selectStyle = {
  width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', 
  border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px',
  outline: 'none', fontFamily: 'inherit'
};
const cardTitleStyle = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' };

export default DashboardAnalytics;
