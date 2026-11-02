/* MP2102 — KARTU GUDANG RINGKAS · FOTO PENERIMAAN PER MATERIAL TAMPIL PER ITEM · KINERJA (2.10.3; Modul server 1.10.8)
 *  1. Keterangan Kartu Gudang (layar, cetak LOGINV-09, Excel): GR → "Masuk - BAPM: <no> | SPM: <no>",
 *     GI → "Keluar - Diambil oleh: <penerima> | Untuk keperluan: <untuk>". Rujukan BAPM/SPM dibaca dari BK (refProgres),
 *     alokasi Bon → kontrak, dan item Register ber-No Bon; tanpa mengubah data.
 *  2. Riwayat & daftar kiriman menampilkan foto SETIAP item (dulu hanya foto item pertama kiriman → terlihat 1 foto global).
 *  3. Kinerja: foto per material diunggah paralel (3 sekaligus), indeks rujukan di-cache, penggabung MutationObserver di awal paket. */
(function () {
  'use strict';
  if (window.__MP2102__) return; window.__MP2102__ = true;
  const S = v => String(v == null ? '' : v).trim();
  const ambil = (nm, fb) => { try { const v = (0, eval)(nm); return v === undefined || v === null ? fb : v; } catch (e) { return fb; } };

  /* ---------- 1. rujukan BAPM & SPM untuk baris GR (dipakai Kartu Gudang) ---------- */
  let C = { sig: '', f: null };
  function indeks() {
    const P = ambil('PROG', {}).data || [], R = ambil('REG', {}).data || [], A = (window.MP214 && window.MP214.alok) || [];
    const sig = P.length + '|' + R.length + '|' + A.length + '|' + P.reduce((a, e) => a + (e.versi || 0), 0);
    if (C.f && C.sig === sig) return C.f;
    const byId = {}, byK = {}, alok = {}, bonReg = {};
    P.forEach(e => { byId[e.id] = e; if (S(e.nomorBA)) (byK[e.noKontrak] = byK[e.noKontrak] || []).push(e); });
    Object.keys(byK).forEach(k => byK[k].sort((a, b) => S(a.tanggalBA || a.tanggal).localeCompare(S(b.tanggalBA || b.tanggal))));
    A.forEach(a => { if (!a.batal && a.noKontrak) alok[a.bonNomor + '|' + Number(a.bonIdx)] = a.noKontrak; });
    R.forEach(r => (r.items || []).forEach(it => { const b = S(it.noPermintaan || it.noBonPermintaan); if (b) (bonReg[b] = bonReg[b] || []).push({ k: r.noKontrak, kode: S(it.kode), ur: S(it.uraian).toLowerCase() }); }));
    const f = r => {
      const e = byId[r.refProgres];
      let spm = S(r.noKontrak) || (e && S(e.noKontrak)) || alok[r.bonNomor + '|' + Number(r.bonIdx)] || '';
      if (!spm) { const c = (bonReg[r.bonNomor] || []).find(x => (x.kode && x.kode === S(r.kode)) || x.ur === S(r.uraian).toLowerCase()); if (c) spm = c.k; }
      let ba = e ? S(e.nomorBA) : /^OTOMATIS /.test(S(r.noSJ)) ? S(r.noSJ).slice(9) : '';
      if (!ba && spm && byK[spm]) { const L = byK[spm], t = S(r.tanggal); const x = L.find(z => S(z.tanggalBA || z.tanggal).slice(0, 10) >= t) || L[L.length - 1]; ba = x ? S(x.nomorBA) : ''; }
      return { ba, spm };
    };
    C = { sig, f }; return f;
  }
  window.mp2102RujukanBA = () => { try { return indeks(); } catch (e) { return () => ({}); } };
  window.mp2102KetGR = r => { const x = window.mp2102RujukanBA()(r) || {}; return 'Masuk - BAPM: ' + (x.ba || '-') + ' | SPM: ' + (x.spm || '-'); };
  window.mp2102KetGI = r => 'Keluar - Diambil oleh: ' + (S(r.penerima) || '-') + ' | Untuk keperluan: ' + (S(r.untuk) || S(r.ket) || '-');

  /* ---------- 2. peringatan modul server ---------- */
  const srv = f => { try { return typeof window.mp220Srv === 'function' && !!window.mp220Srv(f); } catch (e) { return false; } };
  let _cek = 0;
  function cekModul() {
    const md = document.getElementById('mp223FM') || document.getElementById('mp273Modal'); if (!md || md.querySelector('.mp2102-w') || _cek++ > 2000) return;
    if (srv('fotoPerMaterial') && !srv('fotoPerMaterialLangsung')) md.insertAdjacentHTML('afterbegin', '<div class="mp2102-w">Modul server 1.10.8 belum aktif — foto per material tetap tersimpan, tetapi penyimpanan lebih lambat. Admin: Diagnostik sistem › Modul server › unggah server-modul-1.10.8.json.</div>');
  }
  let _t = 0;
  const jadwal = () => { if (_t) return; _t = setTimeout(() => { _t = 0; try { cekModul(); } catch (e) { } }, 400); };
  if (document.body) new MutationObserver(jadwal).observe(document.body, { childList: true, subtree: true });
  else document.addEventListener('DOMContentLoaded', () => new MutationObserver(jadwal).observe(document.body, { childList: true, subtree: true }));
})();
