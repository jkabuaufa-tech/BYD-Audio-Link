  async function bangun(K) {
    const I = isian(K), fmt = (window.__MP292_FORMAT || {})[I.jenis]; if (!fmt) throw new Error('Template format baku belum terpasang (butuh pembaruan 2.9.2).');
    const F = await XLH.bukaZip(b64(fmt)), enc = new TextEncoder(), dec = new TextDecoder();
    bersihMedia(F, I.jenis, dec, enc);
    let W = await XLH.muat(F);
    const ubahSheet = (sh, fn) => { const s = W.byNama[sh.toUpperCase()]; if (!s) throw new Error('Sheet "' + sh + '" tidak ada di format baku.'); F.set(s.path, enc.encode(fn(dec.decode(F.get(s.path))))); };
    Object.keys(I.salinGaya || {}).forEach(sh => ubahSheet(sh, x => { const asli = x; I.salinGaya[sh].forEach(([dari, ke]) => { x = salinGayaBaris(x, dari, ke, asli); }); return x; }));
    Object.keys(I.tulisan).forEach(sh => ubahSheet(sh, x => { Object.entries(I.tulisan[sh]).forEach(([ref, v]) => { x = isiSel(x, ref, v); }); return x; }));
    Object.keys(I.sembunyi || {}).forEach(sh => ubahSheet(sh, x => { I.sembunyi[sh].forEach(r => { x = barisSembunyi(x, r, true); }); return x; }));
    Object.keys(I.tampil || {}).forEach(sh => ubahSheet(sh, x => { I.tampil[sh].forEach(r => { x = barisSembunyi(x, r, false); }); return x; }));
    W.sheets.forEach(s => { const x = dec.decode(F.get(s.path)), y = tanggalAman(x); if (y !== x) F.set(s.path, enc.encode(y)); });
    W = await XLH.muat(F);
    const { hasil } = XLH.hitungSemua(W);
    W.sheets.forEach(s => { const H = hasil.get(s.nama); if (H && H.size) F.set(s.path, enc.encode(XLH.tulisNilai(dec.decode(F.get(s.path)), H))); });
    if (XLR && XLR.rapikan) { try { XLR.rapikan(W, hasil, F, LEMBAR[I.jenis]); W = await XLH.muat(F); } catch (e) { console.warn('[MP293] rapikan', e); } }   // narasi panjang dibungkus utuh
    return { I, W, hasil, F };
  }