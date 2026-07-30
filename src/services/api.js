export const getWcConfig = async () => {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.consumerKey) return data;
    }
  } catch(e) {
    console.error('Error fetching settings config:', e);
  }
  return null;
};

export const saveApiSettings = async (settings) => {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.ok;
  } catch(e) { 
    console.error(e); 
    return false; 
  }
};

export const fetchProfiles = async () => {
  try {
    const res = await fetch('/api/profiles');
    if (res.ok) return await res.json();
  } catch(e) { console.error(e); }
  return {};
};

export const saveProfiles = async (profiles) => {
  try {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profiles)
    });
    return res.ok;
  } catch(e) { console.error(e); return false; }
};

export const fetchLogs = async () => {
  try {
    const res = await fetch('/api/logs');
    if (res.ok) return await res.json();
  } catch(e) { console.error('Error fetching logs', e); }
  return [];
};

export const saveLog = async (logData) => {
  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });
    return res.ok;
  } catch(e) { console.error('Error saving log', e); return false; }
};

const wcFetch = async (path, options = {}) => {
  const config = await getWcConfig();
  if (!config) throw new Error('API Credentials not configured');

  const authHeader = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  const baseUrl = config.storeUrl.replace(/\/$/, '');
  const url = `${baseUrl}/wp-json/wc/v3${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`WooCommerce API Error: ${response.status}`);
  }

  return response.json();
};

// Cache for POS Metadata
let posMetadataCache = null;

export const fetchPosMetadata = async () => {
  if (posMetadataCache) return posMetadataCache;
  const config = await getWcConfig();
  if (!config) return null;
  
  const baseUrl = config.storeUrl.replace(/\/$/, '');
  const authHeader = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  
  try {
    const res = await fetch(`${baseUrl}/wp-json/dashboard-erp/v1/pos-metadata`, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      posMetadataCache = {
        cashiers: data.cashiers || {},
        registers: data.registers || {}
      };
      return posMetadataCache;
    }
  } catch (err) {
    console.error("Error fetching POS metadata", err);
  }
  return { cashiers: {}, registers: {} };
};

export const fetchOrders = async (params = {}) => {
  const { page = 1, perPage = 100, after = null, before = null } = params;
  
  let query = `?page=${page}&per_page=${perPage}`;
  if (after) query += `&after=${after}`;
  if (before) query += `&before=${before}`;

  // Pre-fetch metadata (cache prevents multiple network calls)
  await fetchPosMetadata();

  const orders = await wcFetch(`/orders${query}`);
  
  return orders.map(order => {
    // Determine POS vs Web
    const posMeta = order.meta_data.find(m => m.key === '_yith_pos_register' || m.key === '_yith_pos_cashier');
    const type = posMeta ? 'pos' : 'web';
    
    // POS Register/Store
    const registerMeta = order.meta_data.find(m => m.key === '_yith_pos_register');
    const cashierMeta = order.meta_data.find(m => m.key === '_yith_pos_cashier');
    
    let cashierName = '-';
    let storeName = 'Tienda Web';

    if (type === 'pos') {
      const cashierId = cashierMeta ? cashierMeta.value : null;
      const registerId = registerMeta ? registerMeta.value : null;

      // Buscar alias manuales primero
      let savedAliases = [];
      try {
        const raw = localStorage.getItem('erp_zapier_aliases');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) savedAliases = parsed;
        }
      } catch (e) {}

      const customCashier = savedAliases.find(a => a.type === 'cashier' && String(a.id) === String(cashierId));
      const customStore = savedAliases.find(a => a.type === 'store' && String(a.id) === String(registerId));
      
      if (customCashier) {
        cashierName = customCashier.name;
      } else {
        cashierName = (posMetadataCache && cashierId && posMetadataCache.cashiers[cashierId]) 
          ? posMetadataCache.cashiers[cashierId] 
          : (cashierId ? `Cajero #${cashierId}` : 'Cajero POS');
      }
        
      if (customStore) {
        storeName = customStore.name;
      } else {
        storeName = (posMetadataCache && registerId && posMetadataCache.registers[registerId]) 
          ? posMetadataCache.registers[registerId] 
          : (registerId ? `Caja POS #${registerId}` : 'Sucursal Física');
      }
    }
    
    // Determine internal custom states (Production / Delivery) using WooCommerce Meta Data
    const prodMeta = order.meta_data.find(m => m.key === 'derp_production_status');
    const delivMeta = order.meta_data.find(m => m.key === 'derp_delivery_status');
    const prodUserMeta = order.meta_data.find(m => m.key === 'derp_production_user');
    const prodStartMeta = order.meta_data.find(m => m.key === 'derp_production_start');
    
    const productionStatus = prodMeta ? prodMeta.value : 'pending'; // pending, in_progress, completed
    const deliveryStatus = delivMeta ? delivMeta.value : 'pending'; // pending, en_route, delivered
    const productionUser = prodUserMeta ? prodUserMeta.value : null;
    const productionStart = prodStartMeta ? prodStartMeta.value : null;
    
    // Formatting
    const dateObj = new Date(order.date_created);
    const formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString('es-ES', { month: 'short' })} ${dateObj.getFullYear()}`;
    const requiresDelivery = order.shipping_lines && order.shipping_lines.length > 0 && order.shipping_lines[0].method_id !== 'local_pickup';

    // Materials logic (simplified: extracting from line items names)
    const materials = order.line_items.map(item => `${item.quantity}x ${item.name}`);

    // Detail Items for the Modal
    const itemsDetail = order.line_items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total
    }));

    return {
      rawId: order.id,
      id: `#${order.number}`,
      type: type,
      customer: `${order.billing.first_name} ${order.billing.last_name}`.trim() || 'Cliente Mostrador',
      email: order.billing.email || 'N/A',
      phone: order.billing.phone || 'No registrado',
      address: `${order.shipping.address_1}, ${order.shipping.city}`.trim() || 'Recoger en tienda',
      paymentMethod: order.payment_method_title || 'N/A',
      total: `${order.currency_symbol || '$'}${order.total}`,
      status: order.status,
      date: formattedDate,
      store: type === 'pos' ? storeName : 'Tienda Web',
      cashier: type === 'pos' ? cashierName : '-',
      rawCashierId: type === 'pos' && cashierMeta ? String(cashierMeta.value) : null,
      rawStoreId: type === 'pos' && registerMeta ? String(registerMeta.value) : null,
      requiresDelivery: requiresDelivery,
      productionStatus: productionStatus,
      deliveryStatus: deliveryStatus,
      productionUser: productionUser,
      productionStart: productionStart,
      materials: materials,
      itemsDetail: itemsDetail
    };
  });
};

export const updateOrderMeta = async (orderId, metaKey, metaValue) => {
  // Update a specific meta field using standard WooCommerce REST API
  return await wcFetch(`/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify({
      meta_data: [
        {
          key: metaKey,
          value: metaValue
        }
      ]
    })
  });
};

export const updateOrderMultipleMeta = async (orderId, metaArray) => {
  // Expects metaArray like: [{key: 'a', value: '1'}, {key: 'b', value: '2'}]
  return await wcFetch(`/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify({
      meta_data: metaArray
    })
  });
};
