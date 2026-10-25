// Contoh pemanggil server Apps Script dari frontend yang di-hosting di luar Google (Netlify).
// Pakai di app.js:  const r = await panggilApi('ping');  /  await panggilApi('login', { nama, pin, proyek });
//
// Tiga aturan penting:
// 1. POST dengan Content-Type "text/plain" — Apps Script tidak menjawab preflight CORS (OPTIONS).
//    "application/json" atau header tambahan (Authorization, X-…) = galat CORS di browser.
// 2. Apps Script membalas 302 ke script.googleusercontent.com; fetch mengikutinya otomatis (redirect: 'follow').
// 3. Bila jawaban berupa HTML (bukan JSON) → deployment salah (akses bukan "Anyone", URL /dev, atau login Google diminta).
async function panggilApi(action, data = {}, opsi = {}) {
  const url = (window.CONFIG && window.CONFIG.API_URL) || '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) throw new Error('API_URL belum diatur di config.js.');
  const batas = opsi.batasMs || 60000, ulang = opsi.ulang ?? (action === 'ping' ? 2 : 1);
  for (let k = 0; ; k++) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), batas);
    try {
      const r = action === 'ping'
        ? await fetch(url + '?action=ping', { redirect: 'follow', signal: ctl.signal })
        : await fetch(url, { method: 'POST', redirect: 'follow', signal: ctl.signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...data }) });
      const teks = await r.text();
      let j; try { j = JSON.parse(teks); } catch (e) { throw new Error('Server menjawab bukan JSON (HTTP ' + r.status + '). Periksa deployment Apps Script: "Execute as: Me", "Who has access: Anyone", URL berakhiran /exec.'); }
      if (!j.ok) throw Object.assign(new Error(j.error || 'Server menolak permintaan.'), { dariServer: true });
      return j;
    } catch (e) {
      const sementara = e.name === 'AbortError' || /Failed to fetch|NetworkError|sibuk/i.test(e.message);
      if (e.dariServer && !/sibuk/i.test(e.message)) throw e;   // galat bisnis (sandi salah, dll.) → jangan diulang
      if (!sementara || k >= ulang) throw new Error(e.name === 'AbortError' ? 'Server tidak menjawab dalam ' + batas / 1000 + ' detik.' : e.message);
      await new Promise(ok => setTimeout(ok, 1500 * (k + 1)));   // jeda bertahap sebelum mencoba lagi
    } finally { clearTimeout(t); }
  }
}
