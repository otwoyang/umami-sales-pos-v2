/* Umami Sales PWA - Main Application Script */
/* Data synced via Google Sheets - no IndexedDB */

'use strict';

// ==================== GLOBAL ERROR HANDLING ====================
function showError(message) {
  console.error('[ERROR]', message);
  try {
    const errorEl = document.getElementById('errorDisplay');
    if (errorEl) {
      errorEl.textContent = 'Error: ' + message;
      errorEl.style.display = 'block';
    }
  } catch (e) {
    alert('Error: ' + message);
  }
}

window.onerror = function(msg, url, line, col, error) {
  showError(error?.message || msg);
  return true;
};

// ==================== GOOGLE SHEETS SYNC MODULE ====================
const SHEETS = {
  // Get the configured Google Apps Script Web App URL
  getWebAppUrl() {
    return localStorage.getItem('umamiSheetsUrl') || this.getDefaultWebAppUrl();
  },

  // Configure Web App URL
  setWebAppUrl(url) {
    localStorage.setItem('umamiSheetsUrl', url);
  },

  // Get default Web App URL
  getDefaultWebAppUrl() {
    return 'https://script.google.com/macros/s/AKfycbywEcP4WsIQ6UNL6MZvpSHI1BQ4p0FXrhzw7wIhbVR031Tni-uc6rXxd_83t5oVQPg/exec';
  },

  // Generate order number: YYYYMMDDHHMMSS
  generateOrderNumber() {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('');
  },

  // Generate UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Orders storage (localStorage as fallback, synced to Google Sheets)
  getOrders() {
    try {
      const data = localStorage.getItem('umamiOrders');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[SHEETS] Failed to get orders:', e);
      return [];
    }
  },

  saveOrders(orders) {
    try {
      localStorage.setItem('umamiOrders', JSON.stringify(orders));
      // Also sync to Google Sheets
      this.syncToSheets(orders);
    } catch (e) {
      console.error('[SHEETS] Failed to save orders:', e);
    }
  },

  // Products storage (localStorage)
  getProducts() {
    try {
      const data = localStorage.getItem('umamiProducts');
      if (data) return JSON.parse(data);
      
      // Return default products
      return this.getDefaultProducts();
    } catch (e) {
      console.error('[SHEETS] Failed to get products:', e);
      return this.getDefaultProducts();
    }
  },

  // Products are read-only from Google Sheets, no save function

  // Load products from Google Sheets
  async loadProductsFromSheets() {
    const webAppUrl = this.getWebAppUrl();
    if (!webAppUrl) return null;

    try {
      // Remove /exec if present, then add it back with query param
      const baseUrl = webAppUrl.replace(/\/exec$/, '');
      const url = baseUrl + '/exec?action=getProducts';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && data.products && data.products.length > 0) {
        return data.products;
      }
    } catch (error) {
      console.error('[SHEETS] Failed to load products:', error);
    }
    return null;
  },

  getDefaultProducts() {
    return [
      { id: '1', name: 'Pieni Sushi', price: 11.5, taxPercent: 13.5, category: 'sushi', sortOrder: 1, isActive: true },
      { id: '2', name: 'Pieni+ Sushi', price: 14, taxPercent: 13.5, category: 'sushi', sortOrder: 2, isActive: true },
      { id: '3', name: 'Medium Sushi', price: 16.5, taxPercent: 13.5, category: 'sushi', sortOrder: 3, isActive: true },
      { id: '4', name: 'Iso Sushi', price: 19.5, taxPercent: 13.5, category: 'sushi', sortOrder: 4, isActive: true },
      { id: '5', name: 'Drink', price: 2, taxPercent: 13.5, category: 'drink', sortOrder: 5, isActive: true },
      { id: '6', name: 'Nigri', price: 1.8, taxPercent: 13.5, category: 'drink', sortOrder: 6, isActive: true },
      { id: '7', name: '*Take away', price: 0, taxPercent: 13.5, category: 'addon', sortOrder: 7, isActive: true },
      { id: '8', name: '-Student', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 8, isActive: true },
      { id: '9', name: '-Vege', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 9, isActive: true },
      { id: '10', name: '-Vegan', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 10, isActive: true },
      { id: '11', name: '-All Fry', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 11, isActive: true },
      { id: '12', name: '-All Raw', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 12, isActive: true },
      { id: '13', name: '-No Mayo', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 13, isActive: true },
      { id: '14', name: '-No Dessert', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 14, isActive: true },
      { id: '15', name: '-No Tofu(GF)', price: 0, taxPercent: 13.5, category: 'discount', sortOrder: 15, isActive: true }
    ];
  },

  // Add order
  addOrder(orderData) {
    const orders = this.getOrders();
    const order = {
      id: this.generateUUID(),
      orderNumber: this.generateOrderNumber(),
      status: 'pending',
      items: orderData.items,
      subtotal: orderData.subtotal,
      vat: orderData.vat,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      promiseTime: orderData.promiseTime || 0,
      createdAt: Date.now(),
      completedAt: null
    };
    orders.unshift(order); // Add to beginning
    this.saveOrders(orders);
    return order;
  },

  // Get today's orders
  getTodayOrders() {
    const orders = this.getOrders();
    const today = new Date().toDateString();
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt).toDateString();
      return orderDate === today;
    });
  },

  // Get today's total sales
  getTodaySales() {
    const orders = this.getTodayOrders();
    return orders.reduce((sum, order) => sum + (order.total || 0), 0);
  },

  // Update order status
  updateOrderStatus(orderId, newStatus) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      if (newStatus === 'completed') {
        order.completedAt = Date.now();
      }
      this.saveOrders(orders);
    }
    return order;
  },

  // Delete order
  deleteOrder(orderId) {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders.splice(index, 1);
      this.saveOrders(orders);
    }
  },

  // Sync to Google Sheets (using no-cors mode)
  async syncToSheets(orders) {
    const webAppUrl = this.getWebAppUrl();
    if (!webAppUrl) {
      console.log('[SHEETS] No Web App URL configured, skipping sync');
      return;
    }

    const todayOrders = orders.filter(o => 
      new Date(o.createdAt).toDateString() === new Date().toDateString()
    );

    try {
      // Use no-cors to bypass CORS
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'syncOrders',
          orders: todayOrders,
          timestamp: Date.now()
        })
      });
      console.log('[SHEETS] Orders synced to Google Sheets');
    } catch (error) {
      console.error('[SHEETS] Sync failed:', error);
    }
  },

  // Test connection
  async testConnection() {
    const webAppUrl = this.getWebAppUrl();
    if (!webAppUrl) {
      return { success: false, message: 'No URL configured' };
    }

    try {
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });
      return { success: true, message: 'Connection successful!' };
    } catch (error) {
      return { success: false, message: 'Connection failed: ' + error.message };
    }
  },

  // Initialize
  async init() {
    // Try to load products from Google Sheets first
    const sheetProducts = await this.loadProductsFromSheets();
    if (sheetProducts && sheetProducts.length > 0) {
      localStorage.setItem('umamiProducts', JSON.stringify(sheetProducts));
      console.log('[SHEETS] Loaded', sheetProducts.length, 'products from Google Sheets');
    } else {
      // No products in Sheets - use defaults in localStorage only
      const products = this.getProducts();
      if (products.length === 0) {
        localStorage.setItem('umamiProducts', JSON.stringify(this.getDefaultProducts()));
      }
      console.log('[SHEETS] Initialized with', this.getProducts().length, 'products');
    }
  }
};

