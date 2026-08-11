import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Factory, Search, CheckCircle, Clock, Package, RefreshCw, User, Timer, Image as ImageIcon, Video, X, Maximize, Minimize, CalendarClock } from 'lucide-react';
import { fetchOrders, updateProductionItemStatus, getWcConfig, saveLog, checkManualAvailability } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CHECKLIST_SECTIONS } from './PrintChecklist';

const ElapsedTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!startTime) return;
    
    const calculateTime = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{elapsed || '00:00:00'}</span>;
};

const DeliveryCountdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!targetDate) return;
    
    const update = () => {
      const hasTime = targetDate.length > 10;
      let target = new Date(targetDate);
      
      if (!hasTime) {
         target.setHours(23, 59, 59);
      }
      
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();
      
      if (diffMs < 0) {
        setTimeLeft('Vencido');
        return;
      }
      
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (!hasTime) {
        if (diffDays === 0) setTimeLeft('Entrega Hoy');
        else if (diffDays === 1) setTimeLeft('Entrega Mañana');
        else setTimeLeft(`Faltan ${diffDays} días`);
      } else {
        if (diffDays > 0) setTimeLeft(`Faltan ${diffDays}d ${diffHours}h`);
        else if (diffHours > 0) setTimeLeft(`Faltan ${diffHours}h ${diffMinutes}m`);
        else setTimeLeft(`Faltan ${diffMinutes}m`);
      }
    };
    
    update();
    const int = setInterval(update, 60000);
    return () => clearInterval(int);
  }, [targetDate]);

  const color = timeLeft === 'Vencido' || (!timeLeft.includes('d') && timeLeft.includes('h') && parseInt(timeLeft.match(/\d+/)?.[0]) < 2) 
    ? 'var(--accent-danger)' 
    : 'var(--accent-warning)';

  return (
    <span style={{ color, fontWeight: 'bold' }}>
      {timeLeft} ({targetDate})
    </span>
  );
};

