const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...opts,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.galat = body.galat;
    throw err;
  }
  return body;
}

export const api = {
  items: () => req('/items').then((r) => r.data),
  ringkasan: () => req('/dashboard/ringkasan').then((r) => r.data),
  analitik: (granularitas, itemId, q = {}) =>
    req(`/analitik/${granularitas}?${new URLSearchParams({ item_id: itemId, ...q })}`).then((r) => r.data),
  keputusan: (itemId, granularitas) =>
    req(`/keputusan/${itemId}${granularitas ? `?granularitas=${granularitas}` : ''}`).then((r) => r.data),
  simpanProduksi: (body) => req('/produksi-harian', { method: 'POST', body: JSON.stringify(body) }),
};
