/* Simulator penyedia AI (tanpa API key). Meniru format respons Anthropic / Google / OpenAI-compatible,
 * protokol agen {"aksi","arg","alasan"}, mode analisis JSON, dan galat nyata (401/402/503). */
(function () {
  var rp = function (n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); };
  var hari = function (d) { var t = new Date(Date.now() + (d || 0) * 864e5); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
  function provDari(url) { return /anthropic/.test(url) ? 'anthropic' : /googleapis/.test(url) ? 'google' : /deepseek/.test(url) ? 'deepseek' : /groq/.test(url) ? 'groq' : /openrouter/.test(url) ? 'openrouter' : 'openai'; }
  function status(prov, key) {
    if (/^https?:/i.test(key)) return 401;   // key berisi URL selalu ditolak penyedia
    var s = DEMO.skenario;
    if (s === 'sibuk' && prov === 'google') return 503;
    if (s === 'uji') return { anthropic: 401, google: 503, openai: 401, deepseek: 402, groq: 401 }[prov] || 200;
    return 200;
  }
  function galatBody(prov, kode, key) {
    if (kode === 503) return { error: { code: 503, message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.', status: 'UNAVAILABLE' } };
    if (kode === 402) return { error: { message: 'Insufficient Balance', type: 'unknown_error' } };
    if (prov === 'anthropic') return { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } };
    if (prov === 'openai') return { error: { message: 'Incorrect API key provided: ' + String(key).slice(0, 8) + '****' + String(key).slice(-4) + '. You can find your API key at https://platform.openai.com/account/api-keys.', type: 'invalid_request_error' } };
    return { error: { message: 'Invalid API Key', type: 'invalid_request_error' } };
  }
  function bungkus(fmt, teks, model) {
    if (fmt === 'anthropic') return { id: 'msg_demo', type: 'message', role: 'assistant', model: model, content: [{ type: 'text', text: teks }], stop_reason: 'end_turn', usage: { input_tokens: 900, output_tokens: 180 } };
    if (fmt === 'google') return { candidates: [{ content: { role: 'model', parts: [{ text: teks }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 180 } };
    return { id: 'chatcmpl-demo', model: model, choices: [{ index: 0, message: { role: 'assistant', content: teks }, finish_reason: 'stop' }], usage: { prompt_tokens: 900, completion_tokens: 180 } };
  }
  window.demoLLM = function (url, o) {
    var b = JSON.parse(o.payload), h = o.headers || {}, fmt, sys, msgs, key, model = b.model || '';
    if (/anthropic/.test(url)) { fmt = 'anthropic'; sys = b.system; msgs = b.messages.map(function (m) { return { role: m.role, teks: m.content }; }); key = h['x-api-key']; }
    else if (/googleapis/.test(url)) { fmt = 'google'; sys = b.systemInstruction.parts[0].text; msgs = b.contents.map(function (c) { return { role: c.role === 'model' ? 'assistant' : 'user', teks: c.parts.map(function (p) { return p.text; }).join('') }; }); key = h['x-goog-api-key']; model = (/models\/([^:]+):/.exec(url) || [])[1] || ''; }
    else { fmt = 'openai'; sys = b.messages[0].content; msgs = b.messages.slice(1).map(function (m) { return { role: m.role, teks: m.content }; }); key = String(h.Authorization || '').replace(/^Bearer /, ''); }
    var prov = provDari(url), kode = status(prov, key);
    if (kode !== 200) return { kode: kode, teks: galatBody(prov, kode, key) };
    return { kode: 200, teks: bungkus(fmt, jawab(sys, msgs), model) };
  };

  /* ---------- isi jawaban ---------- */
  function niat(t) {
    t = String(t || '').toLowerCase();
    if (/draf|ba klarifikasi|surat|addendum|perjanjian/.test(t)) return 'draf';
    if (/paket|pbj/.test(t)) return 'pbj';
    if (/ajukan|bayar|pembayaran/.test(t)) return 'bayar';
    if (/terima|penerimaan|surat jalan/.test(t)) return 'terima';
    if (/tagihan|dokumen|checklist|lengkap/.test(t)) return 'tagihan';
    if (/stok|gudang|material|bon/.test(t)) return 'gudang';
    if (/kontrak|register|vendor|nilai/.test(t)) return 'kontrak';
    return '';
  }
  var aksi = function (nama, arg, alasan) { return JSON.stringify({ aksi: nama, arg: arg, alasan: alasan }); };
  function jawab(sys, msgs) {
    var last = msgs[msgs.length - 1].teks;
    if (/MODE ANALISIS/.test(sys)) return JSON.stringify(analisis(last));
    if (/Koneksi OK/.test(last)) return 'Koneksi OK';
    var agen = /MODE AGEN/.test(sys), tanya = '';
    for (var i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'user' && !/^(HASIL AKSI|\[SISTEM\])/.test(msgs[i].teks)) { tanya = msgs[i].teks; break; }
    var n = niat(tanya);
    var hasil = /^HASIL AKSI (\w+)[^\n]*:\n([\s\S]*)$/.exec(last);
    if (hasil) return setelahAksi(hasil[1], hasil[2], n, tanya);
    if (n === 'draf') return drafBA(sys);
    if (!agen) return bantuan();
    if (n === 'pbj') { var bon = /solar/i.test(tanya) ? 'Solar Industri' : /semen/i.test(tanya) ? 'Semen PCC' : /besi/i.test(tanya) ? 'Besi Beton D13/D16' : 'Material Struktur';
      return aksi('savePBJ', { nama: 'Paket ' + bon + ' — ' + hari().slice(0, 7), catatan: 'Disiapkan Asisten AI dari permintaan: ' + tanya.slice(0, 120) }, 'Bon ' + bon + ' belum dipaketkan ke PBJ, sehingga proses PR/RFQ/PO belum bisa dimulai.'); }
    if (n === 'bayar') return aksi('baca', { jenis: 'progres', batas: 20 }, 'Mengambil id & versi tagihan terbaru sebelum menyiapkan pengajuan pembayaran.');
    if (n === 'terima') return aksi('bacaSemua', { koleksi: 'permintaan' }, 'Melihat isi bon permintaan & sisa volume.');
    if (n === 'tagihan') return aksi('checklistRingkas', {}, 'Melihat kelengkapan checklist dokumen per tagihan.');
    if (n === 'gudang') return aksi('gudangBaca', {}, 'Melihat transaksi penerimaan & pengeluaran gudang.');
    if (n === 'kontrak') return aksi('bacaSemua', { koleksi: 'list' }, 'Membaca register kontrak proyek.');
    return bantuan();
  }
  function baris(teks) { try { var j = JSON.parse(teks); if (j.baris) return j.baris; for (var k in j) if (j[k] && j[k].baris) return j[k].baris; } catch (e) { } return []; }
  function setelahAksi(nama, teks, n, tanya) {
    var R = baris(teks);
    if (nama === 'baca' && n === 'bayar') {
      var ba = (/BA-[\w\/.-]+/i.exec(tanya) || [])[0], t = R.find(function (r) { return ba ? String(r.nomorBA).toUpperCase() === ba.toUpperCase() : r.baTerbit && (!r.bayar || r.bayar.status === 'BELUM'); }) || R[0];
      if (!t) return 'Tidak ada tagihan yang dapat diajukan.';
      return aksi('keuanganProgres', { id: t.id, versi: t.versi, bayar: { status: 'DIAJUKAN', tglAju: hari(), noAju: '', catatan: 'Pengajuan disiapkan Asisten AI' } }, 'Tagihan ' + t.nomorBA + ' (' + rp(t.nilai) + ') sudah BA terbit dan belum diajukan.');
    }
    if (nama === 'bacaSemua' && n === 'terima') {
      var b = R[0]; if (!b) return 'Tidak ada bon permintaan.';
      return aksi('gudangTerimaBon', { bonNomor: b.nomor, tanggal: hari(), noSJ: 'SJ-DEMO-0' + (Math.floor(Math.random() * 90) + 10), baris: [{ idx: 0, qty: 100 }], ket: 'Kiriman bertahap' }, 'Bon ' + b.nomor + ' masih memiliki sisa volume yang belum diterima.');
    }
    if (nama === 'bacaSemua') {
      var K = R.slice().sort(function (a, b) { return (b.nilai || 0) - (a.nilai || 0); });
      return 'Register berisi **' + R.length + ' kontrak**. Nilai terbesar: **' + (K[0] ? K[0].noKontrak + ' — ' + K[0].namaVendor + ' (' + rp(K[0].nilai) + ')' : '-') + '**.\n\n| No. Kontrak | Vendor | Nilai | No. PO |\n|---|---|---:|---|\n' +
        K.slice(0, 6).map(function (r) { return '| ' + r.noKontrak + ' | ' + r.namaVendor + ' | ' + rp(r.nilai) + ' | ' + (r.noPO || '— belum') + ' |'; }).join('\n') +
        '\n\nKontrak tanpa No. PO belum dapat ditagihkan. Gunakan Perintah Cepat **Audit 20 kontrak** untuk melihat dokumen yang kurang per kontrak.';
    }
    if (nama === 'checklistRingkas') {
      var belum = R.filter(function (r) { return !r.siap; });
      return 'Dari **' + R.length + ' checklist** tagihan yang tercatat, **' + belum.length + '** belum siap diajukan:\n\n| ID tagihan | Kategori | Lengkap | Verifikasi |\n|---|---|---:|---|\n' +
        R.map(function (r) { return '| ' + r.id + ' | ' + r.kategori + ' | ' + r.lengkap + '/' + r.total + ' | ' + (r.siap ? 'siap' : 'belum') + ' |'; }).join('\n') +
        '\n\nLangkah melengkapi:\n1. Unggah PDF dokumen umum (SPKTV, Kwitansi, Invoice, Faktur Pajak, E-Nofa) di menu Checklist Tagihan.\n2. Dokumen yang tidak relevan diisi **N/A** dengan alasan minimal 12 karakter.\n3. Setelah lengkap, minta **verifikasi Admin** — tanpa itu status bayar tidak dapat diubah ke DIAJUKAN.';
    }
    if (nama === 'gudangBaca') {
      var j = {}; try { j = JSON.parse(teks); } catch (e) { }
      var M = (j.masuk && j.masuk.baris) || [], Kl = (j.keluar && j.keluar.baris) || [];
      return 'Gudang mencatat **' + M.length + ' penerimaan** dan **' + Kl.length + ' pengeluaran** aktif.\n\n| Tanggal | Jenis | Material | Qty |\n|---|---|---|---:|\n' +
        M.map(function (r) { return '| ' + r.tanggal + ' | Masuk (' + r.bonNomor + ') | ' + r.uraian + ' | ' + r.qty + ' ' + r.sat + ' |'; }).concat(Kl.map(function (r) { return '| ' + r.tanggal + ' | Keluar (' + (r.untuk || '-') + ') | ' + r.uraian + ' | ' + r.qty + ' ' + r.sat + ' |'; })).join('\n') +
        '\n\n**Perhatian:** pengeluaran Semen PCC melebihi penerimaan — jalankan Perintah Cepat **Cek stok minus** untuk rincian dan koreksinya.';
    }
    return 'Data sudah saya baca (' + R.length + ' baris). ' + bantuan();
  }
  function bantuan() {
    return 'Saya Asisten AI **mode demo**. Coba perintah berikut:\n- "Kontrak mana yang nilainya terbesar?"\n- "Tagihan mana yang dokumennya belum lengkap?"\n- "Cek stok gudang"\n- "Buatkan paket PBJ untuk bon solar"\n- "Ajukan pembayaran tagihan BA-JSL/001"\n- "Buatkan draf BA Klarifikasi dengan subkontraktor"';
  }
  function drafBA(sys) {
    var vendor = /Geoteknik/.test(sys) ? 'PT Geoteknik Andalan' : '[nama subkontraktor]';
    return '### BERITA ACARA KLARIFIKASI\n**Nomor:** [..../BA-KLR/JSL/' + hari().slice(0, 4) + ']\n\nPada hari ini, [hari], tanggal [tanggal], bertempat di Kantor Proyek Pembangunan Jembatan Sungai Lematang, telah dilaksanakan klarifikasi antara:\n\n1. **Pihak Pertama** — [nama], [jabatan], mewakili Kontraktor Pelaksana.\n2. **Pihak Kedua** — [nama], [jabatan], mewakili ' + vendor + '.\n\nKedua pihak menyepakati hal-hal berikut:\n\n**1. Lingkup Pekerjaan** — sesuai BOQ terlampir; pekerjaan di luar BOQ hanya dapat dilaksanakan atas perintah tertulis (Site Instruction) Pihak Pertama.\n\n**2. Spesifikasi Teknis** — mengacu pada Spesifikasi Teknis Proyek dan gambar kerja revisi terakhir; material wajib mendapat approval sebelum didatangkan.\n\n**3. Waktu Pelaksanaan** — [..] hari kalender sejak SPMK; keterlambatan dikenakan denda 1‰ per hari, maksimal 5% dari nilai kontrak.\n\n**4. Harga dan Pembayaran** — harga satuan tetap (*fixed unit price*); pembayaran berdasarkan BA Opname bulanan, retensi 5% dibayarkan setelah masa pemeliharaan.\n\n**5. Jaminan** — Jaminan Pelaksanaan 5% dan Jaminan Uang Muka (bila ada) dari bank umum, berlaku hingga serah terima.\n\n**6. Lain-lain** — hal yang belum diatur mengikuti Surat Perjanjian; perselisihan diselesaikan secara musyawarah.\n\nDemikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.\n\n| Pihak Pertama | Pihak Kedua |\n|---|---|\n| [nama & tanda tangan] | [nama & tanda tangan] |\n\n*Draf ini perlu ditinjau fungsi Kontrak & Legal sebelum ditandatangani.*';
  }

  /* ---------- mode analisis (membaca DATA yang dihitung server) ---------- */
  function analisis(teks) {
    var judul = (/PERINTAH: (.*)/.exec(teks) || [])[1] || '', d = {};
    var m = /=== DATA[^\n]*\n([\s\S]*?)\n=== AKHIR DATA ===/.exec(teks); try { d = JSON.parse(m[1]); } catch (e) { }
    if (/Audit/.test(judul)) {
      var K = d.kontrak || [], skor = function (k) { return parseInt(k.skor, 10) || 0; }, kurang = K.filter(function (k) { return skor(k) < 5; });
      return { ringkasan: d.totalKontrak + ' kontrak di register diperiksa; ' + kurang.length + ' belum lengkap. Prioritas pada kontrak bernilai besar tanpa PO dan WBS, karena keduanya menahan proses posting dan penagihan.',
        temuan: kurang.slice(0, 5).map(function (k) { return { judul: k.noKontrak + ' · ' + k.vendor + ' — kelengkapan ' + k.skor, detail: 'Kurang: ' + k.kurang.join(', ') + ' · nilai ' + rp(k.nilai), tingkat: skor(k) <= 1 ? 'tinggi' : skor(k) <= 3 ? 'sedang' : 'rendah' }; }),
        saran: [{ judul: 'Telusuri register ' + (kurang[0] || {}).noKontrak, aksi: 'baca', arg: { jenis: 'list', cari: (kurang[0] || {}).noKontrak }, dampak: 'Melihat item & dokumen kontrak sebelum melengkapi PR/RFQ/PO/TOP' },
          { judul: 'Lengkapi kode WBS di seluruh item kontrak bernilai terbesar', aksi: '', dampak: 'Register dapat diposting ke Master Kontrak' },
          { judul: 'Minta penerbitan PO di SAP untuk kontrak tanpa PO', aksi: '', dampak: 'Tagihan vendor dapat diproses tepat waktu' }] };
    }
    if (/tagihan/i.test(judul)) {
      var T = d.tagihan || [];
      return { ringkasan: T.length + ' tagihan belum dibayar dan checklist dokumennya belum lengkap/terverifikasi. Tagihan dengan nilai terbesar perlu didahulukan agar arus kas vendor terjaga.',
        temuan: T.slice(0, 5).map(function (t) { return { judul: t.nomorBA + ' · ' + t.noKontrak + ' — checklist ' + t.lengkap, detail: (t.baTerbit ? '' : 'BA belum terbit. ') + 'Kurang: ' + t.kurang.slice(0, 6).join(', ') + (t.kurang.length > 6 ? ' dan lainnya' : '') + ' · ' + rp(t.nilai) + ' · bayar ' + t.bayar, tingkat: t.nilai > 5e8 ? 'tinggi' : 'sedang' }; }),
        saran: [{ judul: 'Lihat ringkasan checklist semua tagihan', aksi: 'checklistRingkas', arg: {}, dampak: 'Mengetahui posisi lengkap/total & status verifikasi' },
          { judul: 'Unggah PDF dokumen umum (SPKTV, Kwitansi, Invoice, Faktur Pajak, E-Nofa)', aksi: '', dampak: 'Sebagian besar kekurangan tertutup sekaligus' },
          { judul: 'Isi N/A beralasan untuk dokumen yang tidak relevan, lalu minta verifikasi Admin', aksi: '', dampak: 'Status bayar dapat diubah ke DIAJUKAN' }] };
    }
    if (/stok/i.test(judul)) {
      var S = d.stokMinus || [], B = d.bonBelumPenuh || [], b0 = B[0] || {}, c0 = (b0.contoh || [])[0] || {};
      return { ringkasan: S.length + ' material bersaldo minus dan ' + d.jumlahBonBelumPenuh + ' bon belum diterima penuh. Saldo minus biasanya terjadi karena pengeluaran dicatat sebelum penerimaannya.',
        temuan: S.map(function (s) { return { judul: s.uraian + ' — saldo ' + s.saldo + ' ' + s.sat, detail: 'Masuk ' + s.masuk + ', keluar ' + s.keluar + (s.minusPertama ? ' · mulai minus ' + s.minusPertama.tanggal : ''), tingkat: 'tinggi' }; })
          .concat(B.slice(0, 3).map(function (x) { return { judul: x.nomor + ' (' + x.departemen + ') — ' + x.itemBelum + ' item belum lengkap', detail: 'Umur bon ' + x.umurHari + ' hari · ' + x.contoh.map(function (c) { return c.uraian + ' sisa ' + c.sisa + ' ' + c.sat; }).join('; '), tingkat: x.umurHari > 14 ? 'sedang' : 'rendah' }; })),
        saran: [{ judul: 'Periksa pengeluaran ' + ((S[0] || {}).uraian || 'material'), aksi: 'gudangBaca', arg: { jenis: 'keluar', cari: (S[0] || {}).kode || '' }, dampak: 'Menemukan transaksi pengeluaran yang perlu dibatalkan & dicatat ulang' },
          { judul: 'Catat penerimaan ' + (c0.uraian || 'material') + ' untuk ' + (b0.nomor || 'bon'), aksi: 'gudangTerimaBon', arg: { bonNomor: b0.nomor, tanggal: hari(), noSJ: 'SJ-DEMO-77', baris: [{ idx: c0.idx || 0, qty: c0.sisa || 1 }] }, dampak: 'Sisa bon tertutup (lampiran surat jalan & foto tetap wajib)' },
          { judul: 'Konfirmasi jadwal kirim ke vendor untuk bon berumur > 14 hari', aksi: '', dampak: 'Pekerjaan lapangan tidak tertahan material' }] };
    }
    var N = d.notifikasi || [], G = d.gudang || {}, TL = (d.tagihanBelumLengkap || {}).teratas || [];
    return { ringkasan: 'Minggu ini ada ' + N.reduce(function (a, g) { return a + (g.jumlah || 0); }, 0) + ' hal dari notifikasi, ' + TL.length + ' tagihan tertahan dokumen, dan ' + (G.jumlahBonBelumPenuh || 0) + ' bon belum diterima penuh.',
      temuan: N.filter(function (g) { return g.jumlah; }).map(function (g) { return { judul: g.grup + ' (' + g.jumlah + ')', detail: g.item.slice(0, 3).map(function (x) { return x.judul + ' — ' + x.nilai; }).join('; '), tingkat: /berakhir|habis/i.test(g.grup) ? 'tinggi' : 'sedang' }; }),
      saran: [{ judul: 'Buat paket PBJ untuk bon Solar Industri', aksi: 'savePBJ', arg: { nama: 'Paket Solar Industri — ' + hari().slice(0, 7), catatan: 'Dari BON-JSL/027' }, dampak: 'PR/RFQ dapat diproses minggu ini (Pengadaan)' },
        { judul: 'Perpanjang Jaminan Pelaksanaan PT Geoteknik Andalan sebelum habis', aksi: 'arsipBaca', arg: { cari: 'Geoteknik' }, dampak: 'Kontrak tetap terlindungi jaminan (Pengadaan/Keuangan)' },
        { judul: 'Rapat koordinasi Gudang untuk bon berumur > 14 hari', aksi: '', dampak: 'Kiriman material terjadwal (Gudang)' }] };
  }
})();
