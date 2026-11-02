/* MP2103 — WATERMARK FOTO · DOKUMENTASI PENERIMAAN MATERIAL · KETERANGAN VENDOR/PENGAMBIL · CETAK KARTU GUDANG A4 (2.10.4; Modul server 1.10.8)
 *  1. Setiap foto gudang (FOTO-GR, FOTO-GR-ITEM, FOTO-GI) dibubuhi watermark sebelum diunggah: tanggal = tanggal BAPM (bila ada; selain itu
 *     tanggal transaksi), jam acak dalam jam kerja yang berbeda per material (mis. 10.30, 14.10), dan alamat baku WASKITA-NINDYA KSO.
 *  2. Dokumentasi Penerimaan Material: grid foto (2 kolom) dengan label nama material sesuai PO di bawah tiap foto; terbuka otomatis
 *     setelah kiriman/lengkapi foto tersimpan, dan lewat tombol di daftar kiriman. Siap cetak / PDF sebagai lampiran tagihan (BAPM).
 *  3. Keterangan Kartu Gudang: Masuk → nama vendor · Keluar → nama pengambil.
 *  4. Cetak Kartu Gudang A4: dipadatkan agar muat 1 halaman; bila tidak muat, tabel dipecah per halaman dengan header tabel berulang
 *     dan blok tanda tangan utuh di halaman terakhir. */
