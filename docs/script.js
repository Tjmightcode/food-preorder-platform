const MAX_ORDERS_PER_SLOT = 10;
const MAX_ORDERS_PER_HOUR = 20;
const MAX_DELIVERY_PER_SLOT_BY_ZONE = {
  local: 4,
  regional: 2,
  virginiaBeach: 1
};

const menuData = [
  { id: 'entree-1', name: '6 Fried Chicken Wings', type: 'entree' },
  { id: 'entree-2', name: '5 Piece Fried Salmon Bites', type: 'entree' },
  { id: 'entree-3', name: '2 Piece Fried Whiting', type: 'entree' },
  { id: 'entree-4', name: 'Fried Pork Chop', type: 'entree' },
  { id: 'side-1', name: 'Mac & Cheese', type: 'side' },
  { id: 'side-2', name: 'Green Beans', type: 'side' },
  { id: 'side-3', name: 'Candied Yams', type: 'side' },
  { id: 'side-4', name: 'Potato Salad', type: 'side' },
  { id: 'side-5', name: 'White Rice and Gravy', type: 'side' }
];

document.addEventListener('DOMContentLoaded', () => {
  initInventory();
  renderMenu();
  renderTimeframeOptions();

  const form = document.getElementById('preorder-form');
  if (form) form.addEventListener('submit', handlePreorder);

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearForm);

  document.querySelectorAll('input[name="delivery-type"]').forEach(input => {
    input.addEventListener('change', () => {
      const isDelivery = input.value === 'delivery';
      const deliveryDetailsRow = document.getElementById('delivery-details');
      if (deliveryDetailsRow) {
        deliveryDetailsRow.classList.toggle('hidden', !isDelivery);
      }
      renderTimeframeOptions();
      updateCartSummary();
    });
  });
});

function initInventory() {
  const stored = JSON.parse(localStorage.getItem('inventory') || '{}');
  if (Object.keys(stored).length) return;

  const inventory = {};
  menuData.forEach(item => {
    inventory[item.id] = item.type === 'entree' ? 50 : 200;
  });
  localStorage.setItem('inventory', JSON.stringify(inventory));
}

function getInventory() {
  return JSON.parse(localStorage.getItem('inventory') || '{}');
}

function setInventory(inventory) {
  localStorage.setItem('inventory', JSON.stringify(inventory));
}

function getStoredOrders() {
  return JSON.parse(localStorage.getItem('orders') || '[]');
}

