/* MP296 — CETAK BA ANTI-TERPOTONG · KOP STANDAR · NPWP DARI REKANAN (2.9.6)
 *  A. Cetak / Simpan PDF: dokumen yang sudah dirender penuh di modal pratinjau (Preview BA, Paket Tagihan › Pratinjau format Excel,
 *     dokumen generator, permintaan, rekap) dicetak dari JENDELA TERSENDIRI (bukan iframe di dalam aplikasi) setelah huruf & gambar
 *     termuat → pratinjau cetak peramban tampil normal (tidak lagi "Aplikasi ini tidak mendukung pratinjau cetak").
 *     @page A4 portrait, margin 15/15/15/20 mm; narasi rata kanan-kiri & dibungkus; nominal rata kanan.
 *  B. Kop surat standar di setiap dokumen BA (BAP, BAPP, BAPM, BAPR, lampiran, rincian): logo, WASKITA - NINDYA, KSO,
 *     WASKITA - NINDYA KSO, nama pekerjaan/proyek, garis merah & alamat Kantor KSO (sesuai kop baku).
 *  C. NPWP & alamat vendor dari tabel REKANAN (Master Data Vendor SAP: BP No · Street · House No · Post Code · City · Tax No):
 *     impor sekali dari Excel (sheet "rekanan" Master_SPM.xlsx / BAP - format.xlsx atau ekspor rekanan), disimpan di peramban
 *     (IndexedDB). Profil vendor, Paket Tagihan & Excel format baku mengisi NPWP & alamat otomatis; isian tetap dapat diubah manual.
 *  Butuh blok MP292/MP293 (2.9.2–2.9.3). Tanpa perubahan server. */
