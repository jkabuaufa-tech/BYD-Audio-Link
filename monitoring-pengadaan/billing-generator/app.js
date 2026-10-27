/**
 * JICT Priuk – Dokumen Kontrak & Tagihan Assistant
 * Format baku (BOQ, PPN, terbilang, TTD) + riwayat update (BAPM/BAPP/BAPSA) per dokumen.
 * Data persistence: IndexedDB (lokal di browser) + backup/restore JSON.
 */

// Versi kode ini. Naikkan setiap rilis; paket pembaruan dibuat dengan alat/buat-pembaruan.py
const APP_VERSION = '1.2.0';
const UPDATE_FORMAT = 'jict-kontrak-pembaruan';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Konstanta =====
const DOC_TYPES = [
  { code: 'SPK', label: 'SPK – Surat Perintah Kerja', title: 'SURAT PERINTAH KERJA' },
  { code: 'SPP', label: 'SPP – Surat Perjanjian Pekerjaan / Kontrak', title: 'SURAT PERJANJIAN PEKERJAAN' },
  { code: 'ADD', label: 'Addendum Kontrak', title: 'ADDENDUM KONTRAK' },
  { code: 'BAK', label: 'BA Klarifikasi & Negosiasi', title: 'BERITA ACARA KLARIFIKASI DAN NEGOSIASI' },
  { code: 'BAPP', label: 'BAPP – Berita Acara Prestasi Pekerjaan', title: 'BERITA ACARA PRESTASI PEKERJAAN' },
  { code: 'BAPM', label: 'BAPM – Berita Acara Penerimaan Material', title: 'BERITA ACARA PENERIMAAN MATERIAL' },
  { code: 'BAPSA', label: 'BAPSA', title: 'BAPSA' },
  { code: 'PO', label: 'PO / Order Pembelian', title: 'PURCHASE ORDER' },
  { code: 'Invoice', label: 'Invoice / Tagihan', title: 'TAGIHAN / INVOICE' },
  { code: 'SPJ', label: 'SPJ / Laporan Penerimaan', title: 'SURAT PERTANGGUNGJAWABAN' },
  { code: 'Lainnya', label: 'Lainnya', title: 'DOKUMEN' },
];
const UPDATE_PARTIES = ['BAPM', 'BAPP', 'BAPSA', 'BA Klarifikasi', 'Addendum', 'Tagihan', 'Pembayaran', 'Lainnya'];
const MAX_FILE = 10 * 1024 * 1024;

// Struktur master mengikuti format master service SAP (Kode, Deskripsi, Satuan, Material Group, Kategori, Paket).
// `guess` = judul kolom Excel yang dikenali otomatis saat import (dicocokkan persis dulu, lalu sebagian).
// `table` = tampil sebagai kolom di tabel master.
const MASTER_FIELDS = {
  services: [
    { key: 'code', label: 'Kode Item Service', table: true, guess: ['kode item service', 'kode item', 'kode service', 'kode'] },
    { key: 'name', label: 'Item Pekerjaan (Deskripsi)', required: true, table: true, guess: ['item pekerjaan (deskripsi)', 'item pekerjaan', 'deskripsi', 'description', 'uraian', 'nama'] },
    { key: 'unit', label: 'Satuan', table: true, guess: ['satuan', 'base unit of measure', 'uom', 'unit'] },
    { key: 'group', label: 'Material Group', table: true, guess: ['material group', 'mat group', 'mat. group'] },
    { key: 'category', label: 'Kategori', table: true, guess: ['kategori', 'category'] },
    { key: 'paket', label: 'Paket Pengadaan', table: true, guess: ['pkt pengadaan', 'paket pengadaan', 'paket'] },
    { key: 'serviceCat', label: 'Service Cat.', guess: ['service cat.', 'service cat', 'service category'] },
    { key: 'price', label: 'Harga Satuan (Rp)', type: 'number', table: true, guess: ['harga satuan', 'harga', 'price'] },
  ],
  materials: [
    { key: 'code', label: 'Kode Material', table: true, guess: ['material', 'kode material', 'kode item', 'kode'] },
    { key: 'name', label: 'Deskripsi Material', required: true, table: true, guess: ['material description', 'deskripsi material', 'item pekerjaan (deskripsi)', 'deskripsi', 'description', 'nama material', 'uraian'] },
    { key: 'unit', label: 'Satuan', table: true, guess: ['base unit of measure', 'satuan', 'uom', 'unit'] },
    { key: 'group', label: 'Material Group', table: true, guess: ['material group', 'mat group', 'mat. group'] },
    { key: 'category', label: 'Kategori', table: true, guess: ['kategori', 'category'] },
    { key: 'paket', label: 'Paket Pengadaan', table: true, guess: ['paket pengadaan', 'pkt pengadaan', 'paket'] },
    { key: 'price', label: 'Harga Satuan (Rp)', type: 'number', table: true, guess: ['price', 'harga satuan', 'harga'] },
  ],
  vendors: [
    { key: 'code', label: 'ID Vendor (BP No)', table: true, guess: ['bp no', 'id vendor', 'kode vendor', 'vendor id', 'kode'] },
    { key: 'name', label: 'Nama Vendor', required: true, table: true, guess: ['name org', 'nama vendor', 'nama perusahaan', 'nama', 'name'] },
    { key: 'group', label: 'Kode Jenis Usaha', guess: ['jenis usaha', 'kode jenis usaha'] },
    { key: 'category', label: 'Bidang Usaha', table: true, guess: ['description', 'bidang usaha', 'kategori', 'keterangan'] },
    { key: 'address', label: 'Alamat', guess: ['street', 'alamat', 'address'] },
    { key: 'houseNo', label: 'No. Bangunan', guess: ['house no', 'no rumah', 'nomor'] },
    { key: 'city', label: 'Kota', table: true, guess: ['city', 'kota'] },
    { key: 'postCode', label: 'Kode Pos', guess: ['post code', 'kode pos', 'postcode'] },
    { key: 'npwp', label: 'NPWP', table: true, guess: ['tax no', 'npwp'] },
    { key: 'phone', label: 'Telepon', table: true, guess: ['telp no', 'telepon', 'telp', 'phone'] },
    { key: 'mobile', label: 'HP', guess: ['mobile no', 'hp', 'mobile'] },
    { key: 'email', label: 'Email', table: true, guess: ['email', 'e-mail'] },
    { key: 'block', label: 'Blokir (X = diblokir)', table: true, guess: ['block mm', 'blokir', 'block'] },
  ],
};
const MASTER_LABEL = { vendors: 'Vendor', materials: 'Material', services: 'Service' };
const MASTER_PAGE = 50;

const DEFAULT_SETTINGS = {
  company: 'PT WASKITA KARYA (Persero) Tbk',
  project: 'JICT Priuk – Perkuatan Dermaga Barat T1',
  projectCode: 'JICT-DB',
  address: 'Tanjung Priok, Jakarta Utara',
  sign1Name: '', sign1Title: 'Site Engineer / Quantity Surveyor',
  sign2Name: '', sign2Title: 'Site Manager',
  sign3Name: '', sign3Title: 'Project Manager',
  vendorSign: true,
};

// ===== Format helpers =====
function formatIdp(amount) {
  const num = Number(amount);
  if (!isFinite(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatNum(n) {
  const num = Number(n);
  if (!isFinite(num)) return '0';
  return num.toLocaleString('id-ID', { maximumFractionDigits: 3 });
}

function pad(n, len = 2) { return String(n).padStart(len, '0'); }

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function formatDateStr(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getStatusBadge(status) {
  const map = { 'Draft': 'badge-draft', 'Dibuat': 'badge-dibuat', 'Dipublikasikan': 'badge-publikasi', 'Selesai': 'badge-selesai' };
  return map[status] || 'badge-draft';
}

function getCategoryLabel(cat) {
  const map = { 'Subkon': 'Subkontraktor', 'Bahan': 'Bahan', 'Alat': 'Alat & Perlengkapan' };
  return map[cat] || cat || '—';
}

function getDocType(code) {
  return DOC_TYPES.find(t => t.code === code) || { code, label: code, title: String(code || 'DOKUMEN').toUpperCase() };
}

function toRoman(n) {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] || '';
}

function terbilang(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  const s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  const t = (x) => {
    if (x < 12) return s[x];
    if (x < 20) return t(x - 10) + ' belas';
    if (x < 100) return t(Math.floor(x / 10)) + ' puluh ' + t(x % 10);
    if (x < 200) return 'seratus ' + t(x - 100);
    if (x < 1000) return t(Math.floor(x / 100)) + ' ratus ' + t(x % 100);
    if (x < 2000) return 'seribu ' + t(x - 1000);
    if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu ' + t(x % 1000);
    if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta ' + t(x % 1e6);
    if (x < 1e12) return t(Math.floor(x / 1e9)) + ' miliar ' + t(x % 1e9);
    return t(Math.floor(x / 1e12)) + ' triliun ' + t(x % 1e12);
  };
  if (n === 0) return 'nol';
  return t(n).replace(/\s+/g, ' ').trim();
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(msg, type = 'ok') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type === 'error' ? 'toast-error' : '');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ===== Storage (IndexedDB) =====
const DB_NAME = 'JICT_Priuk_DB';
const DB_VERSION = 3;
const STORE = 'documents';
const OLD_MASTER_STORE = 'masterData';
const ITEM_STORE = 'masterItems';
const SETTINGS_STORE = 'settings';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
      if (!db.objectStoreNames.contains(ITEM_STORE)) {
        const items = db.createObjectStore(ITEM_STORE, { keyPath: 'uid' });
        items.createIndex('type', 'type');
        // Pindahkan master versi lama (satu record besar) ke store per-item
        if (db.objectStoreNames.contains(OLD_MASTER_STORE)) {
          const r = req.transaction.objectStore(OLD_MASTER_STORE).get('master');
          r.onsuccess = () => {
            const m = r.result || {};
            ['vendors', 'materials', 'services'].forEach(type => {
              (m[type] || []).filter(x => x && x.name).forEach(x => {
                items.put(toDbItem(makeMasterItem(type, { ...x, price: x.price ?? x.haran ?? x.estimateRate ?? '' })));
              });
            });
            db.deleteObjectStore(OLD_MASTER_STORE);
          };
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => alert('Tutup tab lain aplikasi ini lalu muat ulang halaman.');
  });
  return dbPromise;
}

async function dbRequest(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    let result;
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || req?.error);
    tx.onabort = () => reject(tx.error || new Error('Transaksi dibatalkan (kemungkinan penyimpanan penuh)'));
  });
}

