export async function createOrder(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload is required');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      let message = `Request failed with status ${res.status}`;
      try {
        const data = await res.json();
        if (data && typeof data.message === 'string' && data.message.trim()) {
          message = data.message.trim();
        }
      } catch {
        // ignore JSON parsing errors
      }
      throw new Error(message);
    }

    const data = await res.json();
    const { orderId, price, expiresAt } = data || {};

    if (!orderId || typeof price !== 'number' || !expiresAt) {
      throw new Error('Invalid response from server');
    }

    return { orderId, price, expiresAt };
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err instanceof Error ? err : new Error('Request failed');
  } finally {
    clearTimeout(timeoutId);
  }
}
