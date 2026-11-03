const BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    cache: 'no-store',
    ...opts,
    // X-SEPS-Klien wajib untuk perubahan data di server desktop (pelindung dari situs lain).
    headers: { 'Content-Type': 'application/json', 'X-SEPS-Klien': '1', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || (Array.isArray(body.galat) ? 'Ditolak' : `HTTP ${res.status}`));
    err.galat = body.galat;
    err.body = body;
    throw err;
  }
  return body;
}

const kirim = (path, method, data) => req(path, { method, body: typeof data === 'string' ? data : JSON.stringify(data ?? {}) });

export const api = {
  items: () => req('/items').then((r) => r.data),
  ringkasan: () => req('/dashboard/ringkasan').then((r) => r.data),
  analitik: (granularitas, itemId, q = {}) =>
    req(`/analitik/${granularitas}?${new URLSearchParams({ item_id: itemId, ...q })}`).then((r) => r.data),
  keputusan: (itemId, granularitas) =>
    req(`/keputusan/${itemId}${granularitas ? `?granularitas=${granularitas}` : ''}`).then((r) => r.data),
  simpanProduksi: (body) => kirim('/produksi-harian', 'POST', body),

  benchmark: () => req('/benchmark').then((r) => r.data),
  tambahBenchmark: (body) => kirim('/benchmark', 'POST', body).then((r) => r.data),
  ubahBenchmark: (id, body) => kirim(`/benchmark/${id}`, 'PATCH', body).then((r) => r.data),

  sistemInfo: () => req('/sistem/info').then((r) => r.data),
  /** teksPaket = isi berkas .json apa adanya (tidak di-parse ulang di browser). */
  periksaPaket: (teksPaket) => kirim('/sistem/pembaruan?periksa=1', 'POST', teksPaket),
  pasangPaket: (teksPaket) => kirim('/sistem/pembaruan', 'POST', teksPaket),
  daftarBackup: () => req('/sistem/backup').then((r) => r.data),
  buatBackup: () => kirim('/sistem/backup', 'POST').then((r) => r.data),
  kembalikanVersi: (versi) => kirim('/sistem/kembalikan-versi', 'POST', { versi }).then((r) => r.data),
  mulaiUlang: () => kirim('/sistem/mulai-ulang', 'POST'),
};