const dbGetAll = () => dbRequest(STORE, 'readonly', s => s.getAll());
const dbPut = (doc) => dbRequest(STORE, 'readwrite', s => s.put(doc));
const dbDelete = (id) => dbRequest(STORE, 'readwrite', s => s.delete(id));
const dbGetSettings = () => dbRequest(SETTINGS_STORE, 'readonly', s => s.get('app'));
const dbPutSettings = (v) => dbRequest(SETTINGS_STORE, 'readwrite', s => s.put(v, 'app'));
const dbGetMasterItems = () => dbRequest(ITEM_STORE, 'readonly', s => s.getAll());
const dbPutMasterItems = (items) => dbRequest(ITEM_STORE, 'readwrite', s => { items.forEach(it => s.put(toDbItem(it))); });
const dbDeleteMasterItems = (uids) => dbRequest(ITEM_STORE, 'readwrite', s => { uids.forEach(u => s.delete(u)); });

// ===== State =====
let documents = [];
let filteredDocs = [];
let masterData = { vendors: [], materials: [], services: [] };
let settings = { ...DEFAULT_SETTINGS };
let currentMasterTab = 'services';
let masterPage = 0;

// ===== Normalisasi data lama =====
function normalizeDoc(d) {
  if (!Array.isArray(d.items)) {
    d.items = [];
    if (d.itemDescription || d.unitPrice || d.itemQty) {
      d.items.push({ desc: d.itemDescription || '', unit: '', qty: Number(d.itemQty) || 0, price: Number(d.unitPrice) || 0 });
    }
  }
  if (!Array.isArray(d.updates)) d.updates = [];
  if (d.ppnRate === undefined) d.ppnRate = 11;
  return d;
}

// Bentuk item master baku: hanya field yang dikenal + type + uid
function makeMasterItem(type, src) {
  const item = { type, uid: src.uid || `${type}:${src.code ? String(src.code).trim() : genId('m')}` };
  MASTER_FIELDS[type].forEach(f => {
    let v = src[f.key];
    if (f.type === 'number') v = (v === '' || v === null || v === undefined || !isFinite(Number(v))) ? '' : Number(v);
    else v = v === null || v === undefined ? '' : String(v).trim();
    item[f.key] = v;
  });
  return item;
}

// Kolom bantu pencarian (_s) hanya di memori, tidak disimpan
function toDbItem(it) {
  const { _s, ...rest } = it;
  return rest;
}

function searchText(it) {
  if (!it._s) it._s = MASTER_FIELDS[it.type].map(f => it[f.key]).join(' ').toLowerCase();
  return it._s;
}

function vendorAddress(v) {
  return [v.address, v.houseNo ? 'No. ' + v.houseNo : '', v.city, v.postCode && v.postCode !== '99999' ? v.postCode : '']
    .filter(Boolean).join(', ');
}

