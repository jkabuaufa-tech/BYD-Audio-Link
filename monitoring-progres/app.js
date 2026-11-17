/* =====================================================================
 * Monitoring Progres Harian & Rapat Action Plan – JIAT
 * SPA murni (tanpa framework). Pustaka: xlsx-js-style (SheetJS + gaya).
 *
 * Modul di file ini:
 *   1. Util (tanggal, angka, DOM)
 *   2. Store  (state, localStorage, impor/ekspor JSON, normalisasi)
 *   3. Kalkulasi (bobot, rencana, realisasi, kurva S, rekap divisi)
 *   4. Excel  (pembangun lembar bergaya + laporan per menu)
 *   5. View   (Dashboard, Progres Harian, Isu, SBD, Pengadaan)
 *   6. Modal, toast, event global, boot
 * ===================================================================== */
'use strict';

/* ============================ 1. UTIL ============================ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { if (v === '' || v == null) return 0; const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const NF0 = nf(0), NF2 = nf(2);
const fVol = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? NF0.format(v) : NF2.format(v));
const fRp = (v) => 'Rp ' + NF0.format(Math.round(v));
const fPct = (v, d = 2) => nf(d).format((v || 0) * 100) + '%';

// Tanggal sebagai string lokal YYYY-MM-DD (tanpa geser zona waktu)
const isoLokal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hariIni = () => isoLokal(new Date());
const keDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const tambahHari = (s, n) => { const d = keDate(s); d.setDate(d.getDate() + n); return isoLokal(d); };
const selisihHari = (a, b) => Math.round((keDate(b) - keDate(a)) / 86400000);
const rentang = (a, b) => { const out = []; if (!a || !b || a > b) return out; for (let d = a; d <= b; d = tambahHari(d, 1)) out.push(d); return out; };
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const fTgl = (s) => { if (!s) return '-'; const d = keDate(s); return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
const fTglPanjang = (s) => { const d = keDate(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };

function unduhBlob(blob, nama) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nama;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/* ============================ 2. STORE ============================ */
const KEY = Server.aktif ? 'jiat-progres-srv-v1' : 'jiat-progres-v3';
const UI_KEY = 'jiat-progres-ui-v3';
const SCHEMA = 3;

const STATUS_SBD = ['BELUM MULAI', 'MOBILISASI', 'PENGEBORAN', 'KONSTRUKSI SUMUR', 'WELL DEVELOPMENT', 'UJI PEMOMPAAN', 'FINISHING', 'SELESAI', 'TERKENDALA'];
const STATUS_ISU = ['OPEN', 'PROGRESS', 'CLOSED'];
const PRIORITAS = ['KRITIS', 'TINGGI', 'SEDANG', 'RENDAH'];
const KATEGORI = ['Teknis', 'Material', 'Peralatan', 'Tenaga Kerja', 'Cuaca', 'Lahan / Sosial', 'Perizinan / Administrasi', 'K3', 'Desain / Gambar', 'Lainnya'];

const kosong = () => ({
  aplikasi: 'jiat-monitoring', schemaVersion: SCHEMA,
  project: { nama: '', targetDes: 0, baselineMulai: '', baselineAkhir: '' },
  divisions: [], items: [], progress: [], dailyNotes: [], procurement: [], wells: [],
});

let S = kosong();
let UI = { tab: 'dashboard', tanggal: hariIni(), mode: 'full', inDiv: '', inSbd: '', inCari: '', inAktif: false, isuLingkup: 'aktif', isuCari: '', isuPrio: '', sbdTim: '', sbdStatus: '', dashFilter: 'perhatian', dashSemua: false };

const Store = {
  muat() {
    try { const raw = localStorage.getItem(KEY); if (raw) S = normalisasi(JSON.parse(raw)); } catch (e) { console.error(e); toast('Gagal membaca data tersimpan', true); }
    try { Object.assign(UI, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) { /* abaikan */ }
    if (!UI.tanggal) UI.tanggal = hariIni();
    Calc.reindeks();
  },
  simpan() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      $('#infoSimpan').textContent = '· Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { toast('Penyimpanan browser penuh / gagal: ' + e.message, true); }
    Calc.reindeks();
  },
  simpanUI() { localStorage.setItem(UI_KEY, JSON.stringify(UI)); },
};

/** Menyeragamkan data dari berbagai versi file JSON (schema 2 → 3). */
function normalisasi(d) {
  const o = kosong();
  if (!d || typeof d !== 'object') return o;
  o.project = Object.assign(o.project, d.project || {});
  o.project.targetDes = num(o.project.targetDes);
  o.divisions = (d.divisions || []).map((x, i) => ({ id: x.id || `DIV-${i + 1}`, no: x.no ?? i + 1, kode: x.kode || '', nama: x.nama || '', pic: x.pic || '', kendala: x.kendala || '', tindakLanjut: x.tindakLanjut || '', dueDate: x.dueDate || null, statusAction: x.statusAction || 'OPEN' }));
  o.items = (d.items || []).map((x, i) => {
    const it = { ...x };
    it.id = x.id || `IT-${i + 1}`; it.volume = num(x.volume); it.targetVolDes = num(x.targetVolDes);
    if (x.hargaNego != null) it.hargaNego = num(x.hargaNego); else delete it.hargaNego;
    if (x.bobot != null) it.bobot = num(x.bobot);
    it.mulai = x.mulai || null; it.selesai = x.selesai || null;
    return it;
  });
  o.progress = (d.progress || []).filter((p) => p && p.itemId && p.tanggal).map((p) => ({
    id: idProgres(p.itemId, p.tanggal, p.sbd || ''), itemId: p.itemId, tanggal: String(p.tanggal).slice(0, 10), sbd: p.sbd || '',
    volume: num(p.volume), diinputOleh: p.diinputOleh || '', updatedAt: p.updatedAt || null,
  }));
  o.dailyNotes = (d.dailyNotes || []).map((n) => ({
    id: n.id || uid('ISU'), tanggal: n.tanggal || hariIni(), divisionId: n.divisionId || '', itemId: n.itemId || '', sbd: n.sbd || '',
    kategori: n.kategori || 'Lainnya', uraian: n.uraian || n.catatan || '', dampak: n.dampak || '', tindakLanjut: n.tindakLanjut || '',
    pic: n.pic || '', dueDate: n.dueDate || null, prioritas: PRIORITAS.includes(n.prioritas) ? n.prioritas : 'SEDANG',
    status: STATUS_ISU.includes(n.status) ? n.status : 'OPEN', tanggalSelesai: n.tanggalSelesai || null, updatedAt: n.updatedAt || null,
  }));
  o.procurement = (d.procurement || []).map((p) => ({ ...p, stock2026: p.stock2026 ?? null, mos: p.mos ?? null, catatan: p.catatan || '' }));
  o.wells = (d.wells || []).map((w) => ({ ...w, status: w.status || 'BELUM MULAI', catatan: w.catatan || '' }));
  return o;
}

const idProgres = (itemId, tgl, sbd) => (sbd ? `${itemId}:${tgl}:${sbd}` : `${itemId}:${tgl}`);

/** Gabung pembaruan: upsert per id di setiap koleksi. */
function gabungData(baru) {
  const n = normalisasi(baru);
  Object.entries(baru.project || {}).forEach(([k, v]) => { if (v !== '' && v != null) S.project[k] = v; });
  const upsert = (kol) => {
    const peta = new Map(S[kol].map((x) => [x.id, x]));
    (n[kol] || []).forEach((x) => {
      const asal = (baru[kol] || []).find((y) => (y.id || '') === x.id) || x;
      if (peta.has(x.id)) {
        const lama = peta.get(x.id);
        // hanya timpa field yang memang ada di file pembaruan (agar harga tidak hilang)
        Object.keys(asal).forEach((k) => { lama[k] = x[k]; });
        if (kol === 'progress') lama.id = x.id;
      } else { S[kol].push(x); peta.set(x.id, x); }
    });
  };
  ['divisions', 'items', 'progress', 'dailyNotes', 'procurement', 'wells'].forEach(upsert);
}

function eksporJson(jenis) {
  const rapat = UI.mode === 'rapat';
  let data;
  if (jenis === 'update') {
    data = {
      aplikasi: 'jiat-monitoring', jenis: 'pembaruan-harian', schemaVersion: SCHEMA, tanggal: UI.tanggal,
      diekspor: new Date().toISOString(),
      progress: S.progress.filter((p) => p.tanggal === UI.tanggal),
      dailyNotes: S.dailyNotes, wells: S.wells, procurement: S.procurement,
    };
  } else {
    data = JSON.parse(JSON.stringify(S));
    data.diekspor = new Date().toISOString();
    if (rapat) {
      data.items = data.items.map((it) => { const c = { ...it, bobot: Calc.bobot(it) }; delete c.hargaNego; return c; });
      data.catatanEkspor = 'Ekspor Mode Rapat Pelaksana: harga satuan dihapus, bobot (%) disertakan.';
    }
  }
  const nama = `jiat-monitoring-${jenis === 'update' ? 'update-' : ''}${UI.tanggal}${rapat ? '-rapat' : ''}.json`;
  unduhBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), nama);
  toast('File JSON diunduh: ' + nama);
}

/* ============================ 3. KALKULASI ============================ */
const Calc = {
  idx: { item: new Map(), div: new Map(), prog: new Map(), well: new Map() },
  total: 0, pakaiHarga: true,

  reindeks() {
    const ix = this.idx;
    ix.item = new Map(S.items.map((i) => [i.id, i]));
    ix.div = new Map(S.divisions.map((d) => [d.id, d]));
    ix.well = new Map(S.wells.map((w) => [w.id, w]));
    ix.prog = new Map();
    for (const p of S.progress) { if (!ix.prog.has(p.itemId)) ix.prog.set(p.itemId, []); ix.prog.get(p.itemId).push(p); }
    ix.prog.forEach((arr) => arr.sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)));
    // Bobot: berbasis nilai (volume × harga). Jika harga tak tersedia → pakai field bobot.
    this.pakaiHarga = S.items.length > 0 && S.items.every((i) => i.hargaNego != null);
    this.total = this.pakaiHarga ? S.items.reduce((s, i) => s + i.volume * i.hargaNego, 0) : 0;
    if (this.pakaiHarga && this.total <= 0) this.pakaiHarga = false;
  },
  nilai(it) { return it.hargaNego != null ? it.volume * it.hargaNego : 0; },
  bobot(it) {
    if (this.pakaiHarga) return this.nilai(it) / this.total;
    if (it.bobot != null) return it.bobot;
    return S.items.length ? 1 / S.items.length : 0;
  },
  /** Volume kumulatif s.d. tanggal (inklusif). sbd: undefined = semua, '' = tanpa SBD, 'SBD-x' = satu sumur. */
  kum(itemId, tgl, sbd) {
    const arr = this.idx.prog.get(itemId); if (!arr) return 0;
    let s = 0; for (const p of arr) { if (p.tanggal > tgl) break; if (sbd === undefined || p.sbd === sbd) s += p.volume; }
    return s;
  },
  hari(itemId, tgl, sbd) {
    const arr = this.idx.prog.get(itemId); if (!arr) return 0;
    let s = 0; for (const p of arr) if (p.tanggal === tgl && (sbd === undefined || p.sbd === sbd)) s += p.volume;
    return s;
  },
  entri(itemId, tgl, sbd) { return S.progress.find((p) => p.id === idProgres(itemId, tgl, sbd)); },
  jendela(it) { return { a: it.mulai || S.project.baselineMulai, b: it.selesai || S.project.baselineAkhir }; },
  /** Rencana kumulatif (linier) terhadap target volume s.d. akhir baseline. */
  rencanaKum(it, tgl) {
    const { a, b } = this.jendela(it); if (!a || !b || !it.targetVolDes) return 0;
    if (tgl < a) return 0; if (tgl >= b) return it.targetVolDes;
    return it.targetVolDes * (selisihHari(a, tgl) + 1) / (selisihHari(a, b) + 1);
  },
  targetHarian(it, tgl) {
    const { a, b } = this.jendela(it); if (!a || !b || tgl < a || tgl > b) return 0;
    return it.targetVolDes / (selisihHari(a, b) + 1);
  },
  pct(it, tgl) { return it.volume > 0 ? Math.min(this.kum(it.id, tgl) / it.volume, 1) : 0; },
  /** Ringkasan proyek pada tanggal tertentu. */
  proyek(tgl) {
    let real = 0, ren = 0, kemarin = 0, nilaiReal = 0, nilaiHari = 0;
    const kmr = tambahHari(tgl, -1);
    for (const it of S.items) {
      const w = this.bobot(it), v = it.volume || 0;
      if (v > 0) {
        real += w * Math.min(this.kum(it.id, tgl) / v, 1);
        kemarin += w * Math.min(this.kum(it.id, kmr) / v, 1);
        ren += w * Math.min(this.rencanaKum(it, tgl) / v, 1);
      }
      if (it.hargaNego != null) { nilaiReal += Math.min(this.kum(it.id, tgl), v) * it.hargaNego; nilaiHari += this.hari(it.id, tgl) * it.hargaNego; }
    }
    return { real, ren, dev: real - ren, kemarin, hariIni: real - kemarin, nilaiReal, nilaiHari };
  },
  rekapDivisi(tgl) {
    return S.divisions.map((d) => {
      const items = S.items.filter((i) => i.divisionId === d.id);
      let w = 0, real = 0, ren = 0, nilai = 0, nilaiReal = 0;
      for (const it of items) {
        const b = this.bobot(it), v = it.volume || 0; w += b; nilai += this.nilai(it);
        if (v > 0) { real += b * Math.min(this.kum(it.id, tgl) / v, 1); ren += b * Math.min(this.rencanaKum(it, tgl) / v, 1); }
        if (it.hargaNego != null) nilaiReal += Math.min(this.kum(it.id, tgl), v) * it.hargaNego;
      }
      return { d, items, w, real, ren, dev: real - ren, pctDiv: w ? real / w : 0, nilai, nilaiReal };
    });
  },
  kurvaS(sampai) {
    const p = S.project; if (!p.baselineMulai || !p.baselineAkhir) return [];
    const akhir = p.baselineAkhir > sampai ? p.baselineAkhir : sampai;
    return rentang(p.baselineMulai, akhir).map((t) => {
      let ren = 0, real = 0;
      for (const it of S.items) {
        const v = it.volume || 0; if (!v) continue; const w = this.bobot(it);
        ren += w * Math.min(this.rencanaKum(it, t) / v, 1);
        if (t <= sampai) real += w * Math.min(this.kum(it.id, t) / v, 1);
      }
      return { t, ren, real: t <= sampai ? real : null };
    });
  },
  isuAktif() { return S.dailyNotes.filter((n) => n.status !== 'CLOSED'); },
  isuKritis() { return this.isuAktif().filter((n) => n.prioritas === 'KRITIS'); },
  terlambat(n, tgl = UI.tanggal) { return n.status !== 'CLOSED' && n.dueDate && n.dueDate < tgl; },
};