// Make SHEETS available globally
window.SHEETS = SHEETS;

// ==================== ORDER PAGE ====================
let currentOrder = {
  items: [],
  subtotal: 0,
  vat: 0,
  total: 0
};

let promiseTimeMinutes = 0;
let activeModal = null;
let receiptAutoCloseTimer = null;
let orderSalesInterval = null;
let orderETAInterval = null;

// Initialize order page
async function initOrderPage() {
  console.log('[ORDER] Initializing...');
  
  // Clear existing intervals
  if (orderSalesInterval) clearInterval(orderSalesInterval);
  if (orderETAInterval) clearInterval(orderETAInterval);

  // Initialize SHEETS module and wait for products to load
  await SHEETS.init();

  // Render products and update sales
  renderProducts();
  await updateTodaySales();
  updateOrderDisplay();
  updateETA();

  // Start polling for sales updates
  orderSalesInterval = setInterval(async () => {
    await updateTodaySales();
  }, 5000);

  // Start ETA timer updates
  orderETAInterval = setInterval(updateETA, 1000);

  // Setup PWA
  setupInstallPrompt();
  setupOfflineDetection();
}

// Calculate ETA based on orders
async function updateETA() {
  const orders = SHEETS.getTodayOrders();
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'cooking');
  
  let eta = 15; // Default
  
  if (activeOrders.length > 2) {
    eta += 15;
  }

  // Check cooking orders
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  if (cookingOrders.length > 0) {
    // Add time based on oldest cooking order
    const oldest = cookingOrders[cookingOrders.length - 1];
    const elapsed = Math.floor((Date.now() - oldest.createdAt) / 60000);
    eta += Math.max(0, 15 - elapsed);
  }

  const etaEl = document.getElementById('etaValue');
  if (etaEl) {
    etaEl.textContent = eta;
  }
}

