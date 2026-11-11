const defaultStore = {
  name: "BOTIKA KAHERA",
  address: "Palompon, Leyte",
  contact: "09XX XXX XXXX",
  startingCash: 1000.00,
  footerMsg: "Salamat! Ang tambal dili na mabalik.",
  enableTax: false,
  enableService: false
};

const defaultCategories = [
  { id: 1, name: "Medicine", color: "#3b82f6" },
  { id: 2, name: "Vitamins", color: "#8b5cf6" },
  { id: 3, name: "First Aid", color: "#ef4444" },
  { id: 4, name: "Personal Care", color: "#22c55e" }
];

let categories = JSON.parse(localStorage.getItem('totskie_categories')) || defaultCategories;
let storeInfo = JSON.parse(localStorage.getItem('totskie_store')) || defaultStore;
if (storeInfo.startingCash === undefined) storeInfo.startingCash = 1000.00;

const defaultProducts = [
  { id: 9001, name: "Paracetamol 500mg (tableta)", price: 3, cost: 1.5, stock: 100, category: "Medicine", sc: true },
  { id: 9002, name: "Cetirizine 10mg (tableta)", price: 8, cost: 4, stock: 50, category: "Medicine", sc: true },
  { id: 9003, name: "Loperamide 2mg (kapsula)", price: 6, cost: 3, stock: 50, category: "Medicine", sc: true },
  { id: 9004, name: "Neozep (tableta)", price: 8, cost: 5, stock: 80, category: "Medicine", sc: true },
  { id: 9005, name: "Vitamin C 500mg (tableta)", price: 5, cost: 2.5, stock: 100, category: "Vitamins", sc: true },
  { id: 9006, name: "Multivitamins (kapsula)", price: 10, cost: 6, stock: 60, category: "Vitamins", sc: true },
  { id: 9007, name: "Alcohol 70% 60ml (botelya)", price: 25, cost: 17, stock: 20, category: "First Aid", sc: false },
  { id: 9008, name: "Betadine 15ml (botelya)", price: 50, cost: 35, stock: 20, category: "First Aid", sc: true },
  { id: 9009, name: "Band-aid (piraso)", price: 2, cost: 1, stock: 100, category: "First Aid", sc: false },
  { id: 9010, name: "Face mask (piraso)", price: 5, cost: 2.5, stock: 50, category: "Personal Care", sc: false },
  { id: 9011, name: "Sabon Safeguard 55g", price: 20, cost: 14, stock: 24, category: "Personal Care", sc: false }
];

let products = JSON.parse(localStorage.getItem('totskie_products')) || defaultProducts;
if (!Array.isArray(products) || products.length === 0) { products = defaultProducts.slice(); }
let salesHistory = JSON.parse(localStorage.getItem('totskie_sales')) || [];
let kitchenOrders = JSON.parse(localStorage.getItem('totskie_kds')) || [];
let utangPayments = JSON.parse(localStorage.getItem('totskie_utang')) || [];
function saveUtangStorage() { localStorage.setItem('totskie_utang', JSON.stringify(utangPayments)); syncToServer('totskie_utang', utangPayments); }

let cart = [];
let heldOrders = [];
let currentCustomer = "Walk-in Customer";
let currentCategory = 'All';
let rawPriceInput = '0';
let discountPercent = 0;
let scMode = null;
let cartNote = "";
let selectedPaymentMethod = "Cash";
let lastReceiptText = "";
let confirmCallback = null;

function saveCategoriesToStorage() { (localStorage.setItem('totskie_categories', JSON.stringify(categories)), syncToServer('totskie_categories', categories)); }
function saveProductsToStorage() { (localStorage.setItem('totskie_products', JSON.stringify(products)), syncToServer('totskie_products', products)); }
function saveSalesToStorage() { (localStorage.setItem('totskie_sales', JSON.stringify(salesHistory)), syncToServer('totskie_sales', salesHistory)); }
function saveStoreStorage() { (localStorage.setItem('totskie_store', JSON.stringify(storeInfo)), syncToServer('totskie_store', storeInfo)); }
function saveKdsStorage() { (localStorage.setItem('totskie_kds', JSON.stringify(kitchenOrders)), syncToServer('totskie_kds', kitchenOrders)); }

function applyStoreInfo() {
  document.getElementById('headerStoreName').innerText = storeInfo.name;
  document.getElementById('pageTitle').innerText = `${storeInfo.name} - POS`;
}
applyStoreInfo();

function renderCategoryTabs() {
  const container = document.getElementById('categoryTabs');
  container.innerHTML = `<button class="category-tab ${currentCategory === 'All' ? 'active' : ''}" onclick="filterCategory('All')">All Items</button>`;
  categories.forEach(cat => {
    const activeClass = currentCategory === cat.name ? 'active' : '';
    container.innerHTML += `<button class="category-tab ${activeClass}" onclick="filterCategory('${cat.name}')">${cat.name}</button>`;
  });
}
renderCategoryTabs();

function showCustomAlert(msg) {
  document.getElementById('customAlertMessage').innerText = msg;
  document.getElementById('customAlertModal').style.display = 'flex';
}
function closeCustomAlert() { document.getElementById('customAlertModal').style.display = 'none'; }

function showCustomConfirm(msg, onConfirm) {
  document.getElementById('customConfirmMessage').innerText = msg;
  confirmCallback = onConfirm;
  document.getElementById('confirmYesBtn').onclick = () => { closeCustomConfirm(true); };
  document.getElementById('customConfirmModal').style.display = 'flex';
}
function closeCustomConfirm(result) {
  document.getElementById('customConfirmModal').style.display = 'none';
  if (result && confirmCallback) confirmCallback();
  confirmCallback = null;
}

function openCustomerModal() {
  document.getElementById('inputCustomerName').value = currentCustomer === "Walk-in Customer" ? "" : currentCustomer;
  document.getElementById('customerModal').style.display = 'flex';
}
function closeCustomerModal() { document.getElementById('customerModal').style.display = 'none'; }
function saveCustomerName() {
  const name = document.getElementById('inputCustomerName').value.trim();
  if (name) {
    currentCustomer = name;
    document.getElementById('customerNameDisplay').innerText = `👤 ${currentCustomer}`;
  }
  closeCustomerModal();
}

function openNoteModal() {
  document.getElementById('inputOrderNote').value = cartNote;
  document.getElementById('noteModal').style.display = 'flex';
}
function closeNoteModal() { document.getElementById('noteModal').style.display = 'none'; }
function saveOrderNote() {
  cartNote = document.getElementById('inputOrderNote').value.trim();
  closeNoteModal();
  showCustomAlert("Order note saved successfully!");
}

function renderProducts(items) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #64748b; font-size: 10px; margin-top: 20px;">No menu items found</div>';
    return;
  }
  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.cursor = 'pointer';
    
    const catObj = categories.find(c => c.name === p.category);
    card.style.setProperty('--cat-color', catObj ? catObj.color : '#3b82f6');

    let stockClass = p.stock <= 5 ? 'product-stock low' : 'product-stock';
    let stockText = p.stock <= 5 ? `⚠️ Low: ${p.stock}` : `Stock: ${p.stock}`;

    card.innerHTML = `
      <div class="product-name" style="pointer-events: none;">${p.name}</div>
      <div class="product-footer" style="pointer-events: none;">
        <div class="product-price">₱${p.price.toFixed(2)}</div>
        <div class="${stockClass}">${stockText}</div>
      </div>
    `;
    
    // Bind click securely using dataset and direct event listener
    card.addEventListener('click', () => {
      console.log("Card clicked for product ID:", p.id);
      addToCart(p.id);
    });

    grid.appendChild(card);
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebarDrawer');
  sidebar.style.display = sidebar.style.display === 'flex' ? 'none' : 'flex';
}