const showHarga = () => UI.mode !== 'rapat';
const namaDiv = (id) => { const d = Calc.idx.div.get(id); return d ? `${d.kode ? d.kode + '. ' : ''}${d.nama}` : '-'; };
const namaItem = (id) => Calc.idx.item.get(id)?.uraian || '';
const namaSbd = (id) => Calc.idx.well.get(id)?.sbd || id || '';

/* ============================ 4. EXCEL ============================ */
const XL = (() => {
  const B = { style: 'thin', color: { rgb: '7F8C9A' } };
  const BORDER = { top: B, bottom: B, left: B, right: B };
  const font = (o = {}) => ({ name: 'Arial', sz: 9, ...o });
  const st = {
    judul: { font: font({ sz: 14, bold: true, color: { rgb: '0F2747' } }), alignment: { horizontal: 'center' } },
    sub: { font: font({ sz: 10, bold: true, color: { rgb: '0F2747' } }), alignment: { horizontal: 'center' } },
    lbl: { font: font({ bold: true }) },
    val: { font: font() },
    info: { font: font({ italic: true, color: { rgb: 'B45309' } }) },
    th: { font: font({ bold: true, color: { rgb: 'FFFFFF' } }), fill: { fgColor: { rgb: '1F3864' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER },
    td: { font: font(), border: BORDER, alignment: { vertical: 'top', wrapText: true } },
    tdC: { font: font(), border: BORDER, alignment: { horizontal: 'center', vertical: 'top' } },
    grp: { font: font({ bold: true }), fill: { fgColor: { rgb: 'DCE6F1' } }, border: BORDER, alignment: { vertical: 'top', wrapText: true } },
    sub2: { font: font({ bold: true, italic: true }), fill: { fgColor: { rgb: 'F2F2F2' } }, border: BORDER },
    tot: { font: font({ bold: true }), fill: { fgColor: { rgb: 'FFF2CC' } }, border: BORDER },
    ttd: { font: font(), alignment: { horizontal: 'center' } },
    ttdB: { font: font({ bold: true, underline: true }), alignment: { horizontal: 'center' } },
  };
  const FMT = { vol: '#,##0.00;[Red]-#,##0.00;"-"', rp: '#,##0;[Red]-#,##0;"-"', pct: '0.00%;[Red]-0.00%;"-"', int: '#,##0;-#,##0;"-"', bobot: '0.0000%;[Red]-0.0000%;"-"' };

  class Lembar {
    constructor(nama) { this.nama = nama.slice(0, 31); this.ws = {}; this.r = 0; this.maxC = 0; this.merges = []; this.lebar = []; }
    sel(r, c, v, s, fmt) {
      let cell;
      if (v == null || v === '') cell = { t: 's', v: '' };
      else if (typeof v === 'number') cell = { t: 'n', v: Number.isFinite(v) ? v : 0 };
      else cell = { t: 's', v: String(v) };
      const gaya = s ? { ...s } : {};
      if (fmt) gaya.numFmt = FMT[fmt] || fmt;
      if (Object.keys(gaya).length) cell.s = gaya;
      this.ws[XLSX.utils.encode_cell({ r, c })] = cell;
      this.maxC = Math.max(this.maxC, c);
    }
    /** vals: array nilai; spec: array {s, f} atau gaya tunggal untuk semua sel */
    baris(vals, spec, tinggi) {
      vals.forEach((v, c) => { const sp = Array.isArray(spec) ? spec[c] || {} : { s: spec }; this.sel(this.r, c, v, sp.s, sp.f); });
      if (tinggi) { this.tinggi = this.tinggi || []; this.tinggi[this.r] = { hpt: tinggi }; }
      return this.r++;
    }
    gabung(r1, c1, r2, c2) { this.merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }); }
    kosong(n = 1) { this.r += n; }
    /** Kop laporan standar proyek */
    kop(judul, kolom) {
      const p = S.project, lebar = Math.max(kolom - 1, 4);
      this.baris([judul], st.judul, 22); this.gabung(this.r - 1, 0, this.r - 1, lebar);
      this.baris([(p.nama || '').toUpperCase()], st.sub); this.gabung(this.r - 1, 0, this.r - 1, lebar);
      this.kosong();
      const info = [
        ['Pekerjaan', p.pekerjaan], ['Satuan Kerja', p.satker], ['Lokasi', p.lokasi], ['Sumber Dana', p.sumberDana],
        ['Kontraktor Pelaksana', p.kontraktor], ['No. Kontrak', p.noKontrak],
        ['Periode Baseline', p.baselineMulai ? `${fTgl(p.baselineMulai)} s.d. ${fTgl(p.baselineAkhir)}` : ''],
        ['Tanggal Laporan', fTglPanjang(UI.tanggal)],
      ].filter(([, v]) => v);
      info.forEach(([k, v]) => { this.baris([k, ': ' + v], [{ s: st.lbl }, { s: st.val }]); this.gabung(this.r - 1, 1, this.r - 1, lebar); });
      if (!showHarga()) { this.baris(['Versi Rapat Pelaksana – Harga Satuan & Jumlah Harga tidak ditampilkan'], st.info); this.gabung(this.r - 1, 0, this.r - 1, lebar); }
      this.kosong();
    }
    header(kolom, tinggi = 30) { this.baris(kolom, st.th, tinggi); this.headerRow = this.r - 1; }
    ttd(kolom) {
      const p = S.project; this.kosong(2);
      const slot = [['Dibuat oleh,', p.ttdJab1 || 'Pelaksana Lapangan', p.ttdNama1], ['Diperiksa oleh,', p.ttdJab2 || 'Site Manager', p.ttdNama2], ['Disetujui oleh,', p.ttdJab3 || 'Project Manager', p.ttdNama3]];
      const lebar = Math.max(kolom, 6), seg = Math.floor(lebar / 3);
      const posisi = [0, seg, seg * 2];
      const tulis = (i, s) => posisi.forEach((c, k) => { this.sel(this.r, c, slot[k][i], s); this.gabung(this.r, c, this.r, c + seg - 1); });
      this.sel(this.r, 0, `${p.kotaTtd || ''}${p.kotaTtd ? ', ' : ''}${fTglPanjang(UI.tanggal)}`, { font: font({ italic: true }) }); this.r++;
      tulis(0, st.ttd); this.r++; tulis(1, st.ttd); this.r += 4;
      posisi.forEach((c, k) => { this.sel(this.r, c, slot[k][2] || '(..................................)', st.ttdB); this.gabung(this.r, c, this.r, c + seg - 1); });
      this.r++;
    }
    kolomLebar(arr) { this.lebar = arr; }
    jadi() {
      const ws = this.ws;
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(this.r - 1, 0), c: this.maxC } });
      ws['!merges'] = this.merges;
      ws['!cols'] = this.lebar.map((w) => ({ wch: w }));
      if (this.tinggi) ws['!rows'] = this.tinggi;
      return ws;
    }
  }

  function simpan(nama, lembar) {
    if (typeof XLSX === 'undefined') { toast('Pustaka Excel gagal dimuat (lib/xlsx.bundle.js).', true); return; }
    const wb = XLSX.utils.book_new();
    lembar.forEach((l) => XLSX.utils.book_append_sheet(wb, l.jadi(), l.nama));
    wb.Props = { Title: nama, Author: S.project.kontraktor || 'Monitoring JIAT', CreatedDate: new Date() };
    const file = `JIAT_${nama}_${UI.tanggal}${showHarga() ? '' : '_RapatPelaksana'}.xlsx`;
    XLSX.writeFile(wb, file, { compression: true });
    toast('Excel diunduh: ' + file);
  }

  /* ---------- Laporan Progres Harian (format baku BOQ + progres) ---------- */
  function lembarLaporanHarian(opsi = {}) {
    const tgl = UI.tanggal, kmr = tambahHari(tgl, -1), H = showHarga();
    const kolom = ['NO', 'URAIAN PEKERJAAN', 'SAT', 'VOLUME KONTRAK', ...(H ? ['HARGA SATUAN (Rp)', 'JUMLAH HARGA (Rp)'] : []),
      'BOBOT (%)', 'VOL S.D. KEMARIN', 'VOL HARI INI', 'VOL S.D. HARI INI', 'PROGRES KUMULATIF (%)', 'BOBOT TERCAPAI (%)', 'TARGET VOL S.D. HARI INI', 'DEVIASI VOL', 'KETERANGAN / KENDALA'];
    const L = new Lembar(opsi.nama || 'Laporan Harian');
    L.kop('LAPORAN PROGRES HARIAN PEKERJAAN', kolom.length);
    L.header(kolom, 36);
    // nomor kolom (1),(2)...
    L.baris(kolom.map((_, i) => `(${i + 1})`), { ...st.th, fill: { fgColor: { rgb: '2F5597' } } });
    const nKiri = H ? 6 : 4;
    const fm = [
      { s: st.tdC }, { s: st.td }, { s: st.tdC }, { s: st.td, f: 'vol' }, ...(H ? [{ s: st.td, f: 'rp' }, { s: st.td, f: 'rp' }] : []),
      { s: st.td, f: 'bobot' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'pct' }, { s: st.td, f: 'bobot' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td },
    ];
    let tNilai = 0, tBobot = 0, tTercapai = 0;
    const subtotalSpec = (s) => fm.map((x) => ({ s, f: x.f }));
    Calc.rekapDivisi(tgl).forEach((rk) => {
      const items = rk.items.filter((it) => !opsi.hanyaAktif || Calc.kum(it.id, tgl) > 0 || Calc.targetHarian(it, tgl) > 0);
      if (!items.length) return;
      const g = new Array(kolom.length).fill(''); g[0] = rk.d.kode; g[1] = rk.d.nama;
      L.baris(g, subtotalSpec(st.grp));
      let sub = '';
      let no = 0;
      items.forEach((it) => {
        if (it.subbagian && it.subbagian !== sub) {
          sub = it.subbagian; const r = new Array(kolom.length).fill(''); r[1] = sub; L.baris(r, subtotalSpec(st.sub2));
        }
        no++;
        const kK = Calc.kum(it.id, kmr), kH = Calc.hari(it.id, tgl), kT = Calc.kum(it.id, tgl), w = Calc.bobot(it);
        const pc = it.volume ? Math.min(kT / it.volume, 1) : 0, ren = Calc.rencanaKum(it, tgl);
        const ket = [it.kendala, ...S.dailyNotes.filter((n) => n.itemId === it.id && n.status !== 'CLOSED').map((n) => `[${n.prioritas}] ${n.uraian}`)].filter(Boolean).join('; ');
        L.baris([no, it.uraian, it.satuan, it.volume, ...(H ? [it.hargaNego ?? 0, Calc.nilai(it)] : []), w, kK, kH, kT, pc, pc * w, ren, kT - ren, ket], fm);
      });
      tNilai += rk.nilai; tBobot += rk.w; tTercapai += rk.real;
      const s = new Array(kolom.length).fill(''); s[1] = `JUMLAH ${rk.d.kode} – ${rk.d.nama}`;
      if (H) s[5] = rk.nilai; s[nKiri] = rk.w; s[nKiri + 5] = rk.real;
      L.baris(s, subtotalSpec(st.sub2));
    });
    const t = new Array(kolom.length).fill(''); t[1] = 'TOTAL KESELURUHAN'; if (H) t[5] = tNilai; t[nKiri] = tBobot; t[nKiri + 5] = tTercapai;
    L.baris(t, subtotalSpec(st.tot));
    // Rekap
    const pr = Calc.proyek(tgl);
    L.kosong();
    [['Rencana kumulatif s.d. hari ini', pr.ren], ['Realisasi kumulatif s.d. hari ini', pr.real], ['Deviasi (Realisasi – Rencana)', pr.dev], ['Progres hari ini', pr.hariIni], ['Target s.d. akhir baseline', S.project.targetDes]]
      .forEach(([k, v]) => { L.baris(['', k, '', v], [{}, { s: st.lbl }, {}, { s: { font: font({ bold: true }) }, f: 'pct' }]); L.gabung(L.r - 1, 1, L.r - 1, 2); });
    L.ttd(kolom.length);
    L.kolomLebar([5, 52, 7, 12, ...(H ? [14, 17] : []), 9, 12, 11, 12, 11, 11, 12, 11, 36]);
    return L;
  }

  function lembarMatriks() {
    const p = S.project, akhir = UI.tanggal > (p.baselineAkhir || '') ? UI.tanggal : p.baselineAkhir;
    const tgls = rentang(p.baselineMulai || UI.tanggal, akhir || UI.tanggal);
    const L = new Lembar('Matriks Harian');
    const kolom = ['NO', 'URAIAN PEKERJAAN', 'SAT', 'VOL KONTRAK', ...tgls.map((t) => { const d = keDate(t); return `${d.getDate()}/${d.getMonth() + 1}`; }), 'TOTAL', '%'];
    L.kop('REKAPITULASI VOLUME HARIAN (MATRIKS)', 12);
    L.header(kolom, 28);
    const spec = [{ s: st.tdC }, { s: st.td }, { s: st.tdC }, { s: st.td, f: 'vol' }, ...tgls.map(() => ({ s: st.tdC, f: '#,##0.##;-#,##0.##;""' })), { s: st.tot, f: 'vol' }, { s: st.tot, f: 'pct' }];
    S.divisions.forEach((d) => {
      const items = S.items.filter((i) => i.divisionId === d.id);
      if (!items.length) return;
      const g = new Array(kolom.length).fill(''); g[0] = d.kode; g[1] = d.nama; L.baris(g, kolom.map(() => ({ s: st.grp })));
      items.forEach((it, i) => {
        const vals = tgls.map((t) => Calc.hari(it.id, t) || '');
        const tot = Calc.kum(it.id, akhir);
        L.baris([i + 1, it.uraian, it.satuan, it.volume, ...vals, tot, it.volume ? tot / it.volume : 0], spec);
      });
    });
    L.kolomLebar([5, 46, 7, 11, ...tgls.map(() => 6), 11, 8]);
    return L;
  }

  function lembarIsu(daftar, judul = 'DAFTAR ISU / PERMASALAHAN & ACTION PLAN') {
    const L = new Lembar('Daftar Isu');
    const kolom = ['NO', 'TGL DICATAT', 'PRIORITAS', 'KATEGORI', 'DIVISI / ITEM PEKERJAAN', 'SBD', 'URAIAN PERMASALAHAN', 'DAMPAK', 'TINDAK LANJUT / ACTION PLAN', 'PIC', 'TARGET SELESAI', 'STATUS', 'KETERANGAN'];
    L.kop(judul, kolom.length);
    L.header(kolom, 30);
    const warnaPrio = { KRITIS: 'F8CBAD', TINGGI: 'FCE4D6', SEDANG: 'FFF2CC', RENDAH: 'E2EFDA' };
    daftar.forEach((n, i) => {
      const ket = n.status === 'CLOSED' ? `Selesai ${fTgl(n.tanggalSelesai)}` : (Calc.terlambat(n) ? `TERLAMBAT ${selisihHari(n.dueDate, UI.tanggal)} hari` : '');
      const sp = [{ s: st.tdC }, { s: st.tdC }, { s: { ...st.tdC, font: font({ bold: true }), fill: { fgColor: { rgb: warnaPrio[n.prioritas] || 'FFFFFF' } } } }, { s: st.td }, { s: st.td }, { s: st.tdC }, { s: st.td }, { s: st.td }, { s: st.td }, { s: st.td }, { s: st.tdC }, { s: st.tdC }, { s: Calc.terlambat(n) ? { ...st.td, font: font({ bold: true, color: { rgb: 'C00000' } }) } : st.td }];
      L.baris([i + 1, fTgl(n.tanggal), n.prioritas, n.kategori, [namaDiv(n.divisionId), namaItem(n.itemId)].filter((x) => x && x !== '-').join(' / '), namaSbd(n.sbd), n.uraian, n.dampak, n.tindakLanjut, n.pic, fTgl(n.dueDate), n.status, ket], sp);
    });
    if (!daftar.length) { L.baris(['', 'Tidak ada isu.'], st.td); }
    L.ttd(kolom.length);
    L.kolomLebar([5, 11, 10, 14, 30, 9, 40, 24, 40, 14, 11, 10, 18]);
    return L;
  }

  return { Lembar, st, simpan, lembarLaporanHarian, lembarMatriks, lembarIsu, font };
})();