// Render products grid
function renderProducts() {
  const products = SHEETS.getProducts().filter(p => p.isActive !== false);
  console.log('[RENDER] Products to render:', products.length, products);
  const grid = document.getElementById('productsGrid');
  if (!grid) {
    console.error('[RENDER] productsGrid element not found!');
    return;
  }
  
  // Sort by category
  const categoryOrder = { sushi: 0, drink: 1, addon: 2, discount: 3 };
  products.sort((a, b) => {
    const catDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
    if (catDiff !== 0) return catDiff;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });

  grid.innerHTML = products.map(p => {
    const safeId = String(p.id).replace(/'/g, "\\'");
    return `
    <button class="product-btn ${p.category}" onclick="window.addToOrder('${safeId}')">
      <span class="product-name">${p.name}</span>
      <span class="product-price">€${p.price.toFixed(2)}</span>
    </button>
  `}).join('');
  console.log('[RENDER] Products rendered to grid');
}

// Add product to order
function addToOrder(productId) {
  console.log('[ORDER] Adding product:', productId, 'type:', typeof productId);
  const products = SHEETS.getProducts();
  // Convert to string for comparison since IDs may be numbers or strings
  const productIdStr = String(productId);
  const product = products.find(p => String(p.id) === productIdStr);
  if (!product) {
    console.error('[ORDER] Product not found:', productId, 'in', products.map(p => p.id));
    return;
  }
  console.log('[ORDER] Found product:', product);

  // Check if already in order
  const existing = currentOrder.items.find(i => i.productId === productId);
  if (existing) {
    existing.qty++;
  } else {
    currentOrder.items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      taxPercent: product.taxPercent || 13.5,
      qty: 1
    });
  }

  recalculateOrder();
  updateOrderDisplay();
}

// Remove item from order
function removeFromOrder(productId) {
  const index = currentOrder.items.findIndex(i => i.productId === productId);
  if (index !== -1) {
    currentOrder.items.splice(index, 1);
    recalculateOrder();
    updateOrderDisplay();
  }
}

// Clear entire order
function clearOrder() {
  currentOrder = { items: [], subtotal: 0, vat: 0, total: 0 };
  promiseTimeMinutes = 0;
  const promiseBtn = document.getElementById('promiseBtn');
  if (promiseBtn) {
    promiseBtn.classList.remove('active');
    promiseBtn.textContent = '⏳';
  }
  updateOrderDisplay();
}

// Recalculate totals
function recalculateOrder() {
  let subtotal = 0;
  let vat = 0;

  currentOrder.items.forEach(item => {
    const itemTotal = item.price * item.qty;
    const itemVat = itemTotal * (item.taxPercent / 100);
    subtotal += itemTotal;
    vat += itemVat;
  });

  currentOrder.subtotal = subtotal;
  currentOrder.vat = vat;
  currentOrder.total = subtotal + vat;
}

// Update order display
function updateOrderDisplay() {
  const itemsContainer = document.getElementById('orderItems');
  const emptyEl = document.getElementById('emptyOrder');
  
  if (currentOrder.items.length === 0) {
    itemsContainer.innerHTML = '';
    emptyEl.style.display = 'flex';
  } else {
    emptyEl.style.display = 'none';
    itemsContainer.innerHTML = currentOrder.items.map(item => `
      <div class="order-item">
        <div class="order-item-info">
          <span class="order-item-qty">${item.qty}</span>
          <span class="order-item-name">${item.name}</span>
        </div>
        <span class="order-item-price">€${(item.price * item.qty).toFixed(2)}</span>
        <button class="order-item-remove" onclick="removeFromOrder('${item.productId}')">✕</button>
      </div>
    `).join('');
  }

  // Update totals
  document.getElementById('subtotal').textContent = `€${currentOrder.subtotal.toFixed(2)}`;
  document.getElementById('vat').textContent = `€${currentOrder.vat.toFixed(2)}`;
  document.getElementById('total').textContent = `€${currentOrder.total.toFixed(2)}`;

  // Enable/disable pay buttons
  const hasItems = currentOrder.items.length > 0;
  document.querySelectorAll('.pay-btn.card, .pay-btn.cash').forEach(btn => {
    btn.disabled = !hasItems;
  });
}

