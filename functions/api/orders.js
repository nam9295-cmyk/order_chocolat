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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
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

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env || !env.ORDERS_KV) {
    return jsonResponse({ message: 'ORDERS_KV binding is missing' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ message: 'Invalid JSON body' }, 400);
  }

  const { cacao, isIced, size, hasTopping } = payload || {};

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
    await env.ORDERS_KV.put(orderId, JSON.stringify(record));
  } catch {
    return jsonResponse({ message: 'Failed to store order' }, 500);
  }

  return jsonResponse({ orderId, price, expiresAt }, 200);
}

export async function onRequestGet() {
  return jsonResponse({ message: 'Method not allowed' }, 405);
}
