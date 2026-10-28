/* TAGIHAN KLIEN 1.0.0 — bantu sisi peramban (Monitoring SAP & Billing Generator): SHA-256, base64, kunci idempotensi,
 * unggah PDF bertahap ke modul server (blUnggahMulai → blUnggahPotong ×n → blUnggahSelesai) dengan kirim ulang aman,
 * dan pemuat pdf-lib (berkas lokal → cdnjs → jsdelivr). */
var BLK = (function () {
  'use strict';
  const KK = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256Js(bytes) {   // cadangan bila crypto.subtle tidak tersedia (mis. dibuka dari alamat http biasa)
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(bytes); m[l] = 0x80;
    const bits = l * 8; for (let i = 0; i < 8; i++) m[n - 1 - i] = Math.floor(bits / Math.pow(2, 8 * i)) & 255;
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + KK[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }
  async function sha256(bytes) {
    try { if (typeof crypto !== 'undefined' && crypto.subtle) { const d = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(d), b => ('0' + b.toString(16)).slice(-2)).join(''); } } catch (e) { }
    return sha256Js(bytes);
  }
  function keBase64(bytes) { let s = ''; const P = 0x8000; for (let i = 0; i < bytes.length; i += P) s += String.fromCharCode.apply(null, bytes.subarray(i, i + P)); return btoa(s); }
  function kunciIdem(awal) { let r = ''; try { r = crypto.randomUUID(); } catch (e) { r = Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); } return (awal || 'bl') + '-' + r.replace(/[^A-Za-z0-9-]/g, ''); }
  const jeda = ms => new Promise(r => setTimeout(r, ms));
  const putus = e => /halaman HTML|Failed to fetch|NetworkError|Load failed|network|terputus|timeout|Unexpected token/i.test(String(e && e.message || e));
  // kirim(action, data) → Promise({ok,...}) (melempar galat bila !ok). Ulang aman: potongan ditimpa, selesai idempoten.
  async function unggah(kirim, bytes, meta, kabar) {
    if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
    const sha = await sha256(bytes), b64 = keBase64(bytes), POT = Math.min(Number(meta.potong) || 2000000, 2900000), n = Math.max(1, Math.ceil(b64.length / POT));
    const coba = async (fn, kali) => { for (let i = 0; ; i++) { try { return await fn(); } catch (e) { if (i >= (kali || 3) || !putus(e)) throw e; await jeda(1500 * (i + 1)); } } };
    const m = await coba(() => kirim('blUnggahMulai', { nama: meta.nama, ukuran: bytes.length, sha256: sha, bagian: n, jenis: meta.jenis, ket: meta.ket }));
    for (let i = 0; i < n; i++) { await coba(() => kirim('blUnggahPotong', { uploadId: m.uploadId, ke: i + 1, data: b64.slice(i * POT, (i + 1) * POT) })); if (kabar) kabar((i + 1) / n); }
    const s = await coba(() => kirim('blUnggahSelesai', { uploadId: m.uploadId }), 4);
    return Object.assign({}, s.file, { sha256: sha });
  }
  // kirim tulis dengan kunci idempotensi: bila jawaban terputus, dikirim ulang dengan kunci SAMA (server mengembalikan hasil yang sudah tersimpan)
  async function tulisAman(kirim, action, data) {
    data = Object.assign({ kunciIdem: kunciIdem(action) }, data);
    for (let i = 0; ; i++) { try { return await kirim(action, data); } catch (e) { if (i >= 2 || !putus(e)) throw e; await jeda(2000 * (i + 1)); } }
  }
  const SUMBER_PDFLIB = ['pdf-lib.min.js', 'lib/pdf-lib.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js', 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'];
  let _pl = null;
  function muatPdfLib(sumber) {
    if (typeof window !== 'undefined' && window.PDFLib && window.PDFLib.PDFDocument) return Promise.resolve(window.PDFLib);
    if (_pl) return _pl;
    const L = (sumber || SUMBER_PDFLIB).filter(s => /^https?:/.test(s) || /^https?:|^file:/.test(location.protocol));
    const coba = i => new Promise((ok, no) => {
      if (i >= L.length) return no(new Error('Pustaka pdf-lib tidak dapat dimuat (perlu berkas lib/pdf-lib.min.js atau internet ke cdnjs.cloudflare.com / cdn.jsdelivr.net).'));
      const s = document.createElement('script'); s.src = L[i]; s.onload = () => window.PDFLib && window.PDFLib.PDFDocument ? ok(window.PDFLib) : coba(i + 1).then(ok, no); s.onerror = () => coba(i + 1).then(ok, no); document.head.appendChild(s);
    });
    _pl = coba(0).catch(e => { _pl = null; throw e; }); return _pl;
  }
  function unduh(bytes, nama, tipe) { const b = new Blob([bytes], { type: tipe || 'application/pdf' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  return { VERSI: '1.0.0', sha256, sha256Js, keBase64, kunciIdem, unggah, tulisAman, muatPdfLib, unduh, putus };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BLK;
