// ══════════════════════════════════════════════
// ⚙️ SOZLAMALAR
// ══════════════════════════════════════════════
const API_BASE = 'api.php';
const TELEGRAM_BOT_TOKEN = '8655163628:AAH-jfQj3WrBwA_0BtcR64WSyRbtcYqFOqk';
const TELEGRAM_CHAT_ID = '8161687657';

// ══════════════════════════════════════════════
// GLOBAL O'ZGARUVCHILAR
// ══════════════════════════════════════════════
let allProducts = [];
let allCategories = [];
let cart = JSON.parse(localStorage.getItem('mf_cart') || '[]');
let orderHistory = JSON.parse(localStorage.getItem('mf_order_history') || '[]');

let currentProduct = null;
let modalQty = 1;
let selectedPay = 'naxt';

// ── API ──────────────────────────────────────
async function apiFetch(action, options = {}) {
  try {
    const url = `${API_BASE}?action=${action}`;
    const res = await fetch(url, { 
      headers: { 'Content-Type': 'application/json' }, 
      ...options 
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API xato');
    return json.data;
  } catch (e) {
    console.error('API Error:', e);
    throw e;
  }
}

// ── INIT ─────────────────────────────────────
async function init() {
  try {
    const menu = await apiFetch('menu');
    allCategories = menu.categories;
    allProducts = menu.products;

    renderCategories();
    renderProducts(allProducts);
    updateCartUI();
    updateHistoryCount();

    // Birinchi yuklashda joylashuvni so'rash
    setTimeout(requestLocationOnLoad, 1000);
  } catch (e) {
    console.error('Menu yuklashda xato:', e);
    document.getElementById('productsSection').innerHTML = `
      <div class="error-banner">Menyuni yuklashda xatolik yuz berdi. Iltimos, sahifani yangilang.</div>`;
  }
}

function requestLocationOnLoad() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 });
  }
}