function renderMenu() {
  const container = document.getElementById('menu');
  if (!container) return;

  container.innerHTML = '';
  const entrees = menuData.filter(item => item.type === 'entree');
  const sides = menuData.filter(item => item.type === 'side');
  const inventory = getInventory();

  entrees.forEach(entree => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <h3>${entree.name}</h3>
      <p>Plate includes two sides. Fixed price: $20.</p>
      <p class="price">$20 per plate</p>
      <label>
        Quantity
        <input type="number" id="qty-${entree.id}" min="0" max="${inventory[entree.id] || 50}" value="0" />
      </label>
      <div id="sides-${entree.id}" class="sides-container"></div>
    `;
    container.appendChild(card);
  });

  container.addEventListener('change', (event) => {
    if (event.target.id.startsWith('qty-')) {
      updateSideSelectors();
    }
    updateCartSummary();
  });

  updateSideSelectors();
}

function updateSideSelectors() {
  const entrees = menuData.filter(item => item.type === 'entree');
  const sides = menuData.filter(item => item.type === 'side');

  entrees.forEach(entree => {
    const qtyInput = document.getElementById(`qty-${entree.id}`);
    const quantity = qtyInput ? parseInt(qtyInput.value || '0', 10) : 0;
    const sidesContainer = document.getElementById(`sides-${entree.id}`);
    if (!sidesContainer) return;

    let html = '';
    for (let i = 0; i < quantity; i++) {
      const sideOptions = createSideOptions(sides);
      html += `
        <fieldset class="entree-sides">
          <legend>Plate ${i + 1} - Sides</legend>
          <label>
            Side 1
            <select id="side1-${entree.id}-${i}" class="side-select">
              ${sideOptions}
            </select>
          </label>
          <label>
            Side 2
            <select id="side2-${entree.id}-${i}" class="side-select">
              ${sideOptions}
            </select>
          </label>
          ${entree.id === 'entree-1' ? `
            <label>
              Flavor
              <select id="flavor-${entree.id}-${i}" class="flavor-select">
                <option value="">Choose flavor</option>
                <option value="Lemon Pepper">Lemon Pepper</option>
                <option value="Plain">Plain</option>
                <option value="Garlic Parmesan">Garlic Parmesan</option>
                <option value="Buffalo">Buffalo</option>
                <option value="Thai Chilli">Thai Chilli</option>
              </select>
            </label>
          ` : ''}
        </fieldset>
      `;
    }

    sidesContainer.innerHTML = html;
  });
}

function createSideOptions(sides) {
  return ['<option value="">Select side</option>', ...sides.map(side => `<option value="${side.id}">${side.name}</option>`)].join('');
}

function renderTimeframeOptions() {
  const deliveryType = document.querySelector('input[name="delivery-type"]:checked');
  if (!deliveryType) return;

  const select = document.getElementById('timeframe');
  if (!select) return;

  select.innerHTML = '';
  const endHour = deliveryType.value === 'delivery' ? 17 : 18;

  for (let minutes = 11 * 60; minutes < endHour * 60; minutes += 15) {
    const start = formatTime(minutes);
    const end = formatTime(minutes + 15);
    select.appendChild(new Option(`${start} - ${end}`, `${start} - ${end}`));
  }
}

function formatTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function gatherOrder() {
  const items = [];
  const entrees = menuData.filter(item => item.type === 'entree');
  const sides = menuData.filter(item => item.type === 'side');

  entrees.forEach(entree => {
    const qtyInput = document.getElementById(`qty-${entree.id}`);
    const quantity = qtyInput ? parseInt(qtyInput.value || '0', 10) : 0;
    if (quantity <= 0) return;

    for (let i = 0; i < quantity; i++) {
      const side1Input = document.getElementById(`side1-${entree.id}-${i}`);
      const side2Input = document.getElementById(`side2-${entree.id}-${i}`);
      const flavorInput = document.getElementById(`flavor-${entree.id}-${i}`);

      const side1Id = side1Input ? side1Input.value : '';
      const side2Id = side2Input ? side2Input.value : '';
      const flavor = flavorInput ? flavorInput.value : '';

      const selectedSides = [side1Id, side2Id]
        .filter(Boolean)
        .map(id => sides.find(side => side.id === id))
        .filter(Boolean);

      items.push({
        id: entree.id,
        name: entree.name,
        sides: selectedSides.map(side => ({ id: side.id, name: side.name })),
        flavor: flavor || null,
        missingSides: selectedSides.length !== 2
      });
    }
  });

  const timeframeSelect = document.getElementById('timeframe');
  const customerNameInput = document.getElementById('customer-name');
  const deliveryAddressInput = document.getElementById('delivery-address');
  const deliveryZoneSelect = document.getElementById('delivery-zone');
  const deliveryTypeInput = document.querySelector('input[name="delivery-type"]:checked');

  return {
    items,
    total: items.length * 20,
    timeframe: timeframeSelect ? timeframeSelect.value : '',
    customer: {
      name: customerNameInput ? customerNameInput.value.trim() : ''
    },
    delivery: {
      type: deliveryTypeInput ? deliveryTypeInput.value : 'pickup',
      address: deliveryAddressInput ? deliveryAddressInput.value.trim() : '',
      zone: deliveryZoneSelect ? deliveryZoneSelect.value : 'local'
    }
  };
}

function updateCartSummary() {
  const summary = document.getElementById('cart-summary');
  if (!summary) return;

  const order = gatherOrder();
  if (order.items.length === 0) {
    summary.textContent = 'No plates selected yet.';
    return;
  }

  summary.innerHTML = order.items
    .map((item, idx) => {
      const sides = item.sides.length ? item.sides.map(s => s.name).join(', ') : '⚠ choose 2 sides';
      const flavor = item.flavor ? ` • Flavor: ${item.flavor}` : '';
      return `<div>Plate ${idx + 1}: ${item.name}${flavor} — ${sides}</div>`;
    })
    .join('') + `<div class="summary-total"><strong>Total: $${order.total.toFixed(2)}</strong></div>`;
}

function ordersAtSlot(timeframe) {
  return getStoredOrders().filter(order => order.timeframe === timeframe);
}

function ordersAtHour(timeframe) {
  const hour = timeframe.split(':')[0];
  return getStoredOrders().filter(order => order.timeframe.startsWith(`${hour}:`));
}

function deliveriesAtSlotAndZone(timeframe, zone) {
  return getStoredOrders().filter(order => order.timeframe === timeframe && order.delivery.type === 'delivery' && order.delivery.zone === zone);
}

async function saveOrderToFirestore(order) {
  const orderRef = db.collection('orders').doc();
  order.id = orderRef.id;
  order.createdAt = new Date().toISOString();
  order.status = 'pending';
  await orderRef.set(order);
  return order.id;
}

async function handlePreorder(event) {
  event.preventDefault();
  const order = gatherOrder();
  const errors = [];

  if (order.items.length === 0) errors.push('Select at least one plate.');
  if (!order.timeframe) errors.push('Choose a time slot.');
  if (!order.customer.name) errors.push('Enter your name.');
  if (order.delivery.type === 'delivery' && !order.delivery.address) errors.push('Enter a delivery address.');

  const missingSideItem = order.items.find(item => item.missingSides);
  if (missingSideItem) errors.push('Select two sides for each plate.');

  if (errors.length) {
    alert(errors.join('\n'));
    return;
  }

  const inventory = getInventory();
  const entreeCount = {};
  order.items.forEach(item => {
    entreeCount[item.id] = (entreeCount[item.id] || 0) + 1;
  });

  Object.entries(entreeCount).forEach(([entreeId, qty]) => {
    if (qty > (inventory[entreeId] || 0)) {
      const entree = menuData.find(item => item.id === entreeId);
      errors.push(`${entree?.name || 'Item'} only has ${inventory[entreeId]} available.`);
    }
  });

  const sideCounts = {};
  order.items.forEach(item => {
    item.sides.forEach(side => {
      sideCounts[side.id] = (sideCounts[side.id] || 0) + 1;
    });
  });

  Object.entries(sideCounts).forEach(([sideId, qty]) => {
    if (qty > (inventory[sideId] || 0)) {
      const side = menuData.find(item => item.id === sideId);
      errors.push(`${side?.name || 'Side'} only has ${inventory[sideId]} available.`);
    }
  });

  if (errors.length) {
    alert(errors.join('\n'));
    return;
  }

  Object.entries(entreeCount).forEach(([entreeId, qty]) => {
    inventory[entreeId] -= qty;
  });

  Object.entries(sideCounts).forEach(([sideId, qty]) => {
    inventory[sideId] -= qty;
  });

  setInventory(inventory);
  refreshStockDisplay(inventory);

  const newOrder = {
    eventDate: '2026-06-12',
    timeframe: order.timeframe,
    delivery: order.delivery,
    customer: order.customer,
    items: order.items,
    total: order.total,
    status: 'pending'
  };

  let orderId;
  try {
    orderId = await saveOrderToFirestore(newOrder);
  } catch (error) {
    console.error('Firestore save failed', error);
    alert('Unable to save order. Please try again.');
    return;
  }

  const orderLink = `${location.origin}/order.html?id=${encodeURIComponent(orderId)}`;
  const qrContainer = document.getElementById('qr-container');
  const confirmationContainer = document.getElementById('order-confirmation');

  if (qrContainer) {
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(orderLink)}&size=240x240" alt="QR code" />`;
  }

  if (confirmationContainer) {
    confirmationContainer.innerHTML = `
      <p>✓ Order placed: <strong>${orderId}</strong></p>
      <p>${order.delivery.type === 'delivery' ? `Delivery (${order.delivery.zone === 'virginiaBeach' ? 'Virginia Beach' : order.delivery.zone})` : 'Pickup'} at ${order.timeframe}</p>
      <p>Total: <strong>$${order.total.toFixed(2)}</strong></p>
      <a href="${orderLink}" target="_blank">View order</a>
    `;
  }
}