/* ---------- Ekspor per menu ---------- */
const Ekspor = {
  dashboard() {
    const tgl = UI.tanggal, H = showHarga(), pr = Calc.proyek(tgl), st = XL.st;
    // Ringkasan + rekap divisi
    const L = new XL.Lembar('Ringkasan');
    const kolom = ['NO', 'DIVISI PEKERJAAN', ...(H ? ['NILAI KONTRAK (Rp)', 'NILAI REALISASI (Rp)'] : []), 'BOBOT (%)', 'RENCANA S.D. HARI INI (%)', 'REALISASI S.D. HARI INI (%)', 'DEVIASI (%)', 'PROGRES INTERNAL DIVISI (%)', 'ISU AKTIF'];
    L.kop('RINGKASAN EKSEKUTIF – DASHBOARD PROGRES', kolom.length);
    const kpi = [
      ['Realisasi kumulatif (bobot)', pr.real, 'pct'], ['Rencana kumulatif s.d. hari ini', pr.ren, 'pct'], ['Deviasi', pr.dev, 'pct'],
      ['Progres hari ini', pr.hariIni, 'pct'], ['Target s.d. akhir baseline', S.project.targetDes, 'pct'],
      ['Isu aktif / kritis', `${Calc.isuAktif().length} / ${Calc.isuKritis().length}`],
      ['SBD selesai / total', `${S.wells.filter((w) => w.status === 'SELESAI').length} / ${S.wells.length}`],
      ...(H ? [['Nilai kontrak', Calc.total, 'rp'], ['Nilai realisasi', pr.nilaiReal, 'rp']] : []),
    ];
    kpi.forEach(([k, v, f]) => { L.baris([k, '', v], [{ s: { ...st.td, font: XL.font({ bold: true }) } }, { s: st.td }, { s: st.td, f }]); L.gabung(L.r - 1, 0, L.r - 1, 1); });
    L.kosong();
    L.header(kolom, 36);
    const fm = [{ s: st.tdC }, { s: st.td }, ...(H ? [{ s: st.td, f: 'rp' }, { s: st.td, f: 'rp' }] : []), { s: st.td, f: 'pct' }, { s: st.td, f: 'pct' }, { s: st.td, f: 'pct' }, { s: st.td, f: 'pct' }, { s: st.td, f: 'pct' }, { s: st.tdC, f: 'int' }];
    let t = { n: 0, nr: 0, w: 0, ren: 0, real: 0, isu: 0 };
    Calc.rekapDivisi(tgl).forEach((r, i) => {
      const isu = Calc.isuAktif().filter((n) => n.divisionId === r.d.id).length;
      L.baris([r.d.kode || i + 1, r.d.nama, ...(H ? [r.nilai, r.nilaiReal] : []), r.w, r.ren, r.real, r.dev, r.pctDiv, isu], fm);
      t.n += r.nilai; t.nr += r.nilaiReal; t.w += r.w; t.ren += r.ren; t.real += r.real; t.isu += isu;
    });
    L.baris(['', 'TOTAL', ...(H ? [t.n, t.nr] : []), t.w, t.ren, t.real, t.real - t.ren, t.w ? t.real / t.w : 0, t.isu], fm.map((x) => ({ s: st.tot, f: x.f })));
    L.ttd(kolom.length);
    L.kolomLebar([24, 44, ...(H ? [18, 18] : []), 10, 12, 12, 10, 12, 8]);

    // Target harian
    const T = new XL.Lembar('Target Harian');
    const kT = ['NO', 'DIVISI', 'URAIAN PEKERJAAN', 'SAT', 'VOL KONTRAK', 'TARGET HARI INI', 'REALISASI HARI INI', 'SELISIH', 'VOL S.D. HARI INI', 'RENCANA S.D. HARI INI', 'PROGRES (%)', 'STATUS'];
    T.kop('TARGET & REALISASI HARIAN PER ITEM PEKERJAAN', kT.length);
    T.header(kT, 30);
    const fT = [{ s: st.tdC }, { s: st.td }, { s: st.td }, { s: st.tdC }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'pct' }, { s: st.tdC }];
    View.daftarTargetHarian(tgl).forEach((x, i) => {
      T.baris([i + 1, namaDiv(x.it.divisionId), x.it.uraian, x.it.satuan, x.it.volume, x.target, x.real, x.real - x.target, x.kum, x.ren, x.pct, x.status], fT);
    });
    T.ttd(kT.length);
    T.kolomLebar([5, 26, 48, 7, 12, 12, 12, 11, 12, 12, 10, 14]);

    // Agenda rapat
    const A = XL.lembarIsu(View.agendaRapat(tgl), 'AGENDA RAPAT – ISU YANG PERLU DIBAHAS');
    A.nama = 'Agenda Rapat';

    // Kurva S
    const K = new XL.Lembar('Kurva S');
    K.kop('DATA KURVA S – RENCANA vs REALISASI', 5);
    K.header(['TANGGAL', 'RENCANA KUMULATIF (%)', 'REALISASI KUMULATIF (%)', 'DEVIASI (%)']);
    Calc.kurvaS(tgl).forEach((k) => K.baris([fTgl(k.t), k.ren, k.real ?? '', k.real == null ? '' : k.real - k.ren], [{ s: st.tdC }, { s: st.td, f: 'pct' }, { s: st.td, f: 'pct' }, { s: st.td, f: 'pct' }]));
    K.kolomLebar([16, 18, 18, 14]);

    XL.simpan('Dashboard', [L, T, A, K]);
  },
  progres() { XL.simpan('Laporan_Progres_Harian', [XL.lembarLaporanHarian(), XL.lembarMatriks()]); },
  isu() { XL.simpan('Daftar_Isu', [XL.lembarIsu(View.isuTersaring())]); },
  sbd() {
    const st = XL.st, tgl = UI.tanggal;
    const L = new XL.Lembar('Status SBD');
    const kolom = ['NO', 'SBD', 'KABUPATEN', 'JENIS TANAH', 'REKOMTEK', 'TIM', 'VENDOR PEMBORAN', 'STATUS', 'KEDALAMAN BOR (m)', 'ENTRI PROGRES TERAKHIR', 'ISU AKTIF', 'CATATAN'];
    L.kop('STATUS PEKERJAAN PER SBD (SUMUR BOR DALAM)', kolom.length);
    L.header(kolom, 30);
    const fm = [{ s: st.tdC }, { s: { ...st.tdC, font: XL.font({ bold: true }) } }, { s: st.td }, { s: st.td }, { s: st.td }, { s: st.tdC }, { s: st.td }, { s: st.tdC }, { s: st.td, f: 'vol' }, { s: st.tdC }, { s: st.tdC, f: 'int' }, { s: st.td }];
    View.wellsTersaring().forEach((w, i) => {
      const r = View.ringkasSbd(w.id, tgl);
      L.baris([i + 1, w.sbd, w.kabupaten, w.tanah, w.rekomtek, w.tim, w.vendorPemboran, w.status, r.kedalaman, fTgl(r.terakhir), r.isu, w.catatan], fm);
    });
    const rek = STATUS_SBD.map((s) => [s, S.wells.filter((w) => w.status === s).length]).filter(([, n]) => n);
    L.kosong();
    L.baris(['', 'REKAP STATUS'], [{}, { s: st.th }]); L.gabung(L.r - 1, 1, L.r - 1, 2);
    rek.forEach(([s, n]) => { L.baris(['', s, n], [{}, { s: st.td }, { s: st.tdC, f: 'int' }]); });
    L.baris(['', 'TOTAL SBD', S.wells.length], [{}, { s: st.tot }, { s: st.tot, f: 'int' }]);
    L.ttd(kolom.length);
    L.kolomLebar([5, 10, 16, 14, 14, 8, 20, 18, 12, 14, 8, 30]);

    // Progres per SBD (volume kumulatif per item yang punya entri SBD)
    const P = new XL.Lembar('Progres per SBD');
    const itemIds = [...new Set(S.progress.filter((p) => p.sbd).map((p) => p.itemId))].filter((id) => Calc.idx.item.has(id));
    const items = S.items.filter((i) => itemIds.includes(i.id));
    const kP = ['NO', 'URAIAN PEKERJAAN', 'SAT', ...S.wells.map((w) => w.sbd), 'TOTAL'];
    P.kop('VOLUME KUMULATIF PER ITEM PER SBD', 10);
    P.header(kP, 30);
    items.forEach((it, i) => {
      const v = S.wells.map((w) => Calc.kum(it.id, tgl, w.id) || '');
      P.baris([i + 1, it.uraian, it.satuan, ...v, v.reduce((a, b) => a + num(b), 0)], [{ s: st.tdC }, { s: st.td }, { s: st.tdC }, ...S.wells.map(() => ({ s: st.tdC, f: '#,##0.##;-#,##0.##;""' })), { s: st.tot, f: 'vol' }]);
    });
    if (!items.length) P.baris(['', 'Belum ada entri progres yang ditandai SBD.'], st.td);
    P.kolomLebar([5, 46, 7, ...S.wells.map(() => 8), 11]);
    XL.simpan('SBD_Wells', [L, P]);
  },
  pengadaan() {
    const st = XL.st, tgl = UI.tanggal;
    const L = new XL.Lembar('Pengadaan');
    const kolom = ['NO', 'KELOMPOK', 'URAIAN MATERIAL', 'SAT', 'VOL KONTRAK', 'TERPASANG S.D. HARI INI', 'STOK 2026', 'MATERIAL ON SITE (MOS)', 'SISA KEBUTUHAN', 'CATATAN'];
    L.kop('MONITORING PENGADAAN MATERIAL', kolom.length);
    L.header(kolom, 30);
    const fm = [{ s: st.tdC }, { s: st.td }, { s: st.td }, { s: st.tdC }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td, f: 'vol' }, { s: st.td }];
    S.procurement.forEach((p, i) => {
      const r = View.ringkasPengadaan(p, tgl);
      L.baris([i + 1, p.kelompok, p.uraian, r.sat, r.vol, r.terpasang, p.stock2026 ?? '', p.mos ?? '', r.sisa, p.catatan], fm);
    });
    L.ttd(kolom.length);
    L.kolomLebar([5, 18, 40, 7, 12, 14, 11, 14, 13, 30]);
    XL.simpan('Pengadaan', [L]);
  },
};

/* ============================ 5. VIEW ============================ */
const tombolExcel = (aksi) => `<button type="button" class="btn-excel" data-excel="${aksi}">⬇ Download Excel</button>`;
const bar = (v, warna = 'bg-sky-600') => `<div class="h-2 w-full overflow-hidden rounded-full bg-slate-200"><div class="h-full ${warna}" style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></div></div>`;
const warnaDev = (d) => (d >= -0.0005 ? 'text-emerald-700' : d > -0.05 ? 'text-amber-600' : 'text-red-600');
const pilPrio = (p) => `<span class="pil pil-${p.toLowerCase()}">${p}</span>`;
const pilStatus = (s) => `<span class="pil ${s === 'CLOSED' ? 'pil-rendah' : s === 'PROGRESS' ? 'pil-proses' : 'pil-open'}">${s}</span>`;
const opsi = (arr, nilai, label = (x) => x, val = (x) => x) => arr.map((x) => `<option value="${esc(val(x))}" ${String(val(x)) === String(nilai) ? 'selected' : ''}>${esc(label(x))}</option>`).join('');

