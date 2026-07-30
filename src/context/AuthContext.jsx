import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchProfiles } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [PROFILES, setProfiles] = useState({});

  const loadInitialData = async () => {
    // Intentar recuperar sesión guardada
    const storedUser = localStorage.getItem('erp_local_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    // Descargar perfiles desde backend
    const profilesFromDb = await fetchProfiles();
    setProfiles(profilesFromDb);
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const login = (profileId, pin) => {
    const profile = PROFILES[profileId];
    if (profile && profile.pin === pin) {
      // Remover PIN de la data de sesión por seguridad
      const { pin: _, ...userData } = profile;
      setUser(userData);
      localStorage.setItem('erp_local_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_local_user');
  };

  // refreshProfiles function to be used by UsersManagement to update the context without reloading
  const refreshProfiles = async () => {
    const profilesFromDb = await fetchProfiles();
    setProfiles(profilesFromDb);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, PROFILES, refreshProfiles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
