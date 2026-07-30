import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Edit, Eye, Store, User, Globe, Truck, ArrowRight, RefreshCw, AlertCircle, X, MapPin, Phone, Package, CreditCard, Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchOrders, getWcConfig } from '../services/api';

const OrdersList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const initialFilter = queryParams.get('filter') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(initialFilter);
  
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null); // Modal state

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter) setFilterType(filter);
  }, [location.search]);

  const loadOrders = async () => {
    if (!getWcConfig()) {
      setError("No hay credenciales API. Ve a Conexión API.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const realOrders = await fetchOrders();
      setOrders(realOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed': return <span style={{...badgeStyle, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)'}}>Completado</span>;
      case 'processing': return <span style={{...badgeStyle, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)'}}>Procesando</span>;
      case 'on-hold': return <span style={{...badgeStyle, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)'}}>En Espera</span>;
      default: return <span style={{...badgeStyle, background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-muted)'}}>{status}</span>;
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'web') return <span style={{display:'flex', alignItems:'center', gap:'4px', color:'var(--primary)'}}><Globe size={14}/> Online</span>;
    if (type === 'pos') return <span style={{display:'flex', alignItems:'center', gap:'4px', color:'var(--secondary)'}}><Store size={14}/> POS Tienda</span>;
  };

  const filteredOrders = orders.filter(o => {
    if (filterType === 'delivery') return o.requiresDelivery;
    return filterType === 'all' || o.type === filterType;
  });

  return (
    <div className="page-content animate-fade-in">
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={28} color="var(--primary)" />
            Lista General de Pedidos
          </h1>
          <p className="subtitle">Visualiza los pedidos reales directamente desde WooCommerce</p>
        </div>
        <div className="header-actions">
          <button onClick={loadOrders} disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      </header>

      {/* Tarjetas de Resumen Rápido (Clickables como Filtros) */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div onClick={() => { setFilterType('all'); navigate('/orders'); }} className={`filter-card ${filterType === 'all' ? 'active' : ''}`}>
          <h3>Todos</h3>
          <div className="val">{orders.length}</div>
        </div>
        <div onClick={() => { setFilterType('web'); navigate('/orders?filter=web'); }} className={`filter-card ${filterType === 'web' ? 'active' : ''}`}>
          <h3>Online (Web)</h3>
          <div className="val">{orders.filter(o => o.type === 'web').length}</div>
        </div>
        <div onClick={() => { setFilterType('pos'); navigate('/orders?filter=pos'); }} className={`filter-card ${filterType === 'pos' ? 'active' : ''}`}>
          <h3>POS (Tienda)</h3>
          <div className="val">{orders.filter(o => o.type === 'pos').length}</div>
        </div>
        <div onClick={() => { setFilterType('delivery'); navigate('/orders?filter=delivery'); }} className={`filter-card ${filterType === 'delivery' ? 'active' : ''}`}>
          <h3>Con Envío</h3>
          <div className="val">{orders.filter(o => o.requiresDelivery).length}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o ID de pedido..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px 12px 42px', borderRadius: '8px', 
                border: '1px solid var(--border-color)', background: 'var(--bg-main)', 
                color: 'white', outline: 'none', fontSize: '0.95rem'
              }} 
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={thStyle}>ID Pedido</th>
                <th style={thStyle}>Canal</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Logística</th>
                <th style={{...thStyle, textAlign: 'right'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px', display: 'block' }} />
                    Cargando pedidos desde WooCommerce...
                  </td>
                </tr>
              )}
              
              {!isLoading && error && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-danger)' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 16px', display: 'block' }} />
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No se encontraron pedidos.
                  </td>
                </tr>
              )}

              {!isLoading && !error && filteredOrders.map((order, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{...tdStyle, fontWeight: 'bold', color: 'white'}}>
                    <div>{order.id}</div>
                    <div style={{fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:'normal'}}>{order.date}</div>
                  </td>
                  <td style={tdStyle}>{getTypeBadge(order.type)}</td>
                  <td style={tdStyle}>{getStatusBadge(order.status)}</td>
                  <td style={tdStyle}>{order.customer}</td>
                  <td style={{...tdStyle, fontWeight: 'bold'}}>{order.total}</td>
                  
                  {/* Celda de Logística */}
                  <td style={tdStyle}>
                    {order.requiresDelivery ? (
                      <button onClick={() => navigate('/delivery')} style={{
                        background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)',
                        padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                      }} className="btn-logistics">
                        <Truck size={14} /> Ver Envío <ArrowRight size={12}/>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recoge en tienda</span>
                    )}
                  </td>

                  <td style={{...tdStyle, textAlign: 'right'}}>
                    <button onClick={() => setSelectedOrder(order)} style={actionBtnStyle} title="Ver Detalles"><Eye size={16} /></button>
                    <button style={actionBtnStyle} title="Editar"><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalles del Pedido */}
      {selectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setSelectedOrder(null)}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
            width: '90%', maxWidth: '600px', borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Pedido {selectedOrder.id}</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedOrder.date} • {getTypeBadge(selectedOrder.type)}</div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} /> Cliente
                  </h3>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{selectedOrder.customer}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12}/> {selectedOrder.email}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12}/> {selectedOrder.phone}</div>
                </div>

                <div className="glass-panel" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} /> Entrega & Pago
                  </h3>
                  <div style={{ fontSize: '0.85rem', marginBottom: '6px' }}><MapPin size={12}/> {selectedOrder.address}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={12}/> {selectedOrder.paymentMethod}</div>
                  <div style={{ marginTop: '8px' }}>{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} /> Productos ({selectedOrder.itemsDetail?.length || 0})
              </h3>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px' }}>
                {selectedOrder.itemsDetail && selectedOrder.itemsDetail.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < selectedOrder.itemsDetail.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{item.quantity}x</span>
                      {item.name}
                    </div>
                    <div style={{ fontWeight: '500' }}>${item.total}</div>
                  </div>
                ))}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', borderTop: '2px solid var(--border-color)', marginTop: '8px' }}>
                  <span style={{ fontWeight: 'bold' }}>Total</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.2rem' }}>{selectedOrder.total}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end' }}>
               <button onClick={() => setSelectedOrder(null)} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '6px' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background: var(--bg-surface); }
        .filter-card {
          flex: 1; padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-color);
          border-radius: 12px; cursor: pointer; transition: all 0.2s;
        }
        .filter-card:hover { transform: translateY(-3px); }
        .filter-card.active { border-color: var(--primary); background: rgba(99,102,241,0.1); }
        .filter-card h3 { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; }
        .filter-card .val { font-size: 1.5rem; font-weight: bold; color: white; }
        .btn-logistics:hover { background: var(--primary) !important; color: white !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const thStyle = { padding: '16px', fontWeight: '500', fontSize: '0.9rem' };
const tdStyle = { padding: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' };
const badgeStyle = { padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' };
const actionBtnStyle = { 
  background: 'transparent', border: 'none', color: 'var(--text-muted)', 
  cursor: 'pointer', padding: '6px', marginLeft: '8px', transition: 'color 0.2s' 
};

export default OrdersList;
