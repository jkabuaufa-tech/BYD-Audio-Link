/**
 * JICT Priuk – Dokumen Kontrak & Tagihan Assistant
 * Format baku (BOQ, PPN, terbilang, TTD) + riwayat update (BAPM/BAPP/BAPSA) per dokumen.
 * Data persistence: IndexedDB (lokal di browser) + backup/restore JSON.
 */

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

const MASTER_FIELDS = {
  vendors: [
    { key: 'name', label: 'Nama Vendor', required: true, guess: ['nama', 'name', 'vendor', 'perusahaan', 'subkon'] },
    { key: 'address', label: 'Alamat', guess: ['alamat', 'address'] },
    { key: 'npwp', label: 'NPWP', guess: ['npwp'] },
    { key: 'pic', label: 'PIC / Kontak', guess: ['pic', 'kontak', 'contact', 'direktur'] },
    { key: 'phone', label: 'Telepon', guess: ['telp', 'telepon', 'phone', 'hp', 'no hp'] },
    { key: 'email', label: 'Email', guess: ['email', 'e-mail'] },
  ],
  materials: [
    { key: 'name', label: 'Nama Material', required: true, guess: ['nama', 'name', 'material', 'uraian', 'item'] },
    { key: 'category', label: 'Kategori', guess: ['kategori', 'category', 'jenis'] },
    { key: 'unit', label: 'Satuan', guess: ['satuan', 'unit', 'sat'] },
    { key: 'price', label: 'Harga Satuan (Rp)', type: 'number', guess: ['harga', 'price', 'haran', 'rate'] },
  ],
  services: [
    { key: 'name', label: 'Nama Pekerjaan / Service', required: true, guess: ['nama', 'name', 'service', 'pekerjaan', 'uraian', 'item'] },
    { key: 'category', label: 'Kategori', guess: ['kategori', 'category', 'jenis'] },
    { key: 'unit', label: 'Satuan', guess: ['satuan', 'unit', 'sat'] },
    { key: 'price', label: 'Harga Satuan (Rp)', type: 'number', guess: ['harga', 'price', 'estimasi', 'rate'] },
  ],
};

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
const DB_VERSION = 2;
const STORE = 'documents';
const MASTER_STORE = 'masterData';
const SETTINGS_STORE = 'settings';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(MASTER_STORE)) db.createObjectStore(MASTER_STORE);
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
    };
    req.onsuccess = () => resolve(req.result);
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
    req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || req.error);
    tx.onabort = () => reject(tx.error || new Error('Transaksi dibatalkan (kemungkinan penyimpanan penuh)'));
  });
}

const dbGetAll = () => dbRequest(STORE, 'readonly', s => s.getAll());
const dbPut = (doc) => dbRequest(STORE, 'readwrite', s => s.put(doc));
const dbDelete = (id) => dbRequest(STORE, 'readwrite', s => s.delete(id));
const dbGetMaster = () => dbRequest(MASTER_STORE, 'readonly', s => s.get('master'));
const dbPutMaster = (m) => dbRequest(MASTER_STORE, 'readwrite', s => s.put(m, 'master'));
const dbGetSettings = () => dbRequest(SETTINGS_STORE, 'readonly', s => s.get('app'));
const dbPutSettings = (v) => dbRequest(SETTINGS_STORE, 'readwrite', s => s.put(v, 'app'));

// ===== State =====
let documents = [];
let filteredDocs = [];
let masterData = { vendors: [], materials: [], services: [] };
let settings = { ...DEFAULT_SETTINGS };
let currentMasterTab = 'vendors';
let editingAttachment = null; // { remove: bool }

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