function refreshStockDisplay(inventory) {
  document.querySelectorAll('[id^="qty-"]').forEach(input => {
    const id = input.id.replace('qty-', '');
    if (inventory[id] != null) input.max = inventory[id];
  });
}

function clearForm() {
  document.querySelectorAll('[id^="qty-"]').forEach(el => el.value = 0);
  const nameInput = document.getElementById('customer-name');
  const addressInput = document.getElementById('delivery-address');
  const zoneInput = document.getElementById('delivery-zone');
  if (nameInput) nameInput.value = '';
  if (addressInput) addressInput.value = '';
  if (zoneInput) zoneInput.value = 'local';
  const qrContainer = document.getElementById('qr-container');
  const confirmationContainer = document.getElementById('order-confirmation');
  if (qrContainer) qrContainer.innerHTML = '';
  if (confirmationContainer) confirmationContainer.innerHTML = '';
  updateSideSelectors();
  updateCartSummary();
}

function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function renderOrder(order) {
  const container = document.getElementById('order-detail');
  if (!order || !container) {
    if (container) container.innerHTML = '<p>Order not found.</p>';
    return;
  }

  container.innerHTML = `
    <h2>Order ${order.id}</h2>
    <p><strong>Event date:</strong> ${order.eventDate}</p>
    <p><strong>Placed:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
    <p><strong>Receive:</strong> ${order.delivery.type} at ${order.timeframe}</p>
    ${order.delivery.type === 'delivery' ? `<p><strong>Address:</strong> ${order.delivery.address}</p><p><strong>Zone:</strong> ${order.delivery.zone === 'virginiaBeach' ? 'Virginia Beach' : order.delivery.zone}</p>` : ''}
    <p><strong>Name:</strong> ${order.customer.name}</p>
    <h3>Items</h3>
    ${order.items.map(item => `
      <div class="item-row">
        <strong>${item.name}</strong>
        ${item.flavor ? `<span> • Flavor: ${item.flavor}</span>` : ''}
        <br />
        Sides: ${item.sides.map(side => side.name).join(', ')}
      </div>
    `).join('')}
    <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
  `;
}