const View = {
  render() {
    const belumMasuk = Server.aktif && !Server.sesi;
    const manajemen = Server.peran() === 'MANAJEMEN';
    if (Server.aktif && Server.sesi && !manajemen) UI.mode = 'rapat';
    document.body.classList.toggle('belum-masuk', belumMasuk);
    $('#grupMode').classList.toggle('hidden', !manajemen);
    $('#btnImpor').classList.toggle('hidden', !manajemen);
    $('#btnPengaturan').classList.toggle('hidden', !manajemen);
    const up = $('#infoPengguna');
    if (Server.aktif && Server.user) { up.classList.remove('hidden'); $('#namaPengguna').textContent = Server.user.nama; $('#peranPengguna').textContent = Server.user.peran; }
    else up.classList.add('hidden');
    Server.tampilStatus();
    $$('.tab-btn').forEach((b) => b.classList.toggle('aktif', b.dataset.tab === UI.tab));
    $$('.mode-btn').forEach((b) => b.classList.toggle('aktif', b.dataset.mode === UI.mode));
    document.body.classList.toggle('mode-rapat', UI.mode === 'rapat');
    $('#pitaRapat').classList.toggle('hidden', UI.mode !== 'rapat');
    $('#tanggalGlobal').value = UI.tanggal;
    $('#judulProyek').textContent = belumMasuk ? 'Silakan masuk' : (S.project.nama || 'Belum ada data proyek');
    const nk = Calc.isuKritis().length, b = $('#badgeIsu');
    b.textContent = nk; b.classList.toggle('hidden', !nk);
    const app = $('#app');
    if (belumMasuk) { app.innerHTML = this.login(); this.pasangLogin(); return; }
    if (!S.items.length) { app.innerHTML = this.sambutan(); return; }
    const fn = { dashboard: this.dashboard, input: this.input, isu: this.isu, sbd: this.sbd, pengadaan: this.pengadaan }[UI.tab] || this.dashboard;
    app.innerHTML = fn.call(this);
    if (UI.tab === 'input') this.pasangInput();
  },

  login() {
    const tahap = UI._loginEmail ? 'kode' : 'email';
    return `<div class="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 shadow">
      <div class="text-center text-4xl">🔐</div>
      <h2 class="mt-2 text-center text-xl font-bold">Masuk</h2>
      <p class="mt-1 text-center text-sm text-slate-500">Khusus staf terdaftar. Kode masuk dikirim ke email Anda.</p>
      ${tahap === 'email' ? `
      <form id="fLogin" class="mt-6 space-y-3">
        <label class="fld"><span>Email</span><input name="email" type="email" autocomplete="email" required placeholder="nama@contoh.com" value="${esc(UI._emailTerakhir || '')}"></label>
        <button type="submit" class="btn-pri w-full">Kirim kode masuk</button>
      </form>` : `
      <form id="fKode" class="mt-6 space-y-3">
        <div class="rounded-lg bg-sky-50 p-3 text-xs text-sky-900">Kode 6 digit dikirim ke <b>${esc(UI._loginEmail)}</b> (berlaku 10 menit). Periksa juga folder Spam.</div>
        <label class="fld"><span>Kode masuk</span><input name="kode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required class="text-center text-2xl tracking-[0.5em]" placeholder="••••••"></label>
        <button type="submit" class="btn-pri w-full">Masuk</button>
        <button type="button" class="link block w-full text-center" id="btnGantiEmail">← Ganti email / minta kode baru</button>
      </form>`}
      <p id="pesanLogin" class="mt-3 min-h-[1.25rem] text-center text-sm"></p>
    </div>`;
  },
  pasangLogin() {
    const pesan = (t, err) => { const el = $('#pesanLogin'); el.textContent = t; el.className = `mt-3 min-h-[1.25rem] text-center text-sm ${err ? 'text-red-600' : 'text-slate-600'}`; };
    const sibuk = (f, ya) => $$('button', f).forEach((b) => { b.disabled = ya; b.classList.toggle('opacity-60', ya); });
    const fl = $('#fLogin');
    if (fl) fl.onsubmit = async (e) => {
      e.preventDefault(); const email = new FormData(fl).get('email').trim().toLowerCase();
      sibuk(fl, true); pesan('Mengirim kode…');
      try {
        const r = await Server.mintaKode(email);
        if (!r.ok) { pesan(r.pesan, true); sibuk(fl, false); return; }
        UI._loginEmail = email; UI._emailTerakhir = email; Store.simpanUI(); View.render(); pesan(r.pesan);
      } catch (err) { pesan(err.message, true); sibuk(fl, false); }
    };
    const fk = $('#fKode');
    if (fk) {
      $('#btnGantiEmail').onclick = () => { UI._loginEmail = ''; View.render(); };
      fk.onsubmit = async (e) => {
        e.preventDefault(); sibuk(fk, true); pesan('Memeriksa kode…');
        try {
          const r = await Server.masuk(UI._loginEmail, new FormData(fk).get('kode'));
          if (!r.ok) { pesan(r.pesan, true); sibuk(fk, false); return; }
          UI._loginEmail = ''; Store.simpanUI(); toast(`Selamat datang, ${r.user.nama} (${r.user.peran})`); View.render();
        } catch (err) { pesan(err.message, true); sibuk(fk, false); }
      };
    }
  },

  sambutan() {
    if (Server.aktif && Server.peran() !== 'MANAJEMEN') {
      return `<div class="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-8 text-center shadow"><div class="text-5xl">⏳</div>
        <h2 class="mt-3 text-xl font-bold">Data proyek belum tersedia</h2>
        <p class="mt-2 text-sm text-slate-600">Manajemen belum mengunggah data proyek ke server, atau perangkat ini belum tersinkron.</p>
        <button type="button" class="btn-pri mt-5" data-aksi="sinkron">⟳ Sinkron sekarang</button></div>`;
    }
    return `<div class="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-8 text-center shadow">
      <div class="text-5xl">🏗️</div>
      <h2 class="mt-3 text-xl font-bold">Selamat datang</h2>
      <p class="mt-2 text-sm text-slate-600">Muat file JSON proyek (ekspor dari aplikasi monitoring / file master) untuk mulai. Anda juga bisa menyeret file .json ke halaman ini.</p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" class="btn-pri" data-aksi="impor">⬆ Impor File JSON</button>
        ${Server.aktif ? '' : '<button type="button" class="btn-sec" data-aksi="demo">Muat Data Contoh</button>'}
      </div>
      <p class="mt-6 text-xs text-slate-400">Struktur yang didukung: project, divisions, items, progress, dailyNotes, procurement, wells (schemaVersion 2/3).</p>
    </div>`;
  },

  /* ---------------- DASHBOARD ---------------- */
  daftarTargetHarian(tgl) {
    return S.items.map((it) => {
      const target = Calc.targetHarian(it, tgl), real = Calc.hari(it.id, tgl), kum = Calc.kum(it.id, tgl), ren = Calc.rencanaKum(it, tgl);
      const pct = it.volume ? Math.min(kum / it.volume, 1) : 0;
      let status = '-';
      if (target > 0) status = real >= target - 1e-9 ? 'TERCAPAI' : real > 0 ? 'KURANG' : 'BELUM INPUT';
      else if (real > 0) status = 'DI LUAR JADWAL';
      return { it, target, real, kum, ren, pct, status };
    }).filter((x) => x.target > 0 || x.real > 0);
  },
  agendaRapat(tgl) {
    const urut = { KRITIS: 0, TINGGI: 1, SEDANG: 2, RENDAH: 3 };
    return S.dailyNotes.filter((n) => n.tanggal <= tgl && (n.status !== 'CLOSED' || n.tanggalSelesai === tgl))
      .sort((a, b) => (Calc.terlambat(b, tgl) - Calc.terlambat(a, tgl)) || (urut[a.prioritas] - urut[b.prioritas]) || String(a.dueDate || '9').localeCompare(String(b.dueDate || '9')));
  },

  dashboard() {
    const tgl = UI.tanggal, pr = Calc.proyek(tgl), H = showHarga();
    const aktif = Calc.isuAktif(), kritis = Calc.isuKritis(), telat = aktif.filter((n) => Calc.terlambat(n));
    const selesaiSbd = S.wells.filter((w) => w.status === 'SELESAI').length;
    const jalanSbd = S.wells.filter((w) => !['BELUM MULAI', 'SELESAI'].includes(w.status)).length;
    const p = S.project;
    const sisaHari = p.baselineAkhir ? selisihHari(tgl, p.baselineAkhir) : null;
    const kartu = (judul, nilai, ket, aksen = 'border-sky-500') => `<div class="kartu border-l-4 ${aksen}"><div class="text-xs font-medium uppercase tracking-wide text-slate-500">${judul}</div><div class="mt-1 text-2xl font-bold tabular-nums">${nilai}</div><div class="mt-1 text-xs text-slate-500">${ket}</div></div>`;

    const rekap = Calc.rekapDivisi(tgl);
    const targetHarianAll = this.daftarTargetHarian(tgl);
    const hitTH = (st) => targetHarianAll.filter((x) => x.status === st).length;
    const targetHarianF = targetHarianAll.filter((x) => UI.dashFilter === 'semua' || (UI.dashFilter === 'perhatian' ? ['KURANG', 'BELUM INPUT'].includes(x.status) : x.status === UI.dashFilter))
      .sort((a, b) => (a.status === 'BELUM INPUT') - (b.status === 'BELUM INPUT') || (b.target * (b.it.hargaNego || 1)) - (a.target * (a.it.hargaNego || 1)));
    const BATAS = 25, targetHarian = UI.dashSemua ? targetHarianF : targetHarianF.slice(0, BATAS);
    const agenda = this.agendaRapat(tgl);

    return `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div><h2 class="text-lg font-bold">Ringkasan Eksekutif</h2><p class="text-xs text-slate-500">${fTglPanjang(tgl)}${sisaHari != null ? ` · sisa ${sisaHari} hari ke akhir baseline (${fTgl(p.baselineAkhir)})` : ''}</p></div>
      ${tombolExcel('dashboard')}
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      ${kartu('Total Bobot Progres', fPct(pr.real), `Hari ini +${fPct(pr.hariIni, 3)} · Target akhir ${fPct(p.targetDes)}`, 'border-sky-600')}
      ${kartu('Target vs Realisasi', `<span class="${warnaDev(pr.dev)}">${pr.dev >= 0 ? '+' : ''}${fPct(pr.dev)}</span>`, `Rencana ${fPct(pr.ren)} · Realisasi ${fPct(pr.real)}`, pr.dev >= 0 ? 'border-emerald-500' : 'border-red-500')}
      ${kartu('Isu Kritis Aktif', `<span class="${kritis.length ? 'text-red-600' : ''}">${kritis.length}</span>`, `${aktif.length} isu aktif · ${telat.length} lewat target`, kritis.length ? 'border-red-600' : 'border-emerald-500')}
      ${kartu('SBD Wells', `${selesaiSbd}<span class="text-base font-medium text-slate-400"> / ${S.wells.length}</span>`, `${jalanSbd} sedang berjalan`, 'border-violet-500')}
    </div>
    ${H ? `<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 harga">
      ${kartu('Nilai Kontrak (Harga Nego)', fRp(Calc.total), `${S.items.length} item pekerjaan`, 'border-slate-400')}
      ${kartu('Nilai Realisasi Fisik', fRp(pr.nilaiReal), `${fPct(Calc.total ? pr.nilaiReal / Calc.total : 0)} dari nilai kontrak`, 'border-slate-400')}
      ${kartu('Nilai Progres Hari Ini', fRp(pr.nilaiHari), 'Volume hari ini × harga satuan', 'border-slate-400')}
    </div>` : ''}

    <div class="mt-4 grid gap-4 xl:grid-cols-5">
      <section class="panel xl:col-span-3">
        <div class="panel-head"><h3>Kurva S – Rencana vs Realisasi</h3><span class="text-xs text-slate-500">Bobot kumulatif</span></div>
        <div class="p-3">${this.svgKurvaS(Calc.kurvaS(tgl), tgl)}</div>
      </section>
      <section class="panel xl:col-span-2">
        <div class="panel-head"><h3>Agenda Rapat Hari Ini</h3><button type="button" class="link" data-aksi="tab" data-ke="isu">Semua isu →</button></div>
        <div class="max-h-[340px] divide-y overflow-y-auto">
          ${agenda.length ? agenda.map((n) => `
            <button type="button" class="block w-full px-4 py-2.5 text-left hover:bg-slate-50" data-aksi="edit-isu" data-id="${n.id}">
              <div class="flex flex-wrap items-center gap-1.5 text-xs">${pilPrio(n.prioritas)} ${pilStatus(n.status)}
                ${Calc.terlambat(n, tgl) ? `<span class="pil pil-kritis">TERLAMBAT ${selisihHari(n.dueDate, tgl)} hr</span>` : ''}
                <span class="text-slate-400">${fTgl(n.tanggal)}${n.sbd ? ' · ' + esc(namaSbd(n.sbd)) : ''}</span></div>
              <div class="mt-1 text-sm font-medium">${esc(n.uraian)}</div>
              <div class="text-xs text-slate-500">${esc(namaItem(n.itemId) || namaDiv(n.divisionId))}${n.pic ? ' · PIC: ' + esc(n.pic) : ''}${n.dueDate ? ' · Target: ' + fTgl(n.dueDate) : ''}</div>
            </button>`).join('') : `<div class="p-6 text-center text-sm text-slate-400">Tidak ada isu untuk dibahas. <button type="button" class="link" data-aksi="isu-baru">+ Catat isu</button></div>`}
        </div>
      </section>
    </div>

    <section class="panel mt-4">
      <div class="panel-head"><h3>Rekap Progres per Divisi</h3></div>
      <div class="overflow-x-auto"><table class="tbl">
        <thead><tr><th class="w-10">No</th><th class="text-left">Divisi Pekerjaan</th>${H ? '<th>Nilai Kontrak</th>' : ''}<th>Bobot</th><th>Rencana</th><th>Realisasi</th><th>Deviasi</th><th class="w-48">Progres Divisi</th><th>Isu Aktif</th></tr></thead>
        <tbody>${rekap.map((r) => {
          const isu = aktif.filter((n) => n.divisionId === r.d.id).length;
          return `<tr><td class="text-center">${esc(r.d.kode)}</td><td>${esc(r.d.nama)}</td>${H ? `<td class="num">${fRp(r.nilai)}</td>` : ''}
          <td class="num">${fPct(r.w)}</td><td class="num">${fPct(r.ren)}</td><td class="num font-semibold">${fPct(r.real)}</td>
          <td class="num ${warnaDev(r.dev)}">${fPct(r.dev)}</td>
          <td><div class="flex items-center gap-2">${bar(r.pctDiv)}<span class="w-14 text-right text-xs tabular-nums">${fPct(r.pctDiv, 1)}</span></div></td>
          <td class="text-center">${isu ? `<span class="pil pil-tinggi">${isu}</span>` : '-'}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td></td><td>TOTAL</td>${H ? `<td class="num">${fRp(Calc.total)}</td>` : ''}<td class="num">${fPct(rekap.reduce((s, r) => s + r.w, 0))}</td><td class="num">${fPct(pr.ren)}</td><td class="num">${fPct(pr.real)}</td><td class="num ${warnaDev(pr.dev)}">${fPct(pr.dev)}</td><td></td><td class="text-center">${aktif.length}</td></tr></tfoot>
      </table></div>
    </section>

    <section class="panel mt-4">
      <div class="panel-head flex-wrap gap-2"><h3>Target Harian per Item – ${fTgl(tgl)}</h3>
        <div class="flex flex-wrap items-center gap-1">${[['perhatian', `Perlu perhatian (${hitTH('KURANG') + hitTH('BELUM INPUT')})`], ['TERCAPAI', `Tercapai (${hitTH('TERCAPAI')})`], ['DI LUAR JADWAL', `Di luar jadwal (${hitTH('DI LUAR JADWAL')})`], ['semua', `Semua (${targetHarianAll.length})`]]
          .map(([k, l]) => `<button type="button" class="chip ${UI.dashFilter === k ? 'aktif' : ''}" data-aksi="dash-filter" data-k="${k}">${l}</button>`).join('')}
        <button type="button" class="link ml-2" data-aksi="tab" data-ke="input">Input progres →</button></div></div>
      <div class="overflow-x-auto"><table class="tbl">
        <thead><tr><th class="w-10">No</th><th class="text-left">Item Pekerjaan</th><th>Sat</th><th>Target Hari Ini</th><th>Realisasi Hari Ini</th><th>Vol s.d. Hari Ini</th><th>Rencana s.d. Hari Ini</th><th class="w-40">Progres</th><th>Status</th></tr></thead>
        <tbody>${targetHarian.length ? targetHarian.map((x, i) => `<tr>
          <td class="text-center">${i + 1}</td><td><div>${esc(x.it.uraian)}</div><div class="text-[11px] text-slate-400">${esc(namaDiv(x.it.divisionId))}</div></td>
          <td class="text-center">${esc(x.it.satuan)}</td><td class="num">${fVol(x.target)}</td><td class="num font-semibold">${fVol(x.real)}</td>
          <td class="num">${fVol(x.kum)}</td><td class="num">${fVol(x.ren)}</td>
          <td><div class="flex items-center gap-2">${bar(x.pct, x.kum >= x.ren ? 'bg-emerald-500' : 'bg-amber-500')}<span class="w-12 text-right text-xs tabular-nums">${fPct(x.pct, 1)}</span></div></td>
          <td class="text-center"><span class="pil ${x.status === 'TERCAPAI' ? 'pil-rendah' : x.status === 'KURANG' ? 'pil-sedang' : x.status === 'BELUM INPUT' ? 'pil-kritis' : 'pil-proses'}">${x.status}</span></td></tr>`).join('')
          : '<tr><td colspan="9" class="py-6 text-center text-slate-400">Tidak ada item pada filter ini.</td></tr>'}</tbody>
      </table></div>
      ${targetHarianF.length > BATAS ? `<div class="border-t p-2 text-center"><button type="button" class="link" data-aksi="dash-semua">${UI.dashSemua ? 'Tampilkan ringkas' : `Tampilkan semua ${targetHarianF.length} item`}</button></div>` : ''}
    </section>`;
  },

  svgKurvaS(data, tgl) {
    if (!data.length) return '<div class="p-6 text-center text-sm text-slate-400">Baseline belum diatur (Pengaturan ⚙).</div>';
    const W = 720, Hh = 280, pl = 44, pr = 12, pt = 14, pb = 30;
    const maxV = Math.max(0.05, ...data.map((d) => Math.max(d.ren, d.real || 0)), S.project.targetDes || 0);
    const yMax = Math.ceil(maxV * 1.1 * 20) / 20;
    const x = (i) => pl + (i / Math.max(data.length - 1, 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - v / yMax) * (Hh - pt - pb);
    const garis = (f) => data.map((d, i) => (f(d) == null ? null : `${x(i).toFixed(1)},${y(f(d)).toFixed(1)}`)).filter(Boolean).join(' ');
    const ticks = []; for (let v = 0; v <= yMax + 1e-9; v += yMax / 5) ticks.push(v);
    const iH = data.findIndex((d) => d.t === tgl);
    const langkah = Math.ceil(data.length / 8);
    const last = [...data].reverse().find((d) => d.real != null);
    return `<svg viewBox="0 0 ${W} ${Hh}" class="h-auto w-full" role="img" aria-label="Kurva S">
      ${ticks.map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8f0"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end" font-size="10" fill="#64748b">${(v * 100).toFixed(0)}%</text>`).join('')}
      ${data.map((d, i) => (i % langkah === 0 || (i === data.length - 1 && i % langkah >= langkah / 2)) ? `<text x="${x(i)}" y="${Hh - 10}" text-anchor="middle" font-size="10" fill="#64748b">${fTgl(d.t).slice(0, 6)}</text>` : '').join('')}
      ${S.project.targetDes ? `<line x1="${pl}" x2="${W - pr}" y1="${y(S.project.targetDes)}" y2="${y(S.project.targetDes)}" stroke="#a855f7" stroke-dasharray="4 4"/><text x="${W - pr}" y="${y(S.project.targetDes) - 4}" text-anchor="end" font-size="10" fill="#7e22ce">Target ${fPct(S.project.targetDes, 1)}</text>` : ''}
      ${iH >= 0 ? `<line x1="${x(iH)}" x2="${x(iH)}" y1="${pt}" y2="${Hh - pb}" stroke="#94a3b8" stroke-dasharray="2 3"/>` : ''}
      <polyline fill="none" stroke="#2563eb" stroke-width="2.2" points="${garis((d) => d.ren)}"/>
      <polyline fill="none" stroke="#16a34a" stroke-width="2.6" points="${garis((d) => d.real)}"/>
      ${last ? `<circle cx="${x(data.indexOf(last))}" cy="${y(last.real)}" r="4" fill="#16a34a"/>` : ''}
      <g font-size="11"><rect x="${pl + 8}" y="${pt}" width="10" height="3" fill="#2563eb"/><text x="${pl + 22}" y="${pt + 4}" fill="#334155">Rencana</text>
      <rect x="${pl + 82}" y="${pt}" width="10" height="3" fill="#16a34a"/><text x="${pl + 96}" y="${pt + 4}" fill="#334155">Realisasi</text></g>
    </svg>`;
  },

  /* ---------------- INPUT PROGRES HARIAN ---------------- */
  itemInput() {
    const q = UI.inCari.trim().toLowerCase(), tgl = UI.tanggal;
    return S.items.filter((it) => (!UI.inDiv || it.divisionId === UI.inDiv)
      && (!q || `${it.uraian} ${it.subbagian} ${it.id}`.toLowerCase().includes(q))
      && (!UI.inAktif || Calc.targetHarian(it, tgl) > 0 || Calc.hari(it.id, tgl) > 0));
  },
  input() {
    const tgl = UI.tanggal, kmr = tambahHari(tgl, -1), H = showHarga(), sbd = UI.inSbd;
    const items = this.itemInput();
    const pr = Calc.proyek(tgl);
    const diisi = S.items.filter((it) => Calc.hari(it.id, tgl) > 0).length;
    let html = `
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h2 class="text-lg font-bold">Input Progres Harian</h2>
      <p class="text-xs text-slate-500">${fTglPanjang(tgl)} · ${diisi} item terisi hari ini · Progres hari ini <b>+${fPct(pr.hariIni, 3)}</b> · Kumulatif <b>${fPct(pr.real)}</b></p></div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-sec" data-aksi="geser-tgl" data-n="-1">◀ Kemarin</button>
        <button type="button" class="btn-sec" data-aksi="geser-tgl" data-n="1">Besok ▶</button>
        ${tombolExcel('progres')}
      </div>
    </div>
    <div class="panel mb-3 grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
      <label class="fld lg:col-span-1"><span>SBD (sumur)</span>
        <select id="inSbd"><option value="">— Umum / tanpa SBD —</option>${opsi(S.wells, sbd, (w) => `${w.sbd} · ${w.kabupaten || ''} · ${w.tim || ''}`, (w) => w.id)}</select></label>
      <label class="fld"><span>Divisi</span><select id="inDiv"><option value="">Semua divisi</option>${opsi(S.divisions, UI.inDiv, (d) => `${d.kode}. ${d.nama}`, (d) => d.id)}</select></label>
      <label class="fld lg:col-span-2"><span>Cari item</span><input id="inCari" type="search" placeholder="mis. pengeboran, casing, bekisting…" value="${esc(UI.inCari)}"></label>
      <label class="flex items-end gap-2 pb-2 text-sm"><input id="inAktif" type="checkbox" class="h-4 w-4" ${UI.inAktif ? 'checked' : ''}> Hanya item terjadwal / terisi hari ini</label>
    </div>
    ${sbd ? `<div class="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900 ring-1 ring-violet-200">Input dicatat untuk <b>${esc(namaSbd(sbd))}</b>. Kolom “Hari Ini” adalah volume SBD ini; total proyek tetap terakumulasi otomatis.</div>` : ''}
    <div class="panel overflow-x-auto">
      <table class="tbl tbl-input">
        <thead><tr>
          <th class="w-10">No</th><th class="min-w-[260px] text-left">Item Pekerjaan</th><th>Sat</th>
          <th class="hidden md:table-cell">Vol Kontrak</th>${H ? '<th class="hidden lg:table-cell">Harga Sat.</th>' : ''}
          <th class="hidden md:table-cell">Target Hari Ini</th><th>s.d. Kemarin</th><th class="w-32 bg-sky-800">Hari Ini${sbd ? '<br><span class="font-normal">(' + esc(namaSbd(sbd)) + ')</span>' : ''}</th>
          <th>s.d. Hari Ini</th><th class="w-36">Progres Kum.</th><th class="w-16">Aksi</th>
        </tr></thead><tbody>`;
    let divAktif = null, sub = null, no = 0;
    for (const it of items) {
      if (it.divisionId !== divAktif) {
        divAktif = it.divisionId; sub = null;
        html += `<tr class="baris-div"><td colspan="${H ? 11 : 10}">${esc(namaDiv(divAktif))}</td></tr>`;
      }
      if (it.subbagian && it.subbagian !== sub) { sub = it.subbagian; html += `<tr class="baris-sub"><td></td><td colspan="${H ? 10 : 9}">${esc(sub)}</td></tr>`; }
      no++;
      const kK = Calc.kum(it.id, kmr), kT = Calc.kum(it.id, tgl), e = Calc.entri(it.id, tgl, sbd);
      const hariSemua = Calc.hari(it.id, tgl), lain = hariSemua - (e ? e.volume : 0);
      const target = Calc.targetHarian(it, tgl), pc = it.volume ? kT / it.volume : 0;
      const lebih = kT > it.volume + 1e-9;
      const isu = S.dailyNotes.filter((n) => n.itemId === it.id && n.status !== 'CLOSED').length;
      html += `<tr data-item="${it.id}" class="${lebih ? 'bg-red-50' : ''}">
        <td class="text-center text-slate-400">${no}</td>
        <td><div class="leading-snug">${esc(it.uraian)}</div>${isu ? `<div class="text-[11px] text-red-600">⚠ ${isu} isu aktif</div>` : ''}</td>
        <td class="text-center">${esc(it.satuan)}</td>
        <td class="num hidden md:table-cell">${fVol(it.volume)}</td>${H ? `<td class="num hidden lg:table-cell">${NF0.format(it.hargaNego || 0)}</td>` : ''}
        <td class="num hidden md:table-cell">${target ? `<button type="button" class="link" data-aksi="isi-target" data-id="${it.id}" title="Isi sesuai target">${fVol(target)}</button>` : '<span class="text-slate-300">-</span>'}</td>
        <td class="num" data-k="kmr">${fVol(kK)}</td>
        <td class="bg-sky-50/60"><input type="number" inputmode="decimal" step="any" min="0" class="inp-vol" data-id="${it.id}" value="${e && e.volume ? e.volume : ''}" placeholder="0">
          ${lain > 0 ? `<div class="mt-0.5 text-[10px] text-slate-500">+${fVol(lain)} entri lain</div>` : ''}</td>
        <td class="num font-semibold" data-k="kum">${fVol(kT)}</td>
        <td data-k="pct"><div class="flex items-center gap-2">${bar(Math.min(pc, 1), lebih ? 'bg-red-500' : 'bg-emerald-500')}<span class="w-12 text-right text-xs tabular-nums">${fPct(pc, 1)}</span></div>${lebih ? '<div class="text-[10px] font-semibold text-red-600">Melebihi vol. kontrak</div>' : ''}</td>
        <td class="text-center"><button type="button" class="btn-ikon" data-aksi="isu-item" data-id="${it.id}" title="Catat kendala untuk item ini">⚠</button></td>
      </tr>`;
    }
    if (!items.length) html += `<tr><td colspan="11" class="py-8 text-center text-slate-400">Tidak ada item sesuai filter.</td></tr>`;
    html += `</tbody></table></div>
    <p class="mt-2 text-xs text-slate-500">Tips: ketik volume lalu tekan <kbd>Enter</kbd> untuk lanjut ke item berikutnya. Data tersimpan otomatis. Klik angka target untuk mengisi sesuai target harian.</p>`;
    return html;
  },
  pasangInput() {
    const ulang = () => { Store.simpanUI(); this.render(); const el = $('#inCari'); if (el && document.activeElement !== el && UI._fokusCari) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } };
    $('#inSbd').onchange = (e) => { UI.inSbd = e.target.value; ulang(); };
    $('#inDiv').onchange = (e) => { UI.inDiv = e.target.value; ulang(); };
    $('#inAktif').onchange = (e) => { UI.inAktif = e.target.checked; ulang(); };
    let t; $('#inCari').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { UI.inCari = e.target.value; UI._fokusCari = true; ulang(); UI._fokusCari = false; }, 250); };
    $$('.inp-vol').forEach((inp, i, all) => {
      inp.addEventListener('change', () => this.simpanVolume(inp));
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || (e.key === 'ArrowDown')) { e.preventDefault(); this.simpanVolume(inp); const n = all[i + 1]; if (n) { n.focus(); n.select(); } }
        if (e.key === 'ArrowUp') { e.preventDefault(); const n = all[i - 1]; if (n) { n.focus(); n.select(); } }
      });
      inp.addEventListener('focus', () => inp.select());
    });
  },
  simpanVolume(inp) {
    const itemId = inp.dataset.id, tgl = UI.tanggal, sbd = UI.inSbd, v = num(inp.value);
    if (v < 0) { toast('Volume tidak boleh negatif', true); inp.value = ''; return; }
    const id = idProgres(itemId, tgl, sbd);
    const ada = S.progress.find((p) => p.id === id);
    if ((ada ? ada.volume : 0) === v) return;
    const oleh = Server.user?.email || 'Aplikasi';
    if (v === 0) { S.progress = S.progress.filter((p) => p.id !== id); Server.catat('progress', 'hapus', { id }); }
    else {
      if (ada) { ada.volume = v; ada.updatedAt = new Date().toISOString(); ada.diinputOleh = oleh; }
      else S.progress.push({ id, itemId, tanggal: tgl, sbd, volume: v, diinputOleh: oleh, updatedAt: new Date().toISOString() });
      Server.catat('progress', 'upsert', S.progress.find((p) => p.id === id));
    }
    // Otomatis ubah status SBD dari BELUM MULAI → sesuai subbagian
    if (sbd && v > 0 && Server.boleh('wells')) {
      const w = Calc.idx.well.get(sbd), it = Calc.idx.item.get(itemId);
      if (w && w.status === 'BELUM MULAI') { w.status = /BOR/i.test(it?.subbagian || '') ? 'PENGEBORAN' : 'MOBILISASI'; Server.catat('wells', 'upsert', w); }
    }
    Store.simpan();
    // perbarui baris tanpa render ulang penuh (agar fokus input tetap)
    const it = Calc.idx.item.get(itemId), tr = inp.closest('tr');
    const kT = Calc.kum(itemId, tgl), pc = it.volume ? kT / it.volume : 0, lebih = kT > it.volume + 1e-9;
    tr.querySelector('[data-k="kum"]').textContent = fVol(kT);
    tr.querySelector('[data-k="pct"]').innerHTML = `<div class="flex items-center gap-2">${bar(Math.min(pc, 1), lebih ? 'bg-red-500' : 'bg-emerald-500')}<span class="w-12 text-right text-xs tabular-nums">${fPct(pc, 1)}</span></div>${lebih ? '<div class="text-[10px] font-semibold text-red-600">Melebihi vol. kontrak</div>' : ''}`;
    tr.classList.toggle('bg-red-50', lebih);
    tr.classList.add('baris-ok'); setTimeout(() => tr.classList.remove('baris-ok'), 700);
    if (lebih) toast(`Perhatian: kumulatif ${fVol(kT)} melebihi volume kontrak ${fVol(it.volume)} ${it.satuan}`, true);
    const pr = Calc.proyek(tgl);
    const info = $('#app p.text-xs'); if (info) info.innerHTML = `${fTglPanjang(tgl)} · ${S.items.filter((x) => Calc.hari(x.id, tgl) > 0).length} item terisi hari ini · Progres hari ini <b>+${fPct(pr.hariIni, 3)}</b> · Kumulatif <b>${fPct(pr.real)}</b>`;
  },

  /* ---------------- DAFTAR ISU ---------------- */
  isuTersaring() {
    const tgl = UI.tanggal, q = UI.isuCari.trim().toLowerCase();
    let d = S.dailyNotes.slice();
    if (UI.isuLingkup === 'aktif') d = d.filter((n) => n.status !== 'CLOSED');
    else if (UI.isuLingkup === 'hari') d = d.filter((n) => n.tanggal === tgl);
    else if (UI.isuLingkup === 'telat') d = d.filter((n) => Calc.terlambat(n, tgl));
    else if (UI.isuLingkup === 'selesai') d = d.filter((n) => n.status === 'CLOSED');
    if (UI.isuPrio) d = d.filter((n) => n.prioritas === UI.isuPrio);
    if (q) d = d.filter((n) => `${n.uraian} ${n.tindakLanjut} ${n.pic} ${n.kategori} ${namaItem(n.itemId)} ${namaSbd(n.sbd)}`.toLowerCase().includes(q));
    const urut = { KRITIS: 0, TINGGI: 1, SEDANG: 2, RENDAH: 3 };
    return d.sort((a, b) => (STATUS_ISU.indexOf(a.status) === 2) - (STATUS_ISU.indexOf(b.status) === 2) || urut[a.prioritas] - urut[b.prioritas] || (b.tanggal > a.tanggal ? 1 : -1));
  },
  isu() {
    const daftar = this.isuTersaring(), tgl = UI.tanggal;
    const hit = (f) => S.dailyNotes.filter(f).length;
    const lingkup = [['aktif', `Aktif (${hit((n) => n.status !== 'CLOSED')})`], ['hari', `Dicatat ${fTgl(tgl)} (${hit((n) => n.tanggal === tgl)})`], ['telat', `Lewat target (${hit((n) => Calc.terlambat(n, tgl))})`], ['selesai', `Selesai (${hit((n) => n.status === 'CLOSED')})`], ['semua', `Semua (${S.dailyNotes.length})`]];
    const tindakDiv = S.divisions.filter((d) => d.kendala || d.tindakLanjut);
    return `
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h2 class="text-lg font-bold">Daftar Isu / Permasalahan &amp; Action Plan</h2><p class="text-xs text-slate-500">Bahan rapat harian – urut prioritas &amp; keterlambatan</p></div>
      <div class="flex gap-2"><button type="button" class="btn-pri" data-aksi="isu-baru">+ Isu Baru</button>${tombolExcel('isu')}</div>
    </div>
    <div class="panel mb-3 flex flex-wrap items-center gap-2 p-3">
      <div class="flex flex-wrap gap-1">${lingkup.map(([k, l]) => `<button type="button" class="chip ${UI.isuLingkup === k ? 'aktif' : ''}" data-aksi="isu-lingkup" data-k="${k}">${l}</button>`).join('')}</div>
      <select id="isuPrio" class="ml-auto rounded-md border-slate-300 text-sm"><option value="">Semua prioritas</option>${opsi(PRIORITAS, UI.isuPrio)}</select>
      <input id="isuCari" type="search" placeholder="Cari isu, PIC, item…" value="${esc(UI.isuCari)}" class="w-56 rounded-md border-slate-300 text-sm">
    </div>
    <div class="panel overflow-x-auto"><table class="tbl">
      <thead><tr><th class="w-10">No</th><th>Tgl</th><th>Prioritas</th><th class="text-left">Permasalahan</th><th class="text-left">Lokasi / Item</th><th class="text-left">Tindak Lanjut</th><th>PIC</th><th>Target</th><th>Status</th><th class="w-24">Aksi</th></tr></thead>
      <tbody>${daftar.length ? daftar.map((n, i) => `<tr class="${Calc.terlambat(n, tgl) ? 'bg-red-50/70' : n.status === 'CLOSED' ? 'opacity-60' : ''}">
        <td class="text-center">${i + 1}</td><td class="whitespace-nowrap text-center text-xs">${fTgl(n.tanggal)}</td>
        <td class="text-center">${pilPrio(n.prioritas)}<div class="mt-0.5 text-[10px] text-slate-500">${esc(n.kategori)}</div></td>
        <td><div class="font-medium">${esc(n.uraian)}</div>${n.dampak ? `<div class="text-xs text-slate-500">Dampak: ${esc(n.dampak)}</div>` : ''}</td>
        <td class="text-xs">${n.sbd ? `<span class="pil pil-proses">${esc(namaSbd(n.sbd))}</span> ` : ''}${esc(namaItem(n.itemId) || namaDiv(n.divisionId))}</td>
        <td class="text-xs">${esc(n.tindakLanjut) || '<span class="text-slate-300">—</span>'}</td>
        <td class="text-center text-xs">${esc(n.pic) || '-'}</td>
        <td class="whitespace-nowrap text-center text-xs ${Calc.terlambat(n, tgl) ? 'font-bold text-red-600' : ''}">${fTgl(n.dueDate)}${Calc.terlambat(n, tgl) ? `<div>+${selisihHari(n.dueDate, tgl)} hr</div>` : ''}</td>
        <td class="text-center"><select class="sel-status rounded border-slate-300 py-0.5 text-xs" data-id="${n.id}">${opsi(STATUS_ISU, n.status)}</select></td>
        <td class="whitespace-nowrap text-center"><button type="button" class="btn-ikon" data-aksi="edit-isu" data-id="${n.id}" title="Ubah">✎</button>${Server.peran() === 'MANAJEMEN' ? `<button type="button" class="btn-ikon text-red-600" data-aksi="hapus-isu" data-id="${n.id}" title="Hapus">🗑</button>` : ''}</td>
      </tr>`).join('') : '<tr><td colspan="10" class="py-8 text-center text-slate-400">Tidak ada isu pada filter ini.</td></tr>'}</tbody>
    </table></div>
    ${tindakDiv.length ? `<section class="panel mt-4"><div class="panel-head"><h3>Action Plan per Divisi (dari data proyek)</h3></div>
      <div class="overflow-x-auto"><table class="tbl"><thead><tr><th class="text-left">Divisi</th><th class="text-left">Kendala</th><th class="text-left">Tindak Lanjut</th><th>PIC</th><th>Due</th><th>Status</th></tr></thead>
      <tbody>${tindakDiv.map((d) => `<tr><td>${esc(d.kode)}. ${esc(d.nama)}</td><td>${esc(d.kendala)}</td><td>${esc(d.tindakLanjut)}</td><td class="text-center">${esc(d.pic)}</td><td class="text-center">${fTgl(d.dueDate)}</td><td class="text-center">${esc(d.statusAction)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  },

  /* ---------------- SBD WELLS ---------------- */
  wellsTersaring() { return S.wells.filter((w) => (!UI.sbdTim || w.tim === UI.sbdTim) && (!UI.sbdStatus || w.status === UI.sbdStatus)); },
  ringkasSbd(id, tgl) {
    let kedalaman = 0, terakhir = null;
    for (const p of S.progress) {
      if (p.sbd !== id || p.tanggal > tgl) continue;
      const it = Calc.idx.item.get(p.itemId);
      if (it && /pilot hole/i.test(it.uraian)) kedalaman += p.volume;
      if (!terakhir || p.tanggal > terakhir) terakhir = p.tanggal;
    }
    const isu = S.dailyNotes.filter((n) => n.sbd === id && n.status !== 'CLOSED').length;
    return { kedalaman, terakhir, isu };
  },
  sbd() {
    const tgl = UI.tanggal, daftar = this.wellsTersaring();
    const tims = [...new Set(S.wells.map((w) => w.tim).filter(Boolean))].sort();
    const warna = { 'BELUM MULAI': 'bg-slate-200 text-slate-700', SELESAI: 'bg-emerald-600 text-white', TERKENDALA: 'bg-red-600 text-white' };
    const hitung = STATUS_SBD.map((s) => [s, S.wells.filter((w) => w.status === s).length]);
    return `
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h2 class="text-lg font-bold">SBD Wells – Status per Sumur</h2><p class="text-xs text-slate-500">${S.wells.length} SBD · kedalaman bor dihitung dari entri “Pilot Hole” yang ditandai SBD</p></div>
      ${tombolExcel('sbd')}
    </div>
    <div class="mb-3 flex flex-wrap gap-1.5">${hitung.map(([s, n]) => `<button type="button" class="chip ${UI.sbdStatus === s ? 'aktif' : ''}" data-aksi="sbd-status" data-k="${s}">${s} <b class="ml-1">${n}</b></button>`).join('')}
      ${UI.sbdStatus ? '<button type="button" class="chip" data-aksi="sbd-status" data-k="">✕ reset</button>' : ''}
      <select id="sbdTim" class="ml-auto rounded-md border-slate-300 text-sm"><option value="">Semua tim</option>${opsi(tims, UI.sbdTim)}</select></div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      ${daftar.map((w) => {
        const r = this.ringkasSbd(w.id, tgl);
        return `<div class="panel p-3">
          <div class="flex items-start justify-between gap-2">
            <div><div class="text-base font-bold">${esc(w.sbd)}</div><div class="text-xs text-slate-500">${esc(w.kabupaten)} · ${esc(w.tanah)} · ${esc(w.rekomtek)}</div></div>
            <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold ${warna[w.status] || 'bg-sky-600 text-white'}">${esc(w.status)}</span>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="rounded bg-slate-50 p-1.5"><div class="text-slate-500">Kedalaman</div><div class="font-semibold tabular-nums">${fVol(r.kedalaman)} m</div></div>
            <div class="rounded bg-slate-50 p-1.5"><div class="text-slate-500">Entri terakhir</div><div class="font-semibold">${r.terakhir ? fTgl(r.terakhir) : '-'}</div></div>
            <div class="rounded ${r.isu ? 'bg-red-50 text-red-700' : 'bg-slate-50'} p-1.5"><div class="text-slate-500">Isu aktif</div><div class="font-semibold">${r.isu}</div></div>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <label class="fld"><span>Status</span><select class="sbd-fld" ${Server.boleh('wells') ? '' : 'disabled'} data-id="${w.id}" data-f="status">${opsi(STATUS_SBD, w.status)}</select></label>
            <label class="fld"><span>Tim</span><input class="sbd-fld" ${Server.boleh('wells') ? '' : 'disabled'} data-id="${w.id}" data-f="tim" value="${esc(w.tim)}"></label>
            <label class="fld col-span-2"><span>Vendor pemboran</span><input class="sbd-fld" ${Server.boleh('wells') ? '' : 'disabled'} data-id="${w.id}" data-f="vendorPemboran" value="${esc(w.vendorPemboran)}"></label>
            <label class="fld col-span-2"><span>Catatan</span><input class="sbd-fld" ${Server.boleh('wells') ? '' : 'disabled'} data-id="${w.id}" data-f="catatan" value="${esc(w.catatan)}" placeholder="mis. menunggu casing"></label>
          </div>
          <div class="mt-2 flex gap-2">
            <button type="button" class="btn-sec flex-1 text-xs" data-aksi="input-sbd" data-id="${w.id}">✏️ Input progres SBD</button>
            <button type="button" class="btn-sec text-xs" data-aksi="detail-sbd" data-id="${w.id}">Detail</button>
            <button type="button" class="btn-sec text-xs" data-aksi="isu-sbd" data-id="${w.id}" title="Catat isu">⚠</button>
          </div>
        </div>`;
      }).join('') || '<div class="col-span-full p-8 text-center text-slate-400">Tidak ada SBD.</div>'}
    </div>`;
  },

  /* ---------------- PENGADAAN ---------------- */
  ringkasPengadaan(p, tgl) {
    const it = Calc.idx.item.get(p.itemId);
    const vol = it ? it.volume : 0, terpasang = it ? Calc.kum(it.id, tgl) : 0;
    const sisa = vol - terpasang - num(p.mos);
    return { it, sat: it ? it.satuan : '', vol, terpasang, sisa };
  },
  pengadaan() {
    const tgl = UI.tanggal;
    let kel = null;
    return `
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h2 class="text-lg font-bold">Monitoring Pengadaan Material</h2><p class="text-xs text-slate-500">Sisa kebutuhan = Volume kontrak − terpasang − material on site (MOS)</p></div>
      ${tombolExcel('pengadaan')}
    </div>
    <div class="panel overflow-x-auto"><table class="tbl">
      <thead><tr><th class="w-10">No</th><th class="text-left">Uraian Material</th><th>Sat</th><th>Vol Kontrak</th><th>Terpasang</th><th class="w-28">Stok 2026</th><th class="w-28">MOS</th><th>Sisa Kebutuhan</th><th class="text-left">Catatan</th></tr></thead>
      <tbody>${S.procurement.map((p, i) => {
        const r = this.ringkasPengadaan(p, tgl);
        let g = '';
        if (p.kelompok !== kel) { kel = p.kelompok; g = `<tr class="baris-div"><td colspan="9">${esc(kel)}</td></tr>`; }
        return `${g}<tr><td class="text-center">${i + 1}</td><td>${esc(p.uraian)}<div class="text-[10px] text-slate-400">${esc(p.itemId || '')}</div></td><td class="text-center">${esc(r.sat)}</td>
          <td class="num">${fVol(r.vol)}</td><td class="num">${fVol(r.terpasang)}</td>
          <td><input type="number" step="any" class="inp-vol pgd-fld" ${Server.boleh('procurement') ? '' : 'disabled'} data-id="${p.id}" data-f="stock2026" value="${p.stock2026 ?? ''}"></td>
          <td><input type="number" step="any" class="inp-vol pgd-fld" ${Server.boleh('procurement') ? '' : 'disabled'} data-id="${p.id}" data-f="mos" value="${p.mos ?? ''}"></td>
          <td class="num font-semibold ${r.sisa > 0 ? 'text-amber-700' : 'text-emerald-700'}">${fVol(r.sisa)}</td>
          <td><input class="pgd-fld w-full min-w-[160px] rounded border-slate-300 px-2 py-1 text-xs" ${Server.boleh('procurement') ? '' : 'disabled'} data-id="${p.id}" data-f="catatan" value="${esc(p.catatan)}"></td></tr>`;
      }).join('') || '<tr><td colspan="9" class="py-8 text-center text-slate-400">Belum ada data pengadaan.</td></tr>'}</tbody>
    </table></div>`;
  },
};

/* ============================ 6. MODAL & AKSI ============================ */
const Modal = {
  buka(judul, isi, aksi = []) {
    $('#modalJudul').textContent = judul; $('#modalIsi').innerHTML = isi;
    const box = $('#modalAksi'); box.innerHTML = '';
    aksi.forEach(([label, kelas, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = kelas; b.textContent = label; b.onclick = fn; box.appendChild(b); });
    const m = $('#modal'); m.classList.remove('hidden'); m.classList.add('flex');
    setTimeout(() => $('#modalIsi input, #modalIsi select, #modalIsi textarea')?.focus(), 30);
  },
  tutup() { const m = $('#modal'); m.classList.add('hidden'); m.classList.remove('flex'); },
};

function toast(msg, peringatan = false) {
  const t = $('#toast'); t.textContent = msg;
  t.classList.toggle('bg-red-700', peringatan); t.classList.toggle('bg-slate-900', !peringatan);
  t.style.opacity = '1'; clearTimeout(toast._t); toast._t = setTimeout(() => { t.style.opacity = '0'; }, peringatan ? 3800 : 2200);
}

function formIsu(n = {}) {
  const baru = !n.id;
  const d = { tanggal: UI.tanggal, prioritas: 'SEDANG', status: 'OPEN', kategori: 'Teknis', ...n };
  const itemsDiv = S.items.filter((i) => !d.divisionId || i.divisionId === d.divisionId);
  Modal.buka(baru ? 'Catat Isu / Permasalahan' : 'Ubah Isu', `
    <form id="fIsu" class="grid gap-3 sm:grid-cols-2">
      <label class="fld"><span>Tanggal dicatat</span><input name="tanggal" type="date" value="${esc(d.tanggal)}" required></label>
      <label class="fld"><span>Prioritas</span><select name="prioritas">${opsi(PRIORITAS, d.prioritas)}</select></label>
      <label class="fld"><span>Kategori</span><select name="kategori">${opsi(KATEGORI, d.kategori)}</select></label>
      <label class="fld"><span>SBD</span><select name="sbd"><option value="">—</option>${opsi(S.wells, d.sbd, (w) => w.sbd, (w) => w.id)}</select></label>
      <label class="fld"><span>Divisi</span><select name="divisionId" id="fIsuDiv"><option value="">—</option>${opsi(S.divisions, d.divisionId, (x) => `${x.kode}. ${x.nama}`, (x) => x.id)}</select></label>
      <label class="fld"><span>Item pekerjaan</span><select name="itemId" id="fIsuItem"><option value="">—</option>${opsi(itemsDiv, d.itemId, (x) => x.uraian.slice(0, 80), (x) => x.id)}</select></label>
      <label class="fld sm:col-span-2"><span>Uraian permasalahan *</span><textarea name="uraian" rows="2" required>${esc(d.uraian)}</textarea></label>
      <label class="fld sm:col-span-2"><span>Dampak (waktu / biaya / mutu / K3)</span><input name="dampak" value="${esc(d.dampak)}"></label>
      <label class="fld sm:col-span-2"><span>Tindak lanjut / action plan</span><textarea name="tindakLanjut" rows="2">${esc(d.tindakLanjut)}</textarea></label>
      <label class="fld"><span>PIC</span><input name="pic" value="${esc(d.pic)}"></label>
      <label class="fld"><span>Target selesai</span><input name="dueDate" type="date" value="${esc(d.dueDate || '')}"></label>
      <label class="fld"><span>Status</span><select name="status">${opsi(STATUS_ISU, d.status)}</select></label>
    </form>`, [
    ['Batal', 'btn-sec', Modal.tutup],
    [baru ? 'Simpan Isu' : 'Simpan Perubahan', 'btn-pri', () => {
      const f = $('#fIsu'); if (!f.reportValidity()) return;
      const v = Object.fromEntries(new FormData(f).entries());
      v.dueDate = v.dueDate || null;
      let rec;
      if (baru) { rec = { ...normalisasi({ dailyNotes: [v] }).dailyNotes[0], id: uid('ISU'), updatedAt: new Date().toISOString(), tanggalSelesai: v.status === 'CLOSED' ? UI.tanggal : null }; S.dailyNotes.push(rec); }
      else {
        rec = S.dailyNotes.find((y) => y.id === n.id);
        if (v.status === 'CLOSED' && rec.status !== 'CLOSED') v.tanggalSelesai = UI.tanggal;
        if (v.status !== 'CLOSED') v.tanggalSelesai = null;
        Object.assign(rec, v, { updatedAt: new Date().toISOString() });
      }
      Server.catat('dailyNotes', 'upsert', rec);
      Store.simpan(); Modal.tutup(); View.render(); toast('Isu tersimpan');
    }],
  ]);
  $('#fIsuDiv').onchange = (e) => {
    const its = S.items.filter((i) => !e.target.value || i.divisionId === e.target.value);
    $('#fIsuItem').innerHTML = `<option value="">—</option>${opsi(its, '', (x) => x.uraian.slice(0, 80), (x) => x.id)}`;
  };
}

function formPengaturan() {
  const p = S.project;
  const f = (k, l, t = 'text', cls = '') => `<label class="fld ${cls}"><span>${l}</span><input name="${k}" type="${t}" ${t === 'number' ? 'step="any"' : ''} value="${esc(p[k] ?? '')}"></label>`;
  Modal.buka('Data Proyek & Penandatangan Laporan', `
    <form id="fProj" class="grid gap-3 sm:grid-cols-2">
      ${f('nama', 'Nama monitoring / proyek', 'text', 'sm:col-span-2')}
      ${f('pekerjaan', 'Nama pekerjaan (kop laporan)', 'text', 'sm:col-span-2')}
      ${f('satker', 'Satuan kerja')}${f('sumberDana', 'Sumber dana')}
      ${f('lokasi', 'Lokasi', 'text', 'sm:col-span-2')}
      ${f('kontraktor', 'Kontraktor pelaksana')}${f('noKontrak', 'No. kontrak / SPK')}
      ${f('baselineMulai', 'Baseline mulai', 'date')}${f('baselineAkhir', 'Baseline akhir', 'date')}
      <label class="fld"><span>Target bobot s.d. akhir baseline (%)</span><input name="targetDesPct" type="number" step="any" value="${(num(p.targetDes) * 100).toFixed(2)}"></label>
      ${f('kotaTtd', 'Kota (tanda tangan)')}
      <div class="sm:col-span-2 mt-1 text-xs font-semibold uppercase text-slate-500">Penandatangan laporan Excel</div>
      ${f('ttdJab1', 'Jabatan – Dibuat oleh')}${f('ttdNama1', 'Nama – Dibuat oleh')}
      ${f('ttdJab2', 'Jabatan – Diperiksa oleh')}${f('ttdNama2', 'Nama – Diperiksa oleh')}
      ${f('ttdJab3', 'Jabatan – Disetujui oleh')}${f('ttdNama3', 'Nama – Disetujui oleh')}
    </form>
    <div class="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800 ${Server.aktif ? 'hidden' : ''}">Zona berbahaya: <button type="button" class="font-semibold underline" id="btnReset">Hapus semua data di browser ini</button> (ekspor JSON dulu sebagai cadangan).</div>`, [
    ['Batal', 'btn-sec', Modal.tutup],
    ['Simpan', 'btn-pri', () => {
      const v = Object.fromEntries(new FormData($('#fProj')).entries());
      v.targetDes = num(v.targetDesPct) / 100; delete v.targetDesPct;
      Object.assign(S.project, v); Server.catat('project', 'upsert', S.project); Store.simpan(); Modal.tutup(); View.render(); toast('Data proyek tersimpan');
    }],
  ]);
  if (Server.aktif) return;
  $('#btnReset').onclick = () => {
    if (!confirm('Hapus SEMUA data proyek, progres, dan isu dari browser ini?')) return;
    S = kosong(); Store.simpan(); Modal.tutup(); View.render(); toast('Data dihapus');
  };
}

function detailSbd(id) {
  const w = Calc.idx.well.get(id), tgl = UI.tanggal;
  const ent = S.progress.filter((p) => p.sbd === id && p.tanggal <= tgl).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  const perItem = new Map(); ent.forEach((p) => perItem.set(p.itemId, (perItem.get(p.itemId) || 0) + p.volume));
  Modal.buka(`Detail ${w.sbd}`, `
    <div class="text-xs text-slate-500">${esc(w.kabupaten)} · ${esc(w.tanah)} · ${esc(w.tim)} · ${esc(w.vendorPemboran)}</div>
    <h4 class="mt-3 text-sm font-semibold">Volume kumulatif per item (s.d. ${fTgl(tgl)})</h4>
    <table class="tbl mt-1"><thead><tr><th class="text-left">Item</th><th>Sat</th><th>Volume</th></tr></thead><tbody>
    ${[...perItem].map(([iid, v]) => `<tr><td>${esc(namaItem(iid))}</td><td class="text-center">${esc(Calc.idx.item.get(iid)?.satuan || '')}</td><td class="num">${fVol(v)}</td></tr>`).join('') || '<tr><td colspan="3" class="py-4 text-center text-slate-400">Belum ada entri.</td></tr>'}
    </tbody></table>
    <h4 class="mt-4 text-sm font-semibold">Riwayat entri harian</h4>
    <table class="tbl mt-1"><thead><tr><th>Tanggal</th><th class="text-left">Item</th><th>Volume</th></tr></thead><tbody>
    ${ent.slice(0, 60).map((p) => `<tr><td class="text-center">${fTgl(p.tanggal)}</td><td>${esc(namaItem(p.itemId))}</td><td class="num">${fVol(p.volume)}</td></tr>`).join('') || '<tr><td colspan="3" class="py-4 text-center text-slate-400">-</td></tr>'}
    </tbody></table>`, [['Tutup', 'btn-sec', Modal.tutup]]);
}

/* ---------- Impor JSON ---------- */
function prosesFileJson(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    let data;
    try { data = JSON.parse(rd.result); } catch (e) { toast('File bukan JSON yang valid: ' + e.message, true); return; }
    if (!data || typeof data !== 'object' || !['items', 'progress', 'dailyNotes', 'wells', 'divisions', 'procurement'].some((k) => Array.isArray(data[k]))) {
      toast('Struktur JSON tidak dikenali (butuh items / progress / wells …)', true); return;
    }
    const c = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
    const adaData = S.items.length > 0;
    Modal.buka('Impor Data JSON', `
      <div class="text-sm"><b>${esc(file.name)}</b>${data.jenis ? ` · <span class="pil pil-proses">${esc(data.jenis)}</span>` : ''}</div>
      ${data.project?.nama ? `<div class="mt-1 text-xs text-slate-500">${esc(data.project.nama)}</div>` : ''}
      <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
        ${['divisions', 'items', 'progress', 'dailyNotes', 'procurement', 'wells'].map((k) => `<div class="rounded bg-slate-100 p-2"><div class="text-slate-500">${k}</div><div class="text-base font-bold">${c(k)}</div></div>`).join('')}
      </div>
      <ul class="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-600">
        <li><b>Gabungkan (pembaruan)</b>: data dengan id sama diperbarui, data baru ditambahkan. Cocok untuk file update harian dari pengawas lapangan.</li>
        <li><b>Ganti seluruh data</b>: data di browser ini diganti total oleh isi file.</li>
      </ul>`, [
      ['Batal', 'btn-sec', Modal.tutup],
      ...(adaData ? [['Gabungkan (pembaruan)', 'btn-sec', () => kirimImpor(data, 'gabung')]] : []),
      ['Ganti seluruh data', 'btn-pri', () => {
        if (adaData && !confirm(Server.aktif ? 'Ganti SELURUH data di SERVER (semua staf) dengan isi file?' : 'Ganti seluruh data di browser ini dengan isi file?')) return;
        kirimImpor(data, 'ganti');
      }],
    ]);
  };
  rd.readAsText(file);
}

async function kirimImpor(data, mode) {
  if (!Server.aktif) {
    if (mode === 'ganti') S = normalisasi(data); else gabungData(data);
    Store.simpan(); Modal.tutup(); View.render(); toast(mode === 'ganti' ? 'Data berhasil dimuat' : 'Data digabungkan');
    return;
  }
  if (!navigator.onLine) { toast('Impor ke server butuh koneksi internet', true); return; }
  if (Server.antrean.length) await Server.sinkron({ diam: true });
  const box = $('#modalAksi'); $$('button', box).forEach((b) => { b.disabled = true; }); toast('Mengunggah ke server…');
  try {
    const r = await Server.impor(data, mode);
    Modal.tutup(); View.render();
    toast(`Impor ${mode} ke server berhasil: ${r.jumlah?.items ?? 0} item, ${r.jumlah?.progress ?? 0} progres`);
  } catch (e) { toast('Impor gagal: ' + e.message, true); $$('button', box).forEach((b) => { b.disabled = false; }); }
}

/* ---------- Data contoh (fiktif, untuk uji coba) ---------- */
function dataContoh() {
  const t = hariIni(), a = tambahHari(t, -7), b = tambahHari(t, 44);
  const divs = [['I', 'PEKERJAAN PERSIAPAN'], ['II', 'PENERAPAN SMKK'], ['III', 'PEMBORAN SUMUR PRODUKSI'], ['IV', 'PEKERJAAN TOWER BAJA']];
  const items = [
    ['DIV-01', '', 'Mobilisasi & demobilisasi', 'Ls', 1, 50000000], ['DIV-01', '', 'Stake out trase', 'm2', 4000, 5000],
    ['DIV-02', '', 'Alat pelindung diri (APD) lengkap', 'Set', 60, 450000], ['DIV-02', '', 'Safety talk / tool box meeting', 'Kali', 20, 350000],
    ['DIV-03', 'PENGEBORAN', 'Pengeboran pilot hole 8 3/4" – tanah sedang', 'm', 480, 650000], ['DIV-03', 'PENGEBORAN', 'Reaming 8 3/4" – 14 3/4"', 'm', 480, 640000],
    ['DIV-03', 'KONSTRUKSI', 'Pemasangan casing black steel 6"', 'm', 360, 620000], ['DIV-03', 'KONSTRUKSI', 'Gravel pack', 'm3', 24, 3100000],
    ['DIV-04', '', 'Pemasangan besi profil tower', 'kg', 9000, 25000], ['DIV-04', '', 'Beton fc 20 MPa pondasi tower', 'm3', 16, 1420000],
  ];
  const wells = ['SBD 01', 'SBD 02', 'SBD 03', 'SBD 04'].map((s, i) => ({ id: s.replace(' ', '-'), sbd: s, kabupaten: 'Contoh', tanah: 'Sedang padat', rekomtek: 'Rekomendasi', tim: `TIM ${1 + (i % 2)}`, vendorPemboran: 'Vendor Contoh', status: i === 0 ? 'PENGEBORAN' : 'BELUM MULAI', catatan: '' }));
  const progress = [];
  rentang(a, tambahHari(t, -1)).forEach((d, k) => {
    progress.push({ itemId: 'C05', tanggal: d, sbd: 'SBD-01', volume: 12 + (k % 3) * 2 });
    progress.push({ itemId: 'C02', tanggal: d, sbd: '', volume: 300 });
  });
  return {
    project: { nama: 'CONTOH – MONITORING PROGRES HARIAN (DATA FIKTIF)', pekerjaan: 'Pembangunan Jaringan Irigasi Air Tanah (contoh)', targetDes: 0.6, baselineMulai: a, baselineAkhir: b, kontraktor: 'Kontraktor Contoh' },
    divisions: divs.map(([k, n], i) => ({ id: `DIV-0${i + 1}`, no: i + 1, kode: k, nama: n })),
    items: items.map(([dv, sb, u, s, v, h], i) => ({ id: `C${String(i + 1).padStart(2, '0')}`, divisionId: dv, subbagian: sb, uraian: u, satuan: s, volume: v, hargaNego: h, targetVolDes: v * 0.6 })),
    progress,
    dailyNotes: [{ id: 'ISU-C1', tanggal: tambahHari(t, -2), divisionId: 'DIV-03', itemId: 'C07', sbd: 'SBD-01', kategori: 'Material', prioritas: 'KRITIS', status: 'OPEN', uraian: 'Casing 6" belum tiba di lokasi', dampak: 'Konstruksi sumur tertunda ±3 hari', tindakLanjut: 'Percepat pengiriman dari supplier, konfirmasi jadwal truk', pic: 'Logistik', dueDate: tambahHari(t, -1) }],
    procurement: [{ id: 'PGD-C1', kelompok: 'A. Pemboran', uraian: 'Casing pipa black steel 6"', itemId: 'C07', stock2026: 120, mos: 40, catatan: '' }],
    wells,
  };
}

/* ---------- Event global ---------- */
function pasangEvent() {
  $('#tanggalGlobal').addEventListener('change', (e) => { if (e.target.value) { UI.tanggal = e.target.value; Store.simpanUI(); View.render(); } });
  $$('.mode-btn').forEach((b) => b.addEventListener('click', () => { UI.mode = b.dataset.mode; Store.simpanUI(); View.render(); toast(UI.mode === 'rapat' ? 'Mode Rapat Pelaksana: harga disembunyikan' : 'Mode Manajemen: data lengkap'); }));
  $('#nav').addEventListener('click', (e) => { const b = e.target.closest('.tab-btn'); if (b) { UI.tab = b.dataset.tab; Store.simpanUI(); View.render(); window.scrollTo(0, 0); } });
  $('#btnImpor').addEventListener('click', () => $('#fileJson').click());
  $('#fileJson').addEventListener('change', (e) => { prosesFileJson(e.target.files[0]); e.target.value = ''; });
  $('#btnEkspor').addEventListener('click', (e) => { e.stopPropagation(); $('#menuEkspor').classList.toggle('hidden'); });
  $('#menuEkspor').addEventListener('click', (e) => { const b = e.target.closest('[data-ekspor]'); if (!b) return; $('#menuEkspor').classList.add('hidden'); if (!S.items.length && b.dataset.ekspor === 'penuh') { toast('Belum ada data', true); return; } eksporJson(b.dataset.ekspor); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#menuEkspor') && !e.target.closest('#btnEkspor')) $('#menuEkspor').classList.add('hidden'); });
  $('#btnPengaturan').addEventListener('click', formPengaturan);
  $('#statusSinkron').addEventListener('click', () => Server.sinkron({ penuh: false }));
  $('#btnKeluar').addEventListener('click', async () => { if (await Server.keluar()) { View.render(); toast('Anda telah keluar'); } });
  $('#modalTutup').addEventListener('click', Modal.tutup);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') Modal.tutup(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') Modal.tutup(); });

  // drag & drop JSON
  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) prosesFileJson(f); });

  // Delegasi aksi di area utama
  $('#app').addEventListener('click', (e) => {
    const xl = e.target.closest('[data-excel]');
    if (xl) { try { Ekspor[xl.dataset.excel](); } catch (err) { console.error(err); toast('Gagal membuat Excel: ' + err.message, true); } return; }
    const b = e.target.closest('[data-aksi]'); if (!b) return;
    const id = b.dataset.id;
    switch (b.dataset.aksi) {
      case 'impor': $('#fileJson').click(); break;
      case 'sinkron': Server.sinkron({ penuh: true }); break;
      case 'demo': S = normalisasi(dataContoh()); Store.simpan(); View.render(); toast('Data contoh dimuat'); break;
      case 'tab': UI.tab = b.dataset.ke; Store.simpanUI(); View.render(); break;
      case 'geser-tgl': UI.tanggal = tambahHari(UI.tanggal, +b.dataset.n); Store.simpanUI(); View.render(); break;
      case 'isi-target': {
        const inp = $(`.inp-vol[data-id="${id}"]`); const it = Calc.idx.item.get(id);
        const lain = Calc.hari(id, UI.tanggal) - (Calc.entri(id, UI.tanggal, UI.inSbd)?.volume || 0);
        inp.value = +Math.max(Calc.targetHarian(it, UI.tanggal) - lain, 0).toFixed(3); View.simpanVolume(inp); break;
      }
      case 'isu-baru': formIsu(); break;
      case 'isu-item': { const it = Calc.idx.item.get(id); formIsu({ itemId: id, divisionId: it.divisionId, sbd: UI.inSbd }); break; }
      case 'isu-sbd': formIsu({ sbd: id, divisionId: S.divisions.find((d) => /PEMBORAN/i.test(d.nama))?.id || '' }); break;
      case 'edit-isu': formIsu(S.dailyNotes.find((n) => n.id === id)); break;
      case 'hapus-isu': if (confirm('Hapus isu ini?')) { S.dailyNotes = S.dailyNotes.filter((n) => n.id !== id); Server.catat('dailyNotes', 'hapus', { id }); Store.simpan(); View.render(); } break;
      case 'isu-lingkup': UI.isuLingkup = b.dataset.k; Store.simpanUI(); View.render(); break;
      case 'dash-filter': UI.dashFilter = b.dataset.k; UI.dashSemua = false; Store.simpanUI(); View.render(); break;
      case 'dash-semua': UI.dashSemua = !UI.dashSemua; Store.simpanUI(); View.render(); break;
      case 'sbd-status': UI.sbdStatus = b.dataset.k; Store.simpanUI(); View.render(); break;
      case 'input-sbd': UI.inSbd = id; UI.inDiv = S.divisions.find((d) => /PEMBORAN/i.test(d.nama))?.id || ''; UI.tab = 'input'; Store.simpanUI(); View.render(); break;
      case 'detail-sbd': detailSbd(id); break;
      default: break;
    }
  });
  $('#app').addEventListener('change', (e) => {
    const el = e.target;
    if (el.classList.contains('sel-status')) {
      const n = S.dailyNotes.find((x) => x.id === el.dataset.id);
      if (n) { n.status = el.value; n.tanggalSelesai = el.value === 'CLOSED' ? UI.tanggal : null; n.updatedAt = new Date().toISOString(); Server.catat('dailyNotes', 'upsert', n); Store.simpan(); View.render(); toast('Status isu diperbarui'); }
    } else if (el.classList.contains('sbd-fld')) {
      const w = Calc.idx.well.get(el.dataset.id); if (w) { w[el.dataset.f] = el.value; Server.catat('wells', 'upsert', w); Store.simpan(); if (el.dataset.f === 'status') View.render(); toast(`${w.sbd} diperbarui`); }
    } else if (el.classList.contains('pgd-fld')) {
      const p = S.procurement.find((x) => x.id === el.dataset.id);
      if (p) { p[el.dataset.f] = el.dataset.f === 'catatan' ? el.value : (el.value === '' ? null : num(el.value)); Server.catat('procurement', 'upsert', p); Store.simpan(); View.render(); }
    } else if (el.id === 'isuPrio') { UI.isuPrio = el.value; Store.simpanUI(); View.render(); }
    else if (el.id === 'sbdTim') { UI.sbdTim = el.value; Store.simpanUI(); View.render(); }
  });
  let tc; $('#app').addEventListener('input', (e) => {
    if (e.target.id !== 'isuCari') return;
    clearTimeout(tc); tc = setTimeout(() => { UI.isuCari = e.target.value; View.render(); const el = $('#isuCari'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 300);
  });
}

/* ---------- Boot ---------- */
Store.muat();
pasangEvent();
Server.init();
View.render();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker gagal:', e));
}
