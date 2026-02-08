import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 8787;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'orders.store.json');

const SIZE_ADDONS = {
  M: 0,
  L: 500,
  XL: 1000,
};

const ICE_ADDON = 700;
const TOPPING_ADDON = 0;

const BASE_PRICES = {
  '100': 8300,
  '70.5': 7300,
  '57.9': 6800,
  MILK: 6800,
};

let writeChain = Promise.resolve();

function withStoreLock(fn) {
  writeChain = writeChain.then(fn, fn);
  return writeChain;
}

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

async function writeStore(orders) {
  const tmpPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(orders, null, 2));
  await fs.rename(tmpPath, STORE_PATH);
}

function normalizeCacao(cacao) {
  const val = Number(cacao);
  if (Number.isNaN(val)) return { label: 'MILK', price: BASE_PRICES.MILK };
  if (val >= 85) return { label: '100', price: BASE_PRICES['100'] };
  if (val >= 65) return { label: '70.5', price: BASE_PRICES['70.5'] };
  if (val >= 45) return { label: '57.9', price: BASE_PRICES['57.9'] };
  return { label: 'MILK', price: BASE_PRICES.MILK };
}

function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'VG-';
  for (let i = 0; i < 8; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const app = express();
app.use(express.json({ limit: '50kb' }));

app.post('/api/orders', async (req, res) => {
  const { cacao, isIced, size, hasTopping } = req.body || {};

  const { label: cacaoNormalized, price: basePrice } = normalizeCacao(cacao);
  const sizeAddon = SIZE_ADDONS[size] ?? 0;
  const iceAddon = isIced ? ICE_ADDON : 0;
  const toppingAddon = hasTopping ? TOPPING_ADDON : 0;
  const price = basePrice + sizeAddon + iceAddon + toppingAddon;

  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000;
  const orderId = generateOrderId();

  const record = {
    orderId,
    cacaoNormalized,
    isIced: Boolean(isIced),
    size: typeof size === 'string' ? size : 'M',
    hasTopping: Boolean(hasTopping),
    price,
    status: 'PENDING',
    createdAt: now,
    expiresAt,
  };

  try {
    await withStoreLock(async () => {
      const orders = await readStore();
      orders.push(record);
      await writeStore(orders);
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to store order' });
    return;
  }

  res.json({ orderId, price, expiresAt });
});

app.get('/api/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  let orders;

  try {
    orders = await readStore();
  } catch (err) {
    res.status(500).json({ message: 'Failed to read orders' });
    return;
  }

  const order = orders.find((o) => o.orderId === orderId);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return;
  }

  const now = Date.now();
  if (order.expiresAt && now > order.expiresAt) {
    res.status(410).json({ status: 'EXPIRED' });
    return;
  }

  res.json(order);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Order server listening on ${PORT}`);
});
