import { supabase } from './supabase';

const fetchAppData = async (id, defaultValue) => {
  try {
    const { data, error } = await supabase.from('app_data').select('data').eq('id', id).single();
    if (error || !data) return defaultValue;
    return data.data;
  } catch (e) {
    console.error(`Error fetching app_data for ${id}`, e);
    return defaultValue;
  }
};

const saveAppData = async (id, dataObj) => {
  try {
    const { error } = await supabase.from('app_data').upsert({ id, data: dataObj });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`Error saving app_data for ${id}`, e);
    return false;
  }
};

export const getWcConfig = async () => {
  return await fetchAppData('settings', null);
};

export const saveApiSettings = async (settings) => {
  return await saveAppData('settings', settings);
};

export const fetchProfiles = async () => {
  return await fetchAppData('profiles', []);
};

export const saveProfiles = async (profiles) => {
  return await saveAppData('profiles', profiles);
};

export const fetchLogs = async () => {
  return await fetchAppData('logs', []);
};

export const saveLog = async (logEntry) => {
  try {
    const logs = await fetchAppData('logs', []);
    logs.push({
      ...logEntry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    });
    return await saveAppData('logs', logs);
  } catch(e) { console.error('Error saving log', e); return false; }
};

export const fetchCustomStatuses = async () => {
  return await fetchAppData('customStatuses', []);
};

export const saveCustomStatuses = async (statuses) => {
  return await saveAppData('customStatuses', statuses);
};

export const checkManualAvailability = async (productId) => {
  try {
    const { data: files, error } = await supabase.storage.from('manuales').list('', {
      limit: 100,
      search: productId
    });
    
    if (error || !files) return { image: null, video: null };
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const videoExtensions = ['.mp4', '.mov', '.webm'];
    
    const imageFile = files.find(f => {
      const p = f.name.split('.');
      return p[0] === productId && imageExtensions.includes('.' + p[p.length - 1].toLowerCase());
    });
    
    const videoFile = files.find(f => {
      const p = f.name.split('.');
      return p[0] === productId && videoExtensions.includes('.' + p[p.length - 1].toLowerCase());
    });

    const getUrl = (file) => file ? supabase.storage.from('manuales').getPublicUrl(file.name).data.publicUrl : null;

    return {
      image: getUrl(imageFile),
      video: getUrl(videoFile)
    };
  } catch(e) { 
    console.error('Error fetching manual availability from Supabase', e); 
    return { image: null, video: null };
  }
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
    const delivMeta = order.meta_data.find(m => m.key === 'derp_delivery_status');
    const deliveryStatus = delivMeta ? delivMeta.value : 'pending'; // pending, en_route, delivered
    
    // Formatting
    const dateObj = new Date(order.date_created);
    const formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString('es-ES', { month: 'short' })} ${dateObj.getFullYear()}`;
    const requiresDelivery = order.shipping_lines && order.shipping_lines.length > 0 && order.shipping_lines[0].method_id !== 'local_pickup';

    // Item-level production tracking
    let itemsCompleted = 0;
    let itemsInProgress = 0;
    const totalItems = order.line_items.length;

    const productionItems = order.line_items.map(item => {
      // Look for meta field derp_prod_item_{id} on the order
      const itemProdMeta = order.meta_data.find(m => m.key === `derp_prod_item_${item.id}`);
      let prodData = { status: 'pending', user: null, start: null };
      
      if (itemProdMeta && itemProdMeta.value) {
        try {
          prodData = JSON.parse(itemProdMeta.value);
        } catch (e) {}
      }

      if (prodData.status === 'completed') itemsCompleted++;
      else if (prodData.status === 'in_progress') itemsInProgress++;

      return {
        itemId: item.id,
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        productionStatus: prodData.status || 'pending',
        productionUser: prodData.user || null,
        productionStart: prodData.start || null
      };
    });

    let dynamicProductionStatus = 'pending';
    if (totalItems > 0) {
      if (itemsCompleted === totalItems) {
        dynamicProductionStatus = 'completed';
      } else if (itemsInProgress > 0 || itemsCompleted > 0) {
        dynamicProductionStatus = 'in_progress';
      }
    }

    // Parse delivery date from customer note (e.g., 2026-08-08 9:00)
    let deliveryDateTime = null;
    if (order.customer_note) {
      const match = order.customer_note.match(/(\d{4}-\d{2}-\d{2}\s\d{1,2}:\d{2})/);
      if (match) {
        deliveryDateTime = match[1];
      }
    }

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
      deliveryDateTime: deliveryDateTime,
      customerNote: order.customer_note || '',
      productionStatus: dynamicProductionStatus,
      deliveryStatus: deliveryStatus,
      productionItems: productionItems,
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

export const updateProductionItemStatus = async (orderId, itemId, data) => {
  return await updateOrderMeta(orderId, `derp_prod_item_${itemId}`, JSON.stringify(data));
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

export const updateOrderStatus = async (orderId, newStatus) => {
  // WooCommerce REST API requires statuses without the 'wc-' prefix
  const cleanStatus = newStatus.startsWith('wc-') ? newStatus.substring(3) : newStatus;
  
  return await wcFetch(`/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: cleanStatus })
  });
};