const ProductionItem = ({ item, order, user, isUpdating, handleStartProductionClick, handleOpenChecklist }) => {
  const [manual, setManual] = useState({ image: null, video: null });
  const [mediaModal, setMediaModal] = useState(null); // null, 'image', or 'video'
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (item.productionStatus === 'in_progress') {
      checkManualAvailability(item.productId).then(setManual);
    }
  }, [item.productionStatus, item.productId]);

  const isAssignedToOther = user.role !== 'admin' && item.productionUser && item.productionUser !== user.name;

  return (
    <>
      <div style={{ 
        background: 'var(--bg-surface)', padding: '12px', borderRadius: '6px', 
        borderLeft: `3px solid ${
          item.productionStatus === 'completed' ? 'var(--accent-success)' :
          item.productionStatus === 'in_progress' ? 'var(--primary)' : 'var(--accent-warning)'
        }` 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>ID: {item.productId}</span>
            {item.quantity}x {item.name}
          </div>
          
          {item.productionStatus === 'completed' && (
            <CheckCircle size={16} color="var(--accent-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
          )}
        </div>
        
        {item.productionStatus === 'in_progress' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', padding: '6px 8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-main)' }}>
              <User size={12} color="var(--primary)" /> {item.productionUser}
            </div>
            {item.productionStart && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent-warning)', fontWeight: '600' }}>
                <Timer size={12} /> <ElapsedTimer startTime={item.productionStart} />
              </div>
            )}
          </div>
        )}
        
        {item.productionStatus === 'completed' && item.productionUser && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={12} /> Producido por: {item.productionUser}
          </div>
        )}

        {item.productionStatus === 'in_progress' && !isAssignedToOther && (manual.image || manual.video) && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {manual.image && (
              <button onClick={() => setMediaModal('image')} style={btnStyle('var(--primary)', true)}>
                <ImageIcon size={14} /> Ver Manual
              </button>
            )}
            {manual.video && (
              <button onClick={() => setMediaModal('video')} style={btnStyle('var(--accent-warning)', true)}>
                <Video size={14} /> Ver Video
              </button>
            )}
          </div>
        )}

        {!isAssignedToOther && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {item.productionStatus === 'pending' && (
              <button onClick={() => handleStartProductionClick(order, item)} disabled={isUpdating} style={btnStyle('var(--accent-warning)')}>
                {isUpdating ? '...' : 'Iniciar Este Ítem'}
              </button>
            )}
            {item.productionStatus === 'in_progress' && (
              <button onClick={() => handleOpenChecklist(order, item)} disabled={isUpdating} style={btnStyle('var(--primary)')}>
                {isUpdating ? '...' : 'Terminar Ítem'}
              </button>
            )}
          </div>
        )}
      </div>

      {mediaModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: isFullscreen ? '0' : '40px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: isFullscreen ? '100%' : '1200px', height: isFullscreen ? '100%' : '85vh', background: 'var(--bg-main)', borderRadius: isFullscreen ? '0' : '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                {mediaModal === 'image' ? <ImageIcon size={24} color="var(--primary)"/> : <Video size={24} color="var(--accent-warning)"/>}
                {mediaModal === 'image' ? 'Manual del Producto' : 'Video Tutorial'}
              </h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button onClick={() => setIsFullscreen(!isFullscreen)} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                  <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{isFullscreen ? 'Reducir' : 'Pantalla Completa'}</span>
                </button>
                <button onClick={() => { setMediaModal(null); setIsFullscreen(false); }} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontWeight: 'bold' }}>
                  <X size={20} /> Cerrar
                </button>
              </div>
            </div>
            <div style={{ flex: 1, padding: isFullscreen ? '0' : '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#050505', overflow: 'hidden' }}>
              {mediaModal === 'image' ? (
                <img src={manual.image} alt="Manual" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <video src={manual.video} controls autoPlay style={{ width: '100%', maxHeight: '100%' }} />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const ProductionBoard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null); // Will now hold "orderId-itemId"
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDelivery, setSortByDelivery] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderForStart, setSelectedOrderForStart] = useState(null);
  const [checklistModal, setChecklistModal] = useState({ isOpen: false, order: null, item: null });
  const [checkedChecklistItems, setCheckedChecklistItems] = useState([]);

  const [columns] = useState([
    { id: 'pending', title: 'Pendientes por Fabricar', color: 'var(--accent-warning)', icon: Clock },
    { id: 'in_progress', title: 'En Producción', color: 'var(--primary)', icon: Factory },
    { id: 'completed', title: 'Listo para Envío', color: 'var(--accent-success)', icon: CheckCircle }
  ]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const config = await getWcConfig();
    if (!config) {
      setError("Faltan credenciales API.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const allOrders = await fetchOrders({ page: 1, perPage: 50 }); 
      // Solo mostramos pedidos que no estén cancelados ni reembolsados
      const activeOrders = allOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
      setOrders(activeOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteProduction = async (order, item) => {
    setUpdatingId(`${order.rawId}-${item.itemId}`);
    try {
      // 1. Calculate elapsed time
      const endTime = new Date().toISOString();
      const startTime = item.productionStart || new Date().toISOString();
      
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      const diffMs = Math.max(0, endMs - startMs);
      const diffMinutes = Math.floor(diffMs / 60000);
      
      // 2. Save log
      await saveLog({
        type: 'production',
        orderId: order.id,
        rawOrderId: order.rawId,
        itemId: item.itemId,
        productId: item.productId,
        productName: item.name,
        customer: order.customer,
        user: item.productionUser || user.name,
        startTime: startTime,
        endTime: endTime,
        elapsedMinutes: diffMinutes
      });

      // 3. Update order item meta in WooCommerce
      await updateProductionItemStatus(order.rawId, item.itemId, {
        status: 'completed',
        user: item.productionUser,
        start: startTime
      });
      
      // 4. Update UI dynamically
      setOrders(prev => prev.map(o => {
        if (o.rawId === order.rawId) {
          const updatedItems = o.productionItems.map(i => 
            i.itemId === item.itemId ? { ...i, productionStatus: 'completed' } : i
          );
          
          // Re-calculate dynamic order status
          const totalItems = updatedItems.length;
          const completedCount = updatedItems.filter(i => i.productionStatus === 'completed').length;
          const inProgressCount = updatedItems.filter(i => i.productionStatus === 'in_progress').length;
          
          let dynamicProductionStatus = 'pending';
          if (totalItems > 0) {
            if (completedCount === totalItems) dynamicProductionStatus = 'completed';
            else if (inProgressCount > 0 || completedCount > 0) dynamicProductionStatus = 'in_progress';
          }
          
          return { ...o, productionItems: updatedItems, productionStatus: dynamicProductionStatus };
        }
        return o;
      }));
    } catch (err) {
      alert("Error terminando producción: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenChecklist = (order, item) => {
    setChecklistModal({ isOpen: true, order, item });
    setCheckedChecklistItems([]);
  };

  const handleFinalizeAndPrint = async () => {
    const { order, item } = checklistModal;
    const printData = {
      orderId: order.id,
      date: order.date,
      customer: order.customer,
      address: order.address,
      phone: order.phone,
      checkedItems: checkedChecklistItems
    };
    sessionStorage.setItem('print_checklist_data', JSON.stringify(printData));
    
    await handleCompleteProduction(order, item);
    window.open('/print-checklist', '_blank');
    setChecklistModal({ isOpen: false, order: null, item: null });
  };
  
  const toggleChecklistItem = (itemText) => {
    setCheckedChecklistItems(prev => 
      prev.includes(itemText) ? prev.filter(i => i !== itemText) : [...prev, itemText]
    );
  };

  const handleStartProductionClick = (order, item) => {
    setSelectedOrderForStart({ order, item });
    setShowModal(true);
  };

  const confirmStartProduction = async () => {
    if(!selectedOrderForStart) return;
    const { order, item } = selectedOrderForStart;
    
    setUpdatingId(`${order.rawId}-${item.itemId}`);
    setShowModal(false);
    
    try {
      const isoStart = new Date().toISOString();
      await updateProductionItemStatus(order.rawId, item.itemId, {
        status: 'in_progress',
        user: user.name,
        start: isoStart
      });
      
      setOrders(prev => prev.map(o => {
        if (o.rawId === order.rawId) {
          const updatedItems = o.productionItems.map(i => 
            i.itemId === item.itemId ? { 
              ...i, 
              productionStatus: 'in_progress', 
              productionUser: user.name, 
              productionStart: isoStart 
            } : i
          );
          return { ...o, productionItems: updatedItems, productionStatus: 'in_progress' };
        }
        return o;
      }));
    } catch (err) {
      alert("Error iniciando producción: " + err.message);
    } finally {
      setUpdatingId(null);
      setSelectedOrderForStart(null);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar según el rol (Admin ve todos, Operario ve sus en_proceso/completados)
  const visibleOrders = filteredOrders.filter(o => {
    if (user?.role === 'admin') return true;
    if (o.productionStatus === 'pending') return true;
    
    // Si la orden ya está en progreso, verificar si el operario tiene ALGÚN ítem asignado a él, o si hay ítems pendientes de tomar
    if (o.productionItems) {
      const hasMyItems = o.productionItems.some(i => i.productionUser === user?.name);
      const hasPendingItems = o.productionItems.some(i => i.productionStatus === 'pending');
      return hasMyItems || hasPendingItems;
    }
    return false;
  });

  let sortedOrders = visibleOrders;
  if (sortByDelivery) {
    sortedOrders = [...visibleOrders].sort((a, b) => {
      if (!a.deliveryDateTime && !b.deliveryDateTime) return 0;
      if (!a.deliveryDateTime) return 1;
      if (!b.deliveryDateTime) return -1;
      return new Date(a.deliveryDateTime).getTime() - new Date(b.deliveryDateTime).getTime();
    });
  }

  return (
    <div className="page-content animate-fade-in" style={{ position: 'relative' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Factory size={28} color="var(--primary)" />
            Tablero de Producción (En Vivo)
          </h1>
          <p className="subtitle">Gestiona el flujo de trabajo sincronizado con WooCommerce</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <div className="search-bar" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar pedido..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{
              padding: '10px 10px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)', color: 'white', outline: 'none'
            }} />
          </div>
          <button onClick={() => setSortByDelivery(!sortByDelivery)} className={sortByDelivery ? "btn-primary" : ""} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', background: sortByDelivery ? 'var(--primary)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer' }}>
            <CalendarClock size={18} />
            {sortByDelivery ? 'Ordenado por Entrega' : 'Ordenar por Entrega'}
          </button>
          <button onClick={loadOrders} disabled={isLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Sincronizar
          </button>
        </div>
      </header>

      {error ? (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', borderRadius: '12px', border: '1px solid var(--accent-danger)' }}>
          {error}
        </div>
      ) : (
        <div className="kanban-board" style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '20px', minHeight: '600px' }}>
          {columns.map(col => {
            const Icon = col.icon;
            const colOrders = sortedOrders.filter(o => o.productionStatus === col.id);
            
            return (
              <div key={col.id} className="kanban-column" style={{ flex: '1', minWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="column-header glass-surface" style={{ padding: '16px', borderRadius: '12px', borderTop: `4px solid ${col.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    <Icon size={18} color={col.color} />
                    {col.title}
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {colOrders.length}
                  </div>
                </div>

                <div className="column-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {isLoading && colOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>Cargando...</div>
                  ) : (
                    colOrders.map(order => (
                      <div key={order.rawId} className="kanban-card glass-panel" style={{ padding: '16px', transition: 'transform 0.2s ease', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: col.color }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: 'white' }}>{order.id}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.date}</span>
                        </div>
                        {order.deliveryDateTime && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '8px' }}>
                            <CalendarClock size={14} /> <DeliveryCountdown targetDate={order.deliveryDateTime} />
                          </div>
                        )}
                        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '12px' }}>{order.customer}</div>
                        
                        <div className="materials-list" style={{ background: 'var(--bg-main)', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.85rem', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <Package size={16} /> Ítems a producir:
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {order.productionItems && order.productionItems.map(item => (
                              <ProductionItem 
                                key={item.itemId}
                                item={item}
                                order={order}
                                user={user}
                                isUpdating={updatingId === `${order.rawId}-${item.itemId}`}
                                handleStartProductionClick={handleStartProductionClick}
                                handleOpenChecklist={handleOpenChecklist}
                              />
                            ))}
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {showModal && selectedOrderForStart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <Factory size={40} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: '8px' }}>Iniciar Producción</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Producirás el ítem: <br/>
              <strong style={{ color: 'white', display: 'block', margin: '8px 0' }}>{selectedOrderForStart.item.quantity}x {selectedOrderForStart.item.name}</strong>
              Del pedido <strong>{selectedOrderForStart.order.id}</strong>.
              <br/><br/>
              Este ítem será asignado al operario: <strong style={{ color: 'white' }}>{user.name}</strong>.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmStartProduction} className="btn-primary" style={{ flex: 1, padding: '12px' }}>
                Confirmar Inicio
              </button>
            </div>
          </div>
        </div>
      )}

      {checklistModal.isOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-main)', zIndex: 10 }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle color="var(--primary)" /> Checklist de Producción
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Pedido {checklistModal.order?.id} - {checklistModal.item?.name}
                </div>
              </div>
              <button onClick={() => setChecklistModal({ isOpen: false, order: null, item: null })} className="btn-action" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', width: 'auto', padding: '8px 16px' }}>
                Cancelar
              </button>
            </div>
            
            <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
              {CHECKLIST_SECTIONS.map((sec, idx) => (
                <div key={idx} style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: 'var(--primary)', margin: '0 0 15px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                    {sec.title}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sec.items.map((item, i) => {
                      const isChecked = checkedChecklistItems.includes(item);
                      return (
                        <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', lineHeight: '1.4' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleChecklistItem(item)}
                            style={{ marginTop: '3px', accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span style={{ color: isChecked ? 'white' : 'var(--text-muted)', transition: 'color 0.2s' }}>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '20px 30px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'var(--bg-main)', zIndex: 10 }}>
              <button onClick={handleFinalizeAndPrint} className="btn-action" style={{ background: 'var(--primary)', color: 'white', padding: '12px 24px', fontSize: '1rem', width: 'auto' }}>
                <Package size={18} /> Finalizar Producción e Imprimir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const btnStyle = (color, isSubtle = false) => ({
  width: '100%', padding: '6px', background: isSubtle ? `${color}20` : 'transparent', 
  border: `1px solid ${isSubtle ? 'transparent' : color}`,
  color: color, borderRadius: '6px', cursor: 'pointer', fontWeight: '500', 
  transition: 'all 0.2s', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
});

export default ProductionBoard;
