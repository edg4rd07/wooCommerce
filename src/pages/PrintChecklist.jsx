import React, { useEffect, useState } from 'react';
import { Clock, ClipboardList, Calendar } from 'lucide-react';
import './PrintChecklist.css';

export const CHECKLIST_SECTIONS = [
  {
    title: '1. INSPECCIÓN DEL ARREGLO',
    items: [
      'Flores frescas y sin daños.',
      'No hay pétalos marchitos.',
      'Se retiraron hojas dañadas.',
      'Buena forma y volumen.',
      'No hay espacios vacíos.',
      'Oasis hidratado.',
      'Base limpia.',
      'Moño limpio y firme.',
      'Papel o envoltura limpio y sin arrugas.',
      'Sin tallos visibles donde no deben.'
    ]
  },
  {
    title: '2. MENSAJE Y ACCESORIOS',
    items: [
      'Tarjeta con el mensaje correcta.',
      'Nombre del destinatario verificado.',
      'Globo (si aplica) correctamente inflado y sujeto.',
      'Chocolates, peluche o accesorios correctamente colocados.'
    ]
  },
  {
    title: '3. EMPAQUE',
    items: [
      'Arreglo protegido para transporte.',
      'Agua suficiente (si aplica).',
      'Bolsa protectora colocada.',
      'Etiqueta del pedido colocada.'
    ]
  },
  {
    title: '4. DATOS DE ENTREGA',
    items: [
      'Nombre del cliente.',
      'Nombre del destinatario.',
      'Dirección verificada.',
      'Teléfono verificado.',
      'Horario de entrega confirmado.'
    ]
  },
  {
    title: '5. REVISIÓN FINAL',
    items: [
      'Se tomó fotografía del arreglo terminado.',
      'El pedido coincide con la nota de venta.',
      'Autorizado para envío.'
    ]
  }
];

const PrintChecklist = () => {
  const [data, setData] = useState({
    orderId: '',
    date: '',
    customer: '',
    address: '',
    phone: '',
    checkedItems: []
  });

  useEffect(() => {
    const rawData = sessionStorage.getItem('print_checklist_data');
    if (rawData) {
      setData(JSON.parse(rawData));
    }
    // Lanza la impresión medio segundo después de renderizar para cargar estilos
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  return (
    <div className="print-page">
      <div className="print-header">
        <h2 className="brand-title">♡<br/>FLOR Y FRESA<br/><span>ESTUDIO FLORAL</span></h2>
        <h1>CHECKLIST DE ENVÍO</h1>
        <h3>♡ ARREGLO FLORAL LISTO PARA ENTREGA ♡</h3>
      </div>

      <div className="print-meta">
        <div className="meta-box">
          <Clock size={20} color="#e83e8c" />
          <div className="meta-text">
            <span>TIEMPO ESTIMADO</span>
            <strong>2 MINUTOS</strong>
          </div>
        </div>
        <div className="meta-box">
          <ClipboardList size={20} color="#e83e8c" />
          <div className="meta-text">
            <span>PEDIDO #:</span>
            <strong style={{borderBottom: '1px solid black', minWidth: '100px', display: 'inline-block'}}>{data.orderId}</strong>
          </div>
        </div>
        <div className="meta-box">
          <Calendar size={20} color="#e83e8c" />
          <div className="meta-text">
            <span>FECHA:</span>
            <strong style={{borderBottom: '1px solid black', minWidth: '120px', display: 'inline-block', textAlign: 'center'}}>{data.date || '___/___/___'}</strong>
          </div>
        </div>
      </div>

      <div className="print-grid-top">
        {CHECKLIST_SECTIONS.slice(0, 3).map((sec, idx) => (
          <div key={idx} className="print-section">
            <h4 className="section-title">{sec.title}</h4>
            <div className="checklist-items">
              {sec.items.map((item, i) => {
                const isChecked = data.checkedItems.includes(item);
                return (
                  <div key={i} className="check-item">
                    <div className="square">{isChecked ? '✓' : ''}</div>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="print-grid-bottom">
        {CHECKLIST_SECTIONS.slice(3, 5).map((sec, idx) => (
          <div key={idx} className="print-section">
            <h4 className="section-title">{sec.title}</h4>
            <div className="checklist-items">
              {sec.items.map((item, i) => {
                const isChecked = data.checkedItems.includes(item);
                return (
                  <div key={i} className="check-item">
                    <div className="square">{isChecked ? '✓' : ''}</div>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="signatures">
        <div className="sig-box">
          <span className="sig-title">✏️ ELABORÓ NOTA</span>
          <div className="sig-line">NOMBRE:</div>
        </div>
        <div className="sig-box">
          <span className="sig-title">✏️ ELABORÓ ARREGLO</span>
          <div className="sig-line">NOMBRE:</div>
        </div>
        <div className="sig-box">
          <span className="sig-title">✓ AUTORIZÓ PARA SU ENTREGA</span>
          <div className="sig-line">NOMBRE:</div>
        </div>
      </div>

      <div className="footer-box">
        <div className="footer-left">
          <div className="footer-question">EL ARREGLO QUEDÓ COMO EL OFRECIDO</div>
          <div className="footer-answers">
            <div className="square"></div> SÍ <div className="square" style={{marginLeft: '20px'}}></div> NO
          </div>
          <div className="footer-subtext">Si no quedó, explicar por qué y si está autorizado por el cliente.</div>
          <div className="footer-lines">
            <div className="f-line"></div>
            <div className="f-line"></div>
          </div>
          <div className="footer-auth">
            Autorizado por el cliente: <div className="square"></div> SÍ <div className="square" style={{marginLeft: '10px'}}></div> NO
          </div>
        </div>
        <div className="footer-right">
          <div className="footer-subtext" style={{color: '#e83e8c'}}>ESPACIO PARA OBSERVACIONES / COMENTARIOS</div>
        </div>
      </div>
      
      <div className="print-footer-message">
        ♡<br/>
        Gracias por cuidar cada detalle. <span style={{color: '#e83e8c'}}>Hacemos momentos inolvidables.</span>
      </div>
    </div>
  );
};

export default PrintChecklist;
