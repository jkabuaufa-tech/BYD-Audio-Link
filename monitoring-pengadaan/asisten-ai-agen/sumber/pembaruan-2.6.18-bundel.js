/* MP2618 — PEMBARUAN 2.6.18: BUNDEL TAGIHAN DIPISAH ANDAL & HEMAT TOKEN (aditif; butuh Modul server 1.9.3 · fitur "bundelPetaTeks", "bundelPenyediaLain")
 * Menu Keuangan & Bayar › Bundel PDF:
 * 1. Lapisan teks PDF dibaca di perangkat (pdf.js, tanpa AI, tanpa token) → judul per halaman dikirim ke server sebagai petunjuk pemisahan;
 *    bila AI tetap tidak mengembalikan dokumen, server memisah bundel menurut judul ini (modul 1.9.3).
 * 2. Dokumen yang tidak dikenali dapat dipetakan manual ke item checklist; halaman tanpa dokumen dapat dipetakan manual (hal. a–b → item).
 *    Baris hasil pemetaan manual dibaca AI saat verifikasi (jenis dokumen pasti benar).
 * 3. Baca ulang bundel dengan penyedia AI lain; ringkasan lapisan teks & pemakaian token tampil di panel.
 */
(function () {
  if (window.MP2618) return; window.MP2618 = true;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VT = () => window.MP230_VT || {}, F = () => window.MP219_KEU || {};
  const srv = f => { try { return typeof window.mp220Srv === 'function' ? window.mp220Srv(f) : false; } catch (e) { return false; } };
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  const halTeks = z => !z || !z.halamanMulai ? '' : z.halamanAkhir && z.halamanAkhir !== z.halamanMulai ? z.halamanMulai + '–' + z.halamanAkhir : String(z.halamanMulai);
  const angka = n => Number(n || 0).toLocaleString('id-ID');
  // judul tercetak yang lazim di bundel tagihan (dicari paling kiri/atas pada teks halaman)
  const JUDUL = /jurnal\s+hutang(\s+supplier)?|faktur\s+pajak|tax\s+invoice|k[uw]itansi|invoice|rekap(itulasi)?\s+surat\s+jalan|surat\s+jalan|delivery\s+(order|note)|surat\s+pengiriman(\s+barang)?|spktv|surat\s+penyaluran(\s+pembayaran)?|jaminan\s+(uang\s+muka|pelaksanaan)|berita\s+acara\s+[a-z]+(\s+[a-z]+){0,3}|\bbap[map]?\b|\bbast\b|kartu\s+tanda\s+penduduk|nomor\s+pokok\s+wajib\s+pajak|time\s*sheet|laporan\s+cuaca|surat\s+perjanjian|surat\s+perintah\s+kerja/i;

  /* ---------- 1. lapisan teks PDF (tanpa AI) ---------- */
  const PDFJS = [['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'],
    ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js']];
  let _pj = null;
  function pdfjs() {
    if (window.pdfjsLib && window.pdfjsLib.getDocument) return Promise.resolve(window.pdfjsLib);
    if (_pj) return _pj;
    const coba = i => new Promise((ok, no) => {
      if (i >= PDFJS.length) return no(new Error('pdf.js tidak dapat dimuat'));
      const s = document.createElement('script'); s.src = PDFJS[i][0]; s.async = true;
      s.onload = () => { if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS[i][1]; ok(window.pdfjsLib); } else { s.remove(); coba(i + 1).then(ok, no); } };
      s.onerror = () => { s.remove(); coba(i + 1).then(ok, no); };
      document.head.appendChild(s);
    });
    return (_pj = coba(0).catch(e => { _pj = null; throw e; }));
  }
  const batasWaktu = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('waktu habis')), ms))]);
  function teksHalaman(tc) {   // teks atas halaman lebih dahulu; judul yang dikenali ditaruh di depan: "KWITANSI · <teks atas>"
    const it = (tc.items || []).filter(x => x && x.str && x.str.trim()).sort((a, b) => ((b.transform || [])[5] || 0) - ((a.transform || [])[5] || 0) || ((a.transform || [])[4] || 0) - ((b.transform || [])[4] || 0));
    const t = it.map(x => x.str).join(' ').replace(/\s+/g, ' ').trim(); if (t.length < 4) return '';
    const m = JUDUL.exec(t.slice(0, 600));
    return ((m ? m[0].replace(/\s+/g, ' ').toUpperCase() + ' · ' : '') + t).slice(0, 100);
  }
  window.mp2618PetaTeks = async (file, L) => {   // → [[{h, t}] per bagian] (h = halaman lokal bagian) + .info
    const lib = await batasWaktu(pdfjs(), 15000);
    const doc = await batasWaktu(lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, 20000);
    const n = doc.numPages, teks = [], akhir = Date.now() + 25000;   // maks. ±25 dtk — sisa halaman tetap dibaca AI seperti biasa
    for (let p = 1; p <= n && p <= 600 && Date.now() < akhir; p++) {
      try { const pg = await doc.getPage(p); teks[p - 1] = teksHalaman(await pg.getTextContent()); if (pg.cleanup) pg.cleanup(); } catch (e) { teks[p - 1] = ''; }
    }
    try { if (doc.destroy) doc.destroy(); } catch (e) { }
    const bag = L && L.length ? L : [{ mulai: 1, akhir: n }];
    const PT = bag.map(b => { const a = b.mulai || 1, z = b.akhir || n, o = []; for (let p = a; p <= z; p++) if (teks[p - 1]) o.push({ h: p - a + 1, t: teks[p - 1] }); return o; });
    PT.info = { halaman: n, berteks: teks.filter(Boolean).length, judul: teks.filter(t => / · /.test(t)).length };
    return PT;
  };
  window.mp2618Hasil = (id, r, PT) => {
    const V = VT(); V.teksInfo = V.teksInfo || {}; if (PT && PT.info) V.teksInfo[id] = PT.info;
    if (r && r.dariTeks) setTimeout(() => pesan('AI tidak membaca isi hasil pindai bundel ini. Dokumen dipisahkan menurut judul di lapisan teks PDF (keyakinan rendah) — periksa peta dokumen' + (adm() ? ', atau tekan "Baca ulang dengan penyedia AI lain".' : '.'), 'warn'), 50);
  };

  /* ---------- 2. pemetaan manual ---------- */
  const adm = () => !!(typeof REG !== 'undefined' && REG.sesi && REG.sesi.admin);
  const tplKat = () => { const kat = (F().rec && F().rec.kategori) || ''; return ((window.MP219_T || {})[kat] || []); };
  const itemDari = k => { let x = null; tplKat().some(g => (g.items || []).some(d => d.k === k && (x = d))); return x; };
  const opsiItem = () => tplKat().map(g => `<optgroup label="${E(g.nama)}">${(g.items || []).map(d => `<option value="${E(d.k)}">${E(d.nama)}</option>`).join('')}</optgroup>`).join('');
  const segar = id => { const V = VT(); if (V.sub) V.sub[id] = 'bundel'; if (typeof window.mp240Sub === 'function') window.mp240Sub(id, 'bundel'); };
  function tambahUsulan(B, z, i, d) {
    const st = ((F().rec || {}).items || {})[d.k] || {}, bag = B.berkas && B.berkas.length ? B.berkas : [{ file: B.file, mulai: 1 }];
    let u = (B.usulan || []).find(x => x.k === d.k);
    if (!u) { u = { k: d.k, nama: d.nama, status: st.status || 'TIDAK', segmen: [], tgl: z.tanggal || '', b: z.b || 0 }; (B.usulan = B.usulan || []).push(u); }
    if (u.segmen.indexOf(i) < 0) u.segmen.push(i);
    u.manual = true; u.halaman = u.segmen.map(j => halTeks(B.segmen[j])).filter(Boolean).join(', ');
    u.file = (bag[u.b] || bag[0]).file; u.ket = ('Bundel hal. ' + (u.halaman || '?') + ' (dipetakan manual)').slice(0, 350);
  }
  window.mp2618PilihItem = (id, z, i, boleh) => {
    if (!boleh || !tplKat().length) return '<div class="sub">tidak ada item checklist</div>';
    return `<div class="sub mp2618-pi">tidak dikenali → <select class="form-select form-select-sm mp2618-sel" aria-label="Petakan ${E(z.nama)} hal. ${E(halTeks(z))} ke item checklist" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()" onchange="mp2618Petakan('${E(id)}',${i},this.value)"><option value="">Petakan ke item checklist…</option>${opsiItem()}</select></div>`;
  };
  window.mp2618Petakan = (id, i, k) => {
    const B = (VT().bundel || {})[id], z = B && (B.segmen || [])[i], d = itemDari(k); if (!z || !d) return;
    const lama = z.nama + (z.halamanMulai ? ' hal. ' + halTeks(z) : '');
    z.k = k; z.manual = true; tambahUsulan(B, z, i, d);
    const j = (B.tanpaPeta || []).indexOf(lama); if (j >= 0) B.tanpaPeta.splice(j, 1);
    segar(id); pesan(z.nama + ' hal. ' + (halTeks(z) || '?') + ' → ' + d.nama + '. Tekan "Potong & isi checklist dari bundel" untuk menerapkan.', 'ok');
  };
  window.mp2618Buka = (id, b) => { const V = VT(); V.manBuka = V.manBuka || {}; V.manBuka[id] = !!b; };   // formulir tetap terbuka saat menambah beberapa rentang
  window.mp2618Tambah = id => {
    const B = (VT().bundel || {})[id]; if (!B) return;
    const v = s => (document.getElementById(s) || {}).value, a = parseInt(v('mp2618A'), 10), b = parseInt(v('mp2618B'), 10) || a, d = itemDari(v('mp2618K'));
    const bag = B.berkas && B.berkas.length ? B.berkas : [{ file: B.file, mulai: 1, akhir: null }], info = (VT().teksInfo || {})[id];
    const maks = (info && info.halaman) || (bag.length > 1 ? bag[bag.length - 1].akhir || 0 : 0);   // bundel 1 bagian: server mencatat akhir = 1 → jumlah halaman dari pdf.js
    if (!(a >= 1) || b < a || (maks && b > maks)) { pesan('Isi halaman awal & akhir yang benar' + (maks ? ' (1–' + maks + ')' : '') + '.', 'err'); return; }
    if (!d) { pesan('Pilih item checklist.', 'err'); return; }
    let bi = bag.findIndex(x => a >= (x.mulai || 1) && (!x.akhir || a <= x.akhir)); if (bi < 0) bi = 0;
    B.segmen = B.segmen || []; const i = B.segmen.length;
    const z = { i, b: bi, jenis: 'LAINNYA', judul: '(dipetakan manual)', nama: d.nama, halamanMulai: a, halamanAkhir: b, nomor: null, tanggal: null, nilai: {}, k: d.k, manual: true, keyakinan: 0 };
    B.segmen.push(z); tambahUsulan(B, z, i, d); window.mp2618Buka(id, true);
    segar(id); pesan('Hal. ' + halTeks(z) + ' → ' + d.nama + '. Tekan "Potong & isi checklist dari bundel" untuk menerapkan.', 'ok');
  };

  /* ---------- 3. baca ulang dengan penyedia lain ---------- */
  window.mp2618BacaUlang = async id => {
    const V = VT(), B = (V.bundel || {})[id]; if (!B || typeof window.regAksi !== 'function') return;
    if (F().dirty) { pesan('Simpan perubahan checklist dahulu.', 'err'); return; }
    const bag = B.berkas && B.berkas.length ? B.berkas : [{ file: B.file, mulai: 1, akhir: null }];
    if (typeof tanya === 'function' && !(await tanya('Bundel dibaca ulang oleh penyedia AI lain (bukan ' + E(B.provider || 'sebelumnya') + '). Memakai kuota AI: ' + bag.length + ' panggilan' + (bag.length > 1 ? ' (1 per bagian)' : '') + '. Pemetaan manual yang belum diterapkan akan hilang.', { judul: 'Baca ulang bundel', ok: 'Baca ulang' }))) return;
    V.unggah = V.unggah || {}; V.unggah[id] = { ket: 'Membaca ulang dengan penyedia AI lain…', file: (B.file && B.file.nama) || '' }; segar(id);
    try {
      let r;
      if (bag.length > 1) {
        for (let i = 0; i < bag.length; i++) { V.unggah[id].ket = 'Membaca ulang bagian ' + (i + 1) + '/' + bag.length + ' dengan penyedia AI lain…'; segar(id); await window.regAksi('vtBundel', { data: { id, berkas: [bag[i]], bacaSaja: true, paksa: true, provider: 'lain' } }); }
        r = await window.regAksi('vtBundel', { data: { id, berkas: bag } });
      } else r = await window.regAksi('vtBundel', { data: { id, berkas: bag, paksa: true, provider: 'lain' } });
      V.bundel[id] = r; if (V.hal) V.hal[id] = { n: 1, i: -1 };
      pesan('Bundel dibaca ulang (' + (r.provider || 'AI') + '): ' + (r.segmen || []).length + ' dokumen' + ((r.usulan || []).length ? ', ' + r.usulan.length + ' item checklist dipetakan' : '') + '.', (r.segmen || []).length ? 'ok' : 'warn');
    } catch (e) { pesan('Baca ulang gagal: ' + e.message, 'err'); }
    finally { delete V.unggah[id]; segar(id); }
  };

  /* ---------- panel di bawah peta dokumen ---------- */
  window.mp2618Panel = (id, B, boleh) => {
    const seg = B.segmen || [], info = (VT().teksInfo || {})[id], tk = B.token, tp = (B.tanpaPeta || []).length, out = [];
    if (!seg.length) out.push(`<div class="mp2618-al no"><b>AI tidak menemukan dokumen di bundel ini.</b> Penyebab umum: hasil pindai buram/miring, penyedia AI yang hanya membaca lapisan teks PDF (mis. model OpenRouter tanpa dukungan PDF), atau PDF terkunci. ${adm() ? 'Coba <b>Baca ulang dengan penyedia AI lain</b> (disarankan Google Gemini / Anthropic Claude), ' : 'Minta Admin membaca ulang dengan penyedia lain, '}atau petakan halaman secara manual di bawah.</div>`);
    if (B.dariTeks) out.push('<div class="mp2618-al warn"><b>Dipisahkan dari lapisan teks PDF</b> — AI tidak membaca isi pindaian; nilai, meterai & tanda tangan belum terbaca. Periksa pemetaan; baris checklist tetap diverifikasi AI pada tahap akhir.</div>');
    if (/openrouter/i.test(B.provider || '') && (!seg.length || B.dariTeks)) out.push('<div class="mp2618-al warn">Penyedia <b>OpenRouter</b>: pastikan model yang dipilih mendukung PDF/gambar; model teks saja hanya membaca lapisan teks sehingga bundel hasil pindai terbaca kosong.</div>');
    const ket = [];
    if (info) ket.push('Lapisan teks: ' + info.berteks + '/' + info.halaman + ' halaman' + (info.judul ? ' · ' + info.judul + ' judul dikenali tanpa AI' : '') + (info.berteks < info.halaman ? ' · ' + (info.halaman - info.berteks) + ' halaman hasil pindai' : ''));
    if (tk && (tk.masuk || tk.keluar)) ket.push('Token AI: ' + angka(tk.masuk) + ' masuk · ' + angka(tk.keluar) + ' keluar');
    if (ket.length) out.push('<p class="mp240-cat mp2618-ket">' + E(ket.join(' · ')) + '</p>');
    if (boleh && tplKat().length) out.push(`<details class="mp2618-man"${!seg.length || tp || (VT().manBuka || {})[id] ? ' open' : ''} ontoggle="mp2618Buka('${E(id)}', this.open)"><summary>Petakan halaman secara manual${tp ? ' <span class="mp2618-n">' + tp + ' dokumen belum dipetakan</span>' : ''}</summary>
      <div class="mp2618-f"><label>Hal. <input type="number" min="1" id="mp2618A" class="form-control form-control-sm" inputmode="numeric" aria-label="Halaman awal"></label><label>s.d. <input type="number" min="1" id="mp2618B" class="form-control form-control-sm" inputmode="numeric" aria-label="Halaman akhir"></label>
        <select id="mp2618K" class="form-select form-select-sm" aria-label="Item checklist"><option value="">Item checklist…</option>${opsiItem()}</select>
        <button type="button" class="btn btn-sm btn-primary" onclick="mp2618Tambah('${E(id)}')">Tambah</button></div>
      <p class="mp240-cat">Pratinjau halaman di kiri membantu menentukan nomor halaman. Baris yang dipetakan manual dipotong dari bundel dan dibaca AI saat verifikasi (1 dokumen kecil, bukan seluruh bundel).</p></details>`);
    if (boleh && srv('bundelPenyediaLain')) out.push(`<div class="mp2618-ul"><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp2618BacaUlang('${E(id)}')"><i class="fas fa-rotate me-1"></i>Baca ulang dengan penyedia AI lain</button><span>dibaca ${E(B.provider || 'AI')}${B.cache ? ' · cache' : ''}</span></div>`);
    return out.length ? '<div class="mp2618">' + out.join('') + '</div>' : '';
  };
})();
