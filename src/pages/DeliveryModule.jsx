import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Phone, User, CheckCircle, Navigation, Clock, Package, RefreshCw, CreditCard, MessageCircle } from 'lucide-react';
import { fetchOrders, updateOrderMeta, getWcConfig } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DeliveryModule = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    if (!getWcConfig()) {
      setError("Faltan credenciales API.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const allOrders = await fetchOrders(1, 30);
      // Filtramos solo los pedidos que requieren envío físico
      const deliveryOrders = allOrders.filter(o => 
        o.requiresDelivery && o.status !== 'cancelled' && o.status !== 'refunded'
      );
      setDeliveries(deliveryOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRoute = async (rawId) => {
    setUpdatingId(rawId);
    try {
      await updateOrderMeta(rawId, 'derp_delivery_user', user.name);
      setDeliveries(prev => prev.map(o => o.rawId === rawId ? { ...o, deliveryUser: user.name } : o));
    } catch (err) {
      alert("Error asignando ruta: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendWhatsApp = (delivery) => {
    if (!delivery || !delivery.phone) return;
    
    const hasPlus = delivery.phone.trim().startsWith('+');
    let phoneClean = delivery.phone.replace(/\D/g, '');
    
    if (!hasPlus && phoneClean.length === 10) {
      // Ladas comunes de Estados Unidos en la frontera (El Paso, Las Cruces, etc)
      if (phoneClean.startsWith('915') || phoneClean.startsWith('575') || phoneClean.startsWith('830') || phoneClean.startsWith('956')) {
        phoneClean = '1' + phoneClean;
      } else {
        // Para 656 y el resto de México
        phoneClean = '52' + phoneClean;
      }
    }
    const message = encodeURIComponent(`Hola ${delivery.customer}! 🚚 Tu pedido de Flor y Fresa ya va en camino y está próximo a entregarse. ¡Gracias por tu preferencia!`);
    window.open(`https://wa.me/${phoneClean}?text=${message}`, '_blank');
  };

  const handleUpdateStatus = async (rawId, newStatus) => {
    setUpdatingId(rawId);
    try {
      await updateOrderMeta(rawId, 'derp_delivery_status', newStatus);
      // Si se entregó, opcionalmente podríamos cambiar el status general de WooCommerce a 'completed'
      // pero por ahora solo manejamos el estado logístico interno
      setDeliveries(prev => prev.map(o => o.rawId === rawId ? { ...o, deliveryStatus: newStatus } : o));
      
      // Enviar WhatsApp automático al iniciar ruta
      if (newStatus === 'en_route') {
        const delivery = deliveries.find(d => d.rawId === rawId);
        handleSendWhatsApp(delivery);
      }

    } catch (err) {
      alert("Error actualizando envío: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={28} color="var(--primary)" />
            Rutas de Entrega (En Vivo)
          </h1>
          <p className="subtitle">Panel de repartidor: Gestiona tus pedidos sincronizados</p>
        </div>
        <div className="header-actions">
          <button onClick={loadOrders} disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Sincronizar Rutas
          </button>
        </div>
      </header>

      {error ? (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', borderRadius: '12px', border: '1px solid var(--accent-danger)' }}>
          {error}
        </div>
      ) : (
        <div className="delivery-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isLoading && deliveries.length === 0 ? (
             <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Cargando rutas de WooCommerce...</div>
          ) : (() => {
            const visibleDeliveries = deliveries.filter(d => {
              if (user?.role === 'admin' || user?.role === 'delivery') return true;
              if (!d.deliveryUser) return true;
              if (d.deliveryUser === user?.name) return true;
              return false;
            });

            if (visibleDeliveries.length === 0) {
              return (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <h3>No tienes entregas pendientes</h3>
                  <p>No hay pedidos con envío pendiente en el sistema.</p>
                </div>
              );
            }

            return visibleDeliveries.map(delivery => (
              <div key={delivery.rawId} className="delivery-card glass-panel" style={{  
                overflow: 'hidden', 
                borderLeft: `4px solid ${
                  delivery.deliveryStatus === 'en_route' ? 'var(--accent-warning)' : 
                  delivery.deliveryStatus === 'delivered' ? 'var(--accent-success)' : 
                  'var(--primary)'
                }`
              }}>
                
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{delivery.id}</h2>
                      <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14}/> {delivery.customer}</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> {delivery.date}</span>
                        {delivery.deliveryUser && (
                          <>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}><Truck size={14}/> Asignado a: {delivery.deliveryUser}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                      background: delivery.deliveryStatus === 'en_route' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: delivery.deliveryStatus === 'en_route' ? 'var(--accent-warning)' : 'var(--primary)'
                    }}>
                      {delivery.deliveryStatus === 'pending' && 'Listo para Reparto'}
                      {delivery.deliveryStatus === 'en_route' && 'En Ruta'}
                      {delivery.deliveryStatus === 'delivered' && 'Entregado'}
                    </div>
                  </div>

                  <div className="glass-surface" style={{ padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                      <MapPin size={20} color="var(--secondary)" style={{ marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dirección de entrega</div>
                        <div style={{ fontWeight: '500' }}>{delivery.address}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <Phone size={20} color="var(--primary)" />
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Teléfono</div>
                        <div style={{ fontWeight: '500' }}>{delivery.phone}</div>
                      </div>
                    </div>
                    
                    {delivery.pendingAmount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <CreditCard size={20} color="var(--accent-danger)" />
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-danger)', fontWeight: 'bold' }}>Cobro a realizar:</div>
                          <div style={{ fontWeight: '700', color: 'var(--accent-danger)' }}>${delivery.pendingAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <Package size={20} color="var(--text-muted)" />
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contenido ({delivery.total})</div>
                        <div style={{ fontSize: '0.9rem' }}>{delivery.itemsDetail?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Sin productos'}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {delivery.deliveryStatus === 'pending' && !delivery.deliveryUser && (
                      <button onClick={() => handleAssignRoute(delivery.rawId)} disabled={updatingId === delivery.rawId} className="btn-action" style={{ background: 'var(--primary)', color: '#fff' }}>
                        <Truck size={18} /> {updatingId === delivery.rawId ? 'Asignando...' : 'Tomar Ruta'}
                      </button>
                    )}
                    {delivery.deliveryStatus === 'pending' && delivery.deliveryUser && (
                      <button onClick={() => handleUpdateStatus(delivery.rawId, 'en_route')} disabled={updatingId === delivery.rawId} className="btn-action" style={{ background: 'var(--accent-warning)', color: '#fff' }}>
                        <Navigation size={18} /> {updatingId === delivery.rawId ? 'Actualizando...' : 'Iniciar Ruta'}
                      </button>
                    )}
                    {delivery.deliveryStatus === 'en_route' && (
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button onClick={() => window.open(`https://maps.google.com/?q=${delivery.address}`, '_blank')} className="btn-action glass-surface" style={{ flex: 1, border: '1px solid var(--border-color)', color: 'white', padding: '10px 8px' }} title="Ver Mapa">
                          <MapPin size={18} />
                        </button>
                        <button onClick={() => handleSendWhatsApp(delivery)} className="btn-action glass-surface" style={{ flex: 1, border: '1px solid #10b981', color: '#10b981', padding: '10px 8px' }} title="Avisar por WhatsApp">
                          <MessageCircle size={18} />
                        </button>
                        <button onClick={() => handleUpdateStatus(delivery.rawId, 'delivered')} disabled={updatingId === delivery.rawId} className="btn-action" style={{ flex: 2, background: 'var(--accent-success)', color: '#fff', padding: '10px 8px' }}>
                          <CheckCircle size={18} /> {updatingId === delivery.rawId ? 'Actualizando...' : 'Entregado'}
                        </button>
                      </div>
                    )}
                    {delivery.deliveryStatus === 'delivered' && (
                      <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Este pedido ya fue entregado al cliente.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          })()}
        </div>
      )}
      <style>{`
        .btn-action {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px; border: none; border-radius: 8px; font-weight: 600;
          cursor: pointer; transition: transform 0.2s, opacity 0.2s;
        }
        .btn-action:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DeliveryModule;
