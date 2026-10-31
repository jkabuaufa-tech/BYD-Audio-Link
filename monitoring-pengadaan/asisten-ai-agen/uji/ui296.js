// Uji UJUNG-KE-UJUNG 2.9.6 di APLIKASI ASLI: cetak BA dari jendela tersendiri (bukan iframe), kop standar + nama proyek, narasi BAP utuh,
// uraian pekerjaan dinamis (tanpa "SPPP"), Addendum & Pekerjaan / Pengadaan, tanggal kosong "-", tabel BAPP tanpa baris "0",
// angka ribuan bertitik, NPWP & alamat vendor dari data rekanan (Tax No; Street + House No + City + Post Code).
//   HTML_DASAR=…/Monitoring_SAP.html KODE_GS=…/Code.gs node uji/ui296.js [folder-tangkapan]
const fs = require('fs'), assert = require('assert');
const boot = require('./boot_asli.js'), XLH = require('../sumber/xlsx-hitung.js');
const OUT = process.argv[2] || __dirname + '/../tangkapan';
const R = __dirname + '/..';
const SEBELUM = () => { if (typeof window.itemCmdk === 'undefined') window.itemCmdk = () => []; if (typeof window.buktiPOKontrak === 'undefined') window.buktiPOKontrak = () => ''; };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
// berkas rekanan kecil (format sheet "rekanan" Master_SPM.xlsx): BP No · Name Org · Street · House No · Post Code · City · Tax No
async function rekananXlsx(baris) {
  const kol = ['A', 'G', 'I', 'J', 'K', 'L', 'T'], judul = ['BP No', 'Name Org', 'Street', 'House No', 'Post Code', 'City', 'Tax No'];
  const sel = (r, v) => v.map((x, i) => `<c r="${kol[i]}${r}" t="inlineStr"><is><t>${String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</t></is></c>`).join('');
  const sh = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${[judul].concat(baris).map((v, i) => `<row r="${i + 1}">${sel(i + 1, v)}</row>`).join('')}</sheetData></worksheet>`;
  const t = s => new TextEncoder().encode(s);
  return XLH.tutupZip([
    ['[Content_Types].xml', t('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')],
    ['_rels/.rels', t('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')],
    ['xl/workbook.xml', t('<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="rekanan" sheetId="1" r:id="rId1"/></sheets></workbook>')],
    ['xl/_rels/workbook.xml.rels', t('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')],
    ['xl/worksheets/sheet1.xml', t(sh)]]);
}
(async () => {
  const b = await boot({ paket: fs.readFileSync(R + '/' + (process.env.PAKET || 'pembaruan-2.9.6.json'), 'utf8'), modul: JSON.parse(fs.readFileSync(R + '/server-modul-1.10.3.json', 'utf8')), tunggu: 4000, sebelum: SEBELUM });
  const { pg, K, P } = b;
  await pg.evaluate(async () => { if (typeof muatRegister === 'function') await muatRegister(); });
  const K2 = await pg.evaluate(() => {
    const V = it => Number(it.volumeEfektif ?? it.volume ?? it.volumeKontrak) || 0, H = it => Number(it.hargaSatuanEfektif ?? it.hargaSatuan) || 0;
    const ambil = (re, f) => RINGKASAN.find(g => re.test(g.key) && f(g));
    const spm = ambil(/\/SPM\//, g => g.items.filter(i => V(i) && H(i)).length >= 3 && g.items.filter(i => V(i) && H(i)).length <= 20);
    const bap = ambil(/\/(SPPP|SPK|SPKP)\//, g => g.items.some(i => !V(i) && !H(i)) && g.items.filter(i => V(i) && H(i)).length >= 3 && g.items.length <= 20);
    const info = g => ({ key: g.key, idVendor: g.idVendor || '', namaVendor: g.namaVendor || '', ids: g.items.map((it, i) => (V(it) && H(it)) ? [idItem(g, it, i), V(it)] : null).filter(Boolean) });
    return { spm: info(spm), bap: info(bap) };
  });
  const bk = (id, k, ke, tgl, f) => ({ id, versi: 1, noKontrak: k.key, tagihanKe: ke, nomorBA: String(ke).padStart(2, '0') + (k.key.includes('/SPM/') ? '/BAPM/' : '/BAPP/') + k.key, periode: 'Uji', tanggal: tgl, baTerbit: tgl + 'T00:00:00.000Z',
    items: Object.fromEntries(k.ids.map(([i, v]) => [i, Math.round(v * f * 1000) / 1000])), nilai: 0, revisi: 0 });
  K.tulisKoleksi_(P, 'progres', [bk('U1', K2.spm, 1, '2026-08-10', 0.25), bk('U2', K2.spm, 2, '2026-09-10', 0.5), bk('U3', K2.bap, 1, '2026-08-12', 0.1), bk('U4', K2.bap, 2, '2026-09-12', 0.2)]);
  await pg.evaluate(async () => { await muatRegister(); await window.mp292MuatMaster(true); });

  console.log('A. NPWP & alamat vendor dari data rekanan');
  const NPWP = '02.468.135.7-912.000', berkas = OUT + '/rekanan-uji.xlsx';
  fs.writeFileSync(berkas, await rekananXlsx([[K2.spm.idVendor, K2.spm.namaVendor, 'Jl. Uji Rekanan', '7', '14310', 'Jakarta Utara', NPWP], ['2100099999', 'Vendor Lain, PT', 'Jl. Lain', '1', '10110', 'Jakarta Pusat', '01.111.111.1-111.000']]));
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.evaluate(() => { window.__imp = window.mp296ImporRekanan(); })]);
  await fc.setFiles(berkas); await pg.waitForFunction(() => window.__imp && window.mp296Rekanan && window.mp296Rekanan('2100099999'), null, { timeout: 15000 });
  const pv = await pg.evaluate(k => window.profilVendor(k.idVendor, k.namaVendor), K2.spm);
  ok(pv.npwp === NPWP && pv.alamat === 'Jl. Uji Rekanan No. 7, Jakarta Utara 14310', 'profil vendor: NPWP dari Tax No (' + pv.npwp + ') & alamat Street + House No + City + Post Code ("' + pv.alamat + '")');
  await pg.evaluate(k => window.mp270Buka(k.key, 'U2'), K2.spm);
  await pg.waitForFunction(() => [...document.querySelectorAll('label')].some(l => /NPWP vendor/.test(l.textContent)), null, { timeout: 15000 }); await pg.waitForTimeout(500);
  const isian = () => pg.evaluate(() => { const l = [...document.querySelectorAll('label')].find(x => /NPWP vendor/.test(x.textContent)); return l && l.querySelector('input').value; });
  ok(await isian() === NPWP, 'Paket Tagihan: NPWP vendor terisi otomatis dari rekanan');
  await pg.evaluate(() => { const i = [...document.querySelectorAll('label')].find(x => /NPWP vendor/.test(x.textContent)).querySelector('input'); i.value = '99.999'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  ok(await isian() === '99.999', 'NPWP tetap dapat diedit manual');
  await pg.click('#mp296RkBtn'); await pg.waitForTimeout(400);
  ok(await isian() === NPWP, 'tombol "dari rekanan" mengisi ulang NPWP');
  await pg.screenshot({ path: OUT + '/mp296-paket-npwp.png' });

  console.log('B. Pratinjau format Excel (BAP format SPPP): kop, narasi utuh, BAPP, tanggal, angka');
  await pg.evaluate(() => { const x = document.getElementById('mp270'); if (x) x.remove(); document.querySelectorAll('.mp270-latar').forEach(e => e.remove()); });
  await pg.evaluate(k => window.mp270Buka(k, 'U4'), K2.bap.key);
  await pg.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /^Pratinjau$/.test(b.textContent.trim()) && !b.disabled), null, { timeout: 20000 });
  await pg.evaluate(() => [...document.querySelectorAll('button')].find(b => /^Pratinjau$/.test(b.textContent.trim())).click());
  await pg.waitForSelector('#mp293Frame:not([hidden])', { timeout: 30000 }); await pg.waitForTimeout(800);
  const fr = await (await pg.$('#mp293Frame')).contentFrame();
  const D = await fr.evaluate(() => {
    const hal = [...document.querySelectorAll('.xl-hal')], teks = s => [...document.querySelectorAll('.xl-hal[data-sheet="' + s + '"] .xl-t')].map(t => t.textContent);
    const bap = teks('BAP  1'), bapp = teks('BAPP');
    // narasi dalam batas halaman: setiap teks BAP 1 berada di dalam lebar area cetak
    const h = document.querySelector('.xl-hal[data-sheet="BAP  1"]'), isi = h.querySelector('.xl-skala').getBoundingClientRect();
    const luber = [...h.querySelectorAll('.xl-t > div')].filter(d => d.scrollWidth > d.parentElement.clientWidth + 2 && d.parentElement.style.whiteSpace === 'pre').map(d => d.textContent.slice(0, 40));
    return { hal: hal.length, kop: document.querySelectorAll('.xl-hal > .xl-kop').length, proyek: [...document.querySelectorAll('.xl-kop .p')].every(p => p.textContent === 'Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok' && !/PT\. WASKITA KARYA/.test(document.body.innerText)),
      menerangkan: bap.find(t => /^Menerangkan bahwa kedua belah pihak/.test(t)) || '', menyatakan: bap.find(t => /^Menyatakan bahwa prestasi/.test(t)) || '', semua: document.body.innerText,
      kontrak: bap.find(t => /Tanggal : /.test(t)) || '', addendum: bap.indexOf('Addendum') >= 0, pekerjaan: bap.some(t => /^Pekerjaan \/ Pengadaan/.test(t)), nol: (() => { const L = [...document.querySelectorAll('.xl-hal[data-sheet="BAPP"] .xl-t')], y = t => parseFloat(t.style.top), a = L.find(t => /Macam Pekerjaan/.test(t.textContent)), z = L.find(t => t.textContent.trim() === 'JUMLAH'); return L.filter(t => t.textContent.trim() === '0' && y(t) > y(a) && y(t) < y(z)).length; })(), luber,
      lebarIsi: Math.round(isi.width), lebarHal: Math.round(h.getBoundingClientRect().width) };
  });
  ok(D.kop === D.hal && D.proyek, 'kop standar di setiap halaman (' + D.kop + '/' + D.hal + ') sesuai kop baku: WASKITA - NINDYA KSO & "Pekerjaan Design and Build …" (tanpa PT. Waskita Karya)');
  ok(/atas Pekerjaan .+ pada Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok, dan berdasarkan :$/.test(D.menerangkan) && !/SPPP/.test(D.menerangkan), 'narasi "Menerangkan …" utuh & tanpa teks "SPPP": "' + D.menerangkan.slice(0, 90) + '…"');
  ok(/dengan rincian sebagai berikut :$/.test(D.menyatakan) && /Berita Acara Pemeriksaan Pekerjaan No\. \d+\/BAPP\//.test(D.menyatakan), 'paragraf prestasi utuh sampai "dengan rincian sebagai berikut :"');
  ok(!D.luber.length && D.lebarIsi <= D.lebarHal, 'tidak ada teks narasi yang melewati batas kanan halaman' + (D.luber.length ? ': ' + D.luber.join(' | ') : ''));
  ok(D.addendum && D.pekerjaan, 'baris "Addendum : -" & "Pekerjaan / Pengadaan" tampil');
  ok(/^\S+\/SPPP\/\S+ {3}Tanggal : \d{2} \w+ \d{4}$/.test(D.kontrak.trim()), 'nomor kontrak & tanggal satu baris tanpa tumpang: "' + D.kontrak.trim() + '"');
  ok(!/1899/.test(D.semua), 'tidak ada tanggal "30 Desember 1899"');
  ok(D.nol === 0, 'tabel BAPP tanpa baris "0" (dipetakan ulang per baris lamp1)');
  ok(/\b\d{1,3}(\.\d{3}){2,}(,\d{2})?\b/.test(D.semua) && !/\b\d{1,3}(,\d{3}){2,}\b/.test(D.semua), 'angka ribuan bertitik (mis. ' + (/\b\d{1,3}(\.\d{3}){2,}(,\d{2})?\b/.exec(D.semua) || [''])[0] + ')');
  await pg.screenshot({ path: OUT + '/mp296-pratinjau-bap.png' });
  for (const s of ['BAP  1', 'BAPP']) { const h = await fr.$('.xl-hal[data-sheet="' + s + '"]'); await h.screenshot({ path: OUT + '/mp296-' + s.replace(/\s+/g, '') + '.png' }); }

  console.log('C. Cetak dari jendela tersendiri (bukan iframe)');
  await pg.evaluate(() => { window.MP296.tahan = true; const f = document.getElementById('mp293Frame'); f.contentWindow.print = () => { window.__cetakIframe = true; }; });
  const [pop] = await Promise.all([pg.waitForEvent('popup', { timeout: 15000 }), pg.click('#mp293Pv button.btn-primary')]);
  await pop.waitForLoadState();
  await pop.waitForFunction(() => window.__mp296Dicetak === true, null, { timeout: 15000 });
  const C = await pop.evaluate(() => ({ hal: document.querySelectorAll('.xl-hal').length, css: (document.getElementById('mp296Css') || {}).textContent || '', kop: document.querySelectorAll('.xl-kop').length }));
  ok(C.hal >= 4 && C.kop === C.hal, 'Cetak / Simpan PDF membuka jendela cetak berisi dokumen ter-render penuh (' + C.hal + ' halaman berkop) lalu memanggil print() di jendela itu');
  ok(/size:A4 portrait;margin:15mm 15mm 15mm 20mm/.test(C.css), '@page A4 portrait, margin 15/15/15/20 mm');
  ok(!(await pg.evaluate(() => !!window.__cetakIframe)), 'print() tidak lagi dipanggil dari iframe di dalam aplikasi');
  await pop.close();
  await pg.evaluate(() => mp293PvTutup());

  console.log('D. Preview BA (dokumen HTML) & Excel unduhan');
  await pg.evaluate(() => { document.querySelectorAll('.mp270-latar').forEach(e => e.remove()); window.MP296.tahan = true; window.tanya = async () => true; previewBAEntri('U4'); }); await pg.waitForSelector('#mp293BtnBA:not([hidden])', { timeout: 10000 }); await pg.waitForTimeout(1200);
  ok(await pg.evaluate(() => { const d = document.getElementById('baFrame').contentDocument; const k = d.querySelector('.kop .mp296-kt'); return !!k && !/PT\. WASKITA KARYA/.test(k.textContent) && /^WASKITA - NINDYA KSO/.test(k.textContent) && /Pekerjaan Design and Build Perkuatan Dermaga Barat JICT Pelabuhan Tanjung Priok/.test(k.textContent); }), 'Preview BA: kop WASKITA - NINDYA KSO + nama pekerjaan (tanpa PT. Waskita Karya)');
  const [pop2] = await Promise.all([pg.waitForEvent('popup', { timeout: 15000 }), pg.evaluate(() => cetakBA())]);
  await pop2.waitForLoadState(); await pop2.waitForFunction(() => window.__mp296Dicetak === true, null, { timeout: 15000 });
  ok(await pop2.evaluate(() => /BERITA ACARA/.test(document.body.innerText) && /margin:15mm 15mm 15mm 20mm/.test((document.getElementById('mp296Css') || {}).textContent || '')), 'Preview BA › Cetak: jendela cetak tersendiri dengan @page A4 & margin baku');
  await pop2.close();
  await pg.evaluate(() => { const n = window.notif; window.__notif = []; window.notif = function (m, t) { window.__notif.push(t + ': ' + m); return n && n.apply(this, arguments); }; });
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }).catch(async e => { throw new Error('unduh gagal: ' + (await pg.evaluate(() => window.__notif.join(' | ')))); }), pg.click('#mp293BtnBA')]);
  await dl.saveAs(OUT + '/mp296-bap.xlsx');
  const W = await XLH.muat(new Uint8Array(fs.readFileSync(OUT + '/mp296-bap.xlsx'))), sh = n => W.byNama[n.toUpperCase()], v = (s, r) => { const o = sh(s).sel.get(r); return o ? o.v : undefined; };
  const baris = (s, r) => (new RegExp('<row r="' + r + '"[^>]*>').exec(sh(s).xml) || [''])[0];
  ok(!/hidden="1"/.test(baris('BAP  1', 21)) && !/hidden="1"/.test(baris('BAP  1', 22)) && v('BAP  1', 'K21') === '-' && !/SPPP/.test(String(v('DATA', 'B6'))), 'Excel: baris Addendum & Pekerjaan / Pengadaan tampil, uraian "' + v('DATA', 'B6') + '"');
  ok(/Tanggal : \d{2} \w+ \d{4}$/.test(String(v('BAP  1', 'K20'))) && /<mergeCell ref="C18:Q18"\/>/.test(sh('BAP  1').xml), 'Excel: nomor & tanggal kontrak satu sel; narasi dibungkus pada gabungan sel');
  const st = new TextDecoder().decode(W.F.get('xl/styles.xml')), xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(st)[1].match(/<xf [^>]*\/>|<xf [^>]*>[\s\S]*?<\/xf>/g);
  ok(/wrapText="1"/.test(xfs[sh('BAP  1').sel.get('C28').s] || '') && /wrapText="1"/.test(xfs[sh('BAP  1').sel.get('C18').s] || ''), 'Excel: paragraf "Menerangkan" & "Menyatakan" wrap-text + rata kanan-kiri');
  const kosongBAPP = []; for (let r = 36; r <= 59; r++) if (/hidden="1"/.test(baris('BAPP', r))) kosongBAPP.push(r);
  ok(kosongBAPP.length > 0 && kosongBAPP.every(r => v('BAPP', 'C' + r) === undefined && v('BAPP', 'D' + r) === undefined), 'Excel: baris BAPP kosong disembunyikan (' + kosongBAPP.length + ' baris)');
  // logo tanpa "Member of Danareksa": kop Preview BA & berkas Excel memakai logo bersih
  const logo = fs.readFileSync(R + '/sumber/format-baku/kop-logo.png');
  const td = new TextDecoder(), sisaDanareksa = [...W.F.keys()].filter(p => /^xl\/drawings\/_rels\//.test(p)).filter(rp => { const id = (/Id="([^"]+)"[^>]*image5\.emf/.exec(td.decode(W.F.get(rp))) || [])[1]; const dp = rp.replace('_rels/', '').replace(/\.rels$/, ''); return id && W.F.has(dp) && td.decode(W.F.get(dp)).indexOf('r:embed="' + id + '"') >= 0; });
  ok(Buffer.from(W.F.get('xl/media/image1.png')).equals(logo) && !sisaDanareksa.length, 'Excel: logo kop tanpa "Member of Danareksa" (gambar diganti, kop berlabel Danareksa dibuang)' + (sisaDanareksa.length ? ': ' + sisaDanareksa.join(', ') : ''));
  ok(await pg.evaluate(() => [...document.getElementById('baFrame').contentDocument.querySelectorAll('.kop img')].every(i => i.src === window.MP296.kop.logo[0])), 'Preview BA: logo kop tanpa "Member of Danareksa"');
  const g = b.gal.filter(e => !/favicon|ResizeObserver|itemCmdk is not defined|MIG is not defined/.test(e)); ok(!g.length, 'tanpa galat JavaScript' + (g.length ? ': ' + g.slice(0, 3).join(' | ') : ''));
  await b.br.close();
  console.log('\nLULUS ' + lulus + ' cek ujung-ke-ujung 2.9.6');
})().catch(e => { console.error(e); process.exit(1); });
