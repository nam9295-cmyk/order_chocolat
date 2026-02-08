function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function onRequestGet(context) {
  const { params, env } = context;

  if (!env || !env.ORDERS_KV) {
    return jsonResponse({ message: 'ORDERS_KV binding is missing' }, 500);
  }

  const orderId = params?.orderId;
  if (!orderId) {
    return jsonResponse({ message: 'Order ID is required' }, 400);
  }

  let raw;
  try {
    raw = await env.ORDERS_KV.get(orderId);
  } catch {
    return jsonResponse({ message: 'Failed to read order' }, 500);
  }

  if (!raw) {
    return jsonResponse({ message: 'Order not found' }, 404);
  }

  let order;
  try {
    order = JSON.parse(raw);
  } catch {
    return jsonResponse({ message: 'Invalid order data' }, 500);
  }

  const now = Date.now();
  if (order.expiresAt && now > order.expiresAt) {
    return jsonResponse({ status: 'EXPIRED' }, 410);
  }

  return jsonResponse(order, 200);
}

export async function onRequestPost() {
  return jsonResponse({ message: 'Method not allowed' }, 405);
}
