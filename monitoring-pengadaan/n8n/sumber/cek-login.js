// n8n Code node "Gerbang Login" — memeriksa jawaban panggilan POST pertama (diagServer).
// Bila kredensial ditolak, alur DIHENTIKAN agar tidak menambah hitungan gagal masuk
// (kernel mengunci akun 5 menit setelah 5x gagal).
const r = $input.first().json || {};
if (r.ok === true) return [{ json: r }];
const pesan = String(r.error || r.galat || r.message || 'Server tidak mengirim jawaban JSON');
const login = /sandi|pin|kata sandi|dikunci|terkunci|login|masuk|pengguna tidak|tidak aktif|akses proyek/i.test(pesan);
throw new Error((login ? '[LOGIN DITOLAK] ' : '[SERVER] ') + pesan +
  (login ? ' → periksa Nama/PIN akun bot (di kotak Konfigurasi atau kredensial "Monitoring SAP – Akun Bot") dan hak akses proyek. Alur dihentikan agar akun tidak terkunci.' : ''));
