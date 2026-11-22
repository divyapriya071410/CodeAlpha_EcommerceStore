let currentUser = null;
let isRegisterMode = false;

const authSection = document.getElementById('authSection');
const openAuthBtn = document.getElementById('openAuthBtn');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const nameGroup = document.getElementById('nameGroup');
const authName = document.getElementById('authName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const switchPrompt = document.getElementById('switchPrompt');
const switchAuthMode = document.getElementById('switchAuthMode');
const authMessage = document.getElementById('authMessage');
const userBar = document.getElementById('userBar');

const productsGrid = document.getElementById('productsGrid');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');
const orderMessage = document.getElementById('orderMessage');
const ordersListEl = document.getElementById('ordersList');

function getActiveEmail() {
  return currentUser ? currentUser.email : 'guest@codealpha.local';
}

function updateUserBar() {
  if (currentUser) {
    userBar.innerHTML = `
      <span>Hi, <strong>${currentUser.name}</strong></span>
      <button id="logoutBtn" class="btn btn-outline">Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      currentUser = null;
      updateUserBar();
      loadCart();
      loadOrders();
    });
  } else {
    userBar.innerHTML = `<button id="openAuthBtn" class="btn btn-outline">Login / Register</button>`;
    document.getElementById('openAuthBtn').addEventListener('click', () => {
      authSection.classList.toggle('hidden');
    });
  }
}

openAuthBtn.addEventListener('click', () => {
  authSection.classList.toggle('hidden');
});

switchAuthMode.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authMessage.textContent = '';
  if (isRegisterMode) {
    authTitle.textContent = 'Register';
    nameGroup.classList.remove('hidden');
    authName.required = true;
    authSubmitBtn.textContent = 'Create Account';
    switchPrompt.textContent = 'Already have an account?';
    switchAuthMode.textContent = 'Login';
  } else {
    authTitle.textContent = 'Login';
    nameGroup.classList.add('hidden');
    authName.required = false;
    authSubmitBtn.textContent = 'Login';
    switchPrompt.textContent = 'New here?';
    switchAuthMode.textContent = 'Create an account';
  }
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authMessage.textContent = '';
  const endpoint = isRegisterMode ? '/api/register' : '/api/login';
  const payload = {
    email: authEmail.value.trim(),
    password: authPassword.value
  };
  if (isRegisterMode) {
    payload.name = authName.value.trim();
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      authMessage.style.color = '#dc2626';
      authMessage.textContent = data.error || 'Authentication failed';
      return;
    }

    currentUser = data.user;
    authMessage.style.color = '#059669';
    authMessage.textContent = data.message;
    authForm.reset();
    authSection.classList.add('hidden');
    updateUserBar();
    loadCart();
    loadOrders();
  } catch (err) {
    authMessage.style.color = '#dc2626';
    authMessage.textContent = 'Network error';
  }
});

async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  productsGrid.innerHTML = products
    .map(
      (p) => `
      <div class="card product-card">
        <div>
          <span class="badge">${p.category}</span>
          <h3>${p.name}</h3>
          <p>${p.description}</p>
        </div>
        <div>
          <p class="price">₹${p.price}</p>
          <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to Cart</button>
        </div>
      </div>
    `
    )
    .join('');
}

async function addToCart(productId) {
  await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: getActiveEmail(),
      productId
    })
  });
  loadCart();
}

async function removeFromCart(productId) {
  await fetch(`/api/cart/${productId}?email=${encodeURIComponent(getActiveEmail())}`, {
    method: 'DELETE'
  });
  loadCart();
}

async function loadCart() {
  const res = await fetch(`/api/cart?email=${encodeURIComponent(getActiveEmail())}`);
  const items = await res.json();

  if (!items.length) {
    cartItemsEl.innerHTML = '<p>Your cart is empty.</p>';
    cartTotalEl.textContent = '0';
    return;
  }

  let total = 0;
  cartItemsEl.innerHTML = items
    .map((item) => {
      const subtotal = item.price * item.quantity;
      total += subtotal;
      return `
        <div class="cart-item">
          <div>
            <strong>${item.name}</strong><br />
            <small>₹${item.price} × ${item.quantity} = ₹${subtotal}</small>
          </div>
          <button class="btn btn-danger" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
      `;
    })
    .join('');
  cartTotalEl.textContent = total;
}

checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  orderMessage.textContent = '';

  const customerName = document.getElementById('customerName').value.trim();
  const address = document.getElementById('customerAddress').value.trim();

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: getActiveEmail(),
      customerName,
      address
    })
  });

  const data = await res.json();
  if (!res.ok) {
    orderMessage.style.color = '#dc2626';
    orderMessage.textContent = data.error || 'Could not place order';
    return;
  }

  orderMessage.style.color = '#059669';
  orderMessage.textContent = `Order ${data.order.orderId} confirmed! Total: ₹${data.order.total}`;
  checkoutForm.reset();
  loadCart();
  loadOrders();
});

async function loadOrders() {
  const res = await fetch(`/api/orders?email=${encodeURIComponent(getActiveEmail())}`);
  const orders = await res.json();

  if (!orders.length) {
    ordersListEl.innerHTML = '<p>No orders placed yet.</p>';
    return;
  }

  ordersListEl.innerHTML = orders
    .map(
      (o) => `
      <div class="order-item">
        <div><strong>${o.orderId}</strong> — <span class="badge">${o.status}</span></div>
        <div>Total: <strong>₹${o.total}</strong> | To: ${o.customerName} (${o.address})</div>
        <small>${o.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}</small>
      </div>
    `
    )
    .join('');
}

// Initial load
loadProducts();
loadCart();
loadOrders();
