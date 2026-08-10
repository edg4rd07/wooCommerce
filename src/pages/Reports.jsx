import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Calendar, Filter, Clock } from 'lucide-react';
import { fetchLogs } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('today'); // today, yesterday, week, month, custom
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchLogs();
    // sort newest first
    const sorted = data.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
    setLogs(sorted);
    setIsLoading(false);
  };

  const filteredLogs = useMemo(() => {
    const now = new Date();

    return logs.filter(log => {
      const logDate = new Date(log.endTime);

      switch (filterType) {
        case 'today':
          return logDate.toDateString() === now.toDateString();
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          return logDate.toDateString() === yesterday.toDateString();
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return logDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return logDate >= monthAgo;
        case 'custom':
          if (!customRange.start || !customRange.end) return true;
          const s = new Date(customRange.start);
          s.setHours(0, 0, 0, 0);
          const e = new Date(customRange.end);
          e.setHours(23, 59, 59, 999);
          return logDate >= s && logDate <= e;
        default:
          return true; // all
      }
    });
  }, [logs, filterType, customRange]);

  const formatDuration = (minutes) => {
    if (isNaN(minutes)) return '-';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Reporte de Producción - Flor & Fresa', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    let filterText = '';
    switch (filterType) {
      case 'today': filterText = 'Hoy'; break;
      case 'yesterday': filterText = 'Ayer'; break;
      case 'week': filterText = 'Últimos 7 días'; break;
      case 'month': filterText = 'Último mes'; break;
      case 'custom': filterText = `Desde ${customRange.start} hasta ${customRange.end}`; break;
      default: filterText = 'Todos los registros';
    }
    doc.text(`Filtro aplicado: ${filterText} | Total: ${filteredLogs.length} pedidos`, 14, 30);

    const tableColumn = ["Pedido", "Cliente", "Responsable", "Inicio", "Fin", "Tiempo Total"];
    const tableRows = [];

    filteredLogs.forEach(log => {
      const rowData = [
        log.orderId || '-',
        log.customer || '-',
        log.user || '-',
        formatDate(log.startTime),
        formatDate(log.endTime),
        formatDuration(log.elapsedMinutes)
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241] } // var(--primary)
    });

    doc.save(`Reporte_Produccion_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="page-content animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} color="var(--primary)" />
            Reportes e Historial
          </h1>
          <p className="subtitle">Visualiza y exporta los registros de producción terminada</p>
        </div>
        <div className="header-actions">
          <button onClick={exportPDF} disabled={filteredLogs.length === 0} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}>
            <Download size={18} />
            Exportar a PDF
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          <Filter size={18} /> <strong>Filtrar por Fecha:</strong>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'yesterday', label: 'Ayer' },
            { id: 'week', label: 'Esta Semana' },
            { id: 'month', label: 'Este Mes' },
            { id: 'custom', label: 'Rango Personalizado' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${filterType === f.id ? 'var(--primary)' : 'var(--border-color)'}`,
                background: filterType === f.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: filterType === f.id ? 'var(--primary)' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: filterType === f.id ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filterType === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-main)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} style={dateInputStyle} />
              <span>hasta</span>
              <input type="date" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} style={dateInputStyle} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={thStyle}>Pedido</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Operario</th>
                <th style={thStyle}>Inicio</th>
                <th style={thStyle}>Fin</th>
                <th style={thStyle}>Duración</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay registros para las fechas seleccionadas.</td></tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                    <td style={tdStyle}><strong>{log.orderId}</strong></td>
                    <td style={tdStyle}>{log.customer}</td>
                    <td style={tdStyle}>{log.user}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(log.startTime)}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(log.endTime)}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>
                        <Clock size={14} /> {formatDuration(log.elapsedMinutes)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

const dateInputStyle = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  cursor: 'pointer'
};

const thStyle = { padding: '16px', fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.9rem' };
const tdStyle = { padding: '16px', verticalAlign: 'middle' };

export default Reports;