function setOrderType(btn) {
  document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function filterCategory(category) {
  currentCategory = category;
  renderCategoryTabs();
  filterProducts();
}

function filterProducts() {
  const query = document.getElementById('searchBox').value.toLowerCase();
  const filtered = products.filter(p => {
    const matchesCategory = currentCategory === 'All' || p.category === currentCategory;
    const matchesSearch = p.name.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
  renderProducts(filtered);
}


/* CATEGORY MANAGER LOGIC */
function toggleCategorySection() {
  const sec = document.getElementById('categoryManagerContainer');
  sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
  if (sec.style.display === 'block') renderCategoryList();
}

function renderCategoryList() {
  const container = document.getElementById('categoryListContainer');
  container.innerHTML = '';
  categories.forEach((cat, index) => {
    const div = document.createElement('div');
    div.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 4px 6px; border-radius: 4px; font-size: 10px;";
    div.innerHTML = `
      <span style="color: #fff; font-weight: bold;">${cat.name}</span>
      <div style="display: flex; gap: 8px;">
        <button style="background: #334155; color: #38bdf8; border: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; min-height: 44px; min-width: 44px; cursor: pointer;" onclick="renameCategory(${index})">Edit</button>
        <button style="background: #7f1d1d; color: #fca5a5; border: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; min-height: 44px; min-width: 44px; cursor: pointer;" onclick="deleteCategory(${index})">Del</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function addNewCategory() {
  const name = document.getElementById('newCategoryInput').value.trim();
  if (!name) { showCustomAlert("Please enter a category name."); return; }
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { showCustomAlert("Category already exists!"); return; }
  
  const colors = ["#3b82f6", "#8b5cf6", "#ef4444", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  categories.push({ id: Date.now(), name, color: randomColor });
  saveCategoriesToStorage();
  document.getElementById('newCategoryInput').value = '';
  renderCategoryList();
  renderCategoryTabs();
  populateCategorySelect();
}

function renameCategoryApply(index, newName) {
  const oldName = categories[index].name;
  if (newName && newName.trim() !== "") {
    const trimmed = newName.trim();
    categories[index].name = trimmed;
    products.forEach(p => { if (p.category === oldName) p.category = trimmed; });
    if (currentCategory === oldName) currentCategory = trimmed;
    saveCategoriesToStorage();
    saveProductsToStorage();
    renderCategoryList();
    renderCategoryTabs();
    populateCategorySelect();
    filterProducts();
  }
}

function deleteCategory(index) {
  showCustomConfirm("Delete this category? Items under this will revert to 'All Items'.", () => {
    categories.splice(index, 1);
    saveCategoriesToStorage();
    renderCategoryList();
    renderCategoryTabs();
    populateCategorySelect();
    filterProducts();
  });
}

function populateCategorySelect() {
  const select = document.getElementById('inputItemCategory');
  select.innerHTML = '';
  categories.forEach(c => {
    select.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });
}

function openZReportModal() {
  let cashSales = 0, gcashSales = 0, voidedTotal = 0;
  salesHistory.forEach(s => {
    if (s.isVoided) {
      voidedTotal += s.total;
    } else {
      if (s.paymentMethod === 'GCash') gcashSales += s.total;
      else if (s.paymentMethod !== 'Utang') cashSales += s.total;
    }
  });
  let startingFloat = storeInfo.startingCash || 1000.00;
  let utangPaid = utangPayments.filter(e => e.type === 'payment' && new Date(e.time).toDateString() === new Date().toDateString()).reduce((a, e) => a + e.amount, 0);
  document.getElementById('zUtangPaid').innerText = `₱${utangPaid.toFixed(2)}`;
  let expectedCash = startingFloat + cashSales + utangPaid;

  document.getElementById('zStartingCashDisplay').innerText = `₱${startingFloat.toFixed(2)}`;
  document.getElementById('zCashSales').innerText = `₱${cashSales.toFixed(2)}`;
  document.getElementById('zGcashSales').innerText = `₱${gcashSales.toFixed(2)}`;
  document.getElementById('zVoidedSales').innerText = `₱${voidedTotal.toFixed(2)}`;
  document.getElementById('zExpectedCash').innerText = `₱${expectedCash.toFixed(2)}`;
  document.getElementById('zReportModal').style.display = 'flex';
}
function closeZReportModal() { document.getElementById('zReportModal').style.display = 'none'; }

function exportSalesCsv() {
  if (salesHistory.length === 0) { showCustomAlert("No sales history available to export!"); return; }
  let csvContent = "data:text/csv;charset=utf-8,TransactionID,Customer,ItemsCount,TotalAmount,PaymentMethod,Status,Time\n";
  salesHistory.forEach(s => {
    csvContent += `${s.id},"${s.customer}",${s.itemsCount},${s.total},${s.paymentMethod || 'Cash'},${s.isVoided ? 'VOIDED' : 'ACTIVE'},"${s.time}"\n`;
  });
  triggerFileDownload(csvContent, "totskie_sales_report.csv");
}

function exportInventoryCsv() {
  if (products.length === 0) { showCustomAlert("No inventory items available to export!"); return; }
  let csvContent = "data:text/csv;charset=utf-8,ID,ItemName,Category,Price,Stock\n";
  products.forEach(p => {
    csvContent += `${p.id},"${p.name}",${p.category},${p.price},${p.stock}\n`;
  });
  triggerFileDownload(csvContent, "totskie_inventory.csv");
}

function triggerFileDownload(content, filename) {
  const encodedUri = encodeURI(content);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

let kdsPollTimer = null;
let kdsPollBusy = false;
let kdsMutateStamp = 0;
function startKdsPolling() { stopKdsPolling(); kdsPollTimer = setInterval(pollKds, 4000); }
function stopKdsPolling() { if (kdsPollTimer) { clearInterval(kdsPollTimer); kdsPollTimer = null; } }
function pollKds() {
  if (kdsPollBusy) return;
  kdsPollBusy = true;
  const stamp = kdsMutateStamp;
  fetch('/api/kds')
    .then(r => { if (r.status === 401) { location.reload(); return null; } return r.ok ? r.json() : null; })
    .then(list => {
      if (!Array.isArray(list) || stamp !== kdsMutateStamp) return;
      if (JSON.stringify(list) !== JSON.stringify(kitchenOrders)) { applyKdsList(list); renderKdsOrders(); }
    })
    .catch(() => {})
    .finally(() => { kdsPollBusy = false; });
}
function openKdsModal() { renderKdsOrders(); document.getElementById('kdsModal').style.display = 'flex'; startKdsPolling(); }
function closeKdsModal() { stopKdsPolling(); document.getElementById('kdsModal').style.display = 'none'; }
function renderKdsOrders() {
  const container = document.getElementById('kdsContainer');
  container.innerHTML = '';
  if (kitchenOrders.length === 0) {
    container.innerHTML = '<div class="cart-empty" style="grid-column: 1/-1;">No active kitchen orders</div>';
    return;
  }
  kitchenOrders.forEach((order, index) => {
    const card = document.createElement('div');
    card.className = `kds-card ${order.status}`;
    let itemsHtml = '';
    order.items.forEach(i => { itemsHtml += `<div style="font-size: 10px; color: #f8fafc;">• ${i.name} <strong>x${i.qty}</strong></div>`; });
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 4px;">
        <span style="font-weight: bold; color: #38bdf8; font-size: 11px;">${order.customer}</span>
        <span style="font-size: 8px; color: #94a3b8;">${order.time}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px;">${itemsHtml}</div>
      ${order.note ? `<div style="font-size: 9px; color: #f59e0b; background: #1e293b; padding: 3px; border-radius: 3px;">Note: ${order.note}</div>` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <span style="font-size: 9px; font-weight: bold; color: ${order.status === 'pending' ? '#f59e0b' : '#22c55e'};">${order.status.toUpperCase()}</span>
        <button class="modal-btn" style="padding: 3px 6px; font-size: 8px; background: ${order.status === 'pending' ? '#22c55e' : '#334155'}; color: ${order.status === 'pending' ? '#0f172a' : '#fff'};" onclick="toggleKdsStatus(${order.id})">${order.status === 'pending' ? 'Mark Ready' : 'Clear Order'}</button>
      </div>
    `;
    const printBtn = document.createElement('button');
    printBtn.className = 'modal-btn';
    printBtn.style.cssText = 'min-height: 44px; width: 100%; margin-top: 6px; background: #334155; color: #fff; font-size: 11px;';
    printBtn.innerText = '\uD83D\uDDA8\uFE0F Print';
    printBtn.onclick = () => printKdsTicket(index);
    card.appendChild(printBtn);
    container.appendChild(card);
  });
}
function printKdsTicket(index) {
  const order = kitchenOrders[index];
  const box = document.getElementById('kdsTicket');
  if (!order || !box) { showCustomAlert('Ticket block not ready yet.'); return; }
  box.innerHTML = '';
  const add = (text, cls) => {
    const d = document.createElement('div');
    d.className = cls || 'kt-line';
    d.textContent = text;
    box.appendChild(d);
  };
  add('KITCHEN ORDER', 'kt-title');
  if (order.orderType) add(order.orderType, 'kt-type');
  add(order.customer, 'kt-line');
  add(order.time, 'kt-line');
  add('--------------------', 'kt-line');
  order.items.forEach(i => add(i.qty + 'x ' + i.name, 'kt-item'));
  if (order.note) {
    add('--------------------', 'kt-line');
    add('NOTE: ' + order.note, 'kt-note');
  }
  document.body.classList.add('printing-ticket');
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-ticket'), { once: true });
  window.print();
}
function applyKdsList(list) {
  if (!Array.isArray(list)) return;
  kitchenOrders = list;
  localStorage.setItem('totskie_kds', JSON.stringify(kitchenOrders));
}
function kdsCall(url, body) {
  kdsMutateStamp++;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(r => {
    if (r.status === 401) { location.reload(); return null; }
    if (!r.ok) throw new Error('bad status');
    return r.json();
  }).then(d => { if (d && d.orders) applyKdsList(d.orders); return d; })
    .catch(() => { showCustomAlert('Could not reach server for kitchen orders.'); return null; });
}
function toggleKdsStatus(id) {
  const o = kitchenOrders.find(x => x.id === id);
  const path = (o && o.status === 'pending') ? '/ready' : '/remove';
  kdsCall('/api/kds/' + id + path).then(() => renderKdsOrders());
}

function openPaymentModal() {
  if (cart.length === 0) { showCustomAlert("Please add items to cart before checkout."); return; }
  let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discAmount = discAmt(subtotal);
  let taxableBase = subtotal - discAmount;
  let taxAmount = storeInfo.enableTax ? taxOn(taxableBase) : 0;
  let serviceAmount = storeInfo.enableService ? taxableBase * 0.05 : 0;
  let grandTotal = Math.round((taxableBase + taxAmount + serviceAmount) * 100) / 100;

  document.getElementById('payModalTotal').innerText = `₱${grandTotal.toFixed(2)}`;
  document.getElementById('cashTenderedInput').value = '';
  document.getElementById('changeDisplay').innerText = '₱0.00';

  
  
  
  const qrImg = document.getElementById('gcashQrImage');
  const qrBox = qrImg.parentElement;
  let qrNote = document.getElementById('gcashNoQrNote');
  if (!qrNote) {
    qrNote = document.createElement('div');
    qrNote.id = 'gcashNoQrNote';
    qrNote.style.cssText = 'font-size: 10px; color: #94a3b8; padding: 6px 0;';
    qrNote.innerText = 'No QR uploaded (owner: Settings)';
    qrBox.parentNode.insertBefore(qrNote, qrBox);
  }
  if (storeInfo.gcashQr) { qrImg.src = storeInfo.gcashQr; qrBox.style.display = 'flex'; qrNote.style.display = 'none'; }
  else { qrImg.removeAttribute('src'); qrBox.style.display = 'none'; qrNote.style.display = 'block'; }
  const gcashRefBox = document.getElementById('gcashRefInput'); if (gcashRefBox) gcashRefBox.value = '';
  document.getElementById('qrStoreLabel').innerText = storeInfo.name;
  document.getElementById('qrContactLabel').innerText = storeInfo.contact;
  switchPaymentMethod('Cash');
  document.getElementById('paymentModal').style.display = 'flex';
}
function closePaymentModal() { document.getElementById('paymentModal').style.display = 'none'; }
function calculateChange() {
  // Auto enable/disable Confirm button based on cash tendered vs grand total
  let confirmBtn = document.querySelector('button[onclick="confirmAndProcessPayment()"]');
  if (confirmBtn && document.getElementById('tabCash').classList.contains('active')) {
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let discAmount = discAmt(subtotal);
    let taxableBase = subtotal - discAmount;
    let taxAmount = storeInfo.enableTax ? taxOn(taxableBase) : 0;
    let serviceAmount = storeInfo.enableService ? taxableBase * 0.05 : 0;
    let grandTotal = Math.round((taxableBase + taxAmount + serviceAmount) * 100) / 100;
    
    let tendered = parseFloat(document.getElementById('cashTenderedInput').value) || 0;
    if (tendered < grandTotal) {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.5';
      confirmBtn.style.cursor = 'not-allowed';
    } else {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
  }
  let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discAmount = discAmt(subtotal);
  let taxableBase = subtotal - discAmount;
  let taxAmount = storeInfo.enableTax ? taxOn(taxableBase) : 0;
  let serviceAmount = storeInfo.enableService ? taxableBase * 0.05 : 0;
  let grandTotal = Math.round((taxableBase + taxAmount + serviceAmount) * 100) / 100;
  let tendered = parseFloat(document.getElementById('cashTenderedInput').value) || 0;
  let change = tendered - grandTotal;
  const changeDisplay = document.getElementById('changeDisplay');
  if (change >= 0) { changeDisplay.innerText = `₱${change.toFixed(2)}`; changeDisplay.style.color = '#22c55e'; }
  else { changeDisplay.innerText = `Insufficient cash by ₱${Math.abs(change).toFixed(2)}`; changeDisplay.style.color = '#ef4444'; }
}
function confirmAndProcessPayment() {
  const needed = {};
  cart.forEach(item => { if (!item.isCustom) needed[String(item.id)] = (needed[String(item.id)] || 0) + item.qty; });
  for (const pid in needed) {
    const prod = products.find(p => String(p.id) === pid);
    if (prod && needed[pid] > prod.stock) { showCustomAlert("Not enough stock for " + prod.name + ". Available: " + prod.stock); return; }
  }
  let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  let discAmount = discAmt(subtotal);
  let taxableBase = subtotal - discAmount;
  let taxAmount = storeInfo.enableTax ? taxOn(taxableBase) : 0;
  let serviceAmount = storeInfo.enableService ? taxableBase * 0.05 : 0;
  let grandTotal = Math.round((taxableBase + taxAmount + serviceAmount) * 100) / 100;
  if (selectedPaymentMethod === 'Utang') {
    const un = (document.getElementById('utangNameInput').value || '').trim();
    if (!un) { showCustomAlert("Enter the customer name for utang."); return; }
    window.currentTendered = 0; window.currentUtangName = un;
  } else if (selectedPaymentMethod === 'Cash') {
    let tendered = parseFloat(document.getElementById('cashTenderedInput').value) || 0;
    if (tendered < grandTotal) { showCustomAlert("Cash tendered is less than the total amount due!"); return; }
    window.currentTendered = tendered;
  } else {
    window.currentTendered = 0;
    const refEl = document.getElementById('gcashRefInput');
    const ref = refEl ? refEl.value.replace(/\s+/g, '') : '';
    if (!/^[0-9A-Za-z]{4,20}$/.test(ref)) { showCustomAlert("Enter the GCash reference number (at least 4 letters or digits) before confirming."); return; }
    window.currentGcashRef = ref;
  }
  closePaymentModal();
  processPaymentFinal(grandTotal);
}

function openSettingsModal() {
  document.getElementById('settingStoreName').value = storeInfo.name;
  document.getElementById('settingStoreAddress').value = storeInfo.address;
  document.getElementById('settingStoreContact').value = storeInfo.contact;
  document.getElementById('settingStartingCash').value = storeInfo.startingCash || 1000.00;
  document.getElementById('settingFooterMessage').value = storeInfo.footerMsg || "Thank you, come again!";
  document.getElementById('settingEnableTax').checked = storeInfo.enableTax;
  document.getElementById('settingEnableService').checked = storeInfo.enableService;
  pendingGcashQr = undefined;
  const qrFileEl = document.getElementById('settingGcashQrFile'); if (qrFileEl) qrFileEl.value = '';
  updateQrPreview(storeInfo.gcashQr || '');
  document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettingsModal() { document.getElementById('settingsModal').style.display = 'none'; }
let pendingGcashQr;
function updateQrPreview(src) {
  const img = document.getElementById('settingGcashQrPreview');
  const btn = document.getElementById('settingGcashQrRemove');
  if (!img || !btn) return;
  if (src) { img.src = src; img.style.display = 'block'; btn.style.display = 'block'; }
  else { img.removeAttribute('src'); img.style.display = 'none'; btn.style.display = 'none'; }
}
function handleGcashQrFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => showCustomAlert('Could not read that image.');
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => showCustomAlert('That file is not a usable image.');
    img.onload = () => {
      const scale = Math.min(1, 300 / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      pendingGcashQr = cv.toDataURL('image/png');
      updateQrPreview(pendingGcashQr);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function removeGcashQr() {
  pendingGcashQr = '';
  const f = document.getElementById('settingGcashQrFile'); if (f) f.value = '';
  updateQrPreview('');
}
function saveStoreSettings() {
  const startingCashVal = parseFloat(document.getElementById('settingStartingCash').value);
  storeInfo.name = document.getElementById('settingStoreName').value.trim() || "BOTIKA KAHERA";
  storeInfo.address = document.getElementById('settingStoreAddress').value.trim() || "";
  storeInfo.contact = document.getElementById('settingStoreContact').value.trim() || "";
  storeInfo.startingCash = isNaN(startingCashVal) ? 1000.00 : startingCashVal;
  storeInfo.footerMsg = document.getElementById('settingFooterMessage').value.trim() || "Thank you, come again!";
  storeInfo.enableTax = document.getElementById('settingEnableTax').checked;
  storeInfo.enableService = document.getElementById('settingEnableService').checked;
  if (pendingGcashQr !== undefined) {
    if (pendingGcashQr) storeInfo.gcashQr = pendingGcashQr; else delete storeInfo.gcashQr;
    pendingGcashQr = undefined;
  }
  saveStoreStorage(); applyStoreInfo(); closeSettingsModal(); updateCart();
  showCustomAlert("Store settings and starting cash float saved successfully!");
}

function openSalesHistoryModal() { renderSalesHistoryTable(); document.getElementById('salesHistoryModal').style.display = 'flex'; }
function closeSalesHistoryModal() { document.getElementById('salesHistoryModal').style.display = 'none'; }
function renderSalesHistoryTable() {
  const tbody = document.getElementById('salesHistoryTableBody');
  tbody.innerHTML = '';
  let totalRevenue = 0; let totalProfit = 0;
  if (salesHistory.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b;">No transactions recorded today</td></tr>';
    document.getElementById('totalRevenueDisplay').innerText = `₱${(utangPayments.filter(e => e.type === 'payment' && new Date(e.time).toDateString() === new Date().toDateString()).reduce((a, e) => a + e.amount, 0)).toFixed(2)}`; document.getElementById('totalProfitDisplay').innerText = '₱0.00';
    return;
  }
  salesHistory.forEach((sale, index) => {
    if (!sale.isVoided && sale.paymentMethod !== 'Utang') { totalRevenue += sale.total; if (sale.items.every(i => i.cost !== undefined)) totalProfit += sale.total - sale.items.reduce((c, i) => c + i.cost * i.qty, 0); }
    const tr = document.createElement('tr');
    let statusStyle = sale.isVoided ? 'text-decoration: line-through; color: #ef4444;' : 'color: #22c55e; font-weight: bold;';
    tr.innerHTML = `
      <td><div style="font-weight: bold; color: #38bdf8;">${sale.customer} (${sale.paymentMethod || 'Cash'})</div><div style="font-size: 8px; color: #94a3b8;">${sale.time}${sale.gcashRef ? ' | Ref: ' + sale.gcashRef : ''}</div></td>
      <td style="${statusStyle}">₱${sale.total.toFixed(2)}${sale.isVoided ? ' (VOID)' : ''}</td>
      <td>${sale.isVoided ? '<span style="font-size: 8px; color: #ef4444;">Voided</span>' : `<button style="background: #7f1d1d; color: #fca5a5; border: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; min-height: 44px; min-width: 44px; cursor: pointer;" onclick="promptVoidTransaction(${index})">Void</button>`}</td>
    `;
    tbody.appendChild(tr);
  });
  const _up = utangPayments.filter(e => e.type === 'payment' && new Date(e.time).toDateString() === new Date().toDateString()).reduce((a, e) => a + e.amount, 0); document.getElementById('totalRevenueDisplay').innerText = `₱${(totalRevenue + _up).toFixed(2)}`; document.getElementById('totalProfitDisplay').innerText = `₱${totalProfit.toFixed(2)}`;
}

function promptVoidTransaction(index) {
  showCustomConfirm("Are you sure you want to void this transaction? Stock will be restored and revenue adjusted.", () => {
    let sale = salesHistory[index];
    sale.isVoided = true; utangPayments = utangPayments.filter(e => !(e.type === 'charge' && e.saleId === sale.id)); saveUtangStorage();
    sale.items.forEach(item => {
      if (!item.isCustom) {
        let p = products.find(prod => prod.id === item.id);
        if (p) { p.stock += item.qty; restoreBatches(p, item); }
      }
    });
    saveProductsToStorage(); saveSalesToStorage(); renderSalesHistoryTable(); renderProducts(products);
    showCustomAlert("Transaction voided successfully and inventory stock restored.");
  });
}

function clearSalesHistory() {
  showCustomConfirm("Are you sure you want to reset all sales history?", () => {
    salesHistory = []; saveSalesToStorage(); renderSalesHistoryTable();
    showCustomAlert("Sales history reset successfully.");
  });
}

function openItemManagerModal() {
  populateCategorySelect();
  renderManagerTable();
  cancelProductForm();
  document.getElementById('itemManagerModal').style.display = 'flex';
}
function closeItemManagerModal() { document.getElementById('itemManagerModal').style.display = 'none'; filterProducts(); }
function renderManagerTable() {
  const tbody = document.getElementById('managerTableBody');
  tbody.innerHTML = '';
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: bold; color: #f8fafc;">${p.name}</td>
      <td>${p.category}</td>
      <td style="color: #22c55e;">₱${p.price.toFixed(2)}</td>
      <td style="${p.stock <= 5 ? 'color:#ef4444; font-weight:bold;' : ''}">${p.stock}${expTag(p)}${p.restocks && p.restocks.length ? `<div style="font-size: 8px; color: #94a3b8; font-weight: normal;">Last restock: ${new Date(p.restocks[p.restocks.length - 1].date).toLocaleDateString()} +${p.restocks[p.restocks.length - 1].qty}</div>` : ''}</td>
      <td>
        <button style="background: #334155; color: #38bdf8; border: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; min-height: 44px; min-width: 44px; cursor: pointer;" onclick="editProduct(${p.id})">Edit</button>
                <button style="background: #14532d; color: #86efac; border: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; min-height: 44px; min-width: 44px; cursor: pointer;" onclick="restockProduct(${p.id})">Restock</button>
        <button style="background: #7f1d1d; color: #fca5a5; border: none; padding: 10px 14px; border-radius: 6px; font-size: 13px; min-height: 44px; min-width: 44px; cursor: pointer;" onclick="promptDeleteProduct(${p.id})">Del</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
function openAddProductForm() {
  populateCategorySelect();
  document.getElementById('formTitle').innerText = "Add New Product";
  document.getElementById('editProductId').value = '';
  document.getElementById('inputItemName').value = '';
  document.getElementById('inputItemPrice').value = '';
  document.getElementById('inputItemStock').value = '10'; document.getElementById('inputItemCost').value = ''; document.getElementById('inputItemExpiry').value = ''; document.getElementById('inputItemSC').checked = true;
  document.getElementById('productFormContainer').style.display = 'block';
}
function cancelProductForm() { document.getElementById('productFormContainer').style.display = 'none'; }
function editProduct(id) {
  const p = products.find(item => item.id === id);
  if (!p) return;
  populateCategorySelect();
  document.getElementById('formTitle').innerText = "Edit Product";
  document.getElementById('editProductId').value = p.id;
  document.getElementById('inputItemName').value = p.name;
  document.getElementById('inputItemPrice').value = p.price;
  document.getElementById('inputItemStock').value = p.stock; document.getElementById('inputItemCost').value = p.cost || ''; document.getElementById('inputItemExpiry').value = nearestExp(p); document.getElementById('inputItemSC').checked = (p.sc === true);
  document.getElementById('inputItemCategory').value = p.category;
  document.getElementById('productFormContainer').style.display = 'block';
}
function saveProductData() {
  const editId = document.getElementById('editProductId').value;
  const name = document.getElementById('inputItemName').value.trim();
  const price = parseFloat(document.getElementById('inputItemPrice').value);
  const stock = parseInt(document.getElementById('inputItemStock').value); const cost = parseFloat(document.getElementById('inputItemCost').value) || 0;
  const category = document.getElementById('inputItemCategory').value; const expiry = document.getElementById('inputItemExpiry').value; const sc = document.getElementById('inputItemSC').checked;
  if (!name || isNaN(price) || price <= 0 || isNaN(stock)) { showCustomAlert("Please enter valid product details."); return; }

  if (editId) {
    const p = products.find(item => item.id == editId);
    if (p) { p.name = name; p.price = price; p.stock = stock; p.cost = cost; p.category = category; setExp(p, expiry, stock); p.sc = sc; }
  } else {
    const np = { id: Date.now(), name, price, cost, stock, category, sc }; setExp(np, expiry, stock); products.push(np);
  }
  saveProductsToStorage(); renderManagerTable(); cancelProductForm();
}
function nearestExp(p) { const b = (p.batches || []).filter(x => x.exp).map(x => x.exp).sort(); return b[0] || ''; }
function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s)); }
function addBatch(p, qty, exp, sup, lot) { if (exp && !validDate(exp)) exp = ''; const cl = s => (s || '').replace(/[<>&"]/g, '').slice(0, 40); p.batches = (p.batches || []).concat([{ qty: qty, exp: exp, sup: cl(sup), lot: cl(lot) }]); }
function setExp(p, exp, stock) {
  if (exp && !validDate(exp)) exp = '';
  const bs = p.batches || [];
  if (!bs.length) { if (exp) p.batches = [{ qty: stock, exp: exp }]; return; }
  if (exp) { const i = bs.findIndex(x => x.exp === nearestExp(p)); bs[i >= 0 ? i : 0].exp = exp; }
  else { bs.forEach(x => { x.exp = ''; }); }
}
function expTag(p) {
  const e = nearestExp(p); if (!e) return '';
  const d = Math.ceil((new Date(e) - new Date()) / 86400000);
  const c = d < 0 ? '#ef4444' : d <= 30 ? '#f59e0b' : '#94a3b8';
  return '<br><small style="color:' + c + '">Exp ' + e + (d < 0 ? ' (EXPIRED)' : '') + '</small>';
}
function restockProduct(id) {
  const p = products.find(x => x.id == id);
  if (!p) return;
  const k = parseInt(prompt("How many " + p.name + " added? (now: " + p.stock + ")", ""));
  if (isNaN(k) || k <= 0) return;
  p.stock += k; const ex = prompt("Expiry date of this batch? (YYYY-MM-DD, blank = none)", "") || ""; const sup = prompt("Supplier? (blank = none)", "") || ""; const lot = prompt("Lot/Batch No.? (blank = none)", "") || ""; addBatch(p, k, ex.trim(), sup.trim(), lot.trim());
  p.restocks = (p.restocks || []).concat([{ date: new Date().toISOString(), qty: k }]).slice(-20);
  saveProductsToStorage(); renderManagerTable();
  showCustomAlert("Added " + k + " to " + p.name + ". Stock is now " + p.stock + ".");
}
function promptDeleteProduct(id) {
  showCustomConfirm("Are you sure you want to delete this product?", () => {
    products = products.filter(item => item.id !== id);
    saveProductsToStorage(); renderManagerTable();
  });
}

function holdCurrentOrder() {
  if (cart.length === 0) { showCustomAlert("Cart is empty!"); return; }
  heldOrders.push({
    id: Date.now(), customer: currentCustomer, items: [...cart], note: cartNote, discount: discountPercent,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  document.getElementById('heldCount').innerText = heldOrders.length;
  showCustomAlert(`Ticket saved for ${currentCustomer}!`);
  clearCart();
}
function openHeldOrdersModal() {
  const container = document.getElementById('heldOrdersList');
  container.innerHTML = '';
  if (heldOrders.length === 0) {
    container.innerHTML = '<div class="cart-empty">No held orders found</div>';
    document.getElementById('heldModal').style.display = 'flex';
    return;
  }
  heldOrders.forEach((order, index) => {
    const div = document.createElement('div');
    div.style.cssText = "background: #0f172a; border: 1px solid #334155; padding: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";
    div.innerHTML = `
      <div><div style="font-weight: bold; color: #38bdf8;">${order.customer} (${order.time})</div><div style="font-size: 9px; color: #94a3b8;">${order.items.length} items</div></div>
      <button style="background: #22c55e; color: #0f172a; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 9px;" onclick="restoreHeldOrder(${index})">Resume</button>
    `;
    container.appendChild(div);
  });
  document.getElementById('heldModal').style.display = 'flex';
}
function restoreHeldOrder(index) {
  const order = heldOrders[index];
  cart = order.items; currentCustomer = order.customer; cartNote = order.note; discountPercent = order.discount;
  document.getElementById('customerNameDisplay').innerText = `👤 ${currentCustomer}`;
  heldOrders.splice(index, 1);
  document.getElementById('heldCount').innerText = heldOrders.length;
  closeHeldOrdersModal(); updateCart();
}
function closeHeldOrdersModal() { document.getElementById('heldModal').style.display = 'none'; }

function openCustomModal() { rawPriceInput = '0'; document.getElementById('customName').value = ''; updateNumpadDisplay(); document.getElementById('customModal').style.display = 'flex'; }
function closeCustomModal() { document.getElementById('customModal').style.display = 'none'; }
function pressNumpad(val) { if (rawPriceInput === '0') rawPriceInput = val; else if (rawPriceInput.length < 7) rawPriceInput += val; updateNumpadDisplay(); }
function clearNumpad() { rawPriceInput = '0'; updateNumpadDisplay(); }
function backspaceNumpad() { rawPriceInput = rawPriceInput.slice(0, -1); if (rawPriceInput === '') rawPriceInput = '0'; updateNumpadDisplay(); }
function updateNumpadDisplay() { document.getElementById('numpadDisplay').innerText = `₱${(parseFloat(rawPriceInput) || 0).toFixed(2)}`; }
function addCustomItemToCart() {
  const name = document.getElementById('customName').value.trim() || "Custom Item";
  const price = parseFloat(rawPriceInput) || 0;
  if (price <= 0) { showCustomAlert("Please enter a valid price."); return; }
  cart.push({ id: "custom_" + Date.now(), name, price, qty: 1, isCustom: true });
  updateCart(); closeCustomModal();
}

function changeQty(id, change) {
  const item = cart.find(i => String(i.id) === String(id));
  if (!item) return;
  if (!item.isCustom) {
    const prod = products.find(p => String(p.id) === String(id));
    if (prod && change > 0 && item.qty >= prod.stock) { showCustomAlert("Stock limit reached!"); return; }
  }
  item.qty += change;
  if (item.qty <= 0) cart = cart.filter(i => String(i.id) !== String(id));
  updateCart();
}
function clearCart() { cart = []; discountPercent = 0; scMode = null; cartNote = ""; currentCustomer = "Walk-in Customer"; document.getElementById('customerNameDisplay').innerText = `👤 ${currentCustomer}`; updateCart(); }

function updateCart() {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">No items added yet</div>';
    document.getElementById('cartCount').innerText = '0 items';
    document.getElementById('subtotalText').innerText = '₱0.00';
    document.getElementById('totalText').innerText = '₱0.00';
    document.getElementById('discountRow').style.display = 'none';
    document.getElementById('taxRow').style.display = 'none';
    return;
  }
  let totalItems = 0, subtotal = 0;
  cart.forEach(item => {
    totalItems += item.qty;
    subtotal += item.price * item.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-info"><div class="cart-item-name">${item.name}</div><div class="cart-item-price">₱${(item.price * item.qty).toFixed(2)}</div></div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
        <span class="item-qty">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
      </div>
    `;
    container.appendChild(div);
  });

  let discAmount = discAmt(subtotal);
  let taxableBase = subtotal - discAmount;
  let taxAmount = storeInfo.enableTax ? taxOn(taxableBase) : 0;
  let serviceAmount = storeInfo.enableService ? taxableBase * 0.05 : 0;
  let grandTotal = Math.round((taxableBase + taxAmount + serviceAmount) * 100) / 100;

  if (discountPercent > 0 || scMode) {
    document.getElementById('discountRow').style.display = 'flex';
    document.getElementById('discountText').innerText = `-₱${discAmount.toFixed(2)}`;
  } else { document.getElementById('discountRow').style.display = 'none'; }

  if ((storeInfo.enableTax && !scMode) || storeInfo.enableService) {
    document.getElementById('taxRow').style.display = 'flex';
    let labels = [];
    if (storeInfo.enableTax) labels.push("VAT (12%)");
    if (storeInfo.enableService) labels.push("SrvC (5%)");
    document.getElementById('taxLabel').innerText = labels.join(" + ");
    document.getElementById('taxText').innerText = `₱${(taxAmount + serviceAmount).toFixed(2)}`;
  } else { document.getElementById('taxRow').style.display = 'none'; }

  document.getElementById('cartCount').innerText = `${totalItems} items`;
  document.getElementById('subtotalText').innerText = `₱${subtotal.toFixed(2)}`;
  document.getElementById('totalText').innerText = `₱${grandTotal.toFixed(2)}`;
}

function processPaymentFinal(grandTotal) {
  cart.forEach(item => {
    if (!item.isCustom) {
      const p = products.find(prod => prod.id === item.id);
      if (p) deductFEFO(p, item.qty, item);
    }
  });
  saveProductsToStorage(); renderProducts(products);

  let totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  if (storeInfo.kds_on) kdsCall('/api/kds', {
    customer: currentCustomer, items: JSON.parse(JSON.stringify(cart)), note: cartNote,
    orderType: ((document.querySelector('.order-type-btn.active') || {}).innerText || '').trim(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }).then(() => renderKdsOrders());

  const _sid = Date.now(); let _rn = (parseInt(localStorage.getItem('totskie_rno')) || 0) + 1; try { localStorage.setItem('totskie_rno', _rn); } catch (e) {} window.lastReceiptNo = String(_rn).padStart(6, '0'); if (selectedPaymentMethod === 'Utang') { utangPayments.push({ type: 'charge', saleId: _sid, name: window.currentUtangName || '', amount: grandTotal, time: new Date().toISOString() }); saveUtangStorage(); } salesHistory.unshift({
    id: _sid, rno: window.lastReceiptNo, sc: scMode ? { type: scMode.type, name: scMode.name, id: scMode.id } : null, customer: currentCustomer, items: cart.map(i => { const q = products.find(x => x.id === i.id); return Object.assign({}, i, { cost: (q && q.cost) || 0 }); }), itemsCount: totalItemsCount,
    total: grandTotal, paymentMethod: selectedPaymentMethod, utangName: selectedPaymentMethod === 'Utang' ? (window.currentUtangName || '') : '', gcashRef: selectedPaymentMethod === 'GCash' ? (window.currentGcashRef || '') : '', isVoided: false,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  });
  saveSalesToStorage();

  document.getElementById('receiptStoreHeader').innerText = storeInfo.name;
  document.getElementById('receiptStoreSub').innerText = `${storeInfo.address} | Tel: ${storeInfo.contact}`;
  document.getElementById('receiptPaymentDetails').innerText = `Payment Method: ${selectedPaymentMethod}`;
  document.getElementById('receiptFooterMessage').innerText = storeInfo.footerMsg || "Thank you, come again!";
  
  let randomBarcode = "*" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000) + "*";
  document.getElementById('receiptBarcode').innerText = 'No. ' + (window.lastReceiptNo || '------');

  const receiptBody = document.getElementById('receiptBody');
  receiptBody.innerHTML = ''; const _dt = new Date().toLocaleString('en-PH'); const _d = document.createElement('div'); _d.style.cssText = 'font-size:9px;color:#555;'; _d.innerText = 'Date: ' + _dt; receiptBody.appendChild(_d);
  const activeOrderType = document.querySelector('.order-type-btn.active').innerText;
  
  const custRow = document.createElement('div');
  custRow.style.cssText = "margin-bottom: 4px; font-weight: bold; color: #000;";
  const _rc = (selectedPaymentMethod === 'Utang' && window.currentUtangName) ? window.currentUtangName : (scMode ? scMode.name : currentCustomer);
  custRow.innerText = `Customer: ${_rc}`;
  receiptBody.appendChild(custRow);

  let textLines = [];
  textLines.push(`=== ${storeInfo.name} ===`);
  textLines.push(`${storeInfo.address} | Tel: ${storeInfo.contact}`);
  textLines.push('Receipt No.: ' + (window.lastReceiptNo || '------')); textLines.push('Date: ' + _dt); textLines.push(`Customer: ${_rc}`);
  textLines.push(`--------------------------------`);

  cart.forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.justifyContent = 'space-between';
    row.innerHTML = `<span>${item.name} x${item.qty}</span><span>₱${(item.price * item.qty).toFixed(2)}</span>`;
    receiptBody.appendChild(row);
    textLines.push(`${item.name} x${item.qty} - ₱${(item.price * item.qty).toFixed(2)}`);
  });

  if (scMode) {
    const _row = (a, b) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;justify-content:space-between;color:#444;font-size:9px;'; r.innerHTML = '<span>' + a + '</span><span>' + b + '</span>'; receiptBody.appendChild(r); textLines.push(a + ': ' + b); };
    let _el = 0, _non = 0;
    cart.forEach(i => { const l = i.price * i.qty; if (scLine(i)) _el += l; else _non += l; });
    const _net = _el / 1.12;
    if (_non > 0) { _row('VATable Sales', '₱' + (_non / 1.12).toFixed(2)); _row('VAT (12%)', '₱' + (_non - _non / 1.12).toFixed(2)); }
    _row('VAT-Exempt Sales', '₱' + _net.toFixed(2));
    _row('Less 20% ' + scMode.type, '-₱' + (_net * 0.2).toFixed(2));
  }
  if (storeInfo.enableTax && !scMode) {
    let subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    let taxable = subtotal - (discAmt(subtotal));
    let tax = taxOn(taxable);
    const taxRow = document.createElement('div');
    taxRow.style.cssText = "display: flex; justify-content: space-between; color: #444; font-size: 9px;";
    taxRow.innerHTML = `<span>VAT (12%) Included</span><span>₱${tax.toFixed(2)}</span>`;
    receiptBody.appendChild(taxRow);
    textLines.push(`VAT (12%): ₱${tax.toFixed(2)}`);
  }

  if (cartNote) {
    const noteRow = document.createElement('div');
    noteRow.style.cssText = "font-size: 9px; color: #555; margin-top: 4px;";
    noteRow.innerText = `Note: ${cartNote}`;
    receiptBody.appendChild(noteRow);
    textLines.push(`Note: ${cartNote}`);
  }

  textLines.push(`--------------------------------`);
  if (scMode) { textLines.push(scMode.type + ': ' + scMode.name); textLines.push('ID No.: ' + scMode.id); }
  if (selectedPaymentMethod === 'GCash' && window.currentGcashRef) textLines.push(`GCash Ref: ${window.currentGcashRef}`);
  textLines.push(selectedPaymentMethod === 'Utang' ? `UTANG (NOT YET PAID): ₱${grandTotal.toFixed(2)}` : `TOTAL PAID: ₱${grandTotal.toFixed(2)} (${selectedPaymentMethod})`);
  if (selectedPaymentMethod === 'Cash' && window.currentTendered) { textLines.push('Tendered: P' + window.currentTendered.toFixed(2)); textLines.push('Change: P' + Math.max(0, window.currentTendered - grandTotal).toFixed(2)); }
  textLines.push(`${storeInfo.footerMsg || 'Thank you, come again!'}`);

  lastReceiptText = textLines.join("\n");

  
    let receiptSubtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    let receiptDiscAmount = discAmt(receiptSubtotal);
    let paymentDetailsText = `Payment: ${selectedPaymentMethod}`;
    if (selectedPaymentMethod === 'GCash' && window.currentGcashRef) { paymentDetailsText += ` | Ref: ${window.currentGcashRef}`; }
    if (selectedPaymentMethod === 'Cash' && typeof currentTendered !== 'undefined') {
        let changeAmt = currentTendered - grandTotal;
        paymentDetailsText += ` | Tendered: ₱${currentTendered.toFixed(2)} | Change: ₱${changeAmt >= 0 ? changeAmt.toFixed(2) : '0.00'}`;
    }
    if (discountPercent > 0) {
        paymentDetailsText += ` | Discount (${discountPercent}%): -₱${receiptDiscAmount.toFixed(2)}`;
    }
    if (scMode) { paymentDetailsText += '\n' + scMode.type + ' 20% + VAT-exempt: -P' + receiptDiscAmount.toFixed(2) + '\n' + scMode.type + ': ' + scMode.name + '\nID No.: ' + scMode.id; }
    document.getElementById('receiptPaymentDetails').innerText = paymentDetailsText; document.getElementById('receiptPaymentDetails').style.whiteSpace = 'pre-line';
    document.getElementById('receiptTotal').innerText = `₱${grandTotal.toFixed(2)}`;

  document.getElementById('receiptModal').style.display = 'flex';
}

function copyReceiptToClipboard() {
  navigator.clipboard.writeText(lastReceiptText).then(() => {
    showCustomAlert("Receipt copied to clipboard! Ready to paste into Messenger or SMS.");
  }).catch(err => { showCustomAlert("Failed to copy receipt to clipboard."); });
}

function printReceipt() { document.body.classList.remove('printing-ticket'); window.print(); }
function closeModal() { document.getElementById('receiptModal').style.display = 'none'; clearCart(); }

renderProducts(products);
updateCart();

function scLine(i) { const p = products.find(x => x.id === i.id); return !!(p && p.sc === true) && !i.isCustom; }
function discAmt(subtotal) {
  if (scMode && cart.length === 0) scMode = null;
  if (!scMode) return (subtotal * discountPercent) / 100;
  let d = 0;
  cart.forEach(i => { if (scLine(i)) { const line = i.price * i.qty; const net = line / 1.12; d += line - net * 0.8; } });
  return Math.round(d * 100) / 100;
}
function taxOn(base) { return scMode ? 0 : base * 0.12; }
let scPicked = '';
function scPick(t) {
  scPicked = t;
  document.getElementById('scBtnS').style.opacity = (t === 'Senior') ? '1' : '0.4';
  document.getElementById('scBtnP').style.opacity = (t === 'PWD') ? '1' : '0.4';
}
function applySeniorPwd() {
  if (cart.length === 0) { showCustomAlert("Add items first!"); closeHybridDiscountModal(); return; }
  if (!cart.some(i => scLine(i))) { showCustomAlert("No Senior/PWD-eligible items in cart. Flag the product as eligible first."); return; }
  if (!scPicked) { showCustomAlert("Pili og Senior o PWD."); return; }
  const nm = document.getElementById('scName').value.trim().replace(/[<>&"]/g, '').slice(0, 40);
  const idn = document.getElementById('scId').value.trim().replace(/[<>&"]/g, '').slice(0, 30);
  if (!nm || !idn) { showCustomAlert("Name and ID number are required."); return; }
  scMode = { type: scPicked, name: nm, id: idn };
  discountPercent = 0;
  document.getElementById('scName').value = ''; document.getElementById('scId').value = '';
  scPick(''); scPicked = '';
  updateCart(); closeHybridDiscountModal();
}
// --- Hybrid Discount Modal Logic ---
let selectedDiscountValue = 0;

function applyDiscount() {
    const modal = document.getElementById('hybridDiscountModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeHybridDiscountModal() {
    const modal = document.getElementById('hybridDiscountModal');
    if (modal) {
        modal.style.display = 'none';
    }
    const input = document.getElementById('manualDiscountInput');
    if (input) input.value = '';
}

function selectDiscountPreset(val) {
    selectedDiscountValue = val;
    const input = document.getElementById('manualDiscountInput');
    if (input) input.value = val;
}

function applyManualOrPresetDiscount() {
    const input = document.getElementById('manualDiscountInput');
    const val = input ? parseFloat(input.value) : 0;
    
    if (cart.length === 0) { showCustomAlert("Add items first!"); closeHybridDiscountModal(); return; }
    if (!isNaN(val) && val > 100) { showCustomAlert("Discount cannot exceed 100%."); return; }
    if (isNaN(val) || val < 0) {
        alert('Palihog pagbutang og saktong numero.');
        return;
    }

    // I-update ang global discount variable sa system
    if (typeof discountPercent !== 'undefined') {
        discountPercent = val; scMode = null;
    }

    // Tawga ang updateCart aron ma-refresh dayon ang UI display ug mga totals
    if (typeof updateCart === 'function') {
        updateCart();
    }

    closeHybridDiscountModal();
}

// Quick Cash Preset Helper Functions
function setExactCash() {
  let modalTotalElem = document.getElementById('payModalTotal');
  if (modalTotalElem) {
    let cleanTotal = parseFloat(modalTotalElem.innerText.replace(/[^0-9.]/g, '')) || 0;
    let inputElem = document.getElementById('cashTenderedInput');
    if (inputElem) {
      inputElem.value = cleanTotal.toFixed(2);
      calculateChange();
    }
  }
}

function setPresetCash(amount) {
  let inputElem = document.getElementById('cashTenderedInput');
  if (inputElem) {
    inputElem.value = amount.toFixed(2);
    calculateChange();
  }
}

// Barcode Scanner Listener for Fast Checkout
function handleBarcodeScan(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    let query = event.target.value.trim().toLowerCase();
    if (!query) return;

    // Pangitaon ang product matching barcode or exact name
    let found = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === query) || 
      p.name.toLowerCase() === query
    );

    if (found) {
      addToCart(found.id);
      event.target.value = '';
      filterProducts(); // Reset filter/display
    } else {
      // Kung dili exact match sa barcode, subayon ang filtered list
      let matches = products.filter(p => p.name.toLowerCase().includes(query));
      if (matches.length === 1) {
        addToCart(matches[0].id);
        event.target.value = '';
        filterProducts();
      }
    }
  }
}


// Camera Barcode Scanner Logic
let html5QrCodeScanner = null;

function openCameraScanner() {
  document.getElementById('cameraModal').style.display = 'flex';
  document.getElementById('scanResultStatus').innerText = "Point camera at barcode";
  document.getElementById('scanResultStatus').style.color = "#4b5563";

  if (!html5QrCodeScanner) {
    html5QrCodeScanner = new Html5Qrcode("interactive");
  }

  const config = { fps: 10, qrbox: { width: 250, height: 150 } };
  
  html5QrCodeScanner.start(
    { facingMode: "environment" }, 
    config, 
    (decodedText) => {
      // Success scan
      let code = decodedText.trim().toLowerCase();
      document.getElementById('scanResultStatus').innerText = "Scanned: " + decodedText;
      document.getElementById('scanResultStatus').style.color = "#16a34a";

      let found = products.find(p => 
        (p.barcode && p.barcode.toLowerCase() === code) || 
        p.name.toLowerCase() === code
      );

      if (found) {
        addToCart(found.id);
        if (navigator.vibrate) navigator.vibrate(100); // Haptic feedback
        closeCameraScanner();
      } else {
        document.getElementById('scanResultStatus').innerText = "No product found for code: " + decodedText;
        document.getElementById('scanResultStatus').style.color = "#dc2626";
      }
    },
    (errorMessage) => {
      // scanning... ignore frame errors
    }
  ).catch(err => {
    alert("Camera access error: " + err);
    closeCameraScanner();
  });
}

function closeCameraScanner() {
  if (html5QrCodeScanner) {
    html5QrCodeScanner.stop().then(() => {
      document.getElementById('cameraModal').style.display = 'none';
    }).catch(err => {
      document.getElementById('cameraModal').style.display = 'none';
    });
  } else {
    document.getElementById('cameraModal').style.display = 'none';
  }
}


// --- Restaurant Item Modifiers Logic ---
let currentCustomizingProduct = null;

// Override or enhance addToCart to support modifiers
function addToCart(productId) {
  let product = products.find(p => p.id === productId);
  if (!product) return;
  if (product.stock <= 0) { showCustomAlert("This item is currently out of stock!"); return; } if (isExpired(product)) showCustomAlert("WARNING: " + product.name + " has EXPIRED stock (" + nearestExp(product) + ")");
  const inCartQty = cart.filter(i => i.id === productId).reduce((sum, i) => sum + i.qty, 0);
  if (inCartQty >= product.stock) { showCustomAlert("Reached maximum available stock limit!"); return; }

  // If product has custom modifiers configured, show modal
  if (product.modifiers && product.modifiers.length > 0) {
    currentCustomizingProduct = product;
    openModifierModal(product);
  } else {
    // Normal add to cart for standard items
    let existing = cart.find(item => item.id === productId && (!item.modifiers || item.modifiers.length === 0));
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...product, qty: 1, modifiers: [], finalPrice: product.price, cartItemId: Date.now() });
    }
    updateCart();
  }
}

function openModifierModal(product) {
  document.getElementById('modProductName').innerText = product.name + " (₱" + product.price + ")";
  let container = document.getElementById('modifierOptionsList');
  container.innerHTML = "";

  product.modifiers.forEach((group, gIndex) => {
    let groupHtml = `<div style="margin-bottom: 12px;">
      <label style="font-weight: bold; font-size: 14px; color: #374151; display: block; margin-bottom: 4px;">${group.name}</label>
      <div style="display: flex; flex-direction: column; gap: 6px;">`;
    
    group.options.forEach((opt, oIndex) => {
      let inputType = group.type === 'single' ? 'radio' : 'checkbox';
      let nameAttr = `mod_group_${gIndex}`;
      let priceTag = opt.price > 0 ? ` (+₱${opt.price})` : '';
      
      groupHtml += `
        <label style="font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="${inputType}" name="${nameAttr}" value="${oIndex}" ${oIndex === 0 && group.type === 'single' ? 'checked' : ''} data-group="${gIndex}" style="accent-color: #2563eb;">
          ${opt.name} ${priceTag}
        </label>`;
    });

    groupHtml += `</div></div>`;
    container.innerHTML += groupHtml;
  });

  document.getElementById('modifierModal').style.display = 'flex';
}

function closeModifierModal() {
  document.getElementById('modifierModal').style.display = 'none';
  currentCustomizingProduct = null;
}

function confirmModifiers() {
  if (!currentCustomizingProduct) return;
  const inCartQty = cart.filter(i => String(i.id) === String(currentCustomizingProduct.id)).reduce((sum, i) => sum + i.qty, 0);
  if (inCartQty >= currentCustomizingProduct.stock) { showCustomAlert("Reached maximum available stock limit!"); closeModifierModal(); return; }

  let selectedModifiers = [];
  let additionalCost = 0;

  currentCustomizingProduct.modifiers.forEach((group, gIndex) => {
    let inputs = document.querySelectorAll(`input[name="mod_group_${gIndex}"]:checked`);
    inputs.forEach(input => {
      let optIndex = parseInt(input.value);
      let opt = group.options[optIndex];
      selectedModifiers.push({ group: group.name, name: opt.name, price: opt.price });
      additionalCost += opt.price;
    });
  });

  let finalPrice = currentCustomizingProduct.price + additionalCost;
  let cartItemId = Date.now() + Math.random(); // Unique identifier for customized item variants

  // Check if identical item with same modifiers already in cart
  let existing = cart.find(item => 
    item.id === currentCustomizingProduct.id && 
    JSON.stringify(item.modifiers) === JSON.stringify(selectedModifiers)
  );

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      ...currentCustomizingProduct,
      qty: 1,
      modifiers: selectedModifiers,
      finalPrice: finalPrice,
      cartItemId: cartItemId
    });
  }

  closeModifierModal();
  updateCart();
}


// --- Kitchen Order Ticket (KOT) Logic ---
let activeKitchenOrders = [];

// Hook into checkout/payment to send order to KOT automatically
function sendOrderToKitchen(orderData) {
  activeKitchenOrders.unshift({
    id: 'KOT-' + Math.floor(1000 + Math.random() * 9000),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: orderData.items,
    status: 'Pending'
  });
}

function openKotModal() {
  renderKotOrders();
  document.getElementById('kotModal').style.display = 'flex';
}

function closeKotModal() {
  document.getElementById('kotModal').style.display = 'none';
}

function renderKotOrders() {
  let container = document.getElementById('kotOrdersList');
  if (activeKitchenOrders.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">No active kitchen orders right now.</p>';
    return;
  }

  container.innerHTML = "";
  activeKitchenOrders.forEach((order, index) => {
    let itemsHtml = "";
    order.items.forEach(item => {
      let modsHtml = "";
      if (item.modifiers && item.modifiers.length > 0) {
        modsHtml = `<ul style="margin: 4px 0 0 15px; padding:0; font-size:12px; color:#4b5563;">`;
        item.modifiers.forEach(m => {
          modsHtml += `<li>• ${m.group}: <b>${m.name}</b></li>`;
        });
        modsHtml += `</ul>`;
      }
      itemsHtml += `
        <div style="padding: 6px 0; border-bottom: 1px dashed #e5e7eb;">
          <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>${item.qty}x ${item.name}</span>
          </div>
          ${modsHtml}
        </div>`;
    });

    container.innerHTML += `
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-left:4px solid #d97706; padding:12px; border-radius:8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
          <b style="color:#d97706;">${order.id}</b>
          <span style="color:#6b7280;">${order.time}</span>
        </div>
        <div>${itemsHtml}</div>
        <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:8px;">
          <button onclick="completeKotOrder(${index})" style="padding:6px 12px; background:#16a34a; color:white; border:none; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;">Mark as Done</button>
        </div>
      </div>`;
  });
}

function completeKotOrder(index) {
  activeKitchenOrders.splice(index, 1);
  renderKotOrders();
}


// --- Camera Barcode Scanner Logic ---
let html5QrCode = null;

function openScannerModal() {
  document.getElementById('scannerModal').style.display = 'flex';
  
  // Make sure html5-qrcode library is loaded, if not load it dynamically
  if (typeof Html5Qrcode === 'undefined') {
    let script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    script.onload = function() {
      startScannerCamera();
    };
    document.head.appendChild(script);
  } else {
    startScannerCamera();
  }
}

function startScannerCamera() {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("reader");
  }
  
  const config = { fps: 10, qrbox: { width: 250, height: 150 } };
  
  html5QrCode.start(
    { facingMode: "environment" }, 
    config, 
    onScanSuccess, 
    onScanFailure
  ).catch(err => {
    console.error("Error starting scanner:", err);
    alert("Dili ma-access ang camera. Siguruha nga gihatagan og permission ang browser.");
  });
}

function onScanSuccess(decodedText, decodedResult) {
  console.log(`Code matched = ${decodedText}`, decodedResult);
  // Close scanner and process the scanned barcode/item
  closeScannerModal();
  handleScannedBarcode(decodedText);
}

function onScanFailure(error) {
  // Handle scan failure, usually ignore to keep scanning
}

function closeScannerModal() {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => {
      document.getElementById('scannerModal').style.display = 'none';
    }).catch(err => {
      console.error("Failed to stop scanner", err);
      document.getElementById('scannerModal').style.display = 'none';
    });
  } else {
    document.getElementById('scannerModal').style.display = 'none';
  }
}

function handleScannedBarcode(code) {
  // Search product by barcode or SKU in cart/items
  if (typeof cart !== 'undefined' && typeof products !== 'undefined') {
    let found = products.find(p => p.barcode === code || p.id === code);
    if (found) {
      addToCart(found.id);
    } else {
      alert("Wala makit-an nga produkto para sa barcode: " + code);
    }
  } else {
    alert("Scanned Code: " + code);
  }
}



// --- Confirm button gray-out fix ---
function switchPaymentMethod(method) {
  selectedPaymentMethod = method;
  const confirmBtn = document.querySelector('button[onclick="confirmAndProcessPayment()"]');
  if (method === 'Cash') {
    document.getElementById('tabCash').classList.add('active');
    document.getElementById('tabGcash').classList.remove('active');
    document.getElementById('cashPaymentSection').style.display = 'block';
    document.getElementById('gcashPaymentSection').style.display = 'none';
    calculateChange();
  } else {
    document.getElementById('tabGcash').classList.add('active');
    document.getElementById('tabCash').classList.remove('active');
    document.getElementById('cashPaymentSection').style.display = 'none';
    document.getElementById('gcashPaymentSection').style.display = 'block';
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
      confirmBtn.style.cursor = 'pointer';
    }
  }
}


// --- Added missing handlers for ATS validation ---

function switchTab(tabName) { console.log("switchTab called:", tabName); }

function closeInventoryModal() { const modals = document.querySelectorAll(".modal"); modals.forEach(m => m.style.display = "none"); }



let renameCatIndex = -1;
function renameCategory(index) {
  renameCatIndex = index;
  document.getElementById('renameCatInput').value = categories[index].name;
  document.getElementById('renameCatModal').style.display = 'flex';
  setTimeout(() => document.getElementById('renameCatInput').focus(), 100);
}
function closeRenameCat() { document.getElementById('renameCatModal').style.display = 'none'; }
function saveRenameCat() {
  const v = document.getElementById('renameCatInput').value.trim();
  if (!v) { showCustomAlert("Please enter a category name."); return; }
  renameCategoryApply(renameCatIndex, v);
  closeRenameCat();
}


function syncFetch(key, opts) {
  var track = (key === 'totskie_sales' || key === 'totskie_products');
  var flag = 'totskie_unsynced_' + key;
  window.__syncSeq = window.__syncSeq || {};
  var my = (window.__syncSeq[key] || 0) + 1;
  window.__syncSeq[key] = my;
  if (track) { try { localStorage.setItem(flag, '1'); } catch (e) { console.error(e); } }
  return fetch('/api/state/' + key, opts).then(function (r) {
    if (r.status === 403) { r.clone().json().then(function (d) { if (d && d.error === 'Trial ended') { location.href = '/pay'; } }).catch(function () {}); }
    if (track && r.ok && window.__syncSeq[key] === my) {
      try { localStorage.removeItem(flag); } catch (e) { console.error(e); }
    }
    return r;
  });
}

function syncToServer(key, val) {
  try {
    syncFetch(key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(val) })
    }).then(r => { if (r.status === 401) { location.reload(); } else if (!r.ok) { showCustomAlert('Warning: could not save to server.'); } })
      .catch(() => showCustomAlert('Warning: could not save to server.'));
  } catch (e) { console.error(e); }
}


// ===== Login, roles, staff PINs =====
function logoutNow() {
  ['totskie_categories', 'totskie_products', 'totskie_sales', 'totskie_store', 'totskie_kds', 'totskie_utang'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
  fetch('/api/auth/logout', { method: 'POST' }).finally(() => location.reload());
}

function openStaffModal() {
  document.getElementById('staffModal').style.display = 'flex';
  loadStaff();
}
function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }

function loadStaff() {
  fetch('/api/users').then(r => r.json()).then(list => {
    const box = document.getElementById('staffList');
    box.innerHTML = '';
    if (!Array.isArray(list)) return;
    list.forEach(u => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#0f172a;padding:6px 8px;border-radius:4px;font-size:12px;';
      const label = document.createElement('span');
      label.textContent = u.name + ' (' + u.role + ')';
      const btn = document.createElement('button');
      btn.textContent = 'Del';
      btn.style.cssText = 'background:#7f1d1d;color:#fca5a5;border:none;padding:10px 14px;border-radius:6px;font-size:13px;min-height:44px;min-width:44px;cursor:pointer;';
      btn.onclick = () => deleteStaff(u.id);
      row.appendChild(label);
      row.appendChild(btn);
      box.appendChild(row);
    });
  });
}

function addStaff() {
  const name = document.getElementById('staffName').value.trim();
  const role = document.getElementById('staffRole').value;
  const pin = document.getElementById('staffPin').value.trim();
  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, role: role, pin: pin })
  }).then(r => r.json().then(d => ({ ok: r.ok, d: d }))).then(res => {
    if (!res.ok) { showCustomAlert(res.d.error || 'Could not add.'); return; }
    document.getElementById('staffName').value = '';
    document.getElementById('staffPin').value = '';
    loadStaff();
  });
}

function deleteStaff(id) {
  showCustomConfirm('Delete this staff account?', () => {
    fetch('/api/users/' + id, { method: 'DELETE' }).then(r => r.json().then(d => ({ ok: r.ok, d: d }))).then(res => {
      if (!res.ok) { showCustomAlert(res.d.error || 'Could not delete.'); return; }
      loadStaff();
    });
  });
}

(function () {
  function guard(name, allowed, msg) {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () {
      if (!allowed.includes(window.currentRole)) { showCustomAlert(msg); return; }
      return orig.apply(this, arguments);
    };
  }
  guard('promptVoidTransaction', ['admin'], 'Only an admin can void sales.');
  guard('openItemManagerModal', ['admin'], 'Admin access required.');
  guard('openSettingsModal', ['admin'], 'Admin access required.');
  guard('openStaffModal', ['admin'], 'Admin access required.');
  guard('openPaymentModal', ['admin', 'cashier'], 'Cashier or admin login required.');
})();

function applyRoleUI() {
  const role = window.currentRole;
  if (!role) return;
  const hideFor = {
    cashier: ['openSalesReport', 'openItemManagerModal', 'openSettingsModal', 'openStaffModal', "location.href='/pay'"],
    kitchen: ['openZReportModal', 'openItemManagerModal', 'openHeldOrdersModal', 'openSalesHistoryModal', 'openSettingsModal', 'openStaffModal']
  };
  document.querySelectorAll('.sidebar-item').forEach(el => {
    const oc = el.getAttribute('onclick') || '';
    if ((hideFor[role] || []).some(fn => oc.includes(fn)) || (!storeInfo.kds_on && oc.includes('openKdsModal'))) el.style.display = 'none';
  });
  if (role === 'kitchen' && storeInfo.kds_on) openKdsModal();
}
window.addEventListener('load', applyRoleUI);


// ===== Data: export sales and reset =====
function openDataModal() {
  if (window.currentRole !== 'admin') { showCustomAlert('Admin access required.'); return; }
  document.getElementById('dataModal').style.display = 'flex';
}
function closeDataModal() {
  document.getElementById('dataModal').style.display = 'none';
  document.getElementById('resetPinInput').value = '';
}
function csvCell(v) {
  let s = String(v === undefined || v === null ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function exportSalesRange() {
  if (window.currentRole !== 'admin') { showCustomAlert('Admin access required.'); return; }
  const f = document.getElementById('exportFrom').value;
  const t = document.getElementById('exportTo').value;
  const from = f ? new Date(f + 'T00:00:00').getTime() : 0;
  const to = t ? new Date(t + 'T23:59:59.999').getTime() : Infinity;
  const rows = salesHistory.filter(s => s.id >= from && s.id <= to);
  if (rows.length === 0) { showCustomAlert('No sales found for that date range.'); return; }
  const header = ['Receipt ID', 'Date', 'Time', 'Customer', 'Items', 'Item count', 'Payment method', 'GCash ref', 'Total', 'Status'];
  const lines = [header.map(csvCell).join(',')];
  rows.forEach(s => {
    const items = (s.items || []).map(i => i.name + ' x' + i.qty).join('; ');
    lines.push([s.id, ymd(new Date(s.id)), s.time, s.customer, items, s.itemsCount, s.paymentMethod, s.gcashRef || '', Number(s.total).toFixed(2), s.isVoided ? 'Voided' : 'OK'].map(csvCell).join(','));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sales_' + ymd(new Date()) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showCustomAlert('Exported ' + rows.length + ' sales.');
}
function resetToDefaults() {
  if (window.currentRole !== 'admin') { showCustomAlert('Admin access required.'); return; }
  const pin = document.getElementById('resetPinInput').value.trim();
  if (!/^[0-9]{4,6}$/.test(pin)) { showCustomAlert('Enter your admin PIN to confirm.'); return; }
  showCustomConfirm('Delete ALL products, sales and kitchen orders and restore defaults? Staff accounts are kept. This cannot be undone. Did you export your sales first?', () => {
    fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin })
    }).then(r => r.json().then(d => ({ ok: r.ok, d: d }))).then(res => {
      if (!res.ok) { showCustomAlert(res.d.error || 'Reset failed.'); return; }
      ['totskie_categories', 'totskie_products', 'totskie_sales', 'totskie_store', 'totskie_kds', 'totskie_utang'].forEach(k => localStorage.removeItem(k));
      location.reload();
    }).catch(() => showCustomAlert('Reset failed. Check the server.'));
  });
}
window.addEventListener('load', () => {
  if (window.currentRole !== 'admin') {
    document.querySelectorAll('.sidebar-item').forEach(el => {
      if ((el.getAttribute('onclick') || '').includes('openDataModal')) el.style.display = 'none';
    });
  }
});

function openStockViewModal() {
  if (window.currentRole !== 'admin') { showCustomAlert('Admin access required.'); return; }
  const tb = document.getElementById('stockViewBody');
  tb.innerHTML = '';
  products.slice().sort((a, b) => a.stock - b.stock).forEach(p => {
    const low = p.stock <= 5;
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + p.name + expTag(p) + '</td><td style="' + (low ? 'color:#ef4444; font-weight:bold;' : '') + '">' + p.stock + (low ? ' ⚠️' : '') + '</td><td>₱' + (p.cost || 0).toFixed(2) + '</td><td>₱' + p.price.toFixed(2) + '</td>';
    tb.appendChild(tr);
  });
  document.getElementById('stockViewModal').style.display = 'flex';
}
function todayStr() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function isExpired(p) { const e = nearestExp(p); return !!e && e < todayStr(); }
function deductFEFO(p, qty, item) {
  let left = qty; const alloc = [];
  const bs = (p.batches || []).filter(b => b.qty > 0).sort((a, b) => (a.exp || '9999').localeCompare(b.exp || '9999'));
  for (const b of bs) { if (left <= 0) break; const t = Math.min(b.qty, left); b.qty -= t; left -= t; alloc.push({ exp: b.exp || '', qty: t, sup: b.sup || '', lot: b.lot || '' }); }
  p.batches = (p.batches || []).filter(b => b.qty > 0);
  p.stock = Math.max(0, p.stock - qty);
  item.alloc = alloc;
}
function restoreBatches(p, item) {
  (item.alloc || []).forEach(a => {
    const b = (p.batches || []).find(x => (x.exp || '') === a.exp && (x.lot || '') === (a.lot || ''));
    if (b) { b.qty += a.qty; } else { p.batches = (p.batches || []).concat([{ qty: a.qty, exp: a.exp, sup: a.sup || '', lot: a.lot || '' }]); }
  });
}
function openExpiryModal() {
  if (window.currentRole !== 'admin') { showCustomAlert('Admin access required.'); return; }
  const tb = document.getElementById('expiryBody'); tb.innerHTML = '';
  const rows = [];
  products.forEach(p => (p.batches || []).forEach(b => { if (b.exp && b.qty > 0) rows.push({ n: p.name, q: b.qty, e: b.exp, s: b.sup || '', l: b.lot || '' }); }));
  rows.sort((a, b) => a.e.localeCompare(b.e));
  rows.forEach(r => {
    const d = Math.ceil((new Date(r.e) - new Date()) / 86400000);
    if (d > 30) return;
    const c = d < 0 ? '#ef4444' : '#f59e0b';
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + r.n + (r.l ? ' <small>Lot ' + r.l + '</small>' : '') + (r.s ? '<br><small>' + r.s + '</small>' : '') + '</td><td>' + r.q + '</td><td style="color:' + c + '">' + r.e + (d < 0 ? ' (EXPIRED)' : ' (' + d + 'd)') + '</td>';
    tb.appendChild(tr);
  });
  if (!tb.children.length) tb.innerHTML = '<tr><td colspan="3">Walay hapit mo-expire.</td></tr>';
  document.getElementById('expiryModal').style.display = 'flex';
}
function closeExpiryModal() { document.getElementById('expiryModal').style.display = 'none'; }
function closeStockViewModal() { document.getElementById('stockViewModal').style.display = 'none'; }

(function () {
  const orig = switchPaymentMethod;
  window.switchPaymentMethod = function (method) {
    const us = document.getElementById('utangPaymentSection');
    const ut = document.getElementById('tabUtang');
    if (method === 'Utang') {
      orig('GCash');
      document.getElementById('gcashPaymentSection').style.display = 'none';
      document.getElementById('tabGcash').classList.remove('active');
      ut.classList.add('active');
      us.style.display = 'block';
      document.getElementById('utangNameInput').value = '';
      selectedPaymentMethod = 'Utang';
    } else {
      ut.classList.remove('active');
      us.style.display = 'none';
      orig(method);
    }
  };
})();

let utangPayTarget = null;
function utangBalances() {
  const m = {};
  utangPayments.forEach(e => {
    const k = (e.name || '').trim().toLowerCase();
    if (!k) return;
    if (!m[k]) m[k] = { name: e.name.trim(), bal: 0 };
    m[k].bal += (e.type === 'payment' ? -1 : 1) * e.amount;
  });
  return Object.values(m).map(x => ({ name: x.name, bal: Math.round(x.bal * 100) / 100 })).filter(x => x.bal > 0.004).sort((a, b) => b.bal - a.bal);
}
function renderUtangList() {
  const tb = document.getElementById('utangListBody');
  tb.innerHTML = '';
  const list = utangBalances();
  let total = 0;
  if (!list.length) { tb.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#64748b;">No utang</td></tr>'; }
  list.forEach(x => {
    total += x.bal;
    const tr = document.createElement('tr');
    const t1 = document.createElement('td'); t1.textContent = x.name;
    const t2 = document.createElement('td'); t2.textContent = '₱' + x.bal.toFixed(2); t2.style.color = '#f59e0b';
    const t3 = document.createElement('td');
    const b = document.createElement('button'); b.textContent = 'Pay';
    b.style.cssText = 'background:#22c55e; color:#0f172a; border:none; padding:10px 14px; border-radius:6px; font-size:13px; min-height:44px; font-weight:bold;';
    b.onclick = () => startUtangPay(x.name, x.bal);
    t3.appendChild(b); tr.appendChild(t1); tr.appendChild(t2); tr.appendChild(t3); tb.appendChild(tr);
  });
  document.getElementById('utangTotal').textContent = '₱' + total.toFixed(2);
}
function openUtangModal() {
  if (window.currentRole !== 'admin' && window.currentRole !== 'cashier') { showCustomAlert('Cashier or admin login required.'); return; }
  utangPayTarget = null;
  document.getElementById('utangPayBox').style.display = 'none';
  renderUtangList();
  document.getElementById('utangModal').style.display = 'flex';
}
function closeUtangModal() { document.getElementById('utangModal').style.display = 'none'; }
function startUtangPay(name, bal) {
  utangPayTarget = { name: name, bal: bal };
  document.getElementById('utangPayLabel').textContent = name + ' owes ₱' + bal.toFixed(2);
  document.getElementById('utangPayAmount').value = '';
  document.getElementById('utangPayBox').style.display = 'block';
}
function confirmUtangPay() {
  if (!utangPayTarget) return;
  const amt = Math.round((parseFloat(document.getElementById('utangPayAmount').value) || 0) * 100) / 100;
  if (amt <= 0) { showCustomAlert('Enter the amount received.'); return; }
  if (amt > utangPayTarget.bal) { showCustomAlert('Amount is more than the balance of ₱' + utangPayTarget.bal.toFixed(2) + '.'); return; }
  utangPayments.push({ type: 'payment', name: utangPayTarget.name, amount: amt, time: new Date().toISOString() });
  saveUtangStorage();
  utangPayTarget = null;
  document.getElementById('utangPayBox').style.display = 'none';
  renderUtangList();
  showCustomAlert('Payment recorded.');
}


var srPeriod='today';
function srEsc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function openSalesReport(){srPeriod='today';renderSalesReport();document.getElementById('salesReportModal').style.display='flex';}
function closeSalesReport(){document.getElementById('salesReportModal').style.display='none';}
function srSet(p){srPeriod=p;renderSalesReport();}
function renderSalesReport(){
  var now=new Date();var d0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  var from=srPeriod==='today'?d0:(srPeriod==='week'?d0-6*86400000:new Date(now.getFullYear(),now.getMonth(),1).getTime());
  var rev=0,prof=0,n=0,noCost=0,items={};
  salesHistory.forEach(function(s){
    if(s.isVoided)return;var t=Number(s.id);if(!isFinite(t)||t<from)return;
    n++;
    (s.items||[]).forEach(function(i){var k=i.name||'?';items[k]=(items[k]||0)+(Number(i.qty)||0);});
    if(s.paymentMethod==='Utang')return;
    rev+=s.total;
    if((s.items||[]).every(function(i){return i.cost!==undefined;}))prof+=s.total-s.items.reduce(function(c,i){return c+i.cost*i.qty;},0);else noCost++;
  });
  var top=Object.keys(items).sort(function(a,b){return items[b]-items[a];}).slice(0,10);
  var sc=0,sr=0;
  products.forEach(function(p){var st=Number(p.stock)||0;sc+=st*(Number(p.cost)||0);sr+=st*(Number(p.price)||0);});
  function btn(k,l){var on=srPeriod===k;return '<button onclick="srSet(\''+k+'\')" style="flex:1;padding:8px;border-radius:6px;border:1px solid #38bdf8;font-weight:bold;background:'+(on?'#0284c7':'#334155')+';color:#fff;">'+l+'</button>';}
  var h='<div style="display:flex;gap:6px;margin-bottom:10px;">'+btn('today','Today')+btn('week','7 Days')+btn('month','Month')+'</div>';
  h+='<div style="background:#0f172a;border-radius:8px;padding:10px;margin-bottom:10px;">';
  h+='<div>Sales: <b style="color:#22c55e;">&#8369;'+rev.toFixed(2)+'</b></div>';
  h+='<div>Profit: <b style="color:#22c55e;">&#8369;'+prof.toFixed(2)+'</b></div>';
  h+='<div style="font-size:11px;color:#94a3b8;">'+n+' transactions (excluding Void)</div>';
  if(noCost>0)h+='<div style="font-size:11px;color:#fbbf24;">'+noCost+' transactions without cost, not counted in profit</div>';
  h+='</div><div style="font-weight:bold;color:#38bdf8;margin-bottom:4px;">Best Seller (Top 10)</div>';
  if(top.length===0)h+='<div style="font-size:12px;color:#94a3b8;">No sales</div>';
  top.forEach(function(k,x){h+='<div style="display:flex;justify-content:space-between;font-size:13px;"><span>'+(x+1)+'. '+srEsc(k)+'</span><b>'+items[k]+'</b></div>';});
  h+='<div style="background:#0f172a;border-radius:8px;padding:10px;margin-top:10px;"><div style="font-weight:bold;color:#38bdf8;">Stock Value</div>';
  h+='<div>Cost: <b>&#8369;'+sc.toFixed(2)+'</b></div><div>Retail: <b>&#8369;'+sr.toFixed(2)+'</b></div></div>';
  document.getElementById('srBody').innerHTML=h;
}
