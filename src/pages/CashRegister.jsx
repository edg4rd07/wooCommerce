import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Landmark, Banknote, Calendar, Receipt, ChevronDown, ChevronUp, History, Info } from 'lucide-react';
import { fetchOrders, fetchCreditPayments, getWcConfig } from '../services/api';

const CashRegister = () => {
  const [sales, setSales] = useState({ cash: 0, card: 0, transfer: 0, creditGiven: 0 });
  const [abonos, setAbonos] = useState({ cash: 0, card: 0, transfer: 0, list: [] });
  const [ordersList, setOrdersList] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Date selection state (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadClosure();
  }, [selectedDate]);

  const loadClosure = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config = await getWcConfig();
      if (!config) throw new Error("API no configurada");

      const [allOrders, creditPayments] = await Promise.all([
        fetchOrders({ perPage: 100 }), 
        fetchCreditPayments()
      ]);

      const targetDateObj = new Date(`${selectedDate}T12:00:00Z`); // use noon to avoid timezone shifts
      const isTargetDate = (dateString) => {
        const d = targetDateObj.getDate().toString().padStart(2, '0');
        const m = (targetDateObj.getMonth() + 1).toString().padStart(2, '0');
        const y = targetDateObj.getFullYear();
        return dateString.includes(`${d}/${m}`) || dateString.includes(`${d}-${m}`) || dateString.includes(`${y}-${m}-${d}`);
      };

      const targetIso = selectedDate;

      let s = { cash: 0, card: 0, transfer: 0, creditGiven: 0 };
      let a = { cash: 0, card: 0, transfer: 0, list: [] };
      let oList = [];

      // 1. Calculate Target Date's Sales
      allOrders.forEach(order => {
        if (isTargetDate(order.date)) {
          s.cash += order.paymentSplits?.cash || 0;
          s.card += order.paymentSplits?.card || 0;
          s.transfer += order.paymentSplits?.transfer || 0;
          s.creditGiven += order.paymentSplits?.credit || 0;
          oList.push({ ...order, closureType: 'sale' });
        }
      });

      // 2. Calculate Target Date's Credit Payments (Abonos)
      creditPayments.forEach(p => {
        if (p.date && p.date.startsWith(targetIso)) {
          if (p.method === 'Efectivo') a.cash += p.amount;
          if (p.method === 'Tarjeta') a.card += p.amount;
          if (p.method === 'Transferencia') a.transfer += p.amount;
          
          a.list.push(p);
          oList.push({ 
            id: `Abono de Pedido #${p.orderId}`,
            customer: p.customerName || 'Cliente',
            closureType: 'abono',
            paymentMethod: p.method,
            totalAmount: p.amount,
            date: new Date(p.date).toLocaleString()
          });
        }
      });

      setSales(s);
      setAbonos(a);
      setOrdersList(oList);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalCash = sales.cash + abonos.cash;
  const totalCard = sales.card + abonos.card;
  const totalTransfer = sales.transfer + abonos.transfer;
  
  const grandTotal = totalCash + totalCard + totalTransfer;

  return (
    <div className="page-content animate-fade-in" style={{ paddingBottom: '80px' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Landmark size={28} color="var(--primary)" />
            Corte de Caja Diario
          </h1>
          <p className="subtitle">Resumen de ventas y cobranza por fecha</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <Calendar size={20} color="var(--text-muted)" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'white', 
              fontSize: '1rem', 
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </header>

      {isLoading ? (
        <div style={{ textAlign: 'center', marginTop: '20vh', color: 'var(--text-muted)' }}>Cargando datos...</div>
      ) : error ? (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-danger)', padding: '20px', borderRadius: '12px' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Grand Total */}
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(236,72,153,0.1))' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Gran Total (Ingreso Real)</h2>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white' }}>
              ${grandTotal.toFixed(2)}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              No incluye créditos otorgados, sí incluye créditos pagados en la fecha seleccionada.
            </p>
          </div>

          {/* Splits */}
          <div className="stats-grid">
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <Banknote size={18} color="#10b981" /> Efectivo en Caja
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>${totalCash.toFixed(2)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Ventas: ${sales.cash.toFixed(2)} | Abonos: ${abonos.cash.toFixed(2)}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <CreditCard size={18} color="#6366f1" /> Pagos con Tarjeta
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>${totalCard.toFixed(2)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Ventas: ${sales.card.toFixed(2)} | Abonos: ${abonos.card.toFixed(2)}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <DollarSign size={18} color="#f59e0b" /> Transferencias
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>${totalTransfer.toFixed(2)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Ventas: ${sales.transfer.toFixed(2)} | Abonos: ${abonos.transfer.toFixed(2)}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444', opacity: 0.8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                <History size={18} color="#ef4444" /> Crédito Otorgado (Por Cobrar)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>${sales.creditGiven.toFixed(2)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Solo ventas de hoy a crédito.
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowDetails(!showDetails)}
            >
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} /> Desglose de Movimientos
              </h3>
              <button style={{ background: 'none', border: 'none', color: 'white' }}>
                {showDetails ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>

            {showDetails && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ordersList.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No hay movimientos hoy.</div>
                ) : (
                  ordersList.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        background: item.closureType === 'abono' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-main)',
                        borderLeft: item.closureType === 'abono' ? '3px solid #10b981' : '3px solid var(--primary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item.id}
                          {item.closureType === 'abono' && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#10b981', borderRadius: '4px', color: 'white' }}>ABONO RECIBIDO</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.customer} • {item.date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: item.closureType === 'abono' ? '#10b981' : 'white' }}>
                          ${(item.totalAmount || parseFloat(item.total?.replace('$','')) || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {item.paymentMethod}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
};

export default CashRegister;
