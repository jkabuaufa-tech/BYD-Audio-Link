  /* [2.9.8] MODE RUMUS ASLI TEMPLATE: bila window.mp298Asli menyiapkan isian "asli" (hanya sel isian/konstanta, tanpa mengganti rumus),
   * berkas disusun TANPA perbaikan 2.9.3/2.9.6 (tanggal "-", pemetaan ulang BAPP/rincian, gaya/sembunyi baris, logo kop, rapikan narasi).
   * Hasilnya diverifikasi terhadap angka aplikasi (nilai kontrak, prestasi, volume per item); bila tidak cocok / tidak muat di tata letak
   * template, otomatis kembali ke mode perbaikan 2.9.6 dan alasannya dicatat (I.modeRumus, I.alasanMode) — angka tidak pernah salah. */
  async function bangun(K) {
    const I0 = isian(K);
    let asli = null; try { asli = typeof window.mp298Asli === 'function' ? window.mp298Asli(K, I0) : null; } catch (e) { asli = { alasan: e.message }; }
    if (asli && asli.I) {
      try {
        const B = await bangunInti(asli.I, true);
        const cek = asli.verifikasi ? asli.verifikasi(B.hasil) : '';
        if (!cek) { B.I.modeRumus = 'ASLI'; return B; }
        I0.alasanMode = cek;
      } catch (e) { I0.alasanMode = e.message; }
    } else if (asli && asli.alasan) I0.alasanMode = asli.alasan;
    const B = await bangunInti(I0, false); B.I.modeRumus = 'PERBAIKAN_296'; return B;
  }
  async function bangunInti(I, asli) {
    const fmt = (window.__MP292_FORMAT || {})[I.jenis]; if (!fmt) throw new Error('Template format baku belum terpasang (butuh pembaruan 2.9.2).');
    const F = await XLH.bukaZip(b64(fmt)), enc = new TextEncoder(), dec = new TextDecoder();
    if (!asli) bersihMedia(F, I.jenis, dec, enc);
    let W = await XLH.muat(F);
    const ubahSheet = (sh, fn) => { const s = W.byNama[sh.toUpperCase()]; if (!s) throw new Error('Sheet "' + sh + '" tidak ada di format baku.'); F.set(s.path, enc.encode(fn(dec.decode(F.get(s.path))))); };
    const tulisSemua = T => Object.keys(T).forEach(sh => ubahSheet(sh, x => { Object.entries(T[sh]).forEach(([ref, v]) => { x = isiSel(x, ref, v); }); return x; }));
    if (!asli) Object.keys(I.salinGaya || {}).forEach(sh => ubahSheet(sh, x => { const a0 = x; I.salinGaya[sh].forEach(([dari, ke]) => { x = salinGayaBaris(x, dari, ke, a0); }); return x; }));
    tulisSemua(I.tulisan);
    if (!asli) {
      Object.keys(I.sembunyi || {}).forEach(sh => ubahSheet(sh, x => { I.sembunyi[sh].forEach(r => { x = barisSembunyi(x, r, true); }); return x; }));
      Object.keys(I.tampil || {}).forEach(sh => ubahSheet(sh, x => { I.tampil[sh].forEach(r => { x = barisSembunyi(x, r, false); }); return x; }));
      W.sheets.forEach(s => { const x = dec.decode(F.get(s.path)), y = tanggalAman(x); if (y !== x) F.set(s.path, enc.encode(y)); });
    }
    W = await XLH.muat(F);
    let { hasil } = XLH.hitungSemua(W);
    if (asli && typeof I.tahap2 === 'function') {   // konstanta yang bergantung hasil hitung (mis. nominal uang muka) → tulis nilai, hitung ulang
      const T2 = I.tahap2(hasil); if (T2 && Object.keys(T2).length) { tulisSemua(T2); W = await XLH.muat(F); hasil = XLH.hitungSemua(W).hasil; }
    }
    W.sheets.forEach(s => { const H = hasil.get(s.nama); if (H && H.size) F.set(s.path, enc.encode(XLH.tulisNilai(dec.decode(F.get(s.path)), H))); });
    if (!asli && XLR && XLR.rapikan) { try { XLR.rapikan(W, hasil, F, LEMBAR[I.jenis]); W = await XLH.muat(F); } catch (e) { console.warn('[MP293] rapikan', e); } }   // narasi panjang dibungkus utuh
    return { I, W, hasil, F };
  }