(function () {
  'use strict';
  if (window.__MP2103__) return; window.__MP2103__ = true;
  const $ = id => document.getElementById(id);
  const S = v => String(v == null ? '' : v).trim();
  const E = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ambil = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined || v === null ? fb : v; } catch (e) { return fb; } };
  const pesan = (m, t) => { try { if (typeof window.notif === 'function') window.notif(m, t || ''); } catch (e) { } };
  const ALAMAT = 'No.1 Jalan Sulawesi Ujung, Kecamatan Koja, Jakarta Utara, Daerah Khusus Ibukota Jakarta, WASKITA-NINDYA KSO';
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const tglID = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tglP = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(t)); return m ? Number(m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : '-'; };
  const progres = () => ambil('PROG', {}).data || [];
  const register = () => ambil('REG', {}).data || [];
  const G = () => window.MP223 || { masuk: [], keluar: [] };

  /* ---------- rujukan: SPM, BAPM (nomor & tanggal), vendor, nama material sesuai PO ---------- */
  const rujuk = r => { try { return (window.mp2102RujukanBA ? window.mp2102RujukanBA()(r) : {}) || {}; } catch (e) { return {}; } };
  function kontrak(no) {
    const reg = register().find(x => x.noKontrak === no) || null;
    let g = null; try { g = (ambil('RINGKASAN', []) || []).find(x => x.key === no || (x.terkait || []).indexOf(no) >= 0) || null; } catch (e) { }
    return { reg, g, vendor: S((reg && reg.namaVendor) || (g && (g.namaVendor || g.vendor))) };
  }
  function tglBAPM(r) {
    const e = progres().find(x => x.id === r.refProgres) || (() => { const ba = rujuk(r).ba; return ba ? progres().find(x => S(x.nomorBA) === ba) : null; })();
    const t = S(e && e.tanggalBA).slice(0, 10); return ISO.test(t) ? t : '';
  }
  function namaPO(r, spm) {
    const K = kontrak(spm), kode = S(r.kode), ur = S(r.uraian).toLowerCase();
    const it = ((K.reg && K.reg.items) || []).find(x => (kode && S(x.kode) === kode) || S(x.uraian).toLowerCase() === ur)
      || ((K.g && K.g.items) || []).find(x => (kode && S(x.kodeItem || x.kode) === kode) || S(x.itemPekerjaanEfektif || x.itemPekerjaan || x.uraian).toLowerCase() === ur);
    return S(it && (it.uraian || it.itemPekerjaanEfektif || it.itemPekerjaan)) || S(r.uraian);
  }

  /* ---------- 3. Keterangan Kartu Gudang ---------- */
  window.mp2102KetGR = r => { const spm = rujuk(r).spm; return 'Masuk - ' + (spm && kontrak(spm).vendor || '-'); };
  window.mp2102KetGI = r => 'Keluar - ' + (S(r.penerima) || '-');

  /* ---------- 1. Watermark foto ---------- */
  // jam acak per material dalam jam kerja (mis. 10.30, 14.10): tiap material berbeda, foto berikutnya material yang sama +1–3 menit
  const JAM = {};
  function jamOperasional(kunci) {
    let x = JAM[kunci];
    if (x === undefined) { const dipakai = Object.values(JAM); do { x = 510 + Math.floor(Math.random() * 450); } while (dipakai.some(v => Math.abs(v - x) < 20) && dipakai.length < 20); }   // 08.30–15.59, antarmaterial ≥ 20 menit
    else x = Math.min(1019, x + 1 + Math.floor(Math.random() * 3));
    JAM[kunci] = x;
    return String(Math.floor(x / 60)).padStart(2, '0') + '.' + String(x % 60).padStart(2, '0');
  }
  const kunciMaterial = b => { const m = / · item ([^·]+) · /.exec(S(b.ket)); return S(b.jenis) + '|' + (m ? m[1].trim() : 'utama'); };
  function tanggalFoto(jenis) {
    if (jenis === 'FOTO-GI') return S(($('mp223KTgl') || {}).value);
    const oto = $('mp2100OtoTgl'); if (oto && oto.offsetParent !== null && ISO.test(oto.value)) return oto.value;
    const F = window.MP223F || {}, tr = S(($('mp223MTgl') || {}).value);
    if (F.bon) { let bon = null; try { bon = (ambil('PMT', {}).data || []).find(b => b.nomor === F.bon); } catch (e) { }
      for (const i of Object.keys(F.qty || {}).filter(i => Number(F.qty[i]) > 0)) { const it = bon && bon.items && bon.items[i]; const t = it && tglBAPM({ bonNomor: F.bon, bonIdx: Number(i), kode: it.kode, uraian: it.uraian, tanggal: tr }); if (t) return t; } }
    return tr;
  }
  function bungkusTeks(g, teks, maks) {
    const kata = teks.split(' '), out = []; let b = '';
    kata.forEach(k => { const c = b ? b + ' ' + k : k; if (g.measureText(c).width > maks && b) { out.push(b); b = k; } else b = c; }); if (b) out.push(b); return out;
  }
  function watermark(b64, tgl, jam) {
    return new Promise((ok, gagal) => {
      const im = new Image(); im.onerror = () => gagal(new Error('Foto tidak dapat dibaca untuk watermark.'));
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const W = c.width, fs = Math.max(14, Math.round(W / 42)), pad = Math.round(fs * 0.7), lebar = W - 2 * pad;
        g.font = '600 ' + fs + 'px Arial, Helvetica, sans-serif'; const baris = bungkusTeks(g, ALAMAT, lebar);
        const tinggi = pad * 2 + Math.round(fs * 1.35) * (baris.length + 1);
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, c.height - tinggi, W, tinggi);
        g.fillStyle = '#fff'; g.textBaseline = 'top'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 2;
        let y = c.height - tinggi + pad;
        g.font = '700 ' + Math.round(fs * 1.1) + 'px Arial, Helvetica, sans-serif'; g.fillText(tglID(tgl) + '  ' + jam + ' WIB', pad, y); y += Math.round(fs * 1.35);
        g.font = '600 ' + fs + 'px Arial, Helvetica, sans-serif'; baris.forEach(t => { g.fillText(t, pad, y); y += Math.round(fs * 1.35); });
        ok(c.toDataURL('image/jpeg', 0.88).split(',')[1]);
      };
      im.src = 'data:image/jpeg;base64,' + b64;
    });
  }
  window.mp2103Watermark = watermark;

  /* ---------- regAksi: watermark sebelum unggah · dokumentasi setelah simpan ---------- */
  (function bungkus() {
    const ra = window.regAksi; if (typeof ra !== 'function') { setTimeout(bungkus, 1200); return; } if (ra.__mp2103) return;
    const g = async function (a, x) {
      if (a === 'gudangUnggahFoto' && x && x.berkas && /^FOTO-(GR|GR-ITEM|GI)$/.test(S(x.berkas.jenis)) && x.berkas.data && !x.berkas.wm) {
        const t = tanggalFoto(S(x.berkas.jenis)), tgl = ISO.test(t) ? t : new Date().toISOString().slice(0, 10), jam = jamOperasional(kunciMaterial(x.berkas));
        try { x = Object.assign({}, x, { berkas: Object.assign({}, x.berkas, { data: await watermark(x.berkas.data, tgl, jam), wm: 1, ket: S(x.berkas.ket) + ' · ' + tglID(tgl) + ' ' + jam + ' WIB · ' + ALAMAT }) }); }
        catch (e) { console.warn('[MP2103] watermark', e); }
      }
      const r = await ra.apply(this, [a, x].concat([].slice.call(arguments, 2)));
      if (a === 'gudangTerimaBon' || a === 'gudangLengkapiFoto' || a === 'gudangKeluarSimpan') Object.keys(JAM).forEach(k => delete JAM[k]);   // kiriman berikutnya: jam baru
      if ((a === 'gudangTerimaBon' || a === 'gudangLengkapiFoto') && r && r.ok) {
        const kid = S(r.kiriman || (x && x.data && x.data.kiriman)); if (kid) setTimeout(() => { window.mp2103Dokumentasi(kid).catch(e => pesan('Dokumentasi penerimaan belum tersusun: ' + e.message, 'warning')); }, 600);
      }
      return r;
    };
    Object.keys(ra).forEach(k => { g[k] = ra[k]; }); g.__mp2103 = true; window.regAksi = g;
  })();

  /* ---------- 2. Dokumentasi Penerimaan Material ---------- */
  const CACHE = {};
  async function fotoData(ref) {
    const id = ref && (ref.idServer || ref.id); if (!id) return '';
    if (CACHE[id]) return CACHE[id];
    const r = await window.regAksi('ambilBerkas', { id });
    const src = 'data:' + (r.tipe || 'image/jpeg') + ';base64,' + r.data;
    CACHE[id] = await new Promise(ok => { const im = new Image(); im.onload = () => { const s = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.82)); }; im.onerror = () => ok(src); im.src = src; });
    return CACHE[id];
  }
  const kunciKirim = r => S(r.kiriman) || ('SJ:' + S(r.noSJ).toLowerCase() + '|' + S(r.tanggal));
  window.mp2103Dokumentasi = async function (kunci) {
    let rows = (G().masuk || []).filter(r => r.status === 'AKTIF' && kunciKirim(r) === kunci);
    if (!rows.length && typeof window.mp223Muat === 'function') { await window.mp223Muat(true); rows = (G().masuk || []).filter(r => r.status === 'AKTIF' && kunciKirim(r) === kunci); }
    if (!rows.length) throw new Error('kiriman tidak ditemukan');
    pesan('Menyusun dokumentasi penerimaan material…');
    const r0 = rows[0], rj = rujuk(r0), spm = rj.spm || '', K = kontrak(spm), tB = tglBAPM(r0) || S(r0.tanggal);
    const sel = [];
    for (const r of rows) {
      const nm = namaPO(r, spm), foto = (r.foto || []).map((f, i) => f ? { f, i } : null).filter(Boolean);
      for (const x of foto) sel.push({ id: S(x.f.idServer || x.f.id), nm, sisi: S(x.f.sisi) || ['Tampak Depan', 'Tampak Belakang', 'Samping Kanan', 'Samping Kiri'][x.i], qty: r.qty, sat: r.sat, src: await fotoData(x.f), wakil: !!r.fotoWakil });
    }
    // foto yang sama (foto utama mewakili beberapa item): satu sel, label gabungan
    const un = []; sel.forEach(s => { const a = un.find(u => u.id === s.id); if (a) { if (a.nm.indexOf(s.nm) < 0) a.nm += ' · ' + s.nm; } else un.push(Object.assign({}, s)); });
    const idt = typeof window.mp224Identitas === 'function' ? window.mp224Identitas() : { nama: 'WASKITA - NINDYA KSO', singkatan: 'W', anggota: [] };
    const logo = typeof window.mp227Logo === 'function' ? window.mp227Logo(idt) : '';
    const PR = ambil('PROYEK', {});
    const meta = [['No. BAPM', rj.ba || '-'], ['No. SPM / PO', spm || '-'], ['Vendor', K.vendor || '-'], ['Tanggal BAPM', tglP(tB)], ['No. Bon', S(r0.bonNomor) || '-'], ['No. Surat Jalan', S(r0.noSJ) || '-']];
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Dokumentasi Penerimaan Material · ${E(rj.ba || r0.noSJ)}</title><style>
      @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font:9pt Arial,Helvetica,sans-serif;color:#111;margin:0}
      .kop{display:flex;align-items:center;gap:10px;border-bottom:2px solid #0B2B54;padding-bottom:6px;margin-bottom:8px;font-weight:700;font-size:12pt}.kop .lgi{height:40px;width:auto}
      h1{text-align:center;font-size:12pt;margin:4px 0 2px}.sub{text-align:center;font-size:8.5pt;margin-bottom:8px}
      table.m{width:100%;border-collapse:collapse;margin-bottom:8px}.m td{padding:2px 6px;border:1px solid #999;font-size:8.5pt}.m td.k{width:24%;background:#EEF2F7;font-weight:700}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6mm 6mm}
      .sel{border:1px solid #333;page-break-inside:avoid;break-inside:avoid}.sel img{display:block;width:100%;height:72mm;object-fit:cover;background:#ddd}
      .lbl{padding:3px 6px;border-top:1px solid #333;text-align:center}.lbl b{display:block;font-size:9pt}.lbl small{font-size:7.5pt;color:#444}
      .ttd{display:flex;justify-content:space-between;margin-top:10mm;text-align:center;page-break-inside:avoid;break-inside:avoid}.ttd div{min-width:60mm}.ttd .sp{height:18mm}
      .ft{margin-top:6px;font-size:7pt;color:#666}</style></head><body>
      <div class="kop">${logo}<span>${E(idt.nama)}<small style="display:block;font-weight:400;font-size:8pt">${E(PR.namaLengkap || PR.nama || '')}</small></span></div>
      <h1>DOKUMENTASI PENERIMAAN MATERIAL</h1><div class="sub">Lampiran ${E(rj.ba ? 'BAPM ' + rj.ba : 'Berita Acara Penerimaan Material')}</div>
      <table class="m">${[0, 2, 4].map(i => `<tr><td class="k">${meta[i][0]}</td><td>${E(meta[i][1])}</td><td class="k">${meta[i + 1][0]}</td><td>${E(meta[i + 1][1])}</td></tr>`).join('')}</table>
      <div class="grid">${un.map(s => `<div class="sel"><img src="${s.src}" alt="${E(s.nm)}"><div class="lbl"><b>${E(s.nm)}</b><small>${E(s.sisi)}${s.wakil ? ' · foto utama kiriman' : ''} · ${E(String(s.qty))} ${E(s.sat)}</small></div></div>`).join('')}</div>
      <div class="ttd"><div>Diperiksa oleh,<br>Pelaksana / QC<div class="sp"></div><b>(.........................)</b></div><div>Diterima oleh,<br>Petugas Gudang<div class="sp"></div><b>${E(r0.diterimaOleh || '(.........................)')}</b></div></div>
      <div class="ft">${E(ALAMAT)} · dicetak ${E(new Date().toLocaleString('id-ID'))}</div></body></html>`;
    if (typeof window.mp224Cetak === 'function') window.mp224Cetak(html, { judul: 'Dokumentasi Penerimaan Material ' + (rj.ba || r0.noSJ), lanskap: false });
    return { n: un.length };
  };

  /* ---------- 4. Cetak Kartu Gudang A4: padat 1 halaman, atau dipecah rapi per halaman ---------- */
  const SKRIP_A4 = `<style id="mp2103A4">.t thead{display:table-header-group}.t tr{page-break-inside:avoid;break-inside:avoid}.ttdblok,.ttd{page-break-inside:avoid;break-inside:avoid}
    .mp2103-pg{break-before:page;page-break-before:always;font-size:7.5pt;color:#444;margin:0 0 3px;display:flex;justify-content:space-between}
    body.p1{font-size:8.5pt}body.p1 .t th,body.p1 .t td{padding:2px 4px}body.p1 h1{margin:4px 0 6px;padding:4px}body.p1 .kop{margin-bottom:4px}
    body.p2{font-size:7.8pt}body.p2 .t th,body.p2 .t td{padding:1px 3px}body.p2 .ttd .sp{height:40px!important}
    body.p3{font-size:7.2pt}body.p3 .t th,body.p3 .t td{padding:1px 3px;line-height:1.15}body.p3 .ttd .sp{height:34px!important}body.p3 .meta td{padding:0 4px}</style>
    <script>(function(){function jalan(){var b=document.body,t=b&&b.querySelector('table.t');if(!t||b.dataset.a4)return;b.dataset.a4=1;
      var H=Math.floor(273*96/25.4)-4,awal=function(){var e=b.firstElementChild;while(e&&/^(SCRIPT|STYLE)$/.test(e.tagName))e=e.nextElementSibling;return e?e.getBoundingClientRect().top:0;};
      var tinggi=function(){return b.scrollHeight-(awal()-b.getBoundingClientRect().top)-parseFloat(getComputedStyle(b).paddingBottom||0)-parseFloat(getComputedStyle(b).paddingTop||0);};
      var kls=['p1','p2','p3'];for(var i=0;i<kls.length;i++){b.classList.add(kls[i]);if(tinggi()<=H)return;if(i<kls.length-1)b.classList.remove(kls[i]);}
      b.classList.remove('p3');b.classList.add('p1');
      var th=t.tHead,rows=[].slice.call(t.tBodies[0].rows),y0=awal(),blok=b.querySelector('.ttdblok')||b.querySelector('.ttd');
      var hHead=th.getBoundingClientRect().height,hTtd=0;if(blok){var bb=blok.getBoundingClientRect();hTtd=b.getBoundingClientRect().bottom-bb.top;}
      var cg=document.createElement('colgroup');
      [].slice.call(t.tBodies[0].rows[0]?t.tBodies[0].rows[0].cells:[]).forEach(function(c){var col=document.createElement('col');col.style.width=c.getBoundingClientRect().width+'px';cg.appendChild(col);});
      t.style.tableLayout='fixed';t.insertBefore(cg,t.firstChild);
      var hal=[],kini=[],sisa=H-(t.getBoundingClientRect().top-y0)-hHead,kap2=H-hHead-16;
      rows.forEach(function(r){var h=r.getBoundingClientRect().height;if(h>sisa&&kini.length){hal.push(kini);kini=[];sisa=kap2;}kini.push(r);sisa-=h;});
      if(kini.length){if(sisa<hTtd&&kini.length>2&&hal.length+1>0){var pindah=kini.splice(kini.length-2,2);hal.push(kini);kini=pindah;}hal.push(kini);}
      if(hal.length<2)return;var n=hal.length,induk=t.parentNode,setelah=t.nextSibling,judul=(b.querySelector('h1')||{}).textContent||'';
      hal.slice(1).forEach(function(rs,k){var cap=document.createElement('div');cap.className='mp2103-pg';cap.innerHTML='<span>'+judul+' — lanjutan</span><span>Hal. '+(k+2)+' / '+n+'</span>';
        var tb=t.cloneNode(false),bd=document.createElement('tbody');tb.appendChild(cg.cloneNode(true));tb.appendChild(th.cloneNode(true));rs.forEach(function(r){bd.appendChild(r);});tb.appendChild(bd);
        induk.insertBefore(cap,setelah);induk.insertBefore(tb,setelah);});
      var c1=document.createElement('div');c1.className='mp2103-pg';c1.style.breakBefore='auto';c1.style.pageBreakBefore='auto';c1.style.justifyContent='flex-end';c1.innerHTML='<span>Hal. 1 / '+n+'</span>';t.parentNode.insertBefore(c1,t);
      [].slice.call(b.querySelectorAll('.mp2103-pg')).slice(1).forEach(function(cap){var p=cap.previousElementSibling,ruang=Math.floor((cap.getBoundingClientRect().top-y0)/H+1)*H-(cap.getBoundingClientRect().top-y0);
        if(ruang>4&&ruang<H){var sp=document.createElement('div');sp.style.height=(ruang-4)+'px';cap.parentNode.insertBefore(sp,cap);}});}
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',jalan);else jalan();})();<\/script>`;
  window.mp2103CetakA4 = h => /KARTU GUDANG/i.test(h) && h.indexOf('mp2103A4') < 0 ? h.replace(/<\/head>/i, SKRIP_A4 + '</head>') : h;
  function pasangCetak() {
    const c = window.mp224Cetak; if (typeof c !== 'function' || c.__mp2103) return;
    const g = function (html, opt) { let h = String(html); try { h = window.mp2103CetakA4(h); } catch (e) { } return c.call(this, h, opt); };
    Object.keys(c).forEach(k => { g[k] = c[k]; }); g.__mp2103 = true; window.mp224Cetak = g;
  }

  /* ---------- pemasangan ---------- */
  let _t = 0;
  const jadwal = () => { if (_t) return; _t = setTimeout(() => { _t = 0; try { pasangCetak(); } catch (e) { } }, 300); };
  if (document.body) { new MutationObserver(jadwal).observe(document.body, { childList: true, subtree: true }); jadwal(); }
  else document.addEventListener('DOMContentLoaded', () => { new MutationObserver(jadwal).observe(document.body, { childList: true, subtree: true }); jadwal(); });
})();
