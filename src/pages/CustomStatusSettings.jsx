import React, { useState, useEffect } from 'react';
import { Settings2, Plus, Trash2, Save, RefreshCw, AlertCircle, Tag, Palette } from 'lucide-react';
import { fetchCustomStatuses, saveCustomStatuses } from '../services/api';

const DEFAULT_COLORS = [
  '#94a3b8', '#6366f1', '#f59e0b', '#10b981', '#ef4444', 
  '#8b5cf6', '#ec4899', '#14b8a6', '#0ea5e9', '#eab308'
];

const CustomStatusSettings = () => {
  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    setIsLoading(true);
    const data = await fetchCustomStatuses();
    setStatuses(Array.isArray(data) ? data : []);
    setIsLoading(false);
  };

  const handleAddStatus = () => {
    setStatuses([...statuses, { value: '', label: 'Nuevo Estado', color: '#6366f1' }]);
    setSuccessMsg('');
  };

  const handleRemoveStatus = (index) => {
    const updated = [...statuses];
    updated.splice(index, 1);
    setStatuses(updated);
    setSuccessMsg('');
  };

  const handleChange = (index, field, value) => {
    const updated = [...statuses];
    
    // Ensure custom status values do NOT have 'wc-' prefix for the REST API
    if (field === 'value') {
       let val = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
       if (val.startsWith('wc-')) {
           val = val.substring(3);
       }
       updated[index][field] = val;
    } else {
       updated[index][field] = value;
    }
    
    setStatuses(updated);
    setSuccessMsg('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg('');
    
    // Validation
    const hasEmpty = statuses.some(s => !s.value || s.value === 'wc-' || !s.label);
    if (hasEmpty) {
      setError('Asegúrate de que todos los estados tengan un Identificador (slug) y un Nombre visible.');
      setIsSaving(false);
      return;
    }

    const saved = await saveCustomStatuses(statuses);
    if (saved) {
      setSuccessMsg('Estados guardados correctamente. Ahora aparecerán en tu lista de pedidos.');
    } else {
      setError('Hubo un error al guardar los estados.');
    }
    setIsSaving(false);
  };

  return (
    <div className="page-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings2 size={28} color="var(--primary)" />
            Estados Personalizados
          </h1>
          <p className="subtitle">Registra los estados de tu plugin de WooCommerce para que el sistema los detecte con colores</p>
        </div>
        <div className="header-actions">
          <button onClick={handleSave} disabled={isSaving || isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <Save size={18} />
            {isSaving ? 'Guardando...' : 'Guardar Estados'}
          </button>
        </div>
      </header>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} /> {successMsg}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <AlertCircle size={18} /> ¿Cómo funciona esto?
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
            Si instalaste un plugin en WooCommerce para crear estados nuevos (ej: "En Producción", "Listo para Enviar"), 
            necesitas registrarlos aquí para que el sistema los muestre correctamente en lugar del código técnico gris.
            <br/><br/>
            <strong>Identificador (Slug):</strong> Es el código interno que usa tu plugin SIN el prefijo wc-. Si tu plugin dice "wc-entregado", aquí solo pones <strong>entregado</strong>.<br/>
            <strong>Nombre Visible:</strong> Es el nombre que se mostrará en los botones y tablas de este sistema.
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px', display: 'block' }} />
            Cargando estados...
          </div>
        ) : (
          <div>
            {statuses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px', marginBottom: '20px' }}>
                No tienes estados personalizados configurados.
              </div>
            )}

            {statuses.map((status, index) => (
              <div key={index} style={{ 
                display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px', 
                background: 'var(--bg-main)', border: '1px solid var(--border-color)', 
                borderRadius: '12px', marginBottom: '16px', flexWrap: 'wrap'
              }}>
                
                <div style={{ flex: '1 1 200px' }}>
                  <label style={labelStyle}><Tag size={14} /> Identificador (Slug)</label>
                  <input 
                    type="text" 
                    value={status.value} 
                    onChange={(e) => handleChange(index, 'value', e.target.value)}
                    placeholder="ej: mi-estado"
                    style={inputStyle}
                  />
                </div>

                <div style={{ flex: '1 1 200px' }}>
                  <label style={labelStyle}><Tag size={14} /> Nombre Visible</label>
                  <input 
                    type="text" 
                    value={status.label} 
                    onChange={(e) => handleChange(index, 'label', e.target.value)}
                    placeholder="Mi Estado"
                    style={inputStyle}
                  />
                </div>

                <div style={{ flex: '0 1 auto' }}>
                  <label style={labelStyle}><Palette size={14} /> Color Base</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="color" 
                      value={status.color} 
                      onChange={(e) => handleChange(index, 'color', e.target.value)}
                      style={{ 
                        width: '42px', height: '42px', padding: '2px', 
                        background: 'var(--bg-surface)', border: '1px solid var(--border-color)', 
                        borderRadius: '8px', cursor: 'pointer' 
                      }}
                    />
                    <div style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600',
                      background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40`
                    }}>
                      {status.label || 'Vista Previa'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: '28px' }}>
                  <button 
                    onClick={() => handleRemoveStatus(index)}
                    style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
                    title="Eliminar Estado"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            <button 
              onClick={handleAddStatus} 
              style={{ 
                width: '100%', padding: '16px', background: 'transparent', border: '1px dashed var(--border-color)', 
                color: 'var(--text-main)', borderRadius: '12px', cursor: 'pointer', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', marginTop: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <Plus size={18} /> Agregar nuevo estado personalizado
            </button>
          </div>
        )}
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const labelStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '500' };
const inputStyle = {
  width: '100%', padding: '10px 14px', background: 'var(--bg-surface)', 
  border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px',
  outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem'
};

export default CustomStatusSettings;
