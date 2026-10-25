/* =====================================================================
   PEMANTAUAN & BACKUP OTOMATIS — tambahan untuk project Apps Script Monitoring SAP
   Cara pasang (sekali, ±5 menit):
     1. Apps Script editor › File (+) › Script → beri nama "Pemantauan" → tempel isi file ini → Simpan.
     2. Pilih fungsi pmPasang → Run → izinkan akses (Drive, Sheets, email, pemicu).
     3. Selesai: backup harian ±01.00, cek kesehatan tiap jam, email ke Admin bila ada masalah.
   Aman untuk kernel: TIDAK ada doGet/doPost (nama fungsi kembar akan menimpa server aplikasi), semua fungsi berawalan pm.
   Tidak mengubah data aplikasi; hanya membuat salinan file & mengirim email.
   ===================================================================== */
const PM = {
  SIMPAN_BACKUP: 14,            // salinan harian yang disimpan (yang lebih lama dibuang ke Sampah Drive)
  BATAS_SEL: 10000000,          // batas sel Google Sheets per file
  PERINGATAN_SEL: 0.70, KRITIS_SEL: 0.85,
  BATAS_PROPS: 500 * 1024,      // batas total Script Properties (±500 KB)
  JEDA_EMAIL_JAM: 6             // email yang sama paling sering 1× per 6 jam
};

function pmPasang() {
  ScriptApp.getProjectTriggers().filter(t => /^pm/.test(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('pmBackupHarian').timeBased().everyDays(1).atHour(1).create();
  ScriptApp.newTrigger('pmCekKesehatan').timeBased().everyHours(1).create();
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('PM_EMAIL')) p.setProperty('PM_EMAIL', Session.getEffectiveUser().getEmail());
  pmBackupHarian();
  const h = pmCekKesehatan();
  Logger.log('Terpasang. Email peringatan ke: ' + p.getProperty('PM_EMAIL') + '\n' + JSON.stringify(h, null, 1));
}

function pmSpreadsheet_() {
  if (typeof ss_ === 'function') return ss_();   // fungsi kernel Code.gs (Sheet aktif atau DB_ID)
  const id = PropertiesService.getScriptProperties().getProperty('DB_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function pmFolderBackup_() {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty('PM_FOLDER_BACKUP');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { } }
  const f = DriveApp.createFolder('Backup Monitoring SAP'); p.setProperty('PM_FOLDER_BACKUP', f.getId()); return f;
}

function pmBackupHarian() {
  const ss = pmSpreadsheet_(), folder = pmFolderBackup_(), tz = Session.getScriptTimeZone();
  const nama = ss.getName() + ' — backup ' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HHmm');
  DriveApp.getFileById(ss.getId()).makeCopy(nama, folder);
  // rotasi: simpan N terbaru
  const L = []; const it = folder.getFiles(); while (it.hasNext()) { const f = it.next(); if (/ — backup \d{4}-\d{2}-\d{2}/.test(f.getName())) L.push(f); }
  L.sort((a, b) => b.getDateCreated() - a.getDateCreated()).slice(PM.SIMPAN_BACKUP).forEach(f => f.setTrashed(true));
  PropertiesService.getScriptProperties().setProperty('PM_BACKUP_TERAKHIR', String(Date.now()));
  return nama;
}

function pmCekKesehatan() {
  const masalah = [], info = {}, p = PropertiesService.getScriptProperties();
  try {
    const ss = pmSpreadsheet_(); let sel = 0, terbesar = ['', 0];
    ss.getSheets().forEach(sh => { const n = sh.getMaxRows() * sh.getMaxColumns(); sel += n; if (n > terbesar[1]) terbesar = [sh.getName(), n]; });
    info.sel = sel; info.persenSel = Math.round(sel / PM.BATAS_SEL * 100); info.sheet = ss.getSheets().length; info.sheetTerbesar = terbesar[0] + ' (' + terbesar[1] + ' sel)';
    if (sel > PM.BATAS_SEL * PM.KRITIS_SEL) masalah.push(['SEL', 'KRITIS: database memakai ' + info.persenSel + '% dari batas 10 juta sel. Arsipkan proyek selesai ke file terpisah / hapus baris & kolom kosong.']);
    else if (sel > PM.BATAS_SEL * PM.PERINGATAN_SEL) masalah.push(['SEL', 'Peringatan: database memakai ' + info.persenSel + '% dari batas 10 juta sel. Sheet terbesar: ' + info.sheetTerbesar + '.']);
  } catch (e) { masalah.push(['DB', 'Spreadsheet database tidak dapat dibuka: ' + e.message]); }
  const tB = Number(p.getProperty('PM_BACKUP_TERAKHIR') || 0); info.backupJamLalu = tB ? Math.round((Date.now() - tB) / 36e5) : null;
  if (!tB || Date.now() - tB > 36 * 36e5) masalah.push(['BACKUP', 'Backup terakhir ' + (tB ? info.backupJamLalu + ' jam lalu' : 'belum pernah') + '. Periksa pemicu pmBackupHarian (Apps Script › Triggers › Executions).']);
  const props = p.getProperties(); let ukuran = 0; Object.keys(props).forEach(k => { ukuran += k.length + String(props[k]).length; });
  info.persenProps = Math.round(ukuran / PM.BATAS_PROPS * 100);
  if (ukuran > PM.BATAS_PROPS * 0.8) masalah.push(['PROPS', 'Script Properties terpakai ' + info.persenProps + '% (batas ±500 KB). Simpan data besar di Drive/Sheet, bukan di Properties.']);
  info.kernel = typeof KERNEL_VERSI !== 'undefined' ? KERNEL_VERSI : '?';
  info.server = typeof VERSI_SERVER !== 'undefined' ? VERSI_SERVER : '?';
  if (info.kernel === '?') masalah.push(['KERNEL', 'Konstanta kernel tidak terbaca — pastikan file ini berada di project yang sama dengan Code.gs.']);
  info.masalah = masalah.map(m => m[1]);
  if (masalah.length) pmKirimPeringatan_(masalah, info);
  p.setProperty('PM_CEK_TERAKHIR', JSON.stringify({ pada: new Date().toISOString(), ok: !masalah.length, info: info }));
  return info;
}

function pmKirimPeringatan_(masalah, info) {
  const p = PropertiesService.getScriptProperties(), ke = p.getProperty('PM_EMAIL'); if (!ke) return;
  const baru = masalah.filter(m => { const t = Number(p.getProperty('PM_EMAIL_' + m[0]) || 0); return Date.now() - t > PM.JEDA_EMAIL_JAM * 36e5; });
  if (!baru.length || MailApp.getRemainingDailyQuota() < 5) return;
  MailApp.sendEmail(ke, '[Monitoring SAP] ' + baru.length + ' peringatan sistem',
    baru.map((m, i) => (i + 1) + '. ' + m[1]).join('\n\n') + '\n\n— Ringkasan: ' + JSON.stringify(info) + '\n\nEmail otomatis dari Pemantauan.gs (paling sering 1× per ' + PM.JEDA_EMAIL_JAM + ' jam per jenis masalah).');
  baru.forEach(m => p.setProperty('PM_EMAIL_' + m[0], String(Date.now())));
}

/* Pulihkan dari backup: buka folder "Backup Monitoring SAP" di Drive → pilih salinan → File › Make a copy,
   atau salin sheet yang rusak saja (klik kanan tab › Copy to › spreadsheet database). Jangan menimpa seluruh database tanpa backup terbaru. */
