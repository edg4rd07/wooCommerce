import React, { useState, useEffect } from 'react';
import { Server, Key, Link as LinkIcon, CheckCircle, XCircle, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { getWcConfig, saveApiSettings } from '../services/api';

const ConnectionSettings = () => {
  const [formData, setFormData] = useState({
    storeUrl: '',
    consumerKey: '',
    consumerSecret: ''
  });

  const [status, setStatus] = useState({
    testing: false,
    success: null,
    message: ''
  });

  // Load from backend on mount
  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await getWcConfig();
      if (savedConfig) {
        setFormData(savedConfig);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset status when user changes inputs
    setStatus({ testing: false, success: null, message: '' });
  };

  const saveConfig = async () => {
    // Basic validation
    let url = formData.storeUrl.trim();
    if (url && !url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    const finalData = { ...formData, storeUrl: url };
    await saveApiSettings(finalData);
    setFormData(finalData);
    return finalData;
  };

  const handleTestConnection = async () => {
    const config = await saveConfig();
    
    if (!config.storeUrl || !config.consumerKey || !config.consumerSecret) {
      setStatus({ testing: false, success: false, message: 'Por favor, llena todos los campos antes de probar.' });
      return;
    }

    setStatus({ testing: true, success: null, message: 'Conectando a WooCommerce...' });

    try {
      // Usamos el endpoint de orders con page=1 para validar auth
      const authHeader = btoa(`${config.consumerKey}:${config.consumerSecret}`);
      const endpoint = `${config.storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/orders?per_page=1`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setStatus({ testing: false, success: true, message: '¡Conexión Exitosa! Credenciales válidas.' });
      } else {
        const errData = await response.json();
        setStatus({ testing: false, success: false, message: `Error ${response.status}: ${errData.message || 'Credenciales inválidas'}` });
      }
    } catch (error) {
      setStatus({ 
        testing: false, 
        success: false, 
        message: 'Error de red o CORS. Asegúrate de que la URL sea correcta y soporte peticiones HTTPS.' 
      });
    }
  };

  return (
    <div className="page-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={28} color="var(--primary)" />
            Conexión con WooCommerce
          </h1>
          <p className="subtitle">Configura el acceso a tu tienda para sincronizar datos en tiempo real</p>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        
        {/* Banner de Advertencia/Info */}
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <AlertTriangle color="var(--accent-info)" size={24} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
            <strong>Instrucciones:</strong> Ve a tu panel de WordPress &gt; WooCommerce &gt; Ajustes &gt; Avanzado &gt; API REST. 
            Crea una clave con permisos de <strong>Lectura/Escritura</strong> y pega los datos aquí.
            <em> Los datos se guardarán de forma segura en la base de datos interna.</em>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={labelStyle}><LinkIcon size={16} /> URL de la Tienda</label>
          <input 
            type="text" name="storeUrl"
            placeholder="ejemplo: https://mitienda.com" 
            value={formData.storeUrl} onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
            <label style={labelStyle}><Key size={16} /> Consumer Key (ck_...)</label>
            <input 
              type="password" name="consumerKey"
              placeholder="ck_xxxxxxxxxxxx" 
              value={formData.consumerKey} onChange={handleChange}
              style={inputStyle}
            />
          </div>
          
          <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
            <label style={labelStyle}><Key size={16} /> Consumer Secret (cs_...)</label>
            <input 
              type="password" name="consumerSecret"
              placeholder="cs_xxxxxxxxxxxx" 
              value={formData.consumerSecret} onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          
          {/* Status Message Area */}
          <div style={{ flex: 1, marginRight: '20px' }}>
            {status.message && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500',
                color: status.success ? 'var(--accent-success)' : 'var(--accent-danger)' 
              }}>
                {status.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
                {status.message}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={async () => { await saveConfig(); alert('Guardado en la base de datos interna'); }} 
              className="btn-action glass-surface" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
            >
              <Save size={18} /> Guardar
            </button>
            
            <button 
              onClick={handleTestConnection} 
              disabled={status.testing}
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', cursor: status.testing ? 'not-allowed' : 'pointer', opacity: status.testing ? 0.7 : 1 }}
            >
              <RefreshCw size={18} className={status.testing ? 'spin' : ''} /> 
              {status.testing ? 'Probando...' : 'Probar Conexión'}
            </button>
          </div>
        </div>

      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const labelStyle = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.9rem' };
const inputStyle = { width: '100%', padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '1rem', fontFamily: 'monospace' };

export default ConnectionSettings;