// ── GEOLOCATION ─────────────────────────────────
function getLocation() {
  const btn = document.getElementById('geoBtn');
  const status = document.getElementById('geoStatus');

  if (!btn || !status) return;

  btn.disabled = true;
  btn.textContent = '⏳ Aniqlanmoqda...';
  status.style.display = 'block';
  status.style.color = '';
  status.textContent = '📍 Qurilmangiz joylashuvini aniqlamoqda...';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      await getAddressFromCoords(lat, lng);
      btn.disabled = false;
      btn.textContent = '📍 Qayta aniqlash';
      status.style.display = 'none';
    },
    (error) => {
      btn.disabled = false;
      btn.textContent = '📍 Qayta urinish';
      status.style.display = 'none';
      console.log('Geolocation xatosi:', error);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function getAddressFromCoords(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=uz`,
      { headers: { 'User-Agent': 'BigBurgersApp/1.0' } }
    );
    const data = await response.json();
    const address = formatAddress(data);
    document.getElementById('custAddress').value = address;
  } catch (e) {
    document.getElementById('custAddress').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function formatAddress(data) {
  const a = data.address || {};
  const parts = [
    a.city || a.town || a.region || '',
    a.district || a.suburb || '',
    a.road || a.street || '',
    a.house_number ? a.house_number + '-uy' : ''
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : (data.display_name || '');
}

// ── CATEGORIES ─────────────────────────────────
function renderCategories() {
  const scroll = document.getElementById('categoriesScroll');
  scroll.innerHTML = `
    <div class="cat-chip active" data-id="all" onclick="filterCategory('all', this)">
      <span class="cat-emoji">🍔</span> Barchasi
    </div>`;

  allCategories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'cat-chip';
    chip.dataset.id = cat.id;
    chip.innerHTML = `<span class="cat-emoji">${cat.icon}</span> ${cat.name}`;
    chip.onclick = () => filterCategory(cat.id, chip);
    scroll.appendChild(chip);
  });
}

function filterCategory(id, el) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');

  const filtered = id === 'all' 
    ? allProducts 
    : allProducts.filter(p => p.category_id == id);
  
  renderProducts(filtered);
}

// ── PRODUCTS ─────────────────────────────────
function renderProducts(products) {
  const section = document.getElementById('productsSection');
  section.innerHTML = '';

  if (!products.length) {
    section.innerHTML = '<div class="loading"><span>Mahsulot topilmadi</span></div>';
    return;
  }

  const grouped = {};
  products.forEach(p => {
    if (!grouped[p.category_id]) {
      grouped[p.category_id] = { 
        name: p.category_name, 
        icon: p.category_icon || '🍔', 
        items: [] 
      };
    }
    grouped[p.category_id].items.push(p);
  });

  Object.values(grouped).forEach(group => {
    const el = document.createElement('div');
    el.className = 'cat-group';
    el.innerHTML = `
      <div class="cat-group-header">
        <span style="font-size:24px">${group.icon}</span>
        <div class="cat-group-title">${group.name}</div>
      </div>
      <div class="products-grid">
        ${group.items.map(productCard).join('')}
      </div>`;
    section.appendChild(el);
  });
}

function productCard(p) {
  const fallback = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80';
  return `
    <div class="product-card" onclick="openProduct(${p.id})">
      <div class="product-img-wrap">
        <img src="${p.image_url || fallback}" alt="${p.name}" loading="lazy" onerror="this.src='${fallback}'">
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-footer">
          <div class="product-price">${fmt(p.price)} <span>so'm</span></div>
          <button class="add-btn" onclick="event.stopPropagation();addToCart(${p.id})">+</button>
        </div>
      </div>
    </div>`;
}

// ── PRODUCT MODAL ─────────────────────────────
function openProduct(id) {
  const p = allProducts.find(x => x.id == id);
  if (!p) return;

  currentProduct = p;
  modalQty = 1;

  document.getElementById('modalImg').src = p.image_url || '';
  document.getElementById('modalCat').textContent = `${p.category_icon} ${p.category_name}`;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalDesc').textContent = p.description || '';
  document.getElementById('modalPrice').textContent = fmt(p.price) + " so'm";
  document.getElementById('modalQty').textContent = 1;
  document.getElementById('modalTotal').textContent = fmt(p.price) + " so'm";

  document.getElementById('productModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow = '';
}

function changeQty(d) {
  modalQty = Math.max(1, modalQty + d);
  document.getElementById('modalQty').textContent = modalQty;
  document.getElementById('modalTotal').textContent = fmt(currentProduct.price * modalQty) + " so'm";
}

function addFromModal() {
  if (!currentProduct) return;
  for (let i = 0; i < modalQty; i++) {
    addToCart(currentProduct.id, false);
  }
  updateCartUI();
  closeProductModal();
}

// ── CART ─────────────────────────────────────
function addToCart(id, doUpdate = true) {
  const p = allProducts.find(x => x.id == id);
  if (!p) return;

  const existing = cart.find(x => x.id == id);
  if (existing) existing.qty++;
  else cart.push({ id: p.id, name: p.name, price: p.price, image: p.image_url, qty: 1 });

  saveCart();
  if (doUpdate) updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id != id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function changeCartQty(id, d) {
  const item = cart.find(x => x.id == id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) removeFromCart(id);
  else {
    saveCart();
    updateCartUI();
    renderCartItems();
  }
}

function saveCart() {
  localStorage.setItem('mf_cart', JSON.stringify(cart));
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCartUI() {
  const count = getCartCount();
  const el = document.getElementById('cartCount');
  
  el.textContent = count;
  el.classList.remove('bump');
  void el.offsetWidth;
  if (count > 0) el.classList.add('bump');

  document.getElementById('cartTotal').textContent = fmt(getCartTotal()) + " so'm";
  document.getElementById('checkoutBtn').disabled = cart.length === 0;
}

function renderCartItems() {
  const body = document.getElementById('cartBody');
  if (!cart.length) {
    body.innerHTML = '<div class="cart-empty"><div class="empty-icon">🛒</div><p>Savat bo\'sh</p></div>';
    return;
  }

  const fallback = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=60';
  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image || fallback}" alt="${item.name}" onerror="this.src='${fallback}'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${fmt(item.price)} so'm</div>
        <div class="cart-item-qty">
          <button class="cq-btn" onclick="changeCartQty(${item.id},-1)">−</button>
          <div class="cq-num">${item.qty}</div>
          <button class="cq-btn" onclick="changeCartQty(${item.id},1)">+</button>
        </div>
      </div>
      <button class="cart-item-del" onclick="removeFromCart(${item.id})">🗑</button>
    </div>
  `).join('');
}