function docTotals(doc) {
  const sub = (doc.items || []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
  const ppn = doc.ppnOn ? Math.round(sub * (Number(doc.ppnRate) || 0) / 100) : 0;
  return { sub, ppn, total: sub + ppn };
}

// ===== Render =====
async function render() {
  documents = (await dbGetAll()).map(normalizeDoc);
  refreshProjectOptions();
  applyFilters();
}

function refreshProjectOptions() {
  const projects = [...new Set([settings.project, ...documents.map(d => d.project)].filter(Boolean))].sort();
  const sel = $('#filterProject');
  const current = sel.value;
  sel.innerHTML = '<option value="all">Semua Proyek</option>' +
    projects.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  sel.value = projects.includes(current) ? current : 'all';
  $('#dlProjects').innerHTML = projects.map(p => `<option value="${escapeHtml(p)}">`).join('');
}

function applyFilters() {
  const search = $('#searchInput').value.trim().toLowerCase();
  const project = $('#filterProject').value;
  const category = $('#filterCategory').value;
  const type = $('#filterType').value;
  const status = $('#filterStatus').value;
  const dateFrom = $('#filterDateFrom').value;
  const dateTo = $('#filterDateTo').value;
  const updateSearch = $('#filterUpdateSearch').value.trim().toLowerCase();
  const sortBy = $('#sortBy').value;

  filteredDocs = documents.filter(d => {
    if (project !== 'all' && d.project !== project) return false;
    if (category !== 'all' && d.category !== category) return false;
    if (type !== 'all' && d.docType !== type) return false;
    if (status !== 'all' && d.status !== status) return false;
    if (dateFrom && (d.contractDate || '') < dateFrom) return false;
    if (dateTo && (d.contractDate || '') > dateTo) return false;
    if (search) {
      const hay = [d.docNo, d.refNo, d.project, d.vendor, d.docType, getDocType(d.docType).label, d.npwp, d.notes,
        ...(d.items || []).map(i => i.desc)].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (updateSearch) {
      const ok = (d.updates || []).some(u =>
        [u.description, u.party, u.notes, u.date].join(' ').toLowerCase().includes(updateSearch));
      if (!ok) return false;
    }
    return true;
  });

  const sorters = {
    dateDesc: (a, b) => (b.contractDate || '').localeCompare(a.contractDate || '') || (b.createdAt - a.createdAt),
    dateAsc: (a, b) => (a.contractDate || '').localeCompare(b.contractDate || '') || (a.createdAt - b.createdAt),
    valueDesc: (a, b) => docTotals(b).total - docTotals(a).total,
    updated: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  };
  filteredDocs.sort(sorters[sortBy] || sorters.dateDesc);

  $('#totalCount').textContent = filteredDocs.length;
  $('#totalAmount').textContent = formatIdp(filteredDocs.reduce((s, d) => s + docTotals(d).total, 0));
  $('#pendingCount').textContent = filteredDocs.filter(d => d.status !== 'Selesai').length;
  $('#vendorCount').textContent = new Set(filteredDocs.map(d => (d.vendor || '').trim().toLowerCase()).filter(Boolean)).size;

  const grid = $('#docGrid');
  if (filteredDocs.length === 0) {
    grid.innerHTML = '';
    $('#emptyState').style.display = 'block';
    const noDocs = documents.length === 0;
    $('#emptyTitle').textContent = noDocs ? 'Belum ada dokumen' : 'Tidak ada dokumen yang cocok';
    $('#emptyDesc').textContent = noDocs
      ? 'Silakan buat dokumen pertama Anda. Format mengikuti template baku JICT Priuk.'
      : 'Ubah kata kunci atau klik Reset pada filter.';
    return;
  }
  $('#emptyState').style.display = 'none';
  grid.innerHTML = filteredDocs.map(renderCard).join('');
}

function renderCard(doc) {
  const { total } = docTotals(doc);
  const lastUpdate = (doc.updates || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const firstItem = (doc.items || [])[0];
  const itemInfo = firstItem
    ? escapeHtml(firstItem.desc) + (doc.items.length > 1 ? ` <em>(+${doc.items.length - 1} item)</em>` : '')
    : '<em>Belum ada item</em>';
  const overdue = doc.dueDate && doc.status !== 'Selesai' && doc.dueDate < todayStr();
  return `
    <div class="doc-card" onclick="openPreview('${doc.id}')">
      <div class="doc-card-header">
        <div>
          <div class="doc-card-category">${escapeHtml(getDocType(doc.docType).label)} · ${escapeHtml(getCategoryLabel(doc.category))}</div>
          <div class="doc-card-title">${escapeHtml(doc.vendor)}</div>
          <div class="doc-card-no">${escapeHtml(doc.docNo || '—')}</div>
        </div>
        <span class="doc-card-badge ${getStatusBadge(doc.status)}">${escapeHtml(doc.status)}</span>
      </div>
      <div class="doc-card-body">
        <div class="doc-card-meta">📦 ${itemInfo}</div>
        <div class="doc-card-meta">📅 ${formatDateStr(doc.contractDate)}${doc.dueDate ? ` · ⏰ <span class="${overdue ? 'text-danger' : ''}">${formatDateStr(doc.dueDate)}${overdue ? ' (lewat)' : ''}</span>` : ''}</div>
        <div class="doc-card-total">${formatIdp(total)}${doc.ppnOn ? ' <small>incl. PPN</small>' : ''}</div>
        <div class="doc-card-meta muted">🔄 ${doc.updates.length} update${lastUpdate ? ` · terakhir: ${escapeHtml(lastUpdate.party)} ${escapeHtml(lastUpdate.date ? formatDateStr(lastUpdate.date) : '')}` : ''}</div>
        <div class="doc-card-actions">
          <button class="btn btn-sm" onclick="event.stopPropagation();openEdit('${doc.id}')">✏️ Edit</button>
          <button class="btn btn-sm" onclick="event.stopPropagation();duplicateDoc('${doc.id}')">⧉ Duplikat</button>
          <button class="btn btn-sm" onclick="event.stopPropagation();printDocument('${doc.id}')">🖨️ Cetak</button>
          <button class="btn btn-sm btn-danger-ghost" onclick="event.stopPropagation();deleteDoc('${doc.id}')">🗑️ Hapus</button>
        </div>
      </div>
    </div>
  `;
}

// ===== Item rows (BOQ) =====
function itemRowHtml(it = {}) {
  return `
    <tr class="item-row">
      <td class="row-no"></td>
      <td><input type="text" class="it-code" value="${escapeHtml(it.code)}" placeholder="Kode"></td>
      <td><input type="text" class="it-desc" data-ac="item" value="${escapeHtml(it.desc)}" placeholder="Ketik uraian / kode untuk cari di master" autocomplete="off"></td>
      <td><input type="text" class="it-unit" value="${escapeHtml(it.unit)}" placeholder="M3"></td>
      <td><input type="number" class="it-qty" value="${it.qty ?? ''}" min="0" step="any" oninput="recalcItems()"></td>
      <td><input type="number" class="it-price" value="${it.price ?? ''}" min="0" step="any" oninput="recalcItems()"></td>
      <td class="it-amount num">0</td>
      <td><button type="button" class="btn-remove" onclick="removeItemRow(this)" title="Hapus item">✕</button></td>
    </tr>`;
}

function renderItemRows(items) {
  $('#itemBody').innerHTML = (items.length ? items : [{}]).map(itemRowHtml).join('');
  recalcItems();
}

function addItemRow() {
  $('#itemBody').insertAdjacentHTML('beforeend', itemRowHtml());
  recalcItems();
  const rows = $$('#itemBody .item-row');
  rows[rows.length - 1].querySelector('.it-desc').focus();
}

function removeItemRow(btn) {
  btn.closest('tr').remove();
  if (!$('#itemBody .item-row')) addItemRow();
  recalcItems();
}

function getItemRows() {
  return [...$$('#itemBody .item-row')].map(tr => ({
    code: tr.querySelector('.it-code').value.trim(),
    desc: tr.querySelector('.it-desc').value.trim(),
    unit: tr.querySelector('.it-unit').value.trim(),
    qty: Number(tr.querySelector('.it-qty').value) || 0,
    price: Number(tr.querySelector('.it-price').value) || 0,
  })).filter(it => it.desc || it.qty || it.price);
}

function recalcItems() {
  let sub = 0;
  $$('#itemBody .item-row').forEach((tr, i) => {
    tr.querySelector('.row-no').textContent = i + 1;
    const amt = (Number(tr.querySelector('.it-qty').value) || 0) * (Number(tr.querySelector('.it-price').value) || 0);
    tr.querySelector('.it-amount').textContent = formatNum(Math.round(amt));
    sub += amt;
  });
  const t = docTotals({ items: [{ qty: 1, price: sub }], ppnOn: $('#docPpnOn').checked, ppnRate: $('#docPpnRate').value });
  $('#subTotal').textContent = formatIdp(t.sub);
  $('#ppnTotal').textContent = formatIdp(t.ppn);
  $('#grandTotal').textContent = formatIdp(t.total);
}

// ===== Auto-saran dari master (cepat untuk puluhan ribu data) =====
const ac = { input: null, results: [], idx: 0, timer: null };

function acSources(kind) {
  if (kind === 'vendor') return [masterData.vendors];
  const cat = $('#docCategory').value;
  if (cat === 'Subkon') return [masterData.services, masterData.materials];
  return [masterData.materials, masterData.services];
}

function acSearch(kind, q, limit = 30) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const exact = [], starts = [], other = [];
  for (const list of acSources(kind)) {
    for (const it of list) {
      const s = searchText(it);
      if (!tokens.every(t => s.includes(t))) continue;
      const name = (it.name || '').toLowerCase();
      if (it.code === q.trim() || name === q.trim().toLowerCase()) exact.push(it);
      else if (name.startsWith(tokens[0])) starts.push(it);
      else other.push(it);
      if (exact.length + starts.length >= limit) break;
    }
    if (exact.length + starts.length >= limit) break;
  }
  return [...exact, ...starts, ...other].slice(0, limit);
}

function acRender() {
  const box = $('#acBox');
  if (!ac.input || !ac.results.length) { box.style.display = 'none'; return; }
  const r = ac.input.getBoundingClientRect();
  box.style.left = r.left + 'px';
  box.style.top = (r.bottom + 2) + 'px';
  box.style.width = Math.max(r.width, 420) + 'px';
  box.innerHTML = ac.results.map((it, i) => {
    const tag = { vendors: 'VDR', materials: 'MAT', services: 'SRV' }[it.type];
    const meta = it.type === 'vendors'
      ? [it.code, it.city, it.category].filter(Boolean).join(' · ')
      : [it.code, it.unit, it.group, it.price ? formatIdp(it.price) : ''].filter(Boolean).join(' · ');
    return `<div class="ac-item ${i === ac.idx ? 'active' : ''}" data-i="${i}">
      <span class="ac-tag ac-${it.type}">${tag}</span>
      <div><div class="ac-name">${escapeHtml(it.name)}${it.block === 'X' ? ' <span class="ac-block">DIBLOKIR</span>' : ''}</div>
      <div class="ac-meta">${escapeHtml(meta)}</div></div></div>`;
  }).join('');
  box.style.display = 'block';
  box.querySelector('.ac-item.active')?.scrollIntoView({ block: 'nearest' });
}

function acClose() {
  ac.input = null; ac.results = [];
  $('#acBox').style.display = 'none';
}

function acPick(it) {
  const input = ac.input;
  acClose();
  if (!input || !it) return;
  if (input.dataset.ac === 'vendor') {
    $('#docVendor').value = it.name;
    $('#docVendorAddress').value = vendorAddress(it);
    $('#docNPWP').value = it.npwp || '';
    if (it.block === 'X') showToast('Perhatian: vendor ini berstatus DIBLOKIR (Block MM) di master.', 'error');
  } else {
    const tr = input.closest('tr');
    input.value = it.name;
    tr.querySelector('.it-code').value = it.code || '';
    if (it.unit) tr.querySelector('.it-unit').value = it.unit;
    const price = tr.querySelector('.it-price');
    if (!Number(price.value) && it.price) price.value = it.price;
    recalcItems();
    tr.querySelector('.it-qty').focus();
  }
}

document.addEventListener('input', (e) => {
  const input = e.target;
  if (!input.dataset?.ac) return;
  clearTimeout(ac.timer);
  ac.timer = setTimeout(() => {
    ac.input = input;
    ac.idx = 0;
    ac.results = input.value.trim().length >= 2 ? acSearch(input.dataset.ac, input.value) : [];
    acRender();
  }, 120);
});

document.addEventListener('keydown', (e) => {
  if (!ac.input || e.target !== ac.input || !ac.results.length) return;
  if (e.key === 'ArrowDown') { ac.idx = Math.min(ac.idx + 1, ac.results.length - 1); acRender(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { ac.idx = Math.max(ac.idx - 1, 0); acRender(); e.preventDefault(); }
  else if (e.key === 'Enter') { acPick(ac.results[ac.idx]); e.preventDefault(); }
  else if (e.key === 'Escape') { acClose(); e.stopPropagation(); }
}, true);

document.addEventListener('mousedown', (e) => {
  const item = e.target.closest?.('.ac-item');
  if (item) { e.preventDefault(); acPick(ac.results[Number(item.dataset.i)]); return; }
  if (e.target !== ac.input) acClose();
});

document.addEventListener('scroll', (e) => { if (ac.input && !e.target.closest?.('#acBox')) acRender(); }, true);

// ===== Update Log =====
function updateRowHtml(row = {}) {
  const party = row.party || 'BAPM';
  const parties = UPDATE_PARTIES.includes(party) ? UPDATE_PARTIES : [...UPDATE_PARTIES, party];
  return `
    <div class="update-row" data-update-id="${escapeHtml(row.id || genId('u'))}">
      <div class="field">
        <label>Tanggal</label>
        <input type="date" class="date-input" value="${escapeHtml(row.date || '')}">
      </div>
      <div class="field">
        <label>Jenis</label>
        <select class="party-input">${parties.map(p => `<option ${p === party ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}</select>
      </div>
      <div class="field" style="flex:2;">
        <label>Deskripsi Update</label>
        <input type="text" class="desc-input" value="${escapeHtml(row.description || '')}" placeholder="Contoh: BAPM tahap 2 diterima 50 m³, revisi harga, dsb">
      </div>
      <div class="field" style="flex:1;">
        <label>Catatan</label>
        <input type="text" class="notes-input" value="${escapeHtml(row.notes || '')}">
      </div>
      <button type="button" class="btn-remove" onclick="this.closest('.update-row').remove()" title="Hapus">✕</button>
    </div>`;
}

function renderUpdateRows(rows) {
  $('#updateList').innerHTML = rows.map(updateRowHtml).join('');
}

function addUpdateRow() {
  $('#updateList').insertAdjacentHTML('beforeend', updateRowHtml({ date: todayStr() }));
  const list = $('#updateList');
  list.scrollTop = list.scrollHeight;
}

function getUpdateRows() {
  return [...$$('#updateList .update-row')].map(el => ({
    id: el.dataset.updateId,
    date: el.querySelector('.date-input').value,
    party: el.querySelector('.party-input').value,
    description: el.querySelector('.desc-input').value.trim(),
    notes: el.querySelector('.notes-input').value.trim(),
  })).filter(r => r.description || r.notes);
}

// ===== Penomoran =====
function generateDocNo(type, date, excludeId) {
  const d = date ? new Date(date + 'T00:00:00') : new Date();
  const year = d.getFullYear();
  const sameType = documents.filter(x => x.id !== excludeId && x.docType === type && (x.contractDate || '').startsWith(String(year)));
  const seq = sameType.length + 1;
  const code = settings.projectCode ? '/' + settings.projectCode : '';
  return `${pad(seq, 3)}/${type}${code}/${toRoman(d.getMonth() + 1)}/${year}`;
}

function suggestDocNo(force) {
  if (!force && $('#docNo').value.trim()) return;
  $('#docNo').value = generateDocNo($('#docType').value, $('#docContractDate').value, $('#docId').value);
}

// ===== Create / Edit =====
function fillTypeSelects() {
  const opts = DOC_TYPES.map(t => `<option value="${t.code}">${escapeHtml(t.label)}</option>`).join('');
  $('#docType').innerHTML = opts;
  $('#filterType').innerHTML = '<option value="all">Semua Tipe Dokumen</option>' + opts;
}

function openCreate() {
  $('#docForm').reset();
  $('#docId').value = '';
  $('#modalTitle').textContent = 'Buat Dokumen';
  $('#docProject').value = settings.project || '';
  $('#docContractDate').value = todayStr();
  $('#docType').value = 'SPK';
  $('#docStatus').value = 'Draft';
  $('#docPpnOn').checked = true;
  $('#docPpnRate').value = 11;
  $('#currentAttachment').innerHTML = '';
  renderItemRows([]);
  renderUpdateRows([]);
  openOverlay('#modalOverlay');
  $('#docProject').focus();
}

function openEdit(id, asCopy) {
  const doc = documents.find(d => d.id === id);
  if (!doc) return;
  closePrint();
  $('#docForm').reset();
  $('#docId').value = asCopy ? '' : id;
  $('#modalTitle').textContent = asCopy ? 'Duplikat Dokumen' : 'Edit Dokumen';
  $('#docProject').value = doc.project || '';
  $('#docCategory').value = doc.category || 'Subkon';
  if (![...$('#docType').options].some(o => o.value === doc.docType)) {
    $('#docType').insertAdjacentHTML('beforeend', `<option value="${escapeHtml(doc.docType)}">${escapeHtml(doc.docType)}</option>`);
  }
  $('#docType').value = doc.docType || 'SPK';
  $('#docNo').value = asCopy ? '' : (doc.docNo || '');
  $('#docRefNo').value = doc.refNo || '';
  $('#docVendor').value = doc.vendor || '';
  $('#docContractDate').value = asCopy ? todayStr() : (doc.contractDate || '');
  $('#docDueDate').value = doc.dueDate || '';
  $('#docVendorAddress').value = doc.vendorAddress || '';
  $('#docNPWP').value = doc.npwp || '';
  $('#docNotes').value = doc.notes || '';
  $('#docStatus').value = asCopy ? 'Draft' : (doc.status || 'Draft');
  $('#docPpnOn').checked = !!doc.ppnOn;
  $('#docPpnRate').value = doc.ppnRate ?? 11;
  renderItemRows(doc.items.map(i => ({ ...i })));
  renderUpdateRows(asCopy ? [] : doc.updates);

  if (!asCopy && doc.attachmentName) {
    $('#currentAttachment').innerHTML = `Lampiran saat ini: <strong>${escapeHtml(doc.attachmentName)}</strong>
      <label class="inline-check"><input type="checkbox" id="removeAttachment"> hapus lampiran</label>`;
  } else {
    $('#currentAttachment').innerHTML = '';
  }
  if (asCopy) suggestDocNo(true);
  openOverlay('#modalOverlay');
}

function duplicateDoc(id) { openEdit(id, true); }

function closeModal() {
  closeOverlay('#modalOverlay');
}

// ===== Save =====
async function saveDocument(e) {
  e.preventDefault();
  const id = $('#docId').value;
  const file = $('#docFile').files[0];
  const items = getItemRows();

  if (items.length === 0) { showToast('Isi minimal 1 item / pekerjaan.', 'error'); return; }
  if (items.some(it => !it.desc)) { showToast('Uraian item tidak boleh kosong.', 'error'); return; }
  if (file && file.size > MAX_FILE) { showToast('Lampiran melebihi 10 MB.', 'error'); return; }

  const existing = id ? documents.find(d => d.id === id) : null;
  const now = Date.now();
  const doc = existing ? { ...existing } : { id: genId('d'), createdAt: now, attachmentData: null, attachmentName: null, attachmentType: null };

  Object.assign(doc, {
    project: $('#docProject').value.trim(),
    category: $('#docCategory').value,
    docType: $('#docType').value,
    docNo: $('#docNo').value.trim(),
    refNo: $('#docRefNo').value.trim(),
    vendor: $('#docVendor').value.trim(),
    vendorAddress: $('#docVendorAddress').value.trim(),
    npwp: $('#docNPWP').value.trim(),
    contractDate: $('#docContractDate').value,
    dueDate: $('#docDueDate').value,
    status: $('#docStatus').value,
    notes: $('#docNotes').value.trim(),
    items,
    ppnOn: $('#docPpnOn').checked,
    ppnRate: Number($('#docPpnRate').value) || 0,
    updates: getUpdateRows(),
    updatedAt: now,
  });
  if (!doc.docNo) doc.docNo = generateDocNo(doc.docType, doc.contractDate, doc.id);

  // Catat perubahan status & nilai otomatis di riwayat update
  if (existing) {
    const auto = [];
    if (existing.status !== doc.status) auto.push(`Status: ${existing.status} → ${doc.status}`);
    const before = docTotals(existing).total, after = docTotals(doc).total;
    if (before !== after) auto.push(`Nilai: ${formatIdp(before)} → ${formatIdp(after)}`);
    if (auto.length) doc.updates.push({ id: genId('u'), date: todayStr(), party: 'Lainnya', description: auto.join('; '), notes: 'otomatis' });
  }

  // Lampiran
  if ($('#removeAttachment')?.checked) {
    doc.attachmentData = doc.attachmentName = doc.attachmentType = null;
  }
  try {
    if (file) {
      doc.attachmentName = file.name;
      doc.attachmentType = file.type;
      doc.attachmentData = await readFileAsDataURL(file);
    }
    await dbPut(doc);
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
    return;
  }

  // Simpan vendor baru ke master otomatis
  if (doc.vendor && !masterData.vendors.some(v => (v.name || '').trim().toLowerCase() === doc.vendor.toLowerCase())) {
    const v = makeMasterItem('vendors', { name: doc.vendor, address: doc.vendorAddress, npwp: doc.npwp });
    masterData.vendors.push(v);
    await dbPutMasterItems([v]);
    renderMasterData();
  }

  closeModal();
  await render();
  showToast(existing ? 'Dokumen diperbarui.' : 'Dokumen tersimpan.');
}

// ===== Preview / Print =====
function buildPreviewHtml(doc) {
  const t = docTotals(doc);
  const type = getDocType(doc.docType);
  const hasCode = doc.items.some(it => it.code);
  const itemsHtml = doc.items.map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      ${hasCode ? `<td class="c">${escapeHtml(it.code)}</td>` : ''}
      <td>${escapeHtml(it.desc)}</td>
      <td class="c">${escapeHtml(it.unit)}</td>
      <td class="num">${formatNum(it.qty)}</td>
      <td class="num">${formatNum(Math.round(it.price))}</td>
      <td class="num">${formatNum(Math.round((Number(it.qty) || 0) * (Number(it.price) || 0)))}</td>
    </tr>`).join('');

  const updates = doc.updates.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const updatesHtml = updates.length
    ? `<table class="pv-table">
        <thead><tr><th style="width:36px;">No</th><th style="width:120px;">Tanggal</th><th style="width:110px;">Jenis</th><th>Deskripsi</th><th>Catatan</th></tr></thead>
        <tbody>${updates.map((u, i) => `<tr><td class="c">${i + 1}</td><td>${formatDateStr(u.date)}</td><td>${escapeHtml(u.party)}</td><td>${escapeHtml(u.description)}</td><td>${escapeHtml(u.notes)}</td></tr>`).join('')}</tbody>
      </table>`
    : '<p class="muted">Belum ada riwayat update.</p>';

  const signers = [
    { role: 'Dibuat oleh', name: settings.sign1Name, title: settings.sign1Title },
    { role: 'Diperiksa oleh', name: settings.sign2Name, title: settings.sign2Title },
    { role: 'Disetujui oleh', name: settings.sign3Name, title: settings.sign3Title },
  ].filter(s => s.name || s.title);
  if (settings.vendorSign) signers.unshift({ role: getCategoryLabel(doc.category), name: '', title: doc.vendor });
  const signHtml = signers.map(s => `
    <div class="pv-sign">
      <div>${escapeHtml(s.role)}</div>
      <div class="pv-sign-space"></div>
      <div class="pv-sign-name">${escapeHtml(s.name) || '(……………………………)'}</div>
      <div class="pv-sign-title">${escapeHtml(s.title)}</div>
    </div>`).join('');

  return `
    <div class="preview-doc">
      <div class="pv-kop">
        <div class="pv-company">${escapeHtml(settings.company)}</div>
        <div>Proyek: ${escapeHtml(doc.project)}</div>
        ${settings.address ? `<div class="muted">${escapeHtml(settings.address)}</div>` : ''}
      </div>
      <div class="pv-title">
        <h2>${escapeHtml(type.title)}</h2>
        <div>Nomor: ${escapeHtml(doc.docNo || '—')}</div>
      </div>

      <table class="pv-meta">
        <tr><td>Nama Vendor / Subkon</td><td>:</td><td><strong>${escapeHtml(doc.vendor)}</strong></td></tr>
        <tr><td>Alamat</td><td>:</td><td>${escapeHtml(doc.vendorAddress) || '—'}</td></tr>
        <tr><td>NPWP</td><td>:</td><td>${escapeHtml(doc.npwp) || '—'}</td></tr>
        <tr><td>Kategori</td><td>:</td><td>${escapeHtml(getCategoryLabel(doc.category))}</td></tr>
        <tr><td>Tanggal</td><td>:</td><td>${formatDateStr(doc.contractDate)}</td></tr>
        ${doc.refNo ? `<tr><td>No. Referensi</td><td>:</td><td>${escapeHtml(doc.refNo)}</td></tr>` : ''}
        ${doc.dueDate ? `<tr><td>Batas Waktu / Jatuh Tempo</td><td>:</td><td>${formatDateStr(doc.dueDate)}</td></tr>` : ''}
        <tr><td>Status</td><td>:</td><td>${escapeHtml(doc.status)}</td></tr>
      </table>

      <h4>A. Rincian Item / Pekerjaan</h4>
      <table class="pv-table">
        <thead><tr><th style="width:36px;">No</th>${hasCode ? '<th style="width:90px;">Kode</th>' : ''}<th>Uraian</th><th style="width:70px;">Satuan</th><th style="width:80px;">Volume</th><th style="width:130px;">Harga Satuan (Rp)</th><th style="width:140px;">Jumlah (Rp)</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr><td colspan="${hasCode ? 6 : 5}" class="num">Sub Total</td><td class="num">${formatNum(t.sub)}</td></tr>
          ${doc.ppnOn ? `<tr><td colspan="${hasCode ? 6 : 5}" class="num">PPN ${formatNum(doc.ppnRate)}%</td><td class="num">${formatNum(t.ppn)}</td></tr>` : ''}
          <tr class="pv-grand"><td colspan="${hasCode ? 6 : 5}" class="num">TOTAL</td><td class="num">${formatNum(t.total)}</td></tr>
        </tfoot>
      </table>
      <p class="pv-terbilang">Terbilang: <em>${capitalize(terbilang(t.total))} rupiah${doc.ppnOn ? ' (termasuk PPN)' : ' (belum termasuk PPN)'}</em></p>

      <h4>B. Riwayat Update</h4>
      ${updatesHtml}

      ${doc.notes ? `<h4>C. Catatan</h4><p class="pv-notes">${escapeHtml(doc.notes)}</p>` : ''}

      ${doc.attachmentName ? `<p class="no-print">📎 Lampiran: <a href="#" onclick="openAttachment('${doc.id}');return false;">${escapeHtml(doc.attachmentName)}</a></p>
        <p class="print-only">Lampiran: ${escapeHtml(doc.attachmentName)}</p>` : ''}

      <div class="pv-place">${escapeHtml(settings.address ? settings.address.split(',').pop().trim() : 'Jakarta')}, ${formatDateStr(doc.contractDate)}</div>
      <div class="pv-signs">${signHtml}</div>

      <div class="pv-footer no-print">Dibuat: ${formatDateTime(doc.createdAt)} · Diupdate: ${formatDateTime(doc.updatedAt)}</div>
    </div>`;
}

function openPreview(id) {
  const doc = documents.find(d => d.id === id);
  if (!doc) return;
  $('#printContent').innerHTML = buildPreviewHtml(doc);
  $('#printTitle').textContent = `${getDocType(doc.docType).code} – ${doc.vendor}`;
  $('#btnPreviewEdit').onclick = () => openEdit(id);
  openOverlay('#printOverlay');
}

function closePrint() { closeOverlay('#printOverlay'); }

function printDocument(id) {
  openPreview(id);
  setTimeout(() => window.print(), 150);
}

function openAttachment(id) {
  const doc = documents.find(d => d.id === id);
  if (!doc || !doc.attachmentData) return;
  fetch(doc.attachmentData).then(r => r.blob()).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    if (/pdf|image/.test(doc.attachmentType || '')) a.target = '_blank';
    else a.download = doc.attachmentName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

// ===== Delete =====
async function deleteDoc(id) {
  const doc = documents.find(d => d.id === id);
  if (!doc) return;
  if (!confirm(`Hapus dokumen ${doc.docNo || ''} (${doc.vendor})?\nData akan terhapus permanen.`)) return;
  await dbDelete(id);
  await render();
  showToast('Dokumen dihapus.');
}

// ===== Filters =====
function clearFilters() {
  ['#searchInput', '#filterDateFrom', '#filterDateTo', '#filterUpdateSearch'].forEach(s => { $(s).value = ''; });
  ['#filterProject', '#filterCategory', '#filterType', '#filterStatus'].forEach(s => { $(s).value = 'all'; });
  $('#sortBy').value = 'dateDesc';
  applyFilters();
}

// ===== Export Rekap Excel =====
function requireXLSX() {
  if (window.XLSX) return true;
  showToast('Library Excel belum termuat. Pastikan ada koneksi internet lalu muat ulang.', 'error');
  return false;
}

function exportRekapExcel() {
  closeMenu();
  if (!requireXLSX()) return;
  if (filteredDocs.length === 0) { showToast('Tidak ada dokumen untuk diexport.', 'error'); return; }
  const rekap = [['No', 'No. Dokumen', 'Tanggal', 'Tipe', 'Kategori', 'Proyek', 'Vendor', 'NPWP', 'No. Referensi',
    'Jatuh Tempo', 'Jumlah Item', 'Sub Total', 'PPN', 'Total', 'Status', 'Update Terakhir', 'Catatan']];
  const detail = [['No. Dokumen', 'Vendor', 'No', 'Kode', 'Uraian', 'Satuan', 'Volume', 'Harga Satuan', 'Jumlah']];
  const upd = [['No. Dokumen', 'Vendor', 'Tanggal', 'Jenis', 'Deskripsi', 'Catatan']];
  filteredDocs.forEach((d, i) => {
    const t = docTotals(d);
    const last = d.updates.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    rekap.push([i + 1, d.docNo, d.contractDate, getDocType(d.docType).label, getCategoryLabel(d.category), d.project, d.vendor,
      d.npwp, d.refNo || '', d.dueDate || '', d.items.length, t.sub, t.ppn, t.total, d.status,
      last ? `${last.date} ${last.party}: ${last.description}` : '', d.notes]);
    d.items.forEach((it, j) => detail.push([d.docNo, d.vendor, j + 1, it.code || '', it.desc, it.unit, it.qty, it.price, (Number(it.qty) || 0) * (Number(it.price) || 0)]));
    d.updates.forEach(u => upd.push([d.docNo, d.vendor, u.date, u.party, u.description, u.notes]));
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rekap), 'Rekap');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), 'Rincian Item');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(upd), 'Riwayat Update');
  XLSX.writeFile(wb, `Rekap_Dokumen_JICT_${todayStr()}.xlsx`);
}

// ===== Backup / Restore =====
async function backupData() {
  closeMenu();
  const data = { app: 'JICT_Priuk_Kontrak', version: 3, exportedAt: new Date().toISOString(),
    documents: await dbGetAll(), settings,
    master: Object.fromEntries(Object.entries(masterData).map(([k, list]) => [k, list.map(toDbItem)])) };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Backup_JICT_Kontrak_${todayStr()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  showToast(`Backup ${data.documents.length} dokumen diunduh.`);
}

async function restoreData(input) {
  closeMenu();
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch { showToast('File backup tidak valid.', 'error'); return; }
  if (!data || !Array.isArray(data.documents)) { showToast('File backup tidak dikenali.', 'error'); return; }
  if (!confirm(`Restore ${data.documents.length} dokumen dari backup ${data.exportedAt || ''}?\n` +
    'Dokumen dengan ID sama akan ditimpa; master data & pengaturan diganti dari backup.')) return;
  for (const d of data.documents) {
    if (d && d.id) await dbPut(normalizeDoc(d));
  }
  if (data.master) {
    for (const type of Object.keys(MASTER_FIELDS)) {
      if (!Array.isArray(data.master[type])) continue;
      await dbDeleteMasterItems(masterData[type].map(x => x.uid));
      const items = data.master[type].filter(x => x && x.name)
        .map(x => makeMasterItem(type, { ...x, price: x.price ?? x.haran ?? x.estimateRate ?? '' }));
      await dbPutMasterItems(items);
    }
    await loadMasterData();
  }
  if (data.settings) { settings = { ...DEFAULT_SETTINGS, ...data.settings }; await dbPutSettings(settings); applySettingsUI(); }
  renderMasterData();
  await render();
  showToast('Restore selesai.');
}

// ===== Settings =====
const SETTING_KEYS = ['company', 'project', 'projectCode', 'address', 'sign1Name', 'sign1Title', 'sign2Name', 'sign2Title', 'sign3Name', 'sign3Title'];

function settingInputId(k) { return '#set' + k.charAt(0).toUpperCase() + k.slice(1); }

function openSettings() {
  closeMenu();
  SETTING_KEYS.forEach(k => { $(settingInputId(k)).value = settings[k] || ''; });
  $('#setVendorSign').checked = !!settings.vendorSign;
  openOverlay('#settingsOverlay');
}

function closeSettings() { closeOverlay('#settingsOverlay'); }

async function saveSettings(e) {
  e.preventDefault();
  SETTING_KEYS.forEach(k => { settings[k] = $(settingInputId(k)).value.trim(); });
  settings.vendorSign = $('#setVendorSign').checked;
  await dbPutSettings(settings);
  applySettingsUI();
  refreshProjectOptions();
  closeSettings();
  showToast('Pengaturan tersimpan.');
}

function applySettingsUI() {
  $('#headerProject').textContent = settings.project || '';
}

// ===== Master Data =====
async function loadMasterData() {
  const all = await dbGetMasterItems();
  masterData = { vendors: [], materials: [], services: [] };
  all.forEach(it => { if (masterData[it.type]) masterData[it.type].push(it); });
  Object.values(masterData).forEach(list => list.sort((a, b) =>
    String(a.code || '').localeCompare(String(b.code || ''), 'id', { numeric: true }) || String(a.name).localeCompare(String(b.name))));
}

function switchMasterTab(tab) {
  currentMasterTab = tab;
  masterPage = 0;
  $$('.master-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderMasterData();
}

function onMasterSearch() {
  clearTimeout(onMasterSearch.timer);
  onMasterSearch.timer = setTimeout(() => { masterPage = 0; renderMasterData(); }, 200);
}

function changeMasterPage(delta) {
  masterPage += delta;
  renderMasterData();
}

function renderMasterData() {
  $('#countVendors').textContent = masterData.vendors.length.toLocaleString('id-ID');
  $('#countMaterials').textContent = masterData.materials.length.toLocaleString('id-ID');
  $('#countServices').textContent = masterData.services.length.toLocaleString('id-ID');

  const type = currentMasterTab;
  const cols = MASTER_FIELDS[type].filter(f => f.table);
  const tokens = ($('#masterSearch').value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = tokens.length
    ? masterData[type].filter(it => { const s = searchText(it); return tokens.every(t => s.includes(t)); })
    : masterData[type];

  const pages = Math.max(1, Math.ceil(rows.length / MASTER_PAGE));
  masterPage = Math.min(Math.max(0, masterPage), pages - 1);
  const start = masterPage * MASTER_PAGE;
  const pageRows = rows.slice(start, start + MASTER_PAGE);

  $('#masterPager').innerHTML = rows.length
    ? `<span>${(start + 1).toLocaleString('id-ID')}–${(start + pageRows.length).toLocaleString('id-ID')} dari ${rows.length.toLocaleString('id-ID')} data</span>
       <button class="btn btn-sm" onclick="changeMasterPage(-1)" ${masterPage === 0 ? 'disabled' : ''}>◀ Sebelumnya</button>
       <span>Hal. ${masterPage + 1} / ${pages}</span>
       <button class="btn btn-sm" onclick="changeMasterPage(1)" ${masterPage >= pages - 1 ? 'disabled' : ''}>Berikutnya ▶</button>`
    : '';

  const tbody = $('#masterTbody');
  if (rows.length === 0) {
    tbody.innerHTML = `<div class="master-empty"><div class="empty-icon">📦</div><p>${tokens.length
      ? 'Tidak ada data yang cocok.'
      : `Master ${MASTER_LABEL[type]} masih kosong. Klik “📥 Import Excel” atau “+ Tambah”.`}</p></div>`;
    return;
  }
  tbody.innerHTML = `<div class="table-scroll"><table class="master-table"><thead><tr>
      <th style="width:44px;">No</th>${cols.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}<th style="width:120px;">Aksi</th></tr></thead><tbody>
      ${pageRows.map((it, i) => `<tr data-uid="${escapeHtml(it.uid)}" class="${it.block === 'X' ? 'row-blocked' : ''}" title="Klik dua kali untuk edit">
        <td class="c muted">${(start + i + 1).toLocaleString('id-ID')}</td>
        ${cols.map(f => {
          const v = it[f.key];
          if (f.type === 'number') return `<td class="num">${v !== '' && v !== undefined ? formatIdp(v) : '<span class="muted">—</span>'}</td>`;
          if (f.key === 'block') return `<td class="c">${v === 'X' ? '<span class="badge-block">Blokir</span>' : ''}</td>`;
          return `<td${f.key === 'name' ? ' class="strong"' : ''}>${escapeHtml(v)}</td>`;
        }).join('')}
        <td><div class="master-item-actions">
          <button class="btn btn-sm" data-act="edit">✏️ Edit</button>
          <button class="btn btn-sm btn-danger-ghost" data-act="del" title="Hapus">✕</button>
        </div></td></tr>`).join('')}
    </tbody></table></div>`;
}

function findMaster(uid) {
  return masterData[currentMasterTab].find(x => x.uid === uid);
}

function onMasterTableClick(e) {
  const btn = e.target.closest('button[data-act]');
  const tr = e.target.closest('tr[data-uid]');
  if (!btn || !tr) return;
  if (btn.dataset.act === 'edit') openMasterForm(tr.dataset.uid);
  else if (btn.dataset.act === 'del') removeMasterRow(tr.dataset.uid);
}

function onMasterTableDblClick(e) {
  const tr = e.target.closest('tr[data-uid]');
  if (tr && !e.target.closest('button')) openMasterForm(tr.dataset.uid);
}

function openMasterForm(uid) {
  const type = currentMasterTab;
  const item = uid ? findMaster(uid) : null;
  $('#masterFormTitle').textContent = (item ? '✏️ Edit ' : '+ Tambah ') + MASTER_LABEL[type];
  $('#masterUid').value = item ? item.uid : '';
  $('#masterFields').innerHTML = `<div class="form-grid">${MASTER_FIELDS[type].map(f => `
    <div class="form-group">
      <label for="mf_${f.key}">${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>
      <input id="mf_${f.key}" type="${f.type === 'number' ? 'number' : 'text'}" ${f.type === 'number' ? 'min="0" step="any"' : ''}
        value="${escapeHtml(item ? item[f.key] ?? '' : '')}" ${f.required ? 'required' : ''}>
    </div>`).join('')}</div>`;
  openOverlay('#masterOverlay');
  $(item ? '#mf_name' : '#mf_code').focus();
}

function closeMasterForm() { closeOverlay('#masterOverlay'); }

async function saveMasterForm(e) {
  e.preventDefault();
  const type = currentMasterTab;
  const uid = $('#masterUid').value;
  const old = uid ? findMaster(uid) : null;
  const values = {};
  MASTER_FIELDS[type].forEach(f => { values[f.key] = $('#mf_' + f.key).value.trim(); });
  if (values.code && masterData[type].some(x => x.code === values.code && x.uid !== uid)) {
    showToast(`Kode ${values.code} sudah dipakai data lain.`, 'error');
    return;
  }
  const item = makeMasterItem(type, { ...values, uid: old?.uid });
  try {
    await dbPutMasterItems([item]);
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
    return;
  }
  if (old) masterData[type][masterData[type].indexOf(old)] = item;
  else masterData[type].unshift(item);
  closeMasterForm();
  renderMasterData();
  showToast(old ? 'Perubahan tersimpan.' : 'Data ditambahkan.');
}

async function removeMasterRow(uid) {
  const item = findMaster(uid);
  if (!item || !confirm(`Hapus "${item.name}"${item.code ? ' (' + item.code + ')' : ''}?`)) return;
  await dbDeleteMasterItems([uid]);
  masterData[currentMasterTab].splice(masterData[currentMasterTab].indexOf(item), 1);
  renderMasterData();
}

async function clearMasterData() {
  const type = currentMasterTab;
  const n = masterData[type].length;
  if (!n) return;
  if (!confirm(`Hapus SEMUA ${n.toLocaleString('id-ID')} data master ${MASTER_LABEL[type]}? Ini permanen.`)) return;
  await dbDeleteMasterItems(masterData[type].map(x => x.uid));
  masterData[type] = [];
  renderMasterData();
  showToast(`Master ${MASTER_LABEL[type]} dikosongkan.`);
}

function exportMasterData() {
  if (!requireXLSX()) return;
  const type = currentMasterTab;
  const fields = MASTER_FIELDS[type];
  const rows = masterData[type].map(it => fields.map(f => it[f.key] ?? ''));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([fields.map(f => f.label), ...rows]), MASTER_LABEL[type]);
  XLSX.writeFile(wb, `master_${type}_${todayStr()}.xlsx`);
  if (!rows.length) showToast('Master masih kosong — file berisi template kolom saja.');
}

// ===== Import Excel =====
const SHEET_HINT = { vendors: ['vendor', 'rekanan'], materials: ['material'], services: ['service'] };
let importWb = null;      // workbook terbaca
let importRows = [];      // isi sheet terpilih (array of arrays)
let importHeaderIdx = 0;  // baris judul kolom

function normHeader(h) { return String(h ?? '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Tebak kolom: cocok persis dulu, lalu yang mengandung kata kunci. Satu kolom hanya untuk satu field.
function guessMapping(type, headers) {
  const hs = headers.map(normHeader);
  const map = {}, used = new Set();
  for (const exact of [true, false]) {
    for (const f of MASTER_FIELDS[type]) {
      if (map[f.key] !== undefined) continue;
      for (const g of f.guess) {
        const idx = hs.findIndex((h, i) => h && !used.has(i) && (exact ? h === g : (g.length >= 4 && h.includes(g))));
        if (idx >= 0) { map[f.key] = idx; used.add(idx); break; }
      }
    }
  }
  return map;
}

function sheetHead(ws, n = 20) {
  if (!ws || !ws['!ref']) return [];
  const r = XLSX.utils.decode_range(ws['!ref']);
  r.e.r = Math.min(r.e.r, r.s.r + n - 1);
  r.e.c = Math.min(r.e.c, r.s.c + 80);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: r });
}

// Skor kecocokan (jenis data, sheet, baris judul) — dipakai untuk memilih otomatis
function scoreSheet(type, name, head) {
  let best = { score: 0, headerIdx: 0 };
  head.forEach((row, i) => {
    const m = guessMapping(type, row);
    if (m.name === undefined) return;
    const score = Object.keys(m).length;
    if (score > best.score) best = { score, headerIdx: i };
  });
  if (best.score >= 2 && SHEET_HINT[type].some(k => name.toLowerCase().includes(k))) best.score += 1.5;
  return best;
}

function openImportModal() {
  $('#importType').value = currentMasterTab;
  $('#importFile').value = '';
  $('#importReplace').checked = true;
  importWb = null;
  importRows = [];
  $('#importDetail').style.display = 'none';
  $('#importInfo').textContent = '';
  openOverlay('#importOverlay');
}

function closeImportModal() { closeOverlay('#importOverlay'); }

async function readImportFile() {
  const file = $('#importFile').files[0];
  importWb = null;
  importRows = [];
  $('#importDetail').style.display = 'none';
  if (!file) return;
  if (!requireXLSX()) return;
  $('#importInfo').textContent = `⏳ Membaca ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`;
  await new Promise(r => setTimeout(r, 30));
  try {
    importWb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellFormula: false, cellHTML: false, cellText: false });
  } catch (err) {
    $('#importInfo').textContent = '';
    showToast('Gagal membaca file: ' + err.message, 'error');
    return;
  }

  // Pilih otomatis kombinasi jenis data + sheet yang paling cocok
  let best = null;
  const heads = Object.fromEntries(importWb.SheetNames.map(n => [n, sheetHead(importWb.Sheets[n])]));
  for (const type of Object.keys(MASTER_FIELDS)) {
    for (const n of importWb.SheetNames) {
      const s = scoreSheet(type, n, heads[n]);
      if (!best || s.score > best.score) best = { ...s, type, sheet: n };
    }
  }
  $('#importSheet').innerHTML = importWb.SheetNames.map(n => `<option>${escapeHtml(n)}</option>`).join('');
  if (best && best.score >= 2) {
    if (best.type !== $('#importType').value) {
      showToast(`Isi file terdeteksi sebagai master ${MASTER_LABEL[best.type]}.`);
      $('#importType').value = best.type;
    }
    $('#importSheet').value = best.sheet;
  }
  loadImportSheet();
}

function onImportTypeChange() {
  if (!importWb) return;
  const type = $('#importType').value;
  let best = null;
  importWb.SheetNames.forEach(n => {
    const s = scoreSheet(type, n, sheetHead(importWb.Sheets[n]));
    if (!best || s.score > best.score) best = { ...s, sheet: n };
  });
  if (best && best.score >= 2) $('#importSheet').value = best.sheet;
  loadImportSheet();
}

function loadImportSheet() {
  if (!importWb) return;
  const type = $('#importType').value;
  const name = $('#importSheet').value;
  const ws = importWb.Sheets[name];
  importRows = ws && ws['!ref'] ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false }) : [];
  importHeaderIdx = scoreSheet(type, name, importRows.slice(0, 20)).headerIdx;
  $('#importHeaderRow').value = importHeaderIdx + 1;
  buildMappings();
}

