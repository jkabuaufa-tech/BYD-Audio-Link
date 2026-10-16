// n8n Code node "Susun Laporan" (Run Once for All Items) — alur Laporan Harian Monitoring SAP.
// Membaca hasil node sebelumnya, menilai prioritas, lalu menyusun pesan Telegram (≤ 3.900 karakter/pesan),
// email HTML, dan satu baris log audit. Tidak memanggil server apa pun.
const K = $('Konfigurasi').first().json;
const ambil = nama => { try { return $(nama).first().json || {}; } catch (e) { return {}; } };
const ping = ambil('Ping Server'), diag = ambil('Diagnostik Server');
const vt = ambil('Ringkasan Verifikasi Tagihan'), tim = ambil('Ringkasan Kantor AI'), nt = ambil('Pratinjau Notifikasi');

const esc = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const galat = r => (r && r.ok === false) ? String(r.error || r.galat || 'gagal') : (r && r.ok === true ? '' : 'tidak ada jawaban');
const sekarang = new Date();
const waktu = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(sekarang);
const versiModul = String((diag.modul && (diag.modul.versi || diag.modul)) || '-');
const banding = (a, b) => { const p = v => String(v).split('.').map(n => Number(n) || 0); const x = p(a), y = p(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };

// ---- Verifikasi Tagihan ----
const VT = Array.isArray(vt.data) ? vt.data : [];
const revisi = VT.filter(r => r.keputusan === 'BUTUH REVISI');
const kedaluwarsa = VT.filter(r => r.kedaluwarsa);
const lolos = VT.filter(r => r.keputusan === 'LOLOS' && !r.kedaluwarsa);
const kritis = revisi.filter(r => (r.teratas || []).some(t => /^KRITIS/i.test(t)));

// ---- Notifikasi (kontrak, dokumen vendor, tagihan, gudang) ----
const grup = (nt.pratinjau && Array.isArray(nt.pratinjau.grup)) ? nt.pratinjau.grup : [];
const merah = grup.reduce((a, g) => a + (g.item || []).filter(x => x.merah).length, 0);

// ---- Kantor AI ----
const eskalasi = Number(tim.eskalasi) || 0;

// ---- Prioritas ----
const skor = kritis.length * 3 + revisi.length + merah + eskalasi * 2;
const tingkat = skor === 0 ? 'NORMAL' : (kritis.length || eskalasi || merah >= 5) ? 'TINGGI' : 'PERHATIAN';
const ikonTingkat = { NORMAL: '🟢', PERHATIAN: '🟡', TINGGI: '🔴' }[tingkat];
const peringatan = [];
if (versiModul !== '-' && K.versiModulMinimal && banding(versiModul, K.versiModulMinimal) < 0) peringatan.push('Modul server ' + versiModul + ' lebih lama dari yang diharapkan ' + K.versiModulMinimal + ' → unggah server-modul terbaru.');
[['Verifikasi Tagihan', vt], ['Kantor AI', tim]].concat(K.akunAdmin ? [['Notifikasi', nt]] : []).forEach(([n, r]) => { const g = galat(r); if (g) peringatan.push(n + ': ' + g); });

// ---- Telegram (HTML) ----
const M = Number(K.maksButirPerGrup) || 6;
const B = [];
B.push(`<b>${ikonTingkat} Laporan Harian Monitoring SAP</b>\n${esc(K.namaProyek)} · <code>${esc(K.proyek)}</code>\n${esc(waktu)} WIB\nStatus: <b>${tingkat}</b> · server ${esc(ping.versiServer || '-')} · modul ${esc(versiModul)}`);
B.push(`\n💳 <b>Verifikasi Tagihan</b>\n• Butuh revisi: <b>${revisi.length}</b>${kritis.length ? ' (🔴 ' + kritis.length + ' kritis)' : ''}\n• Kedaluwarsa (perlu verifikasi ulang): <b>${kedaluwarsa.length}</b>\n• Lolos: ${lolos.length}` +
  (revisi.length ? '\n' + revisi.slice(0, M).map(r => `  – <b>${esc(r.id)}</b> ${esc(r.vendor || '')}${r.noKontrak ? ' · ' + esc(r.noKontrak) : ''}\n     ${esc((r.teratas || []).join(' | ') || r.ringkas || '')}`).join('\n') + (revisi.length > M ? `\n  +${revisi.length - M} lainnya` : '') : ''));
grup.forEach(g => {
  const L = g.item || [];
  B.push(`\n<b>${esc(g.judul)}</b> (${L.length})` + (L.length ? '\n' + L.slice(0, M).map(x => `• ${x.merah ? '🔴 ' : ''}${esc(x.judul)} — <i>${esc(x.nilai)}</i>${x.ket ? '\n   ' + esc(x.ket) : ''}`).join('\n') + (L.length > M ? `\n   +${L.length - M} lainnya` : '') : ''));
});
if (tim.ok && tim.ada) B.push(`\n🤖 <b>Kantor AI</b> (laporan ${esc(String(tim.pada || '').slice(0, 16).replace('T', ' '))})\n${esc(tim.ringkasan || '')}\n• Saran terbuka: ${tim.saran || 0} · Antrean input: ${tim.input || 0} · Draf surat: ${tim.draf || 0}${eskalasi ? '\n• 🔴 Eskalasi ≥ 3 hari: <b>' + eskalasi + '</b>' : ''}`);
else if (tim.ok) B.push('\n🤖 <b>Kantor AI</b>: belum ada laporan' + (tim.aktif ? '' : ' (Tim AI tidak aktif)'));
if (peringatan.length) B.push('\n⚠️ <b>Peringatan sistem</b>\n' + peringatan.map(p => '• ' + esc(p)).join('\n'));
if (K.urlAplikasi) B.push(`\n<a href="${esc(K.urlAplikasi)}">Buka aplikasi Monitoring</a>`);

const pesan = []; let cur = '';
B.forEach(b => { if ((cur + '\n' + b).length > 3900) { if (cur) pesan.push(cur); cur = b.slice(0, 3900); } else cur = cur ? cur + '\n' + b : b; });
if (cur) pesan.push(cur);

// ---- Email (HTML) ----
const html = '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#0B1F3A">' +
  pesan.join('\n').split('\n').map(l => l.trim() ? l : '<br>').join('<br>') + '<hr><small>Dikirim otomatis oleh n8n · alur Laporan Harian Monitoring SAP. Jangan balas email ini.</small></div>';

return [{ json: {
  tingkat, skor, pesanTelegram: pesan, subjekEmail: `[${tingkat}] Laporan Harian Monitoring SAP · ${K.namaProyek} · ${waktu}`, emailHtml: html,
  log: { waktu: sekarang.toISOString(), proyek: K.proyek, tingkat, skor, butuhRevisi: revisi.length, kritis: kritis.length, kedaluwarsa: kedaluwarsa.length, lolos: lolos.length,
    notifMerah: merah, notifTotal: (nt.pratinjau && nt.pratinjau.total) || 0, eskalasiAI: eskalasi, versiServer: ping.versiServer || '', versiModul, peringatan: peringatan.join(' | '), eksekusi: $execution.id }
} }];