// Set promise time
function setPromiseTime() {
  const input = prompt('Set promise time (minutes):', '30');
  if (input !== null) {
    const minutes = parseInt(input);
    if (isNaN(minutes) || minutes <= 0) {
      promiseTimeMinutes = 0;
      document.getElementById('promiseBtn').classList.remove('active');
      document.getElementById('promiseBtn').textContent = '⏳';
    } else {
      promiseTimeMinutes = minutes;
      document.getElementById('promiseBtn').classList.add('active');
      document.getElementById('promiseBtn').textContent = `⏳${minutes}`;
    }
  }
}

// Complete order
async function completeOrder(paymentMethod) {
  if (currentOrder.items.length === 0) return;

  const order = SHEETS.addOrder({
    items: [...currentOrder.items],
    subtotal: currentOrder.subtotal,
    vat: currentOrder.vat,
    total: currentOrder.total,
    paymentMethod,
    promiseTime: promiseTimeMinutes
  });

  console.log('[ORDER] Order completed:', order.orderNumber);

  // Show receipt
  showReceipt(order);

  // Clear order
  clearOrder();
  await updateTodaySales();
}

// Update today sales display
async function updateTodaySales() {
  const sales = SHEETS.getTodaySales();
  const amountEl = document.getElementById('todaySalesAmount');
  const boxEl = document.getElementById('todaySalesBox');
  
  if (amountEl) {
    amountEl.textContent = `€${sales.toFixed(2)}`;
  }

  // Update effect class
  if (boxEl) {
    boxEl.classList.remove('td-leaves', 'td-wave', 'td-fire');
    if (sales >= 750) {
      boxEl.classList.add('td-fire');
    } else if (sales >= 381) {
      boxEl.classList.add('td-wave');
    } else if (sales >= 250) {
      boxEl.classList.add('td-leaves');
    }
  }
}

// ==================== RECEIPT ====================
let currentReceiptOrder = null;

function showReceipt(order) {
  currentReceiptOrder = order;
  
  const content = document.getElementById('receiptContent');
  const modal = document.getElementById('receiptModal');
  
  content.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-company">Umami Sushi</div>
      <div class="receipt-info">
        Guaimost Oy<br>
        Y-tunnus: 3287298-9<br>
        VAT: FI 32872989<br>
        guaimost@gmail.com
      </div>
    </div>
    <div class="receipt-order-info">
      <strong>Order #${order.orderNumber}</strong><br>
      ${new Date(order.createdAt).toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })}
    </div>
    <div class="receipt-items">
      ${order.items.map(item => `
        <div class="receipt-item">
          <span>${item.qty}x ${item.name}</span>
          <span>€${(item.price * item.qty).toFixed(2)}</span>
        </div>
      `).join('')}
    </div>
    <div class="receipt-totals">
      <div class="receipt-total-row">
        <span>Subtotal</span>
        <span>€${order.subtotal.toFixed(2)}</span>
      </div>
      <div class="receipt-total-row">
        <span>VAT (13.5%)</span>
        <span>€${order.vat.toFixed(2)}</span>
      </div>
      <div class="receipt-total-row grand-total">
        <span>TOTAL</span>
        <span>€${order.total.toFixed(2)}</span>
      </div>
      ${order.paymentMethod ? `
        <div class="receipt-total-row">
          <span>Paid by</span>
          <span>${order.paymentMethod.toUpperCase()}</span>
        </div>
      ` : ''}
    </div>
    <div class="receipt-footer">
      Thank you for your order!<br>
      See you again soon! 🍣
    </div>
  `;
  
  modal.classList.add('show');
  activeModal = 'receiptModal';
  
  // Auto-close after 60 seconds
  if (receiptAutoCloseTimer) clearTimeout(receiptAutoCloseTimer);
  receiptAutoCloseTimer = setTimeout(() => {
    closeReceipt();
  }, 60000);
}

function closeReceipt() {
  document.getElementById('receiptModal').classList.remove('show');
  activeModal = null;
  if (receiptAutoCloseTimer) {
    clearTimeout(receiptAutoCloseTimer);
    receiptAutoCloseTimer = null;
  }
}

function newOrder() {
  closeReceipt();
  clearOrder();
}

// Download receipt as image
async function downloadReceiptImage() {
  const content = document.getElementById('receiptContent');
  try {
    const canvas = await html2canvas(content, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    const link = document.createElement('a');
    link.download = `receipt-${currentReceiptOrder?.orderNumber || 'unknown'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('[RECEIPT] Failed to download:', error);
    alert('Failed to download receipt');
  }
}