async function loadOrder() {
  const container = document.getElementById('order-detail');
  if (!container) return;

  const orderId = getQueryParam('id');
  if (!orderId) {
    container.innerHTML = '<p>Order ID is missing.</p>';
    return;
  }

  container.innerHTML = '<p>Loading order…</p>';
  try {
    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) {
      container.innerHTML = '<p>Order not found.</p>';
      return;
    }
    renderOrder(doc.data());
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p>Unable to load order.</p>';
  }
}

const ORDERS_KEY = 'orders';
const ADMIN_PASSWORD = 'your-secret-password';

function formatStatus(status) {
  return status === 'completed' ? 'Completed' : 'Pending';
}

async function updateOrderStatus(orderId, completed) {
  try {
    await db.collection('orders').doc(orderId).update({
      status: completed ? 'completed' : 'pending'
    });
    renderOrders();
  } catch (error) {
    console.error(error);
    alert('Unable to update order status.');
  }
}

async function fetchOrders() {
  const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => doc.data());
}

async function renderOrders() {
  const orders = await fetchOrders();
  const stats = document.getElementById('order-stats');
  const container = document.getElementById('orders-container');

  if (!stats || !container) return;

  const total = orders.length;
  const completed = orders.filter(o => o.status === 'completed').length;
  const pending = total - completed;

  stats.innerHTML = `
    <div><strong>Total orders placed:</strong> ${total}</div>
    <div><strong>Pending:</strong> ${pending}</div>
    <div><strong>Completed:</strong> ${completed}</div>
  `;

  if (!orders.length) {
    container.innerHTML = '<p>No orders have been placed yet.</p>';
    return;
  }

  container.innerHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Name</th>
          <th>Receive</th>
          <th>Delivery</th>
          <th>Items</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => `
          <tr>
            <td><strong>${order.id}</strong><br/>${new Date(order.createdAt).toLocaleString()}</td>
            <td>${order.customer.name}</td>
            <td>${order.timeframe}</td>
            <td>${order.delivery.type === 'delivery'
              ? `<div>${order.delivery.address || 'No address'}</div><div>${order.delivery.zone === 'virginiaBeach' ? 'Virginia Beach' : order.delivery.zone}</div>`
              : 'Pickup'}</td>
            <td>${order.items.map(item => `
              <div>
                <strong>${item.name}</strong>
                ${item.flavor ? ` • Flavor: ${item.flavor}` : ''}
                <br/>Sides: ${item.sides.map(side => side.name).join(', ')}
              </div>
            `).join('')}</td>
            <td>$${order.total.toFixed(2)}</td>
            <td>
              <label class="order-status-toggle">
                <input type="checkbox" ${order.status === 'completed' ? 'checked' : ''} data-order-id="${order.id}" />
                ${formatStatus(order.status)}
              </label>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.querySelectorAll('input[data-order-id]').forEach(input => {
    input.addEventListener('change', (event) => {
      updateOrderStatus(event.target.dataset.orderId, event.target.checked);
    });
  });
}

function showLoginForm() {
  const gate = document.getElementById('admin-gate');
  if (!gate) return;
  gate.innerHTML = `
    <div class="admin-login">
      <h2>Admin Access</h2>
      <p>Enter password to view orders</p>
      <input type="password" id="password-input" placeholder="Password" />
      <button onclick="checkPassword()">Login</button>
    </div>
  `;
}

function checkPassword() {
  const input = document.getElementById('password-input');
  if (!input) return;
  if (input.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('adminAllowed', 'true');
    document.getElementById('admin-gate')?.remove();
    document.getElementById('dashboard')?.style?.setProperty('display', 'block');
    renderOrders();
  } else {
    alert('Incorrect password');
    input.value = '';
  }
}

function initAdminPage() {
  if (!document.getElementById('admin-gate') && !document.getElementById('dashboard')) return;

  if (sessionStorage.getItem('adminAllowed') === 'true') {
    document.getElementById('admin-gate')?.remove();
    document.getElementById('dashboard')?.style?.setProperty('display', 'block');
    renderOrders();
  } else {
    showLoginForm();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('order-detail')) {
    loadOrder();
  }
  initAdminPage();
});