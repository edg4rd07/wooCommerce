import React, { useState, useEffect } from 'react';
import { Settings, Database, Link as LinkIcon, RefreshCw, Save, CheckCircle, ChevronDown, User, Store } from 'lucide-react';
import { fetchPosMetadata, fetchOrders } from '../services/api';

const MappingSettings = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState('/wp-json/wc/v3/orders');
  const [isFetching, setIsFetching] = useState(false);
  const [fields, setFields] = useState([]);
  
  const [mappings, setMappings] = useState({});
  const [aliases, setAliases] = useState([]); // [{id: '15', name: 'Juan', type: 'cashier'}]
  const [isSaved, setIsSaved] = useState(false);
  
  const [posData, setPosData] = useState({ cashiers: {}, registers: {} });
  const [detectedIds, setDetectedIds] = useState({ cashiers: [], registers: [] });

  // Cargar configuraciones guardadas al iniciar
  useEffect(() => {
    const savedMappings = localStorage.getItem('erp_zapier_mappings');
    if (savedMappings && savedMappings !== 'null' && savedMappings !== 'undefined') {
      try {
        setMappings(JSON.parse(savedMappings) || {});
      } catch(e) { setMappings({}); }
    } else {
      // Default mappings
      setMappings({
        total_sales: 'total',
        customer_name: 'billing.first_name',
        order_status: 'status',
        pos_cashier: 'meta_data._yith_pos_cashier'
      });
    }

    try {
      const savedAliases = localStorage.getItem('erp_zapier_aliases');
      if (savedAliases) {
        const parsed = JSON.parse(savedAliases);
        if (Array.isArray(parsed)) setAliases(parsed.filter(Boolean));
      }
    } catch(e) {}

    // Intentar cargar IDs reales desde el servidor
    fetchPosMetadata().then(data => {
      if (data) {
        setPosData({
          cashiers: data.cashiers || {},
          registers: data.registers || {}
        });
      }
    });

    // Como respaldo 100% seguro, buscar IDs en los últimos 50 pedidos
    fetchOrders({ perPage: 50 }).then(orders => {
      const cSet = new Set();
      const sSet = new Set();
      orders.forEach(o => {
        if (o.rawCashierId) cSet.add(o.rawCashierId);
        if (o.rawStoreId) sSet.add(o.rawStoreId);
      });
      setDetectedIds({ cashiers: Array.from(cSet), registers: Array.from(sSet) });
    }).catch(() => {});
  }, []);

  const availableCashierIds = Array.from(new Set([...Object.keys(posData.cashiers), ...detectedIds.cashiers]));
  const availableStoreIds = Array.from(new Set([...Object.keys(posData.registers), ...detectedIds.registers]));

  const endpoints = [
    { value: '/wp-json/wc/v3/orders', label: 'WooCommerce Pedidos (Orders)' },
    { value: '/wp-json/wc/v3/products', label: 'WooCommerce Productos (Products)' },
    { value: '/wp-json/wc/v3/customers', label: 'WooCommerce Clientes (Customers)' }
  ];

  const dashboardMetrics = [
    { key: 'total_sales', label: 'Venta Total del Pedido' },
    { key: 'customer_name', label: 'Nombre del Cliente' },
    { key: 'order_status', label: 'Estado del Pedido' },
    { key: 'pos_cashier', label: 'Cajero YITH POS' },
    { key: 'pos_store', label: 'Sucursal YITH POS' },
    { key: 'payment_method_title', label: 'Método de Pago (WooCommerce)' },
    { key: '_yith_pos_register', label: 'ID Caja POS (YITH POS)' },
    { key: '_yith_receipt_number', label: 'Número Recibo POS (YITH POS)' }
  ];

  const handleFetchFields = () => {
    setIsFetching(true);
    // Simular llamada a la API
    setTimeout(() => {
      setFields([
        'id', 'status', 'currency', 'date_created', 'total', 'billing.first_name', 
        'billing.email', 'shipping.city', 'payment_method_title', 'line_items', 
        'meta_data._yith_pos_cashier', 'meta_data._yith_pos_register', 'meta_data._yith_receipt_number'
      ]);
      setIsFetching(false);
    }, 800);
  };

  const handleMappingChange = (metricKey, wooField) => {
    setMappings(prev => ({ ...prev, [metricKey]: wooField }));
    setIsSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('erp_zapier_mappings', JSON.stringify(mappings));
    localStorage.setItem('erp_zapier_aliases', JSON.stringify(aliases));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const addAlias = (type) => {
    setAliases([...aliases, { id: '', name: '', type }]);
    setIsSaved(false);
  };

  const updateAlias = (index, field, value) => {
    const newAliases = [...aliases];
    newAliases[index][field] = value;
    setAliases(newAliases);
    setIsSaved(false);
  };

  const removeAlias = (index) => {
    const newAliases = [...aliases];
    newAliases.splice(index, 1);
    setAliases(newAliases);
    setIsSaved(false);
  };

  return (
    <div className="page-content animate-fade-in">
      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={28} color="var(--primary)" />
            Mapeo de Datos API
          </h1>
          <p className="subtitle">Configura qué campos de WooCommerce alimentan los reportes del Dashboard</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isSaved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-success)', fontSize: '0.9rem', fontWeight: '500' }}>
              <CheckCircle size={16} /> Guardado
            </span>
          )}
          <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Save size={18} />
            Guardar Configuración
          </button>
        </div>
      </header>

      <div className="mapping-container glass-panel">
        <div className="mapping-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, marginRight: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>1. Selecciona el Endpoint de Origen</label>
            <div className="select-wrapper" style={{ position: 'relative' }}>
              <select 
                value={selectedEndpoint} 
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', background: 'var(--bg-surface)', 
                  border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px',
                  appearance: 'none', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem'
                }}
              >
                {endpoints.map(ep => (
                  <option key={ep.value} value={ep.value}>{ep.label}</option>
                ))}
              </select>
              <ChevronDown size={20} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>
          <button 
            onClick={handleFetchFields}
            style={{ 
              padding: '12px 24px', background: 'transparent', border: '1px solid var(--primary)', 
              color: 'var(--primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', 
              alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', fontWeight: '500'
            }}
          >
            <RefreshCw size={18} className={isFetching ? 'spin' : ''} />
            {isFetching ? 'Conectando...' : 'Obtener Campos (API)'}
          </button>
        </div>

        <div className="mapping-body" style={{ padding: '30px 20px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '8px' }}>2. Enlaza los campos (Drag & Drop o Selecciona)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Asigna los campos recibidos de WooCommerce a las métricas del sistema interno. 
            </p>
          </div>

          <div className="mapping-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dashboardMetrics.map(metric => (
              <div key={metric.key} className="mapping-row glass-surface" style={{ 
                display: 'flex', alignItems: 'center', padding: '16px', borderRadius: '12px', gap: '20px' 
              }}>
                <div className="metric-info" style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
                    <Database size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600' }}>{metric.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {metric.key}
                    </div>
                  </div>
                </div>

                <LinkIcon size={20} color="var(--text-muted)" style={{ opacity: 0.5 }} />

                <div className="woo-field-select" style={{ flex: '1' }}>
                  <div className="select-wrapper" style={{ position: 'relative' }}>
                    <select
                      value={(mappings && mappings[metric.key]) || ''}
                      onChange={(e) => handleMappingChange(metric.key, e.target.value)}
                      style={{
                        width: '100%', padding: '10px 16px', background: 'var(--bg-main)', 
                        border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px',
                        appearance: 'none', outline: 'none', cursor: 'pointer', fontFamily: 'monospace'
                      }}
                    >
                      <option value="">-- No enlazado --</option>
                      {fields.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  </div>
                </div>
                
                <div style={{ width: '30px', display: 'flex', justifyContent: 'center' }}>
                  {mappings && mappings[metric.key] ? (
                    <CheckCircle size={20} color="var(--accent-success)" />
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-warning)' }}></div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-main)' }}>3. Diccionario Manual (Alias)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Si YITH POS o WooCommerce te devuelven números de ID (ej. Cajero "15"), puedes bautizarlos aquí con su nombre real para que el Dashboard los reconozca automáticamente.
            </p>

            <div style={{ display: 'flex', gap: '24px' }}>
              {/* Cajeros */}
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><User size={16}/> Traducir Cajeros</h4>
                {aliases.map((alias, idx) => alias && alias.type === 'cashier' && (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {availableCashierIds.length > 0 ? (
                      <select value={alias.id} onChange={e => updateAlias(idx, 'id', e.target.value)} style={{flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'white', outline: 'none'}}>
                        <option value="">-- Selecciona ID --</option>
                        {availableCashierIds.map(id => (
                          <option key={id} value={id}>ID {id} {posData.cashiers[id] ? `(${posData.cashiers[id]})` : '(Encontrado en Ventas)'}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" placeholder="ID de Cajero (ej. 15)" value={alias.id} onChange={e => updateAlias(idx, 'id', e.target.value)} style={{flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'white'}} />
                    )}
                    <input type="text" placeholder="Nombre (ej. Juan)" value={alias.name} onChange={e => updateAlias(idx, 'name', e.target.value)} style={{flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'white'}} />
                    <button onClick={() => removeAlias(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>✖</button>
                  </div>
                ))}
                <button onClick={() => addAlias('cashier')} style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', width: '100%', marginTop: '8px' }}>
                  + Añadir Alias de Cajero
                </button>
              </div>

              {/* Sucursales */}
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><Store size={16}/> Traducir Sucursales</h4>
                {aliases.map((alias, idx) => alias && alias.type === 'store' && (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {availableStoreIds.length > 0 ? (
                      <select value={alias.id} onChange={e => updateAlias(idx, 'id', e.target.value)} style={{flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'white', outline: 'none'}}>
                        <option value="">-- Selecciona Caja --</option>
                        {availableStoreIds.map(id => (
                          <option key={id} value={id}>ID {id} {posData.registers[id] ? `(${posData.registers[id]})` : '(Encontrado en Ventas)'}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" placeholder="ID de Caja (ej. 3)" value={alias.id} onChange={e => updateAlias(idx, 'id', e.target.value)} style={{flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'white'}} />
                    )}
                    <input type="text" placeholder="Sucursal (ej. Norte)" value={alias.name} onChange={e => updateAlias(idx, 'name', e.target.value)} style={{flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'white'}} />
                    <button onClick={() => removeAlias(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>✖</button>
                  </div>
                ))}
                <button onClick={() => addAlias('store')} style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', width: '100%', marginTop: '8px' }}>
                  + Añadir Alias de Sucursal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .mapping-row {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .mapping-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border-color: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
};

export default MappingSettings;
