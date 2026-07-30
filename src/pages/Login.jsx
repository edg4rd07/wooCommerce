import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight } from 'lucide-react';
import './Login.css';

const Login = () => {
  const { login, PROFILES } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedProfile, setSelectedProfile] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Hacia dónde redirigir después de login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProfile || !pin) {
      setError('Selecciona un perfil e ingresa el PIN');
      return;
    }

    const success = login(selectedProfile, pin);
    if (success) {
      // Redirigir dependiendo del rol por defecto si van a '/' o de donde venían
      const user = PROFILES[selectedProfile];
      if (from === '/' || from === '/login') {
        if (user.role === 'production') navigate('/production');
        else if (user.role === 'delivery') navigate('/delivery');
        else navigate('/');
      } else {
        navigate(from);
      }
    } else {
      setError('PIN incorrecto. Intenta de nuevo.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-glass-card glass-surface">
        <div className="login-header">
          <div className="login-logo">
            <span role="img" aria-label="flower">🌸</span>
          </div>
          <h1>FLOR & FRESA</h1>
          <p>Dashboard Operativo</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label><User size={16} /> Perfil</label>
            <select 
              value={selectedProfile} 
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="glass-input"
            >
              <option value="">Selecciona tu perfil...</option>
              {Object.values(PROFILES).map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label><Lock size={16} /> PIN de Acceso</label>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingresa tu PIN" 
              className="glass-input"
              maxLength={4}
            />
          </div>

          <button type="submit" className="login-btn">
            Ingresar <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
