import React, { useState } from 'react';
import { Users, UserPlus, Save, Trash2, Edit2, Key, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveProfiles } from '../services/api';

const UsersManagement = () => {
  const { PROFILES, refreshProfiles } = useAuth();
  const [profilesList, setProfilesList] = useState(Object.values(PROFILES));
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: 'production',
    pin: ''
  });

  const [message, setMessage] = useState('');

  const handleEdit = (profile) => {
    setEditingId(profile.id);
    setFormData(profile);
    setMessage('');
  };

  const handleDelete = async (id) => {
    if(id === 'admin') {
      alert("No puedes eliminar al administrador principal.");
      return;
    }
    if(window.confirm('¿Estás seguro de eliminar este usuario?')) {
      const updatedProfiles = { ...PROFILES };
      delete updatedProfiles[id];
      
      const success = await saveProfiles(updatedProfiles);
      if (success) {
        await refreshProfiles();
        setProfilesList(Object.values(updatedProfiles));
        setMessage('Usuario eliminado correctamente.');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.id || !formData.name || !formData.pin) {
      setMessage('Por favor, llena todos los campos.');
      return;
    }

    const newId = formData.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Si estamos creando uno nuevo y el ID ya existe
    if (!editingId && PROFILES[newId]) {
      setMessage('Ya existe un usuario con ese ID corto.');
      return;
    }

    const updatedProfiles = { ...PROFILES };
    
    // Si cambió el ID durante la edición, borrar el viejo
    if (editingId && editingId !== newId) {
      delete updatedProfiles[editingId];
    }

    updatedProfiles[newId] = {
      ...formData,
      id: newId
    };

    const success = await saveProfiles(updatedProfiles);
    if (success) {
      await refreshProfiles();
      setProfilesList(Object.values(updatedProfiles));
      setEditingId(null);
      setFormData({ id: '', name: '', role: 'production', pin: '' });
      setMessage('Usuario guardado exitosamente.');
      
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error al guardar el usuario en la base de datos.');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ id: '', name: '', role: 'production', pin: '' });
    setMessage('');
  };

  return (
    <div className="page-content animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={28} color="var(--primary)" />
            Gestión de Usuarios
          </h1>
          <p className="subtitle">Administra los accesos y PINs del equipo</p>
        </div>
      </header>

      {message && (
        <div style={{ padding: '12px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(99,102,241,0.2)' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        
        {/* Tabla de Usuarios */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} /> Usuarios Registrados
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profilesList.map(profile => (
              <div key={profile.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: '600' }}>{profile.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={12}/> {profile.role}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Key size={12}/> PIN: {profile.pin}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(profile)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '6px' }}>
                    <Edit2 size={16} />
                  </button>
                  {profile.id !== 'admin' && (
                    <button onClick={() => handleDelete(profile.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '6px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="glass-panel" style={{ padding: '20px', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} /> {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>ID (Corto)</label>
              <input 
                type="text" 
                placeholder="ej. juan_p"
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
                disabled={editingId === 'admin'}
                style={inputStyle}
                required
              />
            </div>
            
            <div>
              <label style={labelStyle}>Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Ej. Juan Pérez"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Rol de Acceso</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                disabled={editingId === 'admin'}
                style={inputStyle}
              >
                <option value="production">Producción</option>
                <option value="delivery">Logística / Repartidor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>PIN de Ingreso</label>
              <input 
                type="text" 
                placeholder="4 dígitos numéricos"
                value={formData.pin}
                onChange={e => setFormData({...formData, pin: e.target.value})}
                maxLength={4}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                <Save size={16} /> {editingId ? 'Actualizar' : 'Guardar'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} style={{ padding: '10px 15px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' };
const inputStyle = { width: '100%', padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', outline: 'none' };

export default UsersManagement;