function onHeaderRowChange() {
  importHeaderIdx = Math.max(0, (Number($('#importHeaderRow').value) || 1) - 1);
  buildMappings();
}

function buildMappings() {
  if (!importWb) return;
  const type = $('#importType').value;
  const headers = (importRows[importHeaderIdx] || []).map(h => String(h ?? '').trim());
  const guess = guessMapping(type, headers);
  const options = headers.map((h, i) => `<option value="${i}">${escapeHtml(h || 'Kolom ' + XLSX.utils.encode_col(i))}</option>`).join('');
  $('#importMappings').innerHTML = MASTER_FIELDS[type].map(f => `
    <div class="map-row">
      <label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>
      <select id="map_${f.key}" onchange="renderImportPreview()"><option value="">— tidak ada / abaikan —</option>${options}</select>
    </div>`).join('');
  MASTER_FIELDS[type].forEach(f => { if (guess[f.key] !== undefined) $('#map_' + f.key).value = guess[f.key]; });
  $('#importDetail').style.display = 'block';
  renderImportPreview();
}

function currentImportMap() {
  const map = {};
  MASTER_FIELDS[$('#importType').value].forEach(f => {
    const v = $('#map_' + f.key)?.value ?? '';
    if (v !== '') map[f.key] = Number(v);
  });
  return map;
}

