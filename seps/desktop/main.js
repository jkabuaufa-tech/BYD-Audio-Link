'use strict';

/**
 * SEPS Desktop — shell Electron.
 * Bagian ini SENGAJA kecil dan jarang berubah (berubah hanya lewat installer baru).
 * Semua logika server & tampilan ada di "folder kode" yang bisa diganti lewat
 * paket pembaruan (Pengaturan › Pembaruan) tanpa menyentuh data.
 *
 *   %APPDATA%\SEPS\data\seps.db       database (tidak pernah ditimpa installer/paket)
 *   %APPDATA%\SEPS\data\backup\       backup harian & sebelum pembaruan
 *   %APPDATA%\SEPS\kode\<versi>\      kode hasil paket pembaruan
 *   %APPDATA%\SEPS\logs\seps.log      log
 */
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { daftarKandidat, bacaAktif, tandaiGagal } = require('./pemilih-kode');

const VERSI_SHELL = app.getVersion();
const KODE_BAWAAN = path.join(__dirname, 'kode');
const PORT = 4780;

// Kode dari paket pembaruan berada di luar folder aplikasi; arahkan require()
// ke node_modules bawaan installer (express, cors, sql.js).
process.env.NODE_PATH = [path.join(__dirname, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();

let jendela = null;
let server = null;
let berkasLog = null;

function tulisLog(...isi) {
  const baris = `${new Date().toISOString()} ${isi.join(' ')}\n`;
  process.stdout.write(baris);
  try { if (berkasLog) fs.appendFileSync(berkasLog, baris); } catch { /* abaikan */ }
}

function mulaiUlang() {
  tulisLog('[SEPS] Mulai ulang aplikasi');
  app.relaunch();
  app.exit(0);
}

async function jalankanServer() {
  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  const kodeRoot = path.join(userData, 'kode');
  const versiBawaan = JSON.parse(fs.readFileSync(path.join(KODE_BAWAAN, 'versi.json'), 'utf8')).versi;
  const kandidat = daftarKandidat({
    aktif: bacaAktif(kodeRoot),
    versiBawaan,
    adaVersi: (v) => fs.existsSync(path.join(kodeRoot, v, 'backend', 'src', 'desktop.js')),
  });
  const kegagalan = [];
  for (const v of kandidat) {
    const dir = v === 'bawaan' ? KODE_BAWAAN : path.join(kodeRoot, v);
    try {
      tulisLog(`[SEPS] Menjalankan kode ${v} dari ${dir}`);
      const { mulai } = require(path.join(dir, 'backend', 'src', 'desktop.js'));
      const s = await mulai({ dataDir, kodeRoot, port: PORT, versiShell: VERSI_SHELL, onMulaiUlang: mulaiUlang, log: tulisLog });
      return { server: s, kegagalan };
    } catch (e) {
      tulisLog(`[SEPS] Kode ${v} gagal: ${e.stack || e.message}`);
      kegagalan.push({ versi: v, pesan: e.message });
      if (v !== 'bawaan') tandaiGagal(kodeRoot, v, e.message);
    }
  }
  const err = new Error(kegagalan.map((k) => `${k.versi}: ${k.pesan}`).join('\n'));
  err.kegagalan = kegagalan;
  throw err;
}

function buatMenu() {
  const login = app.getLoginItemSettings();
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Berkas',
      submenu: [
        { label: 'Buka folder data & backup', click: () => shell.openPath(path.join(app.getPath('userData'), 'data')) },
        { label: 'Buka log', click: () => shell.openPath(berkasLog) },
        { type: 'separator' },
        {
          label: 'Jalankan saat komputer menyala',
          type: 'checkbox',
          checked: login.openAtLogin,
          click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked }),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Keluar' },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'reload', label: 'Muat ulang' },
        { role: 'zoomIn', label: 'Perbesar' },
        { role: 'zoomOut', label: 'Perkecil' },
        { role: 'resetZoom', label: 'Ukuran normal' },
        { role: 'togglefullscreen', label: 'Layar penuh' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Alat pengembang' },
      ],
    },
    {
      label: 'Bantuan',
      submenu: [{
        label: 'Tentang SEPS',
        click: () => dialog.showMessageBox(jendela, {
          type: 'info',
          title: 'Tentang SEPS',
          message: 'SEPS — Sistem Evaluasi & Produksi Swakelola',
          detail: `Versi kode: ${server ? server.versi : '-'}\nVersi installer: ${VERSI_SHELL}\nFolder data: ${path.join(app.getPath('userData'), 'data')}`,
        }),
      }],
    },
  ]));
}

function buatJendela(url) {
  jendela = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'SEPS',
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  jendela.once('ready-to-show', () => jendela.show());
  // Tautan luar dibuka di browser; jendela aplikasi hanya untuk server lokal.
  jendela.webContents.setWindowOpenHandler(({ url: u }) => { shell.openExternal(u); return { action: 'deny' }; });
  jendela.webContents.on('will-navigate', (e, u) => {
    if (!u.startsWith(url)) { e.preventDefault(); shell.openExternal(u); }
  });
  jendela.loadURL(url);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (jendela) { if (jendela.isMinimized()) jendela.restore(); jendela.focus(); }
  });

  app.whenReady().then(async () => {
    const dirLog = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dirLog, { recursive: true });
    berkasLog = path.join(dirLog, 'seps.log');
    tulisLog(`[SEPS] Shell ${VERSI_SHELL} mulai`);
    try {
      const { server: s, kegagalan } = await jalankanServer();
      server = s;
      buatMenu();
      buatJendela(s.url);
      const gagalPaket = kegagalan.filter((k) => k.versi !== 'bawaan');
      if (gagalPaket.length) {
        dialog.showMessageBox(jendela, {
          type: 'warning',
          title: 'Pembaruan tidak dapat dijalankan',
          message: `Versi ${gagalPaket.map((k) => k.versi).join(', ')} gagal dijalankan. Aplikasi otomatis memakai versi ${s.versi}.`,
          detail: `Data tidak berubah. Rincian ada di log.\n\n${gagalPaket.map((k) => `${k.versi}: ${k.pesan}`).join('\n')}`,
        });
      }
    } catch (e) {
      dialog.showErrorBox('SEPS tidak dapat dimulai', `${e.message}\n\nLog: ${berkasLog}`);
      app.exit(1);
    }
  });

  app.on('window-all-closed', async () => {
    try { if (server) await server.tutup(); } catch { /* abaikan */ }
    app.quit();
  });
}