// Print receipt
function printReceipt() {
  const content = document.getElementById('receiptContent').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`
    <html>
    <head>
      <title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 14px; padding: 20px; }
        .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
        .receipt-company { font-size: 18px; font-weight: 700; }
        .receipt-info { font-size: 12px; line-height: 1.5; }
        .receipt-order-info { text-align: center; padding: 12px 0; border-bottom: 1px dashed #000; }
        .receipt-items { padding: 12px 0; border-bottom: 1px dashed #000; }
        .receipt-item { display: flex; justify-content: space-between; padding: 2px 0; }
        .receipt-totals { padding: 12px 0; }
        .receipt-total-row { display: flex; justify-content: space-between; padding: 2px 0; }
        .grand-total { font-weight: 700; font-size: 16px; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px; }
        .receipt-footer { text-align: center; padding-top: 12px; border-top: 1px dashed #000; }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `);
  win.document.close();
  win.print();
  win.close();
}

// Share receipt
async function shareReceipt() {
  if (!navigator.share) {
    alert('Sharing not supported on this device');
    return;
  }

  try {
    const text = `Order #${currentReceiptOrder?.orderNumber}\nTotal: €${currentReceiptOrder?.total.toFixed(2)}\n\nThank you for your order!`;
    await navigator.share({
      title: 'Umami Sushi Receipt',
      text
    });
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[RECEIPT] Share failed:', error);
    }
  }
}

