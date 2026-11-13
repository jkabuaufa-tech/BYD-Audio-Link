/**
 * auth.js — Akun pengguna untuk mode berkas (HTML lokal).
 *
 * Admin membuat akun staf; daftar akun ikut terbawa di "HTML untuk staf" atau
 * berkas paket, sehingga staf cukup membuka berkas lalu masuk.
 *
 * BATASAN: ini pengaman tingkat aplikasi, bukan keamanan server. Kata sandi
 * disimpan sebagai hash bergaram (bukan teks asli), tetapi siapa pun yang
 * menguasai perangkat dan paham alat pengembang browser tetap bisa melewatinya.
 * Di mode tersinkron (artifact claude.ai) modul ini tidak dipakai; hak akses
 * mengikuti menu Share.
 *
 * LocalStorage `jiat-monitoring:akun` = { kunci, diterbitkan, users: [
 *   { id, nama, username, peran: 'admin'|'staf', aktif, salt, hash } ] }
 */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const KEY = 'jiat-monitoring:akun', KEY_SESI = 'jiat-monitoring:sesi';
  const ITER = 2000;

  // SHA-256 murni JS: crypto.subtle tidak selalu tersedia untuk berkas file://.
  const K = new Uint32Array(64);
  (function () { let n = 0; for (let c = 2; n < 64; c++) { let p = true; for (let i = 2; i * i <= c; i++) if (c % i === 0) { p = false; break; } if (p) K[n++] = (Math.cbrt(c) * 4294967296) >>> 0; } })();
  function sha256(bytes) {
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(total), w = new Uint32Array(64);
    m.set(bytes); m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 8, Math.floor((len * 8) / 4294967296)); dv.setUint32(total - 4, (len * 8) >>> 0);
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) >>> 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    H.forEach((v, i) => odv.setUint32(i * 4, v));
    return out;
  }
  const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const utf8 = (s) => new TextEncoder().encode(s);
  function hashSandi(sandi, salt) {
    let h = sha256(utf8(salt + ':' + sandi));
    for (let i = 0; i < ITER; i++) { const buf = new Uint8Array(h.length + 1); buf.set(h); buf[h.length] = i & 255; h = sha256(buf); }
    return hex(h);
  }
  const acak = (n) => { const b = new Uint8Array(n); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => { b[i] = Math.random() * 256; }); return hex(b); };

  let data = { kunci: '', diterbitkan: '', users: [] };
  let sesi = null;
  const simpan = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* abaikan */ } };
  const norm = (u) => String(u || '').trim().toLowerCase();
  const sah = (u) => u && typeof u.id === 'string' && typeof u.nama === 'string' && /^[a-z0-9._-]{3,30}$/.test(u.username || '') &&
    ['admin', 'staf'].includes(u.peran) && /^[0-9a-f]{64}$/.test(u.hash || '') && /^[0-9a-f]{8,64}$/.test(u.salt || '');

  function cekSandi(s) { return typeof s === 'string' && s.length >= 6 ? null : 'Kata sandi minimal 6 karakter.'; }
  function cekProfil(nama, username, kecualiId) {
    if (!String(nama || '').trim()) return 'Nama wajib diisi.';
    if (!/^[a-z0-9._-]{3,30}$/.test(norm(username))) return 'Username 3–30 karakter: huruf kecil, angka, titik, strip.';
    if (data.users.some((u) => u.username === norm(username) && u.id !== kecualiId)) return 'Username sudah dipakai.';
    return null;
  }
  const publik = (u) => u && { id: u.id, nama: u.nama, username: u.username, peran: u.peran, aktif: u.aktif !== false };
  const adminAktif = (kecualiId) => data.users.filter((u) => u.peran === 'admin' && u.aktif !== false && u.id !== kecualiId).length;

  JIAT.auth = {
    /** Login lokal hanya dipakai bila bukan di artifact claude.ai. */
    enabled: !(window.claude && typeof window.claude.use === 'function'),
    init() {
      try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.users)) data = { kunci: String(d.kunci || ''), diterbitkan: String(d.diterbitkan || ''), users: d.users.filter(sah) }; } catch (_) { /* abaikan */ }
      try { const id = localStorage.getItem(KEY_SESI); const u = data.users.find((x) => x.id === id && x.aktif !== false); sesi = u ? u.id : null; } catch (_) { /* abaikan */ }
    },
    hasUsers: () => data.users.length > 0,
    current: () => publik(data.users.find((u) => u.id === sesi && u.aktif !== false)),
    list: () => data.users.map(publik),
    diterbitkan: () => data.diterbitkan,

    login(username, sandi) {
      const u = data.users.find((x) => x.username === norm(username));
      if (!u || u.hash !== hashSandi(String(sandi || ''), u.salt)) return 'Username atau kata sandi salah.';
      if (u.aktif === false) return 'Akun ini dinonaktifkan. Hubungi Admin.';
      sesi = u.id; try { localStorage.setItem(KEY_SESI, u.id); } catch (_) { /* abaikan */ }
      return null;
    },
    logout() { sesi = null; try { localStorage.removeItem(KEY_SESI); } catch (_) { /* abaikan */ } },

    /** Pemasangan pertama: membuat akun Admin dan kunci instalasi. */
    setupAdmin(nama, username, sandi) {
      if (data.users.length) return 'Akun sudah ada di perangkat ini.';
      const err = cekProfil(nama, username) || cekSandi(sandi);
      if (err) return err;
      const salt = acak(16), u = { id: 'usr-' + acak(6), nama: nama.trim(), username: norm(username), peran: 'admin', aktif: true, salt, hash: hashSandi(sandi, salt) };
      data = { kunci: acak(16), diterbitkan: new Date().toISOString(), users: [u] }; simpan();
      sesi = u.id; try { localStorage.setItem(KEY_SESI, u.id); } catch (_) { /* abaikan */ }
      return null;
    },
    /** Tambah/ubah akun (Admin). `sandi` kosong saat mengubah = tidak diganti. */
    upsertUser({ id, nama, username, peran, aktif, sandi }) {
      const lama = data.users.find((u) => u.id === id);
      const err = cekProfil(nama, username, id) || (!lama || sandi ? cekSandi(sandi) : null);
      if (err) return err;
      if (!['admin', 'staf'].includes(peran)) return 'Peran tidak dikenal.';
      if (lama && lama.peran === 'admin' && (peran !== 'admin' || aktif === false) && !adminAktif(lama.id)) return 'Harus ada minimal satu Admin aktif.';
      const u = lama || { id: 'usr-' + acak(6) };
      Object.assign(u, { nama: nama.trim(), username: norm(username), peran, aktif: aktif !== false });
      if (sandi) { u.salt = acak(16); u.hash = hashSandi(sandi, u.salt); }
      if (!lama) data.users.push(u);
      data.diterbitkan = new Date().toISOString(); simpan();
      return null;
    },
    removeUser(id) {
      const u = data.users.find((x) => x.id === id);
      if (!u) return null;
      if (u.id === sesi) return 'Tidak bisa menghapus akun yang sedang dipakai.';
      if (u.peran === 'admin' && !adminAktif(u.id)) return 'Harus ada minimal satu Admin aktif.';
      data.users = data.users.filter((x) => x.id !== id); data.diterbitkan = new Date().toISOString(); simpan();
      return null;
    },

    /** Daftar akun untuk dibawa ke perangkat lain (hash, bukan kata sandi asli). */
    exportAkun: () => JSON.parse(JSON.stringify(data)),
    /**
     * Terima daftar akun dari Admin. Perangkat yang sudah punya akun hanya
     * menerima paket dengan kunci instalasi yang sama dan terbitan lebih baru.
     * @returns {'dipasang'|'lama'|'ditolak'}
     */
    importAkun(paket) {
      if (!paket || !Array.isArray(paket.users) || !paket.kunci) return 'ditolak';
      const users = paket.users.filter(sah);
      if (!users.some((u) => u.peran === 'admin' && u.aktif !== false)) return 'ditolak';
      if (data.users.length && data.kunci !== paket.kunci) return 'ditolak';
      if (data.users.length && !(String(paket.diterbitkan) > data.diterbitkan)) return 'lama';
      data = { kunci: String(paket.kunci), diterbitkan: String(paket.diterbitkan || ''), users }; simpan();
      if (!data.users.some((u) => u.id === sesi && u.aktif !== false)) this.logout();
      return 'dipasang';
    },
  };
})();
