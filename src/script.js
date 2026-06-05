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

function handlePreorder(event) {
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

  const sameSlotOrders = ordersAtSlot(order.timeframe);
  if (sameSlotOrders.length >= MAX_ORDERS_PER_SLOT) {
    errors.push('That time slot is fully booked.');
  }

  const sameHourOrders = ordersAtHour(order.timeframe);
  if (sameHourOrders.length >= MAX_ORDERS_PER_HOUR) {
    errors.push('Too many orders in that hour.');
  }

  if (order.delivery.type === 'delivery') {
    const deliveriesForZone = deliveriesAtSlotAndZone(order.timeframe, order.delivery.zone);
    const limit = MAX_DELIVERY_PER_SLOT_BY_ZONE[order.delivery.zone] || 1;
    if (deliveriesForZone.length >= limit) {
      const zoneName = order.delivery.zone === 'virginiaBeach' ? 'Virginia Beach' : order.delivery.zone;
      errors.push(`${zoneName} delivery slot is full.`);
    }
  }

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

  const orderId = `ORD-${Date.now()}`;
  const storedOrders = getStoredOrders();
  const newOrder = {
    id: orderId,
    eventDate: '2026-06-12',
    createdAt: new Date().toISOString(),
    timeframe: order.timeframe,
    delivery: order.delivery,
    customer: order.customer,
    items: order.items,
    total: order.total,
    status: 'pending'
  };

  storedOrders.push(newOrder);
  localStorage.setItem('orders', JSON.stringify(storedOrders));

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