// ── HISTORY ─────────────────────────────────
function updateHistoryCount() {
  const el = document.getElementById('historyCount');
  if (el) el.textContent = orderHistory.length;
}

function openHistory() {
  renderHistory();
  document.getElementById('historyOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeHistory() {
  document.getElementById('historyOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderHistory() {
  const body = document.getElementById('historyBody');
  
  if (!orderHistory.length) {
    body.innerHTML = `
      <div class="cart-empty" style="padding:80px 20px">
        <div class="empty-icon">📜</div>
        <p>Hozircha buyurtmalar yo'q</p>
      </div>`;
    return;
  }

  body.innerHTML = orderHistory.map(order => `
    <div class="history-item">
      <div class="history-item-head">
        <div class="history-order-num">#${order.order_number}</div>
        <div class="history-date">${order.date}</div>
      </div>
      <div class="history-meta">
        <span>${order.name}</span>
        <span>${order.phone}</span>
      </div>
      <div class="history-products">
        ${order.items.map(item => `
          <div class="history-product-row">
            <span class="history-product-name">${item.name}</span>
            <span class="history-product-qty">×${item.qty}</span>
            <span class="history-product-price">${fmt(item.price * item.qty)}</span>
          </div>
        `).join('')}
      </div>
      <div class="history-total-row">
        <span>Jami:</span>
        <span class="history-total-price">${fmt(order.total)} so'm</span>
      </div>
    </div>
  `).join('');
}

function clearHistory() {
  if (confirm("Barcha buyurtma tarixini o'chirib tashlamoqchimisiz?")) {
    orderHistory = [];
    localStorage.setItem('mf_order_history', '[]');
    renderHistory();
    updateHistoryCount();
  }
}

// ── CART & CHECKOUT ─────────────────────────────
function openCart() {
  renderCartItems();
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function openCheckout() {
  closeCart();
  setTimeout(requestLocationOnLoad, 300);

  document.getElementById('checkoutBody').innerHTML = `
    <div class="checkout-form-title">Buyurtma berish</div>
    <div class="checkout-form-sub">Ma'lumotlaringizni kiriting</div>
    
    <div class="form-group">
      <label class="form-label">Ismingiz</label>
      <input type="text" class="form-input" id="custName" placeholder="Ismoil Karimov">
    </div>
    
    <div class="form-group">
      <label class="form-label">Telefon raqam</label>
      <input type="tel" class="form-input" id="custPhone" placeholder="+998 90 123 45 67">
    </div>
    
    <div class="form-group">
      <label class="form-label">Joylashuv (manzil)</label>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="geo-btn" id="geoBtn" onclick="getLocation()">
          📍 Avtomatik aniqlash
        </button>
      </div>
      <input type="text" class="form-input" id="custAddress" placeholder="Toshkent, Chilonzor, 5-uy">
      <div id="geoStatus" style="font-size:13px;margin-top:6px;display:none"></div>
    </div>
    
    <div class="form-group">
      <label class="form-label">To'lov usuli</label>
      <div class="pay-options">
        <div class="pay-option active" id="payNaxt" onclick="selectPay('naxt')">💵 Naqt</div>
        <div class="pay-option" id="payKarta" onclick="selectPay('karta')">💳 Karta</div>
        <div class="pay-option" id="payClick" onclick="selectPay('click')">📱 Click/Payme</div>
      </div>
    </div>
    
    <div class="cart-total-row" style="margin:20px 0 16px">
      <div class="cart-total-label">Umumiy summa:</div>
      <div class="cart-total-price">${fmt(getCartTotal())} so'm</div>
    </div>
    
    <button class="modal-add-btn" id="confirmBtn" onclick="placeOrder()">✅ Tasdiqlash</button>`;
  
  document.getElementById('checkoutModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
  document.body.style.overflow = '';
}

async function placeOrder() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();

  if (!name || !phone || !address) {
    alert("Iltimos, barcha maydonlarni to'ldiring!");
    return;
  }

  const btn = document.getElementById('confirmBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Yuborilmoqda...';

  try {
    const result = await apiFetch('order', {
      method: 'POST',
      body: JSON.stringify({ name, phone, address, payment: selectedPay, items: cart })
    });

    // Telegramga yuborish
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      await sendToTelegram(name, phone, address, selectedPay, cart, getCartTotal(), result.order_number);
    }

    // Tarixga qo'shish
    const newOrder = {
      order_number: result.order_number || ('BB' + Date.now().toString().slice(-6)),
      date: new Date().toLocaleDateString('uz-UZ') + " " + new Date().toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'}),
      name: name,
      phone: phone,
      address: address,
      payment: selectedPay,
      items: [...cart],
      total: getCartTotal()
    };

    orderHistory.unshift(newOrder);
    localStorage.setItem('mf_order_history', JSON.stringify(orderHistory));
    updateHistoryCount();

    // Savatni tozalash
    cart = [];
    saveCart();
    updateCartUI();

    // Muvaffaqiyat ekrani
    document.getElementById('checkoutBody').innerHTML = `
      <div class="success-state">
        <div class="success-icon">🎉</div>
        <div class="success-title">Buyurtma qabul qilindi!</div>
        <div class="success-sub">Buyurtma #${newOrder.order_number}<br>Tez orada siz bilan bog'lanamiz!</div>
      </div>`;

    setTimeout(closeCheckout, 4500);

  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = '✅ Tasdiqlash';
    alert("Buyurtma yuborishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
  }
}

async function sendToTelegram(name, phone, address, payment, items, total, orderNum) {
  const payLabels = { naxt: '💵 Naqt', karta: '💳 Karta', click: '📱 Click/Payme' };
  const lines = items.map(i => `• ${i.name} × ${i.qty} — ${fmt(i.price * i.qty)} so'm`).join('\n');
  
  const text = `🆕 Yangi buyurtma #${orderNum}\n━━━━━━━━━━━━\n👤 ${name}\n📞 ${phone}\n📍 ${address}\n💳 ${payLabels[payment]}\n━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━\n💰 Jami: ${fmt(total)} so'm`;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
  });
}

function fmt(n) {
  return Number(n).toLocaleString('uz-UZ');
}

function selectPay(type) {
  selectedPay = type;
  ['naxt','karta','click'].forEach(t => {
    const el = document.getElementById('pay' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.classList.toggle('active', t === type);
  });
}

// ── EVENT LISTENERS ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  // Modal tashqarisini bosganda yopish
  document.getElementById('productModal').addEventListener('click', e => {
    if (e.target.id === 'productModal') closeProductModal();
  });
  document.getElementById('cartOverlay').addEventListener('click', e => {
    if (e.target.id === 'cartOverlay') closeCart();
  });
  document.getElementById('checkoutModal').addEventListener('click', e => {
    if (e.target.id === 'checkoutModal') closeCheckout();
  });
});