function parseNumber(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d,.-]/g, '');
  if (!s) return '';
  const n = Number(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,](?=\d{3}(\D|$))/g, ''));
  return isFinite(n) ? n : '';
}

function rowToItem(type, row, map) {
  const src = {};
  MASTER_FIELDS[type].forEach(f => {
    const v = map[f.key] === undefined ? '' : row[map[f.key]];
    src[f.key] = f.type === 'number' ? parseNumber(v) : v;
  });
  if (src.price === 0) src.price = '';
  return makeMasterItem(type, src);
}

function renderImportPreview() {
  const type = $('#importType').value;
  const map = currentImportMap();
  const dataRows = importRows.slice(importHeaderIdx + 1).filter(r => map.name !== undefined && String(r[map.name] ?? '').trim());
  const cols = MASTER_FIELDS[type].filter(f => map[f.key] !== undefined);
  $('#importInfo').innerHTML = map.name === undefined
    ? '⚠️ Pilih kolom untuk <b>' + escapeHtml(MASTER_FIELDS[type].find(f => f.required).label) + '</b>.'
    : `✅ <b>${dataRows.length.toLocaleString('id-ID')}</b> baris data siap diimport dari sheet “${escapeHtml($('#importSheet').value)}”. Contoh 3 baris pertama:`;
  $('#importPreview').innerHTML = map.name === undefined ? '' : `<div class="table-scroll"><table class="master-table small">
    <thead><tr>${cols.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}</tr></thead>
    <tbody>${dataRows.slice(0, 3).map(r => { const it = rowToItem(type, r, map);
      return `<tr>${cols.map(f => `<td>${escapeHtml(f.type === 'number' && it[f.key] !== '' ? formatIdp(it[f.key]) : it[f.key])}</td>`).join('')}</tr>`; }).join('')}</tbody>
  </table></div>`;
}

