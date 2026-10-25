/* MP2620 — PEMBARUAN 2.6.20: MODE MANUAL VERIFIKASI TAGIHAN (Admin) — butuh Modul server 1.9.5 · fitur "vtManual" (aditif; tanpa mengubah Code.gs & data)
 * Admin mengaktifkan / mematikan mode manual dari panel Bundel PDF. Mode manual = PDF tagihan tidak dikirim ke penyedia AI (diblokir di server). */
(function () {
  if (window.MP2620) return; window.MP2620 = true;
  const pesan = (m, t) => { if (typeof notif === 'function') notif(m, t || ''); };
  window.mp2620Manual = async aktif => {
    const VT = window.MP230_VT || {}, s = (VT.info && VT.info.setelan) || {};
    const teks = aktif ? 'Aktifkan mode manual? PDF tagihan tidak lagi dikirim ke penyedia AI; verifikasi dilakukan manual oleh Admin.'
      : 'Izinkan AI membaca dokumen tagihan? Isi PDF (NPWP, KTP, rekening, faktur) akan dikirim ke penyedia AI yang aktif di Setelan Asisten AI.';
    const ya = typeof tanya === 'function' ? await tanya(teks, { judul: 'Mode verifikasi tagihan', ok: aktif ? 'Aktifkan mode manual' : 'Izinkan AI' }) : window.confirm(teks);
    if (!ya) return;
    try {
      const r = await window.regAksi('vtSetel', { data: Object.assign({}, s, { tanpaAI: !!aktif }) });
      VT.info = Object.assign({}, VT.info || {}, r); pesan(aktif ? 'Mode manual aktif: PDF tagihan tidak dikirim ke AI.' : 'AI diizinkan membaca dokumen tagihan.', 'ok');
      const id = window.MP219_KEU && window.MP219_KEU.rec && window.MP219_KEU.rec.id; if (id && typeof window.mp240Sub === 'function') window.mp240Sub(id, 'bundel');
    } catch (e) { pesan('Gagal mengubah mode: ' + e.message, 'err'); }
  };
})();
