// Uji 2.10.28 di Chromium (blok MP292–MP296, MP2104, MP21028, MP21024 dari paket; tanpa HTML dasar / kernel):
// proyek Non-KSO — logo Waskita di kop, nama KSO diganti nama perusahaan di dokumen cetak & Excel format baku; proyek KSO tidak berubah.
// Pakai: node uji/ui21028.js [paket.json] [folder-tangkapan]
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert'), { execFileSync } = require('child_process');
const PK = process.argv[2] || path.join(__dirname, '..', 'pembaruan-2.10.28.json'), OUT = process.argv[3] || path.join(__dirname, '..', 'tangkapan');
const JS = JSON.parse(fs.readFileSync(PK, 'utf8')).js, blok = (a, z) => { const i = JS.indexOf(a), j = JS.indexOf(z, i + 10); assert.ok(i >= 0 && j > i, 'blok ' + a); return JS.slice(i, j); };
let lulus = 0; const ok = (c, m) => { assert.ok(c, m); lulus++; console.log('  ✓ ' + m); };
const D = { no: '012/SPM/WK/DIV.II/INF2/1726099/2026', jenis: 'SPM', vendor: 'PT Cahaya Utama Safety Indonesia', idVendor: '', tgl: '2026-11-16', selesai: '2026-12-15', top: '45 hari', items: [{ uraian: 'Environment Meter 5in1 pro Krisbow', sat: 'PC', vol: 1, harga: 4850000 }, { uraian: 'Lampu Sorot LED 1000W COB', sat: 'PC', vol: 1, harga: 8450000 }, { uraian: 'Helm Delta Putih+Tali Dagu 3M', sat: 'PC', vol: 14, harga: 325000 }] };
const zipCek = f => JSON.parse(execFileSync('python3', ['-I', '-c', `
import zipfile, re, json, sys
z = zipfile.ZipFile(sys.argv[1]); o = {'nindya': [], 'kso': [], 'pt': 0, 'gambar': {}, 'rusak': z.testzip(), 'jictKop': 0, 'proyekKop': 0}
for n in z.namelist():
    if n.endswith('.xml') or n.endswith('.rels'):
        t = z.read(n).decode('utf-8', 'ignore'); teks = re.sub(r'<[^>]+>', '', t)
        if re.search('NINDYA', teks, re.I): o['nindya'].append(n)
        if re.search(r'WASKITA\\s*-\\s*NINDYA|Kantor KSO', teks, re.I): o['kso'].append(n)
        o['pt'] += len(re.findall(r'PT WASKITA KARYA \\(Persero\\) Tbk', teks))
        if '/drawings/drawing' in n: o['jictKop'] += len(re.findall('Dermaga Barat JICT', teks)); o['proyekKop'] += len(re.findall('Jalan Tol Contoh Seksi 2', teks))
for n in z.namelist():
    if n.startswith('xl/drawings/drawing') and n.endswith('.xml'):
        rp = n.replace('drawings/', 'drawings/_rels/') + '.rels'; r = z.read(rp).decode() if rp in z.namelist() else ''; d = z.read(n).decode()
        ids = set(re.findall(r'r:embed="(rId\\d+)"', d)); o['gambar'][n] = sorted(re.search(r'media/([^"]+)', x).group(1) for x in re.findall(r'<Relationship [^>]*>', r) if re.search(r'Id="(rId\\d+)"', x).group(1) in ids)
import xml.dom.minidom as md
for n in z.namelist():
    if n.endswith('.xml') and ('drawings/' in n or 'sharedStrings' in n):
        try: md.parseString(z.read(n))
        except Exception as e: o['rusak'] = n + ': ' + str(e)
        if re.search(r'<xdr:(twoCellAnchor|oneCellAnchor)>(?:(?!<xdr:(pic|sp|grpSp|graphicFrame|cxnSp)\\b).)*?</xdr:\\1>', z.read(n).decode(), re.S): o['rusak'] = n + ': bingkai kosong'
print(json.dumps(o))`, f], { encoding: 'utf8' }));
(async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 900, height: 1250 }, deviceScaleFactor: 2 }), gal = []; pg.on('pageerror', e => gal.push(e.message));
  await pg.route('https://app.test/**', q => q.fulfill({ body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="layar">Pihak Pertama: WASKITA - NINDYA, KSO</div></body></html>', contentType: 'text/html; charset=utf-8' })); await pg.goto('https://app.test/');
  await pg.evaluate(() => {
    window.PROYEK = { id: 'P2', nama: 'Jalan Tol Contoh', kso: 'PT Waskita Karya (Persero) Tbk' };
    window.REG = { url: 'x', data: [], sesi: { nama: 'Staf Pengadaan', peran: 'PENGADAAN', proyek: 'P2', cfg: { id: 'P2', nama: 'Jalan Tol Contoh', namaLengkap: 'Proyek Pembangunan Jalan Tol Contoh Seksi 2', kapro: 'Ir. Budi Santoso, M.T.' } } };
    window.__idt = { bentuk: 'TUNGGAL', nama: 'PT Waskita Karya (Persero) Tbk', unit: 'Infrastructure II Division', npwp: '01.001.614.5-093.000', alamat: 'Jl. M.T. Haryono Kav. No. 10, Cawang, Jakarta 13340', asal: 'server' };
    window.mp224Identitas = () => window.__idt; window.notif = (m, t) => (window.__n = window.__n || []).push([m, t]); window.regAksi = async () => ({ data: [] });
    window.escHtml = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  });
  for (const [a, z] of [['/* MP292 —', '/* MP296 —'], ['/* MP296 —', '/* MP297 —'], ['/* MP2104 —', '/* MP2105 —'], ['/* MP21028 —', '/* MP264 — PEMBARUAN'], ['/* MP21024 — PEMBARUAN', '\u0000']]) await pg.addScriptTag({ content: z === '\u0000' ? JS.slice(JS.indexOf(a)) : blok(a, z) });
  const galMuat = gal.splice(0); await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => !!(window.MP296 && window.MP21028 && window.MP21024 && window.mp292Bangun && window.mp2104KSO)), 'blok termuat' + (galMuat.length ? ' (galat lingkungan uji: ' + galMuat.join(' | ').slice(0, 160) + ')' : ''));

  console.log('1. Kop & SPM Non-KSO');
  let r = await pg.evaluate(D => { const x = new DOMParser().parseFromString(MP21024.htmlSPM(D), 'text/html'), K = MP296.kop;
    return { logoSPM: x.querySelector('.kd img').src === MP21028.logo, kop: x.querySelector('.kd .nm').textContent, teks: x.body.textContent, K: { nama: K.nama, proyek: K.proyek, alamat: K.alamat, logo: K.logo[0] === MP21028.logo, n: K.logo.length }, k2104: mp2104KSO(), layar: document.getElementById('layar').textContent }; }, D);
  ok(r.logoSPM && r.kop === 'PT WASKITA KARYA (Persero) Tbk', 'SPM: logo Waskita (tunggal) + PT WASKITA KARYA (Persero) Tbk');
  ok(!/NINDYA|KSO/i.test(r.teks) && /Nomor NPWP : 010016145093000 atas nama PT WASKITA KARYA \(Persero\) Tbk/.test(r.teks), 'SPM: tanpa nama KSO, NPWP perusahaan');
  ok(r.K.nama === 'PT WASKITA KARYA (Persero) Tbk' && r.K.proyek === 'Proyek Pembangunan Jalan Tol Contoh Seksi 2' && /Cawang/.test(r.K.alamat) && r.K.logo && r.K.n === 1, 'kop standar (MP296.kop) = perusahaan, proyek aktif, alamat kantor, 1 logo Waskita');
  ok(r.k2104.nama === 'PT WASKITA KARYA (Persero) Tbk' && r.k2104.npwp === '010016145093000' && /Cawang/.test(r.k2104.alamat), 'identitas untuk Excel / BAP (mp2104KSO) = perusahaan');
  await pg.waitForTimeout(2300);
  ok(await pg.evaluate(() => document.getElementById('layar').textContent) === 'Pihak Pertama: PT WASKITA KARYA (Persero) Tbk', 'layar: ejaan berkoma "WASKITA - NINDYA, KSO" diganti');

  console.log('2. Dokumen cetak (BA / gudang) lewat pratinjau & kop standar');
  r = await pg.evaluate(() => {
    const h = MP21028.gantiHtml('<html><head><style>.a:after{content:"WASKITA - NINDYA KSO"}</style></head><body><div class="kop"><img src="x"><span class="nm">WASKITA - NINDYA KSO</span></div><p title="WASKITA - NINDYA KSO">bertindak untuk dan atas nama Waskita - Nindya KSO, NPWP 1000.0000.0784.5824</p><td>PIHAK PERTAMA<br>WASKITA - NINDYA, KSO</td><div>Kantor KSO : Jl. M.T. Haryono Kav. No.12-13 Bidaracina• Telp (021)8515521</div><b>PT WASKITA KARYA (PERSERO) TBK</b></body></html>', MP21028.info());
    const d = new DOMParser().parseFromString(h, 'text/html'); mp296Kop(d);
    return { h, nm: d.querySelector('.kop .nm').textContent, pr: d.querySelector('.kop .pr').textContent, img: d.querySelector('.kop img').getAttribute('src') === MP21028.logo, bungkus: !!(window.mp296Cetak && window.mp296Cetak.__mp21028) };
  });
  ok(/atas nama PT WASKITA KARYA \(Persero\) Tbk, NPWP 010016145093000/.test(r.h) && /PIHAK PERTAMA<br>PT WASKITA KARYA \(Persero\) Tbk/.test(r.h) && /<div>Jl\. M\.T\. Haryono Kav\. No\. 10, Cawang, Jakarta 13340<\/div>/.test(r.h) && /<b>PT WASKITA KARYA \(Persero\) Tbk<\/b>/.test(r.h), 'nama, NPWP & alamat KSO pada isi dokumen → perusahaan');
  ok(/content:"WASKITA - NINDYA KSO"/.test(r.h) && /title="WASKITA - NINDYA KSO"/.test(r.h), 'hanya teks dokumen yang diganti (gaya & atribut tidak disentuh)');
  ok(r.nm === 'PT WASKITA KARYA (Persero) Tbk' && /Jalan Tol Contoh/.test(r.pr) && r.img && r.bungkus, 'kop standar BA: nama perusahaan, proyek aktif, logo Waskita; fungsi cetak terbungkus');

  console.log('3. Excel format baku');
  const simpanXl = async (jenis, f) => { const b64 = await pg.evaluate(async ([jenis, D]) => { const u8 = jenis === 'spm' ? new Uint8Array(await (await MP21024.excelBlob(D)).arrayBuffer()) : await mp292Bangun('bap', { DATA: {} }); let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }, [jenis, D]); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return zipCek(f); };
  const fS = path.join(os.tmpdir(), 'uji21028-spm.xlsx'), fB = path.join(os.tmpdir(), 'uji21028-bap.xlsx');
  let z = await simpanXl('spm', fS);
  ok(!z.rusak && !z.nindya.length && !z.kso.length && z.pt >= 3, 'SPM .xlsx: tanpa teks Nindya / KSO, nama perusahaan terisi (' + z.pt + '×)');
  ok(!z.jictKop && z.proyekKop >= 1, 'SPM .xlsx: baris nama proyek bawaan (JICT) di kop diganti proyek aktif');
  ok(Object.values(z.gambar).every(g => g.indexOf('image2.png') < 0) && Object.values(z.gambar).some(g => g.indexOf('image1.emf') >= 0), 'SPM .xlsx: logo Nindya dilepas dari semua lembar, logo Waskita tetap');
  z = await simpanXl('bap', fB);
  ok(!z.rusak && !z.nindya.length && !z.kso.length && z.pt >= 3, 'BAP .xlsx: tanpa teks Nindya / KSO (kop, narasi, tanda tangan), nama perusahaan ' + z.pt + '×');
  ok(Object.values(z.gambar).every(g => g.indexOf('image3.png') < 0), 'BAP .xlsx: logo Nindya dilepas; logo gabungan diganti logo Waskita');
  const bapLogo = execFileSync('python3', ['-I', '-c', 'import zipfile,sys,hashlib;z=zipfile.ZipFile(sys.argv[1]);print(len(z.read("xl/media/image1.png")), z.read("xl/media/image1.png")[:4]==b"\\x89PNG")', fB], { encoding: 'utf8' }).trim();
  ok(/ True$/.test(bapLogo), 'BAP .xlsx: xl/media/image1.png = PNG logo Waskita (' + bapLogo.split(' ')[0] + ' byte)');

  console.log('4. Tangkapan SPM & kembali ke proyek KSO');
  const hal = await pg.evaluate(D => MP21024.berhalaman(MP21024.htmlSPM(D)), D); ok(hal.halaman === 1, 'SPM Non-KSO 1 halaman A4');
  const p2 = await br.newPage({ viewport: { width: 900, height: 1250 }, deviceScaleFactor: 2 }); await p2.setContent(hal.html); await p2.evaluate(() => document.body.classList.add('siap')); await p2.waitForTimeout(400);
  const lg = await p2.evaluate(() => { const i = document.querySelector('.kd img'); return { w: i.naturalWidth, h: i.naturalHeight, tampil: i.getBoundingClientRect().height }; });
  ok(lg.w > 100 && lg.h > 100 && lg.tampil > 30, 'logo Waskita termuat & tampil di kop (' + lg.w + '×' + lg.h + ')');
  await (await p2.$('.hal')).screenshot({ path: path.join(OUT, 'spm-non-kso.png') }); await p2.close();
  r = await pg.evaluate(D => { window.__idt = { bentuk: 'KSO', nama: 'WASKITA - NINDYA, KSO', asal: 'server' }; MP21028.terap(); const K = MP296.kop, x = MP21024.htmlSPM(D).replace(/<style>[\s\S]*?<\/style>/, '');
    return { nama: K.nama, proyek: K.proyek, logo: K.logo[0] !== MP21028.logo, bap: Object.keys(MP296.media.bap).join(), sisa: !!(MP296.media.olah || MP296.media.buangJenis), spm: /WASKITA - NINDYA, KSO/.test(x) && !/mtr|stp/.test(x), k: mp2104KSO().npwp }; }, D);
  if (process.env.DEBUG) console.log(r);
  ok(r.nama === 'WASKITA - NINDYA KSO' && /JICT/.test(r.proyek) && r.logo && r.bap === 'xl/media/image1.png' && r.spm && r.k === '1000000007845824', 'proyek KSO: kop, logo gabungan, media Excel, SPM & NPWP KSO kembali seperti semula');
  ok(await pg.evaluate(() => window.mp21028GantiHtml('<p>WASKITA - NINDYA KSO</p>')) === '<p>WASKITA - NINDYA KSO</p>', 'proyek KSO: teks dokumen tidak disentuh');
  ok(!gal.length, 'tanpa galat JS: ' + gal.join(' | '));
  await br.close(); console.log('\n' + lulus + ' cek lulus');
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