function normalizeMaster(m) {
  const out = { vendors: [], materials: [], services: [] };
  if (!m) return out;
  out.vendors = (m.vendors || []).filter(Boolean);
  out.materials = (m.materials || []).filter(Boolean).map(x => ({ ...x, price: x.price ?? x.haran ?? '' }));
  out.services = (m.services || []).filter(Boolean).map(x => ({ ...x, price: x.price ?? x.estimateRate ?? '' }));
  return out;
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
      <td><input type="text" class="it-desc" list="dlItems" value="${escapeHtml(it.desc)}" placeholder="Uraian pekerjaan / material" onchange="fillItemFromMaster(this)"></td>
      <td><input type="text" class="it-unit" value="${escapeHtml(it.unit)}" placeholder="m³"></td>
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

function fillItemFromMaster(input) {
  const name = input.value.trim().toLowerCase();
  if (!name) return;
  const match = [...masterData.materials, ...masterData.services].find(m => (m.name || '').trim().toLowerCase() === name);
  if (!match) return;
  const tr = input.closest('tr');
  if (!tr.querySelector('.it-unit').value && match.unit) tr.querySelector('.it-unit').value = match.unit;
  if (!tr.querySelector('.it-price').value && match.price) tr.querySelector('.it-price').value = Number(match.price) || '';
  recalcItems();
}

function fillVendorFromMaster() {
  const name = $('#docVendor').value.trim().toLowerCase();
  const v = masterData.vendors.find(x => (x.name || '').trim().toLowerCase() === name);
  if (!v) return;
  if (v.address) $('#docVendorAddress').value = v.address;
  if (v.npwp) $('#docNPWP').value = v.npwp;
}

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
  editingAttachment = null;
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

  editingAttachment = null;
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
    masterData.vendors.push({ name: doc.vendor, address: doc.vendorAddress, npwp: doc.npwp, pic: '', phone: '', email: '' });
    await dbPutMaster(masterData);
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
  const itemsHtml = doc.items.map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
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
        <thead><tr><th style="width:36px;">No</th><th>Uraian</th><th style="width:70px;">Satuan</th><th style="width:80px;">Volume</th><th style="width:130px;">Harga Satuan (Rp)</th><th style="width:140px;">Jumlah (Rp)</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr><td colspan="5" class="num">Sub Total</td><td class="num">${formatNum(t.sub)}</td></tr>
          ${doc.ppnOn ? `<tr><td colspan="5" class="num">PPN ${formatNum(doc.ppnRate)}%</td><td class="num">${formatNum(t.ppn)}</td></tr>` : ''}
          <tr class="pv-grand"><td colspan="5" class="num">TOTAL</td><td class="num">${formatNum(t.total)}</td></tr>
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
  const detail = [['No. Dokumen', 'Vendor', 'No', 'Uraian', 'Satuan', 'Volume', 'Harga Satuan', 'Jumlah']];
  const upd = [['No. Dokumen', 'Vendor', 'Tanggal', 'Jenis', 'Deskripsi', 'Catatan']];
  filteredDocs.forEach((d, i) => {
    const t = docTotals(d);
    const last = d.updates.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    rekap.push([i + 1, d.docNo, d.contractDate, getDocType(d.docType).label, getCategoryLabel(d.category), d.project, d.vendor,
      d.npwp, d.refNo || '', d.dueDate || '', d.items.length, t.sub, t.ppn, t.total, d.status,
      last ? `${last.date} ${last.party}: ${last.description}` : '', d.notes]);
    d.items.forEach((it, j) => detail.push([d.docNo, d.vendor, j + 1, it.desc, it.unit, it.qty, it.price, (Number(it.qty) || 0) * (Number(it.price) || 0)]));
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
  const data = { app: 'JICT_Priuk_Kontrak', version: 2, exportedAt: new Date().toISOString(),
    documents: await dbGetAll(), master: masterData, settings };
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
  if (data.master) { masterData = normalizeMaster(data.master); await dbPutMaster(masterData); }
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
  masterData = normalizeMaster(await dbGetMaster());
}

async function saveMaster() {
  masterData.updatedAt = Date.now();
  await dbPutMaster(masterData);
  renderMasterData();
}

function refreshDatalists() {
  $('#dlVendors').innerHTML = masterData.vendors.map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.address || '')}</option>`).join('');
  $('#dlItems').innerHTML = [...masterData.materials, ...masterData.services]
    .map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml([m.unit, m.price ? formatIdp(m.price) : ''].filter(Boolean).join(' · '))}</option>`).join('');
}