(function () {
  'use strict';
  if (window.__MP296__) return; window.__MP296__ = true;
  const $ = id => document.getElementById(id);
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };

  /* ======================= konfigurasi kop & cetak ======================= */
  const KOP = { logo: ['__LOGO_KOP__'], nama: 'WASKITA - NINDYA KSO', proyek: 'Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok', alamat: 'Kantor KSO : Jl. M.T. Haryono Kav. No.12-13 Bidaracina, Jatinegara-Jakarta Timur 13330• Telp (021)8515521• waskitanindya.jict@gmail.com' };
  const MARGIN = { t: 15, r: 15, b: 15, l: 20 };   // mm
  const PAGE = `@page{size:A4 portrait;margin:${MARGIN.t}mm ${MARGIN.r}mm ${MARGIN.b}mm ${MARGIN.l}mm}@page lanskap{size:A4 landscape;margin:${MARGIN.t}mm ${MARGIN.r}mm ${MARGIN.b}mm ${MARGIN.l}mm}`;
  // dokumen format Excel (XLR): margin halaman disimulasikan padding di layar; saat cetak padding dilepas & @page memberi margin yang sama
  const CSS_XL = `@media print{${PAGE}.xl-hal{padding:0!important;margin:0!important;box-shadow:none!important;width:${210 - MARGIN.l - MARGIN.r}mm!important;min-height:0!important;height:${297 - MARGIN.t - MARGIN.b}mm}.xl-hal.lanskap{width:${297 - MARGIN.l - MARGIN.r}mm!important;height:${210 - MARGIN.t - MARGIN.b}mm}.xl-hal:last-child{page-break-after:auto;break-after:auto}}`;
  // dokumen HTML (Preview BA, generator): anti-terpotong
  const CSS_DOK = `@media print{${PAGE}html,body{background:#fff!important}.kertas{width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;overflow:visible!important}}
*{box-sizing:border-box}body{word-wrap:break-word;overflow-wrap:break-word}p,.narasi,td.narasi{white-space:normal;text-align:justify;word-wrap:break-word;overflow-wrap:break-word}
table{max-width:100%}td.r,th.r,.r,td.v,.nominal{text-align:right}img{max-width:100%}
.kop .mp296-kt{line-height:1.25}.kop .mp296-kt .nm{font-size:17pt;font-weight:800;color:#0b2a6b;letter-spacing:.5px}.kop .mp296-kt .pr{font-size:9pt;font-weight:700;color:#111;white-space:nowrap}`;
  // logo tanpa "Member of Danareksa": dipakai kop cetak, Preview BA/generator, dan menggantikan logo di berkas Excel format BAP
  window.MP296 = { kop: KOP, margin: MARGIN, cssXL: CSS_XL, cssDok: CSS_DOK, media: { bap: { 'xl/media/image1.png': KOP.logo[0] }, buang: ['image5.emf'] } };
  if (window.XLH) window.XLH.lokal = 'id';   // angka 1.234.567,89 di Excel unduhan & pratinjau

  /* ======================= B. kop standar dokumen HTML ======================= */
  function kopStandar(doc) {
    if (!doc || !doc.querySelectorAll) return;
    doc.querySelectorAll('.kop').forEach(k => {
      if (k.querySelector('.mp296-kt')) return;
      const nm = k.querySelector('.nm'); if (!nm) return;
      const d = doc.createElement('div'); d.className = 'mp296-kt';
      d.innerHTML = `<div class="nm">${E(KOP.nama)}</div><div class="pr">${E(KOP.proyek)}</div>`;
      nm.replaceWith(d);
      k.querySelectorAll('img').forEach(i => { i.src = KOP.logo[0]; });
    });
    if (doc.head && !doc.getElementById('mp296Css')) { const st = doc.createElement('style'); st.id = 'mp296Css'; st.textContent = doc.querySelector('.xl-hal') ? CSS_XL : CSS_DOK; doc.head.appendChild(st); }
  }
  window.mp296Kop = kopStandar;
  // modal pratinjau (iframe) ikut dirapikan saat dimuat → pratinjau = hasil cetak
  document.addEventListener('load', ev => { const f = ev.target; if (f && f.tagName === 'IFRAME') { try { kopStandar(f.contentDocument); } catch (e) { } } }, true);

  /* ======================= A. cetak dari jendela tersendiri ======================= */
  const tunggu = ms => new Promise(r => setTimeout(r, ms));
  async function siap(w) {
    for (let i = 0; i < 100 && w.document.readyState !== 'complete'; i++) await tunggu(50);
    const img = [...w.document.images].filter(x => !x.complete); await Promise.race([Promise.all(img.map(x => new Promise(r => { x.onload = x.onerror = r; }))), tunggu(4000)]);
    try { if (w.document.fonts && w.document.fonts.ready) await Promise.race([w.document.fonts.ready, tunggu(2500)]); } catch (e) { }
    await tunggu(150);
  }
  window.mp296Cetak = async (html, judul) => {
    if (!/<html/i.test(html)) html = '<!doctype html><html><head><meta charset="utf-8"><title>' + E(judul || 'Cetak') + '</title></head><body>' + html + '</body></html>';
    if (!/<meta charset/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + '<meta charset="utf-8">');
    const w = window.open('', '_blank', 'width=960,height=1100');
    if (!w) {   // pop-up diblokir → cetak dari bingkai tersembunyi (cara lama)
      pesan('Izinkan pop-up untuk aplikasi ini agar pratinjau cetak tampil penuh.', 'err');
      let fr = $('mp296Fr'); if (!fr) { fr = document.createElement('iframe'); fr.id = 'mp296Fr'; fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(fr); }
      fr.srcdoc = html; fr.onload = () => { try { kopStandar(fr.contentDocument); fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { } };
      return false;
    }
    w.document.open(); w.document.write(html); w.document.close();
    await siap(w); kopStandar(w.document);
    if (judul) try { w.document.title = judul; } catch (e) { }
    w.__mp296Dicetak = true; if (window.MP296.tahan) return true;   // MP296.tahan: uji — jendela diperiksa tanpa dialog cetak
    w.addEventListener('afterprint', () => setTimeout(() => { try { w.close(); } catch (e) { } }, 300));
    w.focus(); w.print();
    return true;
  };
  window.mp296CetakFrame = (id, judul) => {
    const fr = typeof id === 'string' ? $(id) : id, d = fr && fr.contentDocument;
    if (!d || !d.documentElement) { pesan('Dokumen belum siap dicetak — tunggu pratinjau tampil.', 'err'); return false; }
    kopStandar(d);
    return window.mp296Cetak('<!doctype html>' + d.documentElement.outerHTML, judul || d.title);
  };
  // tombol cetak lama (onclick "…contentWindow.print()") → jendela tersendiri
  document.addEventListener('click', ev => {
    const b = ev.target && ev.target.closest && ev.target.closest('[onclick*="contentWindow.print()"]'); if (!b) return;
    const m = /getElementById\(['"]([^'"]+)['"]\)\.contentWindow\.print\(\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
    ev.preventDefault(); ev.stopImmediatePropagation(); window.mp296CetakFrame(m[1]);
  }, true);
  function bungkusCetak() {
    if (typeof window.cetakBA === 'function' && !window.cetakBA.__mp296) {
      const g = async function () {
        try { if (typeof BA !== 'undefined' && BA && !BA.final && typeof tanya === 'function' && !(await tanya('Dokumen masih DRAF (nomor belum diterbitkan). Cetak sebagai draf?'))) return; } catch (e) { }
        let j = ''; try { j = nomorBA(BA.urut, BA.kode, BA.g.key); } catch (e) { }
        return window.mp296CetakFrame('baFrame', j);
      };
      g.__mp296 = true; window.cetakBA = g;
    }
    if (typeof window.cetakPermintaanSekarang === 'function' && !window.cetakPermintaanSekarang.__mp296) { const g = () => window.mp296CetakFrame('pmFrame'); g.__mp296 = true; window.cetakPermintaanSekarang = g; }
  }
  bungkusCetak(); setTimeout(bungkusCetak, 2000); window.addEventListener('load', bungkusCetak);

  /* ======================= C. REKANAN (Tax No, alamat) ======================= */
  const RK = { peta: null, muat: null, n: 0, pada: '' };
  const DB = 'mp296', TOKO = 'rekanan';
  const idb = () => new Promise((ok, gagal) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(TOKO); r.onsuccess = () => ok(r.result); r.onerror = () => gagal(r.error); } catch (e) { gagal(e); } });
  async function simpanRK(obj) { try { const d = await idb(); await new Promise((ok, gagal) => { const t = d.transaction(TOKO, 'readwrite'); t.objectStore(TOKO).put(obj, 'data'); t.oncomplete = ok; t.onerror = () => gagal(t.error); }); } catch (e) { try { localStorage.setItem('mp296_rekanan', JSON.stringify(obj)); } catch (x) { } } }
  function muatRK() {
    if (RK.muat) return RK.muat;
    RK.muat = (async () => {
      let o = null;
      try { const d = await idb(); o = await new Promise(ok => { const q = d.transaction(TOKO, 'readonly').objectStore(TOKO).get('data'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); }); } catch (e) { }
      if (!o) try { o = JSON.parse(localStorage.getItem('mp296_rekanan') || 'null'); } catch (e) { }
      if (o && o.peta) { RK.peta = o.peta; RK.n = o.n; RK.pada = o.pada; }
      return RK.peta;
    })();
    return RK.muat;
  }
  muatRK();
  const rapi = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const alamatDari = (st, no, pos, kota) => { const a = rapi(st), n = rapi(no); const jalan = a && n && a.toUpperCase().indexOf(n.toUpperCase()) < 0 ? a + ' No. ' + n : a || (n ? 'No. ' + n : ''); return [jalan, [rapi(kota), rapi(pos)].filter(Boolean).join(' ')].filter(Boolean).join(', '); };
  window.mp296Rekanan = id => { const r = RK.peta && id != null ? RK.peta[String(id).trim()] : null; return r ? { npwp: r[0], alamat: r[1], kota: r[2], telp: r[3], email: r[4], nama: r[5] } : null; };

  // baca sheet rekanan dari .xlsx (kolom dicari dari judul: BP No, Name Org, Street, House No, Post Code, City, Telp No, Email, Tax No)
  async function bacaXlsx(bytes) {
    const XLH = window.XLH; if (!XLH || !XLH.bukaZip) throw new Error('Mesin Excel belum terpasang (butuh pembaruan 2.9.3).');
    const F = await XLH.bukaZip(bytes), dec = new TextDecoder();
    const wb = dec.decode(F.get('xl/workbook.xml')), rels = dec.decode(F.get('xl/_rels/workbook.xml.rels'));
    const daftar = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map(m => { const t = new RegExp('Id="' + m[2] + '"[^>]*Target="([^"]+)"').exec(rels) || new RegExp('Target="([^"]+)"[^>]*Id="' + m[2] + '"').exec(rels); return { nama: XLH.unesc(m[1]), path: t ? 'xl/' + t[1].replace(/^\/?xl\//, '') : '' }; });
    const ss = F.has('xl/sharedStrings.xml') ? [...dec.decode(F.get('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => XLH.unesc((m[1].match(/<t[^>]*>([^<]*)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))) : [];
    const urut = daftar.slice().sort((a, b) => (/rekanan/i.test(b.nama) ? 1 : 0) - (/rekanan/i.test(a.nama) ? 1 : 0));
    for (const sh of urut) {
      if (!F.has(sh.path)) continue;
      const xml = dec.decode(F.get(sh.path)), reBaris = /<row [^>]*>([\s\S]*?)<\/row>/g; let m, kol = null; const out = {}; let n = 0;
      const sel = isi => { const o = {}; for (const c of isi.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) { const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] || ''), is = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] || ''); o[c[1]] = /t="s"/.test(c[2]) && v ? ss[Number(v[1])] : v ? XLH.unesc(v[1]) : is ? XLH.unesc(is[1]) : ''; } return o; };
      while ((m = reBaris.exec(xml))) {
        const o = sel(m[1]);
        if (!kol) {
          const cari = re => Object.keys(o).find(k => re.test(String(o[k]).trim()));
          const k = { bp: cari(/^BP\s*No/i), nama: cari(/^Name\s*Org|^Nama/i), st: cari(/^Street/i), no: cari(/^House\s*No/i), pos: cari(/^Post\s*Code/i), kota: cari(/^City/i), telp: cari(/^Telp/i), email: cari(/^E-?mail/i), tax: cari(/^Tax\s*No/i) };
          if (k.bp && k.tax) kol = k; else if (n++ > 5) break; continue;
        }
        const bp = rapi(o[kol.bp]); if (!bp) continue;
        out[bp] = [rapi(o[kol.tax]), alamatDari(o[kol.st], o[kol.no], o[kol.pos], o[kol.kota]), rapi(o[kol.kota]), rapi(o[kol.telp]), rapi(o[kol.email]), rapi(o[kol.nama])];
      }
      if (kol) return { peta: out, sheet: sh.nama };
    }
    throw new Error('Kolom "BP No" & "Tax No" tidak ditemukan. Pilih Excel yang memuat sheet rekanan (Master_SPM.xlsx / BAP - format.xlsx).');
  }
  window.mp296ImporRekanan = () => new Promise(selesai => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xlsm';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return selesai(false);
      pesan('Membaca data rekanan dari ' + f.name + '…', '');
      try {
        const h = await bacaXlsx(new Uint8Array(await f.arrayBuffer())), n = Object.keys(h.peta).length;
        RK.peta = h.peta; RK.n = n; RK.pada = new Date().toISOString(); RK.muat = Promise.resolve(RK.peta);
        await simpanRK({ peta: h.peta, n, pada: RK.pada, berkas: f.name });
        const npwp = Object.values(h.peta).filter(r => r[0]).length;
        pesan('Data rekanan tersimpan: ' + n.toLocaleString('id-ID') + ' vendor (' + npwp.toLocaleString('id-ID') + ' ber-NPWP) dari sheet "' + h.sheet + '". NPWP & alamat vendor kini terisi otomatis.', 'ok');
        selesai(true);
      } catch (e) { pesan(e.message, 'err'); selesai(false); }
    };
    inp.click();
  });

  // profil vendor (dipakai Preview BA, Paket Tagihan, Excel format baku): NPWP & alamat dari rekanan bila kosong
  (function bungkusProfil() {
    const asli = window.profilVendor; if (typeof asli !== 'function' || asli.__mp296) { if (typeof asli !== 'function') setTimeout(bungkusProfil, 1500); return; }
    const g = function (id, nama) {
      const p = asli.apply(this, arguments) || {};
      try { const r = window.mp296Rekanan(id || p.id); if (r) { if (!p.npwp && r.npwp) p.npwp = r.npwp; if (!p.alamat && r.alamat) p.alamat = r.alamat; ['telp', 'email', 'kota'].forEach(k => { if (!p[k] && r[k]) p[k] = r[k]; }); p.rekanan = true; } } catch (e) { }
      return p;
    };
    g.__mp296 = true; window.profilVendor = g;
  })();
  (function bungkusMaster() {   // vendor master MP292 (Excel format baku: INPUT!B25/B26, DATA!B76/B77)
    const asli = window.mp292VendorMaster; if (typeof asli !== 'function' || asli.__mp296) { if (typeof asli !== 'function') setTimeout(bungkusMaster, 1500); return; }
    const g = function (id, nama) { const m = asli.apply(this, arguments), r = window.mp296Rekanan(id); if (!r) return m; const o = Object.assign({}, m || {}); if (!o.npwp && r.npwp) o.npwp = r.npwp; if (!o.alamat && r.alamat) o.alamat = r.alamat; return o; };
    g.__mp296 = true; window.mp292VendorMaster = g;
  })();

  // Paket Tagihan: tombol "Rekanan" di samping isian NPWP vendor (isi dari rekanan; impor bila belum ada); isian tetap dapat diedit
  function pasangTombol() {
    document.querySelectorAll('label').forEach(l => {
      if (l.dataset.mp296 || !/^\s*NPWP vendor/.test(l.textContent)) return; const inp = l.querySelector('input'); if (!inp) return;
      l.dataset.mp296 = '1';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-link btn-sm p-0 ms-2 mp296-rk'; b.id = 'mp296RkBtn';
      b.innerHTML = '<i class="fas fa-address-book me-1"></i>dari rekanan'; b.title = 'Isi NPWP (Tax No) & alamat dari tabel rekanan (Master Data Vendor SAP)';
      b.onclick = async ev => {
        ev.preventDefault(); await muatRK(); if (!RK.peta && !(await window.mp296ImporRekanan())) return;
        let id = ''; try { const T = window.mp270Aktif && window.mp270Aktif(); id = (T && T.g && T.g.idVendor) || ''; } catch (e) { }
        const r = window.mp296Rekanan(id);
        if (!r) { pesan('Vendor ini tidak ditemukan di data rekanan (BP No ' + (id || '-') + '). Isi NPWP manual atau impor ulang data rekanan terbaru.', 'err'); return; }
        if (r.npwp) { inp.value = r.npwp; inp.dispatchEvent(new Event('change', { bubbles: true })); }
        const al = [...document.querySelectorAll('label')].find(x => /^\s*Alamat vendor/i.test(x.textContent)), ai = al && al.querySelector('input,textarea');
        if (ai && !ai.value.trim() && r.alamat) { ai.value = r.alamat; ai.dispatchEvent(new Event('change', { bubbles: true })); }
        pesan(r.npwp ? 'NPWP ' + r.npwp + ' diisi dari rekanan (tetap dapat diubah).' : 'Vendor ada di rekanan, namun Tax No kosong.', r.npwp ? 'ok' : 'err');
      };
      inp.insertAdjacentElement('beforebegin', b);
    });
  }
  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(() => { try { pasangTombol(); bungkusCetak(); } catch (e) { } }, 200); };
  const awasi = () => { if (!document.body) return; pasangTombol(); new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length)) jadwal(); }).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
})();
