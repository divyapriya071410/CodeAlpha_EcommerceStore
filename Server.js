const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const products = [
  { id: 1, name: 'Wireless Headphones', price: 1999, category: 'Electronics', description: 'High-clarity wireless headphones with long battery life.' },
  { id: 2, name: 'Smart Fitness Watch', price: 2499, category: 'Wearables', description: 'Tracks steps, heart rate, sleep quality, and notifications.' },
  { id: 3, name: 'Minimalist Backpack', price: 1299, category: 'Accessories', description: 'Water-resistant everyday backpack with laptop compartment.' },
  { id: 4, name: 'Mechanical Keyboard', price: 2999, category: 'Electronics', description: 'Compact tactile keyboard for fast typing and coding.' }
];

const users = [];
const carts = {};
const orders = [];

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'User already registered' });
  const user = { id: users.length + 1, name, email, password };
  users.push(user);
  if (!carts[email.toLowerCase()]) carts[email.toLowerCase()] = [];
  res.status(201).json({ message: 'Registered successfully', user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  if (!carts[user.email.toLowerCase()]) carts[user.email.toLowerCase()] = [];
  res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/products', (req, res) => res.json(products));

app.get('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.get('/api/cart', (req, res) => {
  const email = (req.query.email || 'guest@codealpha.local').toLowerCase();
  const items = carts[email] || [];
  const detailed = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? { ...product, quantity: item.quantity } : null;
  }).filter(Boolean);
  res.json(detailed);
});

app.post('/api/cart', (req, res) => {
  const email = (req.body.email || 'guest@codealpha.local').toLowerCase();
  const productId = Number(req.body.productId);
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!carts[email]) carts[email] = [];
  const existing = carts[email].find((i) => i.productId === productId);
  if (existing) existing.quantity += 1;
  else carts[email].push({ productId, quantity: 1 });
  res.json({ message: 'Added to cart' });
});

app.delete('/api/cart/:productId', (req, res) => {
  const email = (req.query.email || 'guest@codealpha.local').toLowerCase();
  const productId = Number(req.params.productId);
  carts[email] = (carts[email] || []).filter((i) => i.productId !== productId);
  res.json({ message: 'Removed from cart' });
});

app.post('/api/orders', (req, res) => {
  const email = (req.body.email || 'guest@codealpha.local').toLowerCase();
  const customerName = req.body.customerName || 'Guest Customer';
  const address = req.body.address || 'Online Order';
  const items = carts[email] || [];
  if (items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  let total = 0;
  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return null;
    total += product.price * item.quantity;
    return { id: product.id, name: product.name, price: product.price, quantity: item.quantity };
  }).filter(Boolean);

  const order = {
    orderId: 'ORD-' + (1000 + orders.length + 1),
    email,
    customerName,
    address,
    items: orderItems,
    total,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  carts[email] = [];
  res.status(201).json({ message: 'Order placed successfully', order });
});

app.get('/api/orders', (req, res) => {
  const email = (req.query.email || 'guest@codealpha.local').toLowerCase();
  res.json(orders.filter((o) => o.email === email));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
