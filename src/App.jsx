import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Truck, Factory, Settings, LogOut, Users, FileText } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import UsersManagement from './pages/UsersManagement';
import Reports from './pages/Reports';
import DashboardAnalytics from './pages/DashboardAnalytics';
import MappingSettings from './pages/MappingSettings';
import ProductionBoard from './pages/ProductionBoard';
import DeliveryModule from './pages/DeliveryModule';
import OrdersList from './pages/OrdersList';
import ConnectionSettings from './pages/ConnectionSettings';
import CustomStatusSettings from './pages/CustomStatusSettings';
import './App.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  if (!user) return null;
  
  const isAdmin = user.role === 'admin';
  const isProd = user.role === 'production';
  const isDelivery = user.role === 'delivery';

  return (
    <aside className="sidebar glass-surface">
      <div className="logo-container">
        <div className="logo-icon"></div>
        <h2>ERP Dash</h2>
      </div>
      <nav className="nav-menu">
        {isAdmin && (
          <>
            <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link to="/orders" className={`nav-item ${location.pathname === '/orders' ? 'active' : ''}`}>
              <ShoppingCart size={20} />
              <span>Pedidos POS</span>
            </Link>
          </>
        )}
        
        {(isAdmin || isProd) && (
          <Link to="/production" className={`nav-item ${location.pathname === '/production' ? 'active' : ''}`}>
            <Factory size={20} />
            <span>Producción</span>
          </Link>
        )}

        {(isAdmin || isDelivery) && (
          <Link to="/delivery" className={`nav-item ${location.pathname === '/delivery' ? 'active' : ''}`}>
            <Truck size={20} />
            <span>Logística</span>
          </Link>
        )}

        {isAdmin && (
          <>
            <Link to="/users" className={`nav-item ${location.pathname === '/users' ? 'active' : ''}`}>
              <Users size={20} />
              <span>Usuarios y Accesos</span>
            </Link>
            <Link to="/reports" className={`nav-item ${location.pathname === '/reports' ? 'active' : ''}`}>
              <FileText size={20} />
              <span>Reportes e Historial</span>
            </Link>
            <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
              <Settings size={20} />
              <span>Mapeo Zapier</span>
            </Link>
            <div style={{ margin: '16px 0', borderTop: '1px solid var(--border-color)' }}></div>
            <Link to="/custom-status" className={`nav-item ${location.pathname === '/custom-status' ? 'active' : ''}`}>
              <Settings size={20} color="var(--primary)" />
              <span>Estados Custom</span>
            </Link>
            <Link to="/api-connection" className={`nav-item ${location.pathname === '/api-connection' ? 'active' : ''}`}>
              <Settings size={20} color="var(--accent-warning)" />
              <span style={{ color: 'var(--text-main)' }}>Conexión API</span>
            </Link>
          </>
        )}
      </nav>
      
      <div className="user-profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar">{user.name.substring(0, 2).toUpperCase()}</div>
          <div className="user-info">
            <span className="name">{user.name}</span>
            <span className="role">{user.id.toUpperCase()}</span>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }} title="Cerrar Sesión">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};

const AppContent = () => {
  const { user } = useAuth();
  
  return (
    <div className={user ? "app-layout" : "login-layout"}>
      <Sidebar />
      <main className={user ? "main-content" : ""}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardAnalytics />
            </ProtectedRoute>
          } />
          
          <Route path="/orders" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <OrdersList />
            </ProtectedRoute>
          } />
          
          <Route path="/production" element={
            <ProtectedRoute allowedRoles={['admin', 'production']}>
              <ProductionBoard />
            </ProtectedRoute>
          } />
          
          <Route path="/delivery" element={
            <ProtectedRoute allowedRoles={['admin', 'delivery']}>
              <DeliveryModule />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MappingSettings />
            </ProtectedRoute>
          } />
          
          <Route path="/api-connection" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ConnectionSettings />
            </ProtectedRoute>
          } />

          <Route path="/custom-status" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CustomStatusSettings />
            </ProtectedRoute>
          } />
          
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersManagement />
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
