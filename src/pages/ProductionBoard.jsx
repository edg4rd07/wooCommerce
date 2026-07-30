import React, { useState, useEffect } from 'react';
import { Factory, Search, CheckCircle, Clock, Package, RefreshCw, User, Timer } from 'lucide-react';
import { fetchOrders, updateOrderMeta, updateOrderMultipleMeta, getWcConfig, saveLog } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ElapsedTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) return;
    
    const calculateTime = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{elapsed || '00:00:00'}</span>;
};

const ProductionBoard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderForStart, setSelectedOrderForStart] = useState(null);

  const [columns] = useState([
    { id: 'pending', title: 'Pendientes por Fabricar', color: 'var(--accent-warning)', icon: Clock },
    { id: 'in_progress', title: 'En Producción', color: 'var(--primary)', icon: Factory },
    { id: 'completed', title: 'Listo para Envío', color: 'var(--accent-success)', icon: CheckCircle }
  ]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const config = await getWcConfig();
    if (!config) {
      setError("Faltan credenciales API.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const allOrders = await fetchOrders({ page: 1, perPage: 50 }); 
      // Solo mostramos pedidos que no estén cancelados ni reembolsados
      const activeOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
      setOrders(activeOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (rawId, newStatus) => {
    setUpdatingId(rawId);
    try {
      await updateOrderMeta(rawId, 'derp_production_status', newStatus);
      // Actualizamos UI localmente rápido
      setOrders(prev => prev.map(o => o.rawId === rawId ? { ...o, productionStatus: newStatus } : o));
    } catch (err) {
      alert("Error actualizando pedido: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCompleteProduction = async (order) => {
    setUpdatingId(order.rawId);
    try {
      // 1. Calculate elapsed time
      const endTime = new Date().toISOString();
      const startTime = order.productionStart || new Date().toISOString();
      
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      const diffMs = Math.max(0, endMs - startMs);
      const diffMinutes = Math.floor(diffMs / 60000);
      
      // 2. Save log
      await saveLog({
        type: 'production',
        orderId: order.id,
        rawOrderId: order.rawId,
        customer: order.customer,
        user: order.productionUser || user.name,
        startTime: startTime,
        endTime: endTime,
        elapsedMinutes: diffMinutes
      });

      // 3. Update order in WooCommerce
      await updateOrderMeta(order.rawId, 'derp_production_status', 'completed');
      
      // 4. Update UI
      setOrders(prev => prev.map(o => o.rawId === order.rawId ? { ...o, productionStatus: 'completed' } : o));
    } catch (err) {
      alert("Error terminando producción: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartProductionClick = (order) => {
    setSelectedOrderForStart(order);
    setShowModal(true);
  };

  const confirmStartProduction = async () => {
    if(!selectedOrderForStart) return;
    setUpdatingId(selectedOrderForStart.rawId);
    setShowModal(false);
    
    try {
      const isoStart = new Date().toISOString();
      await updateOrderMultipleMeta(selectedOrderForStart.rawId, [
        { key: 'derp_production_status', value: 'in_progress' },
        { key: 'derp_production_user', value: user.name },
        { key: 'derp_production_start', value: isoStart }
      ]);
      
      setOrders(prev => prev.map(o => o.rawId === selectedOrderForStart.rawId ? { 
        ...o, 
        productionStatus: 'in_progress', 
        productionUser: user.name, 
        productionStart: isoStart 
      } : o));
    } catch (err) {
      alert("Error iniciando producción: " + err.message);
    } finally {
      setUpdatingId(null);
      setSelectedOrderForStart(null);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar según el rol (Admin ve todos, Operario ve sus en_proceso/completados)
  const visibleOrders = filteredOrders.filter(o => {
    if (user?.role === 'admin') return true;
    if (o.productionStatus === 'pending') return true;
    if (o.productionUser === user?.name) return true;
    return false;
  });

  return (
    <div className="page-content animate-fade-in" style={{ position: 'relative' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory size={28} color="var(--primary)" />
            Tablero de Producción (En Vivo)
          </h1>
          <p className="subtitle">Gestiona el flujo de trabajo sincronizado con WooCommerce</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <div className="search-bar" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar pedido..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{
              padding: '10px 10px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)', color: 'white', outline: 'none'
            }} />
          </div>
          <button onClick={loadOrders} disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Sincronizar
          </button>
        </div>
      </header>

      {error ? (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', borderRadius: '12px', border: '1px solid var(--accent-danger)' }}>
          {error}
        </div>
      ) : (
        <div className="kanban-board" style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '20px', minHeight: '600px' }}>
          {columns.map(col => {
            const Icon = col.icon;
            const colOrders = visibleOrders.filter(o => o.productionStatus === col.id);
            
            return (
              <div key={col.id} className="kanban-column" style={{ flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="column-header glass-surface" style={{ padding: '16px', borderRadius: '12px', borderTop: `4px solid ${col.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    <Icon size={18} color={col.color} />
                    {col.title}
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {colOrders.length}
                  </div>
                </div>

                <div className="column-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {isLoading && colOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>Cargando...</div>
                  ) : (
                    colOrders.map(order => (
                      <div key={order.rawId} className="kanban-card glass-panel" style={{ padding: '16px', transition: 'transform 0.2s ease', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: col.color }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: 'white' }}>{order.id}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.date}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '12px' }}>{order.customer}</div>
                        
                        {/* Assignment Info */}
                        {order.productionUser && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', padding: '8px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                              <User size={14} color="var(--primary)" /> {order.productionUser}
                            </div>
                            {col.id === 'in_progress' && order.productionStart && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--accent-warning)', fontWeight: '600' }}>
                                <Timer size={14} /> <ElapsedTimer startTime={order.productionStart} />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="materials-list" style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} /> Ítems a producir:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {order.materials.map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {col.id === 'pending' && (
                            <button onClick={() => handleStartProductionClick(order)} disabled={updatingId === order.rawId} style={btnStyle(col.color)}>
                              {updatingId === order.rawId ? 'Actualizando...' : 'Iniciar Producción'}
                            </button>
                          )}
                          {col.id === 'in_progress' && (
                            <button onClick={() => handleCompleteProduction(order)} disabled={updatingId === order.rawId} style={btnStyle(col.color)}>
                              {updatingId === order.rawId ? 'Actualizando...' : 'Marcar Terminado'}
                            </button>
                          )}
                          {col.id === 'completed' && (
                            <div style={{ width: '100%', textAlign: 'center', fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                              Listo para logística
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {showModal && selectedOrderForStart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <Factory size={40} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: '8px' }}>Iniciar Producción</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Estás a punto de iniciar la producción del pedido <strong>{selectedOrderForStart.id}</strong>. 
              <br/><br/>
              Será asignado al operario actual: <strong style={{ color: 'white' }}>{user.name}</strong>.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmStartProduction} className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                Confirmar Inicio
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const btnStyle = (color) => ({
  width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${color}`,
  color: color, borderRadius: '6px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s'
});

export default ProductionBoard;