function switchMasterTab(tab) {
  currentMasterTab = tab;
  $$('.master-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderMasterData();
}

function renderMasterData() {
  refreshDatalists();
  $('#countVendors').textContent = masterData.vendors.length;
  $('#countMaterials').textContent = masterData.materials.length;
  $('#countServices').textContent = masterData.services.length;

  const fields = MASTER_FIELDS[currentMasterTab];
  const q = ($('#masterSearch').value || '').trim().toLowerCase();
  const rows = masterData[currentMasterTab]
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !q || fields.some(f => String(item[f.key] ?? '').toLowerCase().includes(q)));

  const tbody = $('#masterTbody');
  if (rows.length === 0) {
    tbody.innerHTML = `<div class="master-empty"><div class="empty-icon">📦</div><p>${q ? 'Tidak ada data yang cocok.' : 'Belum ada data. Klik “+ Tambah” atau Import dari Excel.'}</p></div>`;
    return;
  }
  tbody.innerHTML = `<div class="table-scroll"><table class="master-table"><thead><tr>
      ${fields.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}<th style="width:90px;"></th></tr></thead><tbody>
      ${rows.map(({ item, idx }) => `<tr>
        ${fields.map((f, i) => {
          const v = item[f.key];
          const shown = f.type === 'number' ? (v !== '' && v !== undefined ? formatIdp(v) : '') : escapeHtml(v);
          return `<td${f.type === 'number' ? ' class="num"' : ''}>${i === 0 ? `<strong>${shown}</strong>` : shown}</td>`;
        }).join('')}
        <td><div class="master-item-actions">
          <button class="btn btn-sm" onclick="openMasterForm(${idx})" title="Edit">✏️</button>
          <button class="btn btn-sm btn-danger-ghost" onclick="removeMasterRow(${idx})" title="Hapus">✕</button>
        </div></td></tr>`).join('')}
    </tbody></table></div>`;
}

function openMasterForm(idx) {
  const fields = MASTER_FIELDS[currentMasterTab];
  const item = idx >= 0 ? masterData[currentMasterTab][idx] : {};
  const tabLabel = { vendors: 'Vendor', materials: 'Material', services: 'Service' }[currentMasterTab];
  $('#masterFormTitle').textContent = (idx >= 0 ? 'Edit ' : 'Tambah ') + tabLabel;
  $('#masterIdx').value = idx;
  $('#masterFields').innerHTML = fields.map(f => `
    <div class="form-group">
      <label for="mf_${f.key}">${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>
      <input id="mf_${f.key}" type="${f.type === 'number' ? 'number' : 'text'}" ${f.type === 'number' ? 'min="0" step="any"' : ''}
        value="${escapeHtml(item[f.key] ?? '')}" ${f.required ? 'required' : ''}>
    </div>`).join('');
  openOverlay('#masterOverlay');
  $('#mf_name').focus();
}

function closeMasterForm() { closeOverlay('#masterOverlay'); }

async function saveMasterForm(e) {
  e.preventDefault();
  const idx = Number($('#masterIdx').value);
  const item = {};
  MASTER_FIELDS[currentMasterTab].forEach(f => {
    const v = $('#mf_' + f.key).value.trim();
    item[f.key] = f.type === 'number' ? (v === '' ? '' : Number(v)) : v;
  });
  if (idx >= 0) masterData[currentMasterTab][idx] = item;
  else masterData[currentMasterTab].push(item);
  await saveMaster();
  closeMasterForm();
  showToast('Master data tersimpan.');
}

async function removeMasterRow(idx) {
  const item = masterData[currentMasterTab][idx];
  if (!confirm(`Hapus "${item?.name || 'data ini'}"?`)) return;
  masterData[currentMasterTab].splice(idx, 1);
  await saveMaster();
}

async function clearMasterData() {
  const label = { vendors: 'Vendor', materials: 'Material', services: 'Service' }[currentMasterTab];
  if (!confirm(`Hapus SEMUA data master ${label}? Ini permanen.`)) return;
  masterData[currentMasterTab] = [];
  await saveMaster();
}