// ==================== HISTORY ====================
async function showHistory() {
  const modal = document.getElementById('historyModal');
  const list = document.getElementById('historyList');
  
  const orders = SHEETS.getTodayOrders();
  orders.sort((a, b) => b.createdAt - a.createdAt);

  if (orders.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:2em;">No orders today</div>';
  } else {
    list.innerHTML = orders.map(order => `
      <div class="history-item">
        <div class="history-item-info">
          <span class="history-item-number">#${order.orderNumber}</span>
          <span class="history-item-time">${new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="history-item-total">€${order.total.toFixed(2)}</div>
        <div class="history-item-actions">
          <button class="history-action-btn receipt" onclick="viewReceipt('${order.id}')" title="View Receipt">🧾</button>
          <button class="history-action-btn delete" onclick="deleteHistoryOrder('${order.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  modal.classList.add('show');
  activeModal = 'historyModal';
}

function closeHistory() {
  document.getElementById('historyModal').classList.remove('show');
  if (activeModal === 'historyModal') activeModal = null;
}

function viewReceipt(orderId) {
  const order = SHEETS.getOrders().find(o => o.id === orderId);
  if (order) {
    closeHistory();
    showReceipt(order);
  }
}

async function deleteHistoryOrder(orderId) {
  if (!confirm('Delete this order?')) return;
  SHEETS.deleteOrder(orderId);
  showHistory(); // Refresh list
  await updateTodaySales();
  
  // Notify kitchen to refresh
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ action: 'refreshOrders' }, '*');
  }
}

// Export to Excel
async function exportTodayOrders() {
  const orders = SHEETS.getTodayOrders();
  
  if (orders.length === 0) {
    alert('No orders to export');
    return;
  }

  // Prepare data
  const data = [
    ['Order Number', 'Time', 'Items', 'Subtotal', 'VAT', 'Total', 'Payment', 'Status']
  ];

  orders.forEach(order => {
    const items = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');
    data.push([
      order.orderNumber,
      new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items,
      order.subtotal.toFixed(2),
      order.vat.toFixed(2),
      order.total.toFixed(2),
      order.paymentMethod || '',
      order.status
    ]);
  });

  // Add total row
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  data.push([]);
  data.push(['Total Sales:', '', '', '', '', `€${totalSales.toFixed(2)}`, '', '']);

  // Create workbook
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Today Orders');

  // Download
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `umami-orders-${date}.xlsx`);
}

// Product editor removed - products are managed via Google Sheets only

function closeAllModals() {
  if (activeModal) {
    document.getElementById(activeModal)?.classList.remove('show');
    activeModal = null;
  }
}

// ==================== GOOGLE SHEETS CONFIG ====================
function openConfigSheets() {
  const modal = document.getElementById('configSheetsModal');
  const input = document.getElementById('sheetsUrlInput');
  const status = document.getElementById('sheetsStatus');
  
  input.value = SHEETS.getWebAppUrl();
  status.textContent = SHEETS.getWebAppUrl() ? 'Current URL configured' : 'No URL configured';
  
  modal.classList.add('show');
  activeModal = 'configSheetsModal';
}

function closeConfigSheets() {
  document.getElementById('configSheetsModal').classList.remove('show');
  if (activeModal === 'configSheetsModal') activeModal = null;
}

function saveSheetsUrl() {
  const input = document.getElementById('sheetsUrlInput');
  const status = document.getElementById('sheetsStatus');
  
  SHEETS.setWebAppUrl(input.value.trim());
  status.textContent = 'URL saved! Test it by creating an order.';
  
  // Auto test
  setTimeout(async () => {
    const result = await SHEETS.testConnection();
    status.textContent = result.message;
  }, 1000);
}

function configureGoogleSheets() {
  openConfigSheets();
}

// ==================== SPLIT VIEW ====================
function setupDraggableDivider() {
  const divider = document.getElementById('splitDivider');
  const leftPane = document.getElementById('splitPaneLeft');
  const container = document.getElementById('splitViewContent');
  
  if (!divider || !leftPane || !container) return;

  let isDragging = false;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const rect = container.getBoundingClientRect();
    let percent = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Clamp between 20% and 80%
    percent = Math.max(20, Math.min(80, percent));
    
    leftPane.style.flex = `0 0 ${percent}%`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch support
  divider.addEventListener('touchstart', (e) => {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const rect = container.getBoundingClientRect();
    let percent = ((touch.clientX - rect.left) / rect.width) * 100;
    percent = Math.max(20, Math.min(80, percent));
    
    leftPane.style.flex = `0 0 ${percent}%`;
  });

  document.addEventListener('touchend', () => {
    isDragging = false;
  });
}

// ==================== PWA & OFFLINE ====================
function setupInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const prompt = document.getElementById('installPrompt');
    const installBtn = document.getElementById('installBtn');
    const dismissBtn = document.getElementById('dismissInstall');
    
    if (prompt) {
      prompt.classList.add('show');
      
      installBtn?.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('Install:', outcome);
          deferredPrompt = null;
          prompt.classList.remove('show');
        }
      });
      
      dismissBtn?.addEventListener('click', () => {
        prompt.classList.remove('show');
      });
    }
  });
}

function setupOfflineDetection() {
  const banner = document.getElementById('offlineBanner');
  
  function updateStatus() {
    if (banner) {
      if (navigator.onLine) {
        banner.classList.remove('show');
      } else {
        banner.classList.add('show');
      }
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
  // ESC to close modals
  if (e.key === 'Escape' && activeModal) {
    closeAllModals();
  }
  
  // Ctrl/Cmd + E to export
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    exportTodayOrders();
  }
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  console.log('[APP] Page:', page);

  if (page === 'order') {
    await initOrderPage();
  } else if (page === 'kitchen') {
    // Kitchen page has its own initialization in kitchen.html
    await SHEETS.init();
    setupInstallPrompt();
    setupOfflineDetection();
  }
});

// Expose functions to window for onclick handlers
window.addToOrder = addToOrder;
window.removeFromOrder = removeFromOrder;
window.clearOrder = clearOrder;
window.completeOrder = completeOrder;
window.setPromiseTime = setPromiseTime;
window.showHistory = showHistory;
window.closeHistory = closeHistory;
window.viewReceipt = viewReceipt;
window.deleteHistoryOrder = deleteHistoryOrder;
window.exportTodayOrders = exportTodayOrders;
window.showReceipt = showReceipt;
window.closeReceipt = closeReceipt;
window.newOrder = newOrder;
window.downloadReceiptImage = downloadReceiptImage;
window.printReceipt = printReceipt;
window.shareReceipt = shareReceipt;
window.configureGoogleSheets = configureGoogleSheets;
window.openConfigSheets = openConfigSheets;
window.closeConfigSheets = closeConfigSheets;
window.saveSheetsUrl = saveSheetsUrl;
window.closeAllModals = closeAllModals;
window.setupDraggableDivider = setupDraggableDivider;

console.log('[APP] App.js loaded');
