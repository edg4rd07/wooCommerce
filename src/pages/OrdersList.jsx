import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Edit, Eye, Store, User, Globe, Truck, ArrowRight, RefreshCw, AlertCircle, X, MapPin, Phone, Package, CreditCard, Mail, CheckCircle, Calendar, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchOrders, getWcConfig, updateOrderStatus, fetchCustomStatuses } from '../services/api';

const WC_STATUSES = [
  { value: 'pending',    label: 'Pendiente',    color: '#94a3b8' },
  { value: 'processing', label: 'Procesando',   color: '#6366f1' },
  { value: 'on-hold',   label: 'En Espera',     color: '#f59e0b' },
  { value: 'completed', label: 'Completado',    color: '#10b981' },
  { value: 'cancelled', label: 'Cancelado',     color: '#ef4444' },
  { value: 'refunded',  label: 'Reembolsado',   color: '#8b5cf6' },
  { value: 'failed',    label: 'Fallido',       color: '#dc2626' },
];

const OrdersList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialFilter = queryParams.get('filter') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(initialFilter);

  const [orders, setOrders] = useState([]);
  const [customStatuses, setCustomStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingStatus, setEditingStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get('filter');
    if (filter) setFilterType(filter);
  }, [location.search]);

  const loadOrders = async () => {
    const config = await getWcConfig();
    if (!config) {
      setError('No hay credenciales API. Ve a Conexión API.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [realOrders, dbCustomStatuses] = await Promise.all([
        fetchOrders(),
        fetchCustomStatuses()
      ]);
      setOrders(realOrders);
      setCustomStatuses(Array.isArray(dbCustomStatuses) ? dbCustomStatuses : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const allStatuses = [...WC_STATUSES, ...customStatuses];

  const openView = (order) => {
    setSelectedOrder(order);
    setEditMode(false);
    setSaveSuccess(false);
    setEditingStatus(order.status);
  };

  const openEdit = (order) => {
    setSelectedOrder(order);
    setEditMode(true);
    setSaveSuccess(false);
    setEditingStatus(order.status);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setEditMode(false);
    setSaveSuccess(false);
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder || editingStatus === selectedOrder.status) return;
    setIsSaving(true);
    try {
      await updateOrderStatus(selectedOrder.rawId, editingStatus);
      // Update order in local state immediately
      setOrders(prev => prev.map(o =>
        o.rawId === selectedOrder.rawId ? { ...o, status: editingStatus } : o
      ));
      setSelectedOrder(prev => ({ ...prev, status: editingStatus }));
      setSaveSuccess(true);
      setEditMode(false);
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusMeta = (status) => {
    return allStatuses.find(s => s.value === status) || { label: status, color: '#94a3b8' };
  };

  const getStatusBadge = (status) => {
    const meta = getStatusMeta(status);
    return (
      <span style={{
        ...badgeStyle,
        background: `${meta.color}20`,
        color: meta.color,
        border: `1px solid ${meta.color}40`
      }}>
        {meta.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    if (type === 'web') return <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}><Globe size={14} /> Online</span>;
    if (type === 'pos') return <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--secondary)' }}><Store size={14} /> POS Tienda</span>;
  };

  const filteredOrders = orders
    .filter(o => {
      if (filterType === 'delivery') return o.requiresDelivery;
      return filterType === 'all' || o.type === filterType;
    })
    .filter(o =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="page-content animate-fade-in">
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={28} color="var(--primary)" />
            Lista General de Pedidos
          </h1>
          <p className="subtitle">Visualiza y gestiona los pedidos directamente desde WooCommerce</p>
        </div>
        <div className="header-actions">
          <button onClick={loadOrders} disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      </header>

      {/* Filtros rápidos */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Todos', count: orders.length },
          { id: 'web', label: 'Online (Web)', count: orders.filter(o => o.type === 'web').length },
          { id: 'pos', label: 'POS (Tienda)', count: orders.filter(o => o.type === 'pos').length },
          { id: 'delivery', label: 'Con Envío', count: orders.filter(o => o.requiresDelivery).length },
        ].map(f => (
          <div
            key={f.id}
            onClick={() => { setFilterType(f.id); navigate(f.id === 'all' ? '/orders' : `/orders?filter=${f.id}`); }}
            className={`filter-card ${filterType === f.id ? 'active' : ''}`}
          >
            <h3>{f.label}</h3>
            <div className="val">{f.count}</div>
          </div>
        ))}
      </div>

      {/* Estado por WooCommerce */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {allStatuses.map(s => {
          const count = orders.filter(o => o.status === s.value).length;
          if (count === 0) return null;
          return (
            <div key={s.value} style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600',
              background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}35`,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              {s.label}: {count}
            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por cliente o ID de pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'white', outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={thStyle}>ID Pedido</th>
                <th style={thStyle}>Canal</th>
                <th style={thStyle}>Estado WooCommerce</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Logística</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
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
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: 'white' }}>
                    <div>{order.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{order.date}</div>
                  </td>
                  <td style={tdStyle}>{getTypeBadge(order.type)}</td>
                  <td style={tdStyle}>{getStatusBadge(order.status)}</td>
                  <td style={tdStyle}>{order.customer}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{order.total}</td>
                  <td style={tdStyle}>
                    {order.requiresDelivery ? (
                      <button onClick={() => navigate('/delivery')} style={{
                        background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)',
                        padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <Truck size={14} /> Ver Envío <ArrowRight size={12} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recoge en tienda</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button onClick={() => openView(order)} style={actionBtnStyle} title="Ver Detalles">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => openEdit(order)} style={{ ...actionBtnStyle, color: 'var(--primary)' }} title="Editar Estado">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle / Edición */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '5vh', zIndex: 1000, overflowY: 'auto'
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
              width: '90%', maxWidth: '620px', borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', marginBottom: '5vh'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
                  {editMode ? '✏️ Editar Pedido ' : ''}{selectedOrder.id}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedOrder.date} • {getTypeBadge(selectedOrder.type)}
                </div>
              </div>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>

            {/* Status Editor (Edit Mode) */}
            {editMode && (
              <div style={{ padding: '20px 24px', background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>
                  Estado actual del pedido en WooCommerce
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={editingStatus}
                    onChange={e => setEditingStatus(e.target.value)}
                    style={{
                      flex: 1, minWidth: '200px', padding: '12px 16px',
                      background: 'var(--bg-main)', border: '2px solid var(--primary)',
                      color: 'white', borderRadius: '8px', outline: 'none',
                      fontFamily: 'inherit', fontSize: '0.95rem'
                    }}
                  >
                    {allStatuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveStatus}
                    disabled={isSaving || editingStatus === selectedOrder.status}
                    className="btn-primary"
                    style={{ padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (isSaving || editingStatus === selectedOrder.status) ? 0.6 : 1 }}
                  >
                    {isSaving ? <RefreshCw size={16} className="spin" /> : null}
                    {isSaving ? 'Guardando...' : 'Guardar en WooCommerce'}
                  </button>
                </div>
                {editingStatus !== selectedOrder.status && (
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--accent-warning)' }}>
                    Cambiarás el estado de <strong>{getStatusMeta(selectedOrder.status).label}</strong> → <strong>{getStatusMeta(editingStatus).label}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Success banner */}
            {saveSuccess && (
              <div style={{ padding: '12px 24px', background: 'rgba(16,185,129,0.1)', borderBottom: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-success)' }}>
                <CheckCircle size={18} /> Estado actualizado correctamente en WooCommerce
              </div>
            )}

            {/* Body */}
            <div style={{ padding: '24px', maxHeight: '55vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

                <div className="glass-panel" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} /> Cliente
                  </h3>
                  <div style={{ fontWeight: '500', marginBottom: '6px' }}>{selectedOrder.customer}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {selectedOrder.email}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}><Phone size={12} /> {selectedOrder.phone}</div>
                </div>

                <div className="glass-panel" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} /> Entrega & Pago
                  </h3>
                  <div style={{ fontSize: '0.82rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {selectedOrder.address}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><CreditCard size={12} /> {selectedOrder.paymentMethod}</div>
                  
                  {selectedOrder.deliveryDateTime && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 'bold' }}>
                      <Calendar size={14} /> Fecha de Entrega: {selectedOrder.deliveryDateTime}
                    </div>
                  )}

                  <div>{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              {selectedOrder.customerNote && (
                <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: '20px', borderLeft: '3px solid var(--primary)' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare size={16} /> Nota del Pedido
                  </h3>
                  <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-main)' }}>
                    "{selectedOrder.customerNote}"
                  </div>
                </div>
              )}

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

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!editMode ? (
                <button
                  onClick={() => { setEditMode(true); setSaveSuccess(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  <Edit size={16} /> Editar Estado
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(false)}
                  style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              )}
              <button onClick={closeModal} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '6px' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background: var(--bg-surface); }
        .filter-card {
          flex: 1; min-width: 120px; padding: 16px; background: var(--bg-surface);
          border: 1px solid var(--border-color); border-radius: 12px; cursor: pointer; transition: all 0.2s;
        }
        .filter-card:hover { transform: translateY(-3px); }
        .filter-card.active { border-color: var(--primary); background: rgba(99,102,241,0.1); }
        .filter-card h3 { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; }
        .filter-card .val { font-size: 1.5rem; font-weight: bold; color: white; }
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
