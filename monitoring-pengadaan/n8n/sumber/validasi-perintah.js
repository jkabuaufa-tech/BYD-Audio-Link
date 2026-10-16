// n8n Code node "Validasi Perintah" — alur Webhook Perintah. Hanya perintah dalam daftar putih yang diteruskan.
const PERINTAH = {
  ringkas:    { action: 'vtRingkas',  ket: 'Ringkasan hasil Verifikasi Tagihan' },
  kantor:     { action: 'timRingkas', ket: 'Ringkasan laporan Kantor AI' },
  diagnostik: { action: 'diagServer', ket: 'Diagnostik server (versi, modul, jumlah baris)' },
  notifikasi: { action: 'notifInfo',  ket: 'Pratinjau notifikasi (khusus akun Admin)' },
  timjalan:   { action: 'timJalan',   ket: 'Jalankan Tim AI sekarang (memakai kuota AI; jeda 5 menit)' },
  verifikasi: { action: 'vtNilai',    ket: 'Nilai ulang tagihan dari hasil baca tersimpan (tanpa biaya AI)', perluId: true }
};
const b = ($input.first().json.body) || {};
const p = String(b.perintah || '').trim().toLowerCase();
const def = PERINTAH[p];
if (!def) return [{ json: { sah: false, kode: 400, jawaban: { ok: false, error: 'Perintah tidak dikenal.', perintahTersedia: Object.keys(PERINTAH).map(k => ({ perintah: k, ket: PERINTAH[k].ket })) } } }];
const id = String(b.id || '').trim();
if (def.perluId && !/^[\w.\-\/]{1,80}$/.test(id)) return [{ json: { sah: false, kode: 400, jawaban: { ok: false, error: 'Perintah "' + p + '" butuh "id" tagihan yang sah.' } } }];
return [{ json: { sah: true, perintah: p, action: def.action, data: def.perluId ? { id } : {}, pemohon: String(b.pemohon || 'webhook').slice(0, 60) } }];