async function doImport() {
  const type = $('#importType').value;
  if (!importWb) { showToast('Pilih file Excel terlebih dahulu.', 'error'); return; }
  const map = currentImportMap();
  if (map.name === undefined) { showToast('Kolom nama/deskripsi wajib dipilih.', 'error'); return; }

  // Susun item, buang duplikat dalam file (kunci: kode, atau nama bila kode kosong)
  const keyOf = (it) => it.code ? 'c:' + it.code : 'n:' + it.name.toLowerCase();
  const incoming = new Map();
  importRows.slice(importHeaderIdx + 1).forEach(r => {
    const it = rowToItem(type, r, map);
    if (it.name) incoming.set(keyOf(it), it);
  });
  if (!incoming.size) { showToast('Tidak ada data valid untuk diimport.', 'error'); return; }

  const replace = $('#importReplace').checked;
  const msg = replace
    ? `Ganti seluruh master ${MASTER_LABEL[type]} (${masterData[type].length.toLocaleString('id-ID')} data lama) dengan ${incoming.size.toLocaleString('id-ID')} data dari file?`
    : `Tambahkan/perbarui ${incoming.size.toLocaleString('id-ID')} data master ${MASTER_LABEL[type]}?`;
  if (!confirm(msg)) return;

  const btn = $('#btnDoImport');
  btn.disabled = true;
  btn.textContent = '⏳ Mengimport…';
  try {
    let added = 0, updated = 0;
    const toPut = [];
    if (replace) {
      await dbDeleteMasterItems(masterData[type].map(x => x.uid));
      masterData[type] = [];
      incoming.forEach(it => { toPut.push(it); added++; });
    } else {
      const existing = new Map(masterData[type].map(x => [keyOf(x), x]));
      incoming.forEach((it, k) => {
        const old = existing.get(k);
        if (old) {
          const merged = { ...old };
          MASTER_FIELDS[type].forEach(f => { if (it[f.key] !== '') merged[f.key] = it[f.key]; });
          delete merged._s;
          toPut.push(merged);
          updated++;
        } else {
          toPut.push(it);
          added++;
        }
      });
    }
    await dbPutMasterItems(toPut);
    await loadMasterData();
    closeImportModal();
    switchMasterTab(type);
    showToast(`Import selesai: ${added.toLocaleString('id-ID')} baru, ${updated.toLocaleString('id-ID')} diperbarui.`);
  } catch (err) {
    showToast('Import gagal: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📥 Import';
  }
}


// ===== File handling =====
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

// ===== Overlay & menu helpers =====
function openOverlay(sel) {
  $(sel).style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeOverlay(sel) {
  $(sel).style.display = 'none';
  if (![...$$('.modal-overlay')].some(o => o.style.display === 'flex')) document.body.classList.remove('modal-open');
}

function toggleMenu(e) {
  e.stopPropagation();
  $('#mainMenu').classList.toggle('open');
}

function closeMenu() { $('#mainMenu').classList.remove('open'); }

document.addEventListener('click', closeMenu);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = [...$$('.modal-overlay')].filter(o => o.style.display === 'flex');
  if (open.length) closeOverlay('#' + open[open.length - 1].id);
  closeMenu();
});

