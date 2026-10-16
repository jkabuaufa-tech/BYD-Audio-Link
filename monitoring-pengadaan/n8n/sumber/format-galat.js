// n8n Code node "Format Galat" — alur Penangan Galat (Error Trigger).
const e = $input.first().json || {};
const esc = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const x = e.execution || {}, w = e.workflow || {}, er = x.error || (e.trigger && e.trigger.error) || {};
const node = x.lastNodeExecuted || (er.node && er.node.name) || '-';
const pesan = String(er.message || er.description || 'Galat tanpa pesan');
const login = /LOGIN DITOLAK/.test(pesan);
const teks = `<b>⛔ Otomasi Monitoring SAP gagal</b>\nAlur: <b>${esc(w.name || '-')}</b>\nNode: <code>${esc(node)}</code>\nWaktu: ${esc(new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }).format(new Date()))} WIB\n\n${esc(pesan).slice(0, 1500)}` +
  (login ? '\n\n🔐 Kredensial bot ditolak. Jangan jalankan ulang sebelum Nama/PIN diperbaiki (akun terkunci setelah 5x gagal).' : '') +
  (x.url ? `\n\n<a href="${esc(x.url)}">Buka eksekusi di n8n</a>` : '');
return [{ json: { teks, login, alur: w.name || '', node, pesan } }];
