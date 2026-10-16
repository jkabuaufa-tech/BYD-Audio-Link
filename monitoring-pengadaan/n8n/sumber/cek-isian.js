// n8n Code node "Cek Isian" — alur Siap Upload. Memeriksa kotak Konfigurasi SEBELUM menghubungi server,
// supaya isian yang belum diganti / salah format tidak dikirim (login gagal 5x = akun bot terkunci 5 menit).
const K = $input.first().json || {};
const salah = [];
const isi = (k, ket, pola, contoh) => {
  const v = String(K[k] === undefined || K[k] === null ? '' : K[k]).trim();
  if (!v || /^ISI[_ ]/i.test(v)) salah.push(`• ${k}: belum diisi (${ket})`);
  else if (pola && !pola.test(v)) salah.push(`• ${k}: formatnya tidak sesuai (${ket}, contoh ${contoh})`);
};
isi('proyek', 'ID Proyek di aplikasi', /^[\w.-]{1,40}$/, 'P01');
isi('namaProyek', 'nama proyek untuk judul laporan');
isi('namaBot', 'nama akun bot di aplikasi Monitoring');
isi('pinBot', 'PIN akun bot');
isi('telegramToken', 'token dari @BotFather', /^\d{6,}:[\w-]{30,}$/, '7123456789:AAH4xYz…');
isi('telegramChatId', 'Chat ID dari halaman getUpdates', /^-?\d{4,}$/, '123456789 atau -1001234567890');
if (!/^https:\/\/script\.google(usercontent)?\.com\/macros\/s\/[\w-]+\/exec$/.test(String(K.urlServer || '').trim()))
  salah.push('• urlServer: harus alamat Web App yang berakhiran /exec (jangan diubah bila tidak yakin)');
if (salah.length) throw new Error('Kotak "Konfigurasi" belum lengkap. Klik dua kali kotak Konfigurasi lalu perbaiki:\n' + salah.join('\n'));
return [{ json: K }];