// Klik di area gelap di luar modal = tutup (kecuali form dokumen, agar isian tidak hilang)
document.addEventListener('mousedown', (e) => {
  if (e.target.classList?.contains('modal-overlay') && e.target.id !== 'modalOverlay') closeOverlay('#' + e.target.id);
});

// ===== Pembaruan Aplikasi (paket .json, tanpa mengganti file) =====
function updateDb(mode, fn) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(window.UPDATE_DB || 'JICT_Priuk_Pembaruan', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('paket');
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('paket', mode);
      const req = fn(tx.objectStore('paket'));
      let result;
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
const updateGet = (key) => updateDb('readonly', s => s.get(key));
const updatePut = (key, v) => updateDb('readwrite', s => s.put(v, key));
const updateDel = (key) => updateDb('readwrite', s => s.delete(key));

function runningSource() {
  return window.PAKET_AKTIF ? `paket pembaruan (dipasang ${formatDateTime(window.PAKET_AKTIF.dipasang)})` : 'file bawaan di folder';
}

async function openUpdate() {
  closeMenu();
  const [aktif, sebelumnya] = await Promise.all([updateGet('aktif'), updateGet('sebelumnya')]).catch(() => [null, null]);
  const base = window.APP_BASE_VERSION || APP_VERSION;
  const ignored = aktif && !window.PAKET_AKTIF && window.bandingVersi?.(aktif.versi, base) <= 0;
  $('#updateInfo').innerHTML = `
    <table class="pv-meta">
      <tr><td>Versi berjalan</td><td>:</td><td><strong>${escapeHtml(APP_VERSION)}</strong> — ${escapeHtml(runningSource())}</td></tr>
      <tr><td>Versi file bawaan</td><td>:</td><td>${escapeHtml(base)}</td></tr>
      ${aktif ? `<tr><td>Paket tersimpan</td><td>:</td><td>${escapeHtml(aktif.versi)}${aktif.tanggal ? ' (' + escapeHtml(aktif.tanggal) + ')' : ''}${ignored ? ' — <em>diabaikan, file bawaan lebih baru</em>' : ''}</td></tr>` : ''}
      ${sebelumnya ? `<tr><td>Cadangan versi</td><td>:</td><td>${escapeHtml(sebelumnya.versi)}</td></tr>` : ''}
    </table>
    ${aktif?.catatan && !ignored ? `<div class="update-note">${escapeHtml(aktif.catatan)}</div>` : ''}
    ${/[?&]aman\b/.test(location.search) ? '<p class="text-danger">Mode aman: paket pembaruan tidak dijalankan.</p>' : ''}`;
  $('#btnRollback').style.display = aktif ? '' : 'none';
  $('#btnRollback').textContent = sebelumnya ? `↩️ Kembali ke ${sebelumnya.versi}` : `↩️ Kembali ke versi bawaan ${base}`;
  openOverlay('#updateOverlay');
}

async function installUpdate(input) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  let pkg;
  try { pkg = JSON.parse(await file.text()); } catch { showToast('File pembaruan tidak valid (bukan JSON).', 'error'); return; }
  if (!pkg || pkg.format !== UPDATE_FORMAT || !pkg.versi || typeof pkg.js !== 'string' || !pkg.js.includes('APP_VERSION')) {
    showToast('File ini bukan paket pembaruan aplikasi JICT Kontrak.', 'error');
    return;
  }
  const cmp = window.bandingVersi ? window.bandingVersi(pkg.versi, APP_VERSION) : 1;
  const base = window.APP_BASE_VERSION || APP_VERSION;
  if (window.bandingVersi && window.bandingVersi(pkg.versi, base) <= 0) {
    showToast(`Versi ${pkg.versi} tidak lebih baru dari file bawaan ${base} — tidak perlu dipasang.`, 'error');
    return;
  }
  const head = cmp > 0 ? `Pasang pembaruan ${APP_VERSION} → ${pkg.versi}?`
    : `Versi ${pkg.versi} ${cmp === 0 ? 'sama dengan' : 'LEBIH LAMA dari'} versi berjalan ${APP_VERSION}. Tetap pasang?`;
  if (!confirm(`${head}\n\n${String(pkg.catatan || '').slice(0, 600)}\n\nData dokumen & master tidak berubah.`)) return;
  try {
    const aktif = await updateGet('aktif');
    if (aktif && aktif.versi !== pkg.versi) await updatePut('sebelumnya', aktif);
    await updatePut('aktif', { ...pkg, dipasang: Date.now() });
  } catch (err) {
    showToast('Gagal memasang pembaruan: ' + err.message, 'error');
    return;
  }
  showToast(`Pembaruan ${pkg.versi} terpasang. Memuat ulang…`);
  setTimeout(() => { location.href = location.pathname; }, 800);
}

async function rollbackUpdate() {
  const sebelumnya = await updateGet('sebelumnya');
  const target = sebelumnya ? sebelumnya.versi : `versi bawaan ${window.APP_BASE_VERSION || ''}`;
  if (!confirm(`Kembali ke ${target}? Data dokumen & master tidak berubah.`)) return;
  if (sebelumnya) {
    await updatePut('aktif', sebelumnya);
    await updateDel('sebelumnya');
  } else {
    await updateDel('aktif');
  }
  location.href = location.pathname;
}

// ===== Init =====
async function boot() {
  fillTypeSelects();
  $('#menuVersion').textContent = 'v' + APP_VERSION;
  try {
    const saved = await dbGetSettings();
    settings = { ...DEFAULT_SETTINGS, ...(saved || {}) };
    applySettingsUI();
    await loadMasterData();
    renderMasterData();
    await render();
  } catch (err) {
    console.error(err);
    alert('Gagal membuka database lokal: ' + err.message + '\nGunakan browser Chrome/Edge terbaru dan jangan gunakan mode Incognito.');
  }
  if ('storage' in navigator && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

// app.js dimuat oleh pemuat di index.html (bisa setelah DOMContentLoaded)
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