function exportMasterData() {
  if (!requireXLSX()) return;
  const wb = XLSX.utils.book_new();
  let total = 0;
  Object.entries(MASTER_FIELDS).forEach(([tab, fields]) => {
    const rows = masterData[tab].map(item => fields.map(f => item[f.key] ?? ''));
    total += rows.length;
    const name = { vendors: 'Vendor', materials: 'Material', services: 'Service' }[tab];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([fields.map(f => f.label), ...rows]), name);
  });
  if (total === 0) { showToast('Master data masih kosong — file berisi template kolom saja.'); }
  XLSX.writeFile(wb, `Master_Data_JICT_${todayStr()}.xlsx`);
}

// ===== Import Excel =====
let importRows = [];

function openImportModal() {
  $('#importType').value = currentMasterTab;
  $('#importFile').value = '';
  importRows = [];
  $('#importMappingsGroup').style.display = 'none';
  openOverlay('#importOverlay');
}

function closeImportModal() { closeOverlay('#importOverlay'); }

async function readImportFile() {
  const file = $('#importFile').files[0];
  importRows = [];
  if (!file) { $('#importMappingsGroup').style.display = 'none'; return; }
  if (!requireXLSX()) return;
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    importRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      .filter(r => r.some(c => String(c).trim() !== ''));
  } catch (err) {
    showToast('Gagal membaca file: ' + err.message, 'error');
    return;
  }
  if (importRows.length < 2) { showToast('File tidak berisi data (minimal 1 baris judul + 1 baris data).', 'error'); return; }
  buildMappings();
}

function buildMappings() {
  if (importRows.length === 0) return;
  const type = $('#importType').value;
  const headers = importRows[0].map(h => String(h).trim());
  const options = headers.map((h, i) => `<option value="${i}">${escapeHtml(h || 'Kolom ' + (i + 1))}</option>`).join('');
  $('#importMappings').innerHTML = MASTER_FIELDS[type].map(f => `
    <div class="map-row">
      <label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>
      <select id="map_${f.key}"><option value="">— abaikan —</option>${options}</select>
    </div>`).join('');
  MASTER_FIELDS[type].forEach(f => {
    const guess = headers.findIndex(h => f.guess.some(g => h.toLowerCase().includes(g)));
    if (guess >= 0) $('#map_' + f.key).value = guess;
  });
  $('#importInfo').textContent = `${importRows.length - 1} baris data terdeteksi.`;
  $('#importMappingsGroup').style.display = 'block';
}

async function doImport() {
  const type = $('#importType').value;
  if (importRows.length < 2) { showToast('Pilih file Excel terlebih dahulu.', 'error'); return; }
  const fields = MASTER_FIELDS[type];
  const map = {};
  fields.forEach(f => { map[f.key] = $('#map_' + f.key)?.value ?? ''; });
  const missing = fields.filter(f => f.required && map[f.key] === '');
  if (missing.length) { showToast('Kolom wajib belum dipilih: ' + missing.map(f => f.label).join(', '), 'error'); return; }

  let added = 0, updated = 0;
  importRows.slice(1).forEach(r => {
    const item = {};
    fields.forEach(f => {
      let v = map[f.key] === '' ? '' : r[Number(map[f.key])];
      if (f.type === 'number') {
        v = typeof v === 'number' ? v : Number(String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
        v = isFinite(v) && v !== 0 ? v : '';
      } else {
        v = String(v ?? '').trim();
      }
      item[f.key] = v;
    });
    if (!item.name) return;
    const existingIdx = masterData[type].findIndex(x => (x.name || '').trim().toLowerCase() === item.name.toLowerCase());
    if (existingIdx >= 0) {
      const merged = { ...masterData[type][existingIdx] };
      Object.entries(item).forEach(([k, v]) => { if (v !== '') merged[k] = v; });
      masterData[type][existingIdx] = merged;
      updated++;
    } else {
      masterData[type].push(item);
      added++;
    }
  });
  if (added + updated === 0) { showToast('Tidak ada data valid untuk diimport.', 'error'); return; }
  await saveMaster();
  switchMasterTab(type);
  closeImportModal();
  showToast(`Import selesai: ${added} baru, ${updated} diperbarui.`);
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

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  fillTypeSelects();
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
});
