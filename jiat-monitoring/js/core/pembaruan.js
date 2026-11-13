/**
 * pembaruan.js — Paket pembaruan aplikasi yang diunggah Admin.
 *
 * Paket = berkas JSON berisi CSS dan/atau JS tambahan yang dijalankan di atas
 * aplikasi dasar setiap kali dibuka, sehingga fitur baru bisa dipasang tanpa
 * mengganti berkas HTML:
 *   { "format": "jiat-monitoring-pembaruan", "versi": "1.3.0", "untukDasar": "1",
 *     "tanggal": "2026-11-20", "catatan": "…", "css": "…", "js": "…" }
 * Paket bersifat KUMULATIF: satu paket aktif menggantikan paket sebelumnya.
 * Buat dengan `node tools/rakit-pembaruan.js`.
 *
 * Pengaman: bila aplikasi gagal terbuka setelah paket dipasang, pada pembukaan
 * berikutnya paket dilewati otomatis (mode aman) dan Admin diberi tahu.
 * Paket menjalankan kode — unggah hanya berkas dari sumber yang Anda percaya.
 */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});
  const KEY = 'jiat-monitoring:pembaruan', KEY_UJI = 'jiat-monitoring:pembaruan-uji';
  const FORMAT = 'jiat-monitoring-pembaruan';
  JIAT.VERSI_DASAR = '1.2.0';

  let simpanan = { aktif: null, sebelumnya: null };
  let status = 'tidak-ada';            // 'tidak-ada' | 'aktif' | 'gagal'
  const tulis = () => { try { localStorage.setItem(KEY, JSON.stringify(simpanan)); return true; } catch (_) { return false; } };
  const angka = (v) => String(v).split('.').map((n) => parseInt(n, 10) || 0);
  /** Bandingkan versi "a.b.c": >0 bila a lebih baru. */
  const banding = (a, b) => { const x = angka(a), y = angka(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

  function periksa(p) {
    if (!p || p.format !== FORMAT) return 'Berkas bukan paket pembaruan JIAT Monitoring.';
    if (!/^\d+\.\d+\.\d+$/.test(p.versi || '')) return 'Nomor versi paket tidak valid.';
    if (String(p.untukDasar) !== JIAT.VERSI_DASAR.split('.')[0]) return `Paket ini untuk aplikasi dasar ${p.untukDasar}.x, sedangkan berkas ini ${JIAT.VERSI_DASAR}.`;
    if (typeof (p.js || '') !== 'string' || typeof (p.css || '') !== 'string' || !(p.js || p.css)) return 'Paket tidak berisi CSS maupun JS.';
    if (banding(p.versi, JIAT.VERSI_DASAR) <= 0) return `Versi paket (${p.versi}) tidak lebih baru dari aplikasi dasar (${JIAT.VERSI_DASAR}).`;
    return null;
  }
  const rapikan = (p) => ({ format: FORMAT, versi: p.versi, untukDasar: String(p.untukDasar), tanggal: String(p.tanggal || '').slice(0, 10), catatan: String(p.catatan || '').slice(0, 4000), css: p.css || '', js: p.js || '' });

  JIAT.pembaruan = {
    FORMAT, banding,
    init() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && typeof d === 'object') simpanan = { aktif: d.aktif || null, sebelumnya: d.sebelumnya || null }; } catch (_) { /* abaikan */ } },
    aktif: () => simpanan.aktif, sebelumnya: () => simpanan.sebelumnya, status: () => status,
    versi: () => (status === 'aktif' ? simpanan.aktif.versi : JIAT.VERSI_DASAR),

    /** Jalankan paket aktif. Dipanggil sekali saat aplikasi dibuka, sebelum JIAT.start(). */
    terapkan() {
      const p = simpanan.aktif;
      if (!p || periksa(p)) return;
      let gagalSebelumnya = false;
      try { gagalSebelumnya = localStorage.getItem(KEY_UJI) === p.versi; localStorage.setItem(KEY_UJI, p.versi); } catch (_) { /* abaikan */ }
      if (gagalSebelumnya) { status = 'gagal'; return; }      // pembukaan lalu tidak selesai → mode aman
      try {
        if (p.css) { const st = document.createElement('style'); st.dataset.pembaruan = p.versi; st.textContent = p.css; document.head.appendChild(st); }
        if (p.js) new Function('JIAT', p.js)(JIAT);
        status = 'aktif';
      } catch (e) { console.error('Paket pembaruan gagal dijalankan', e); status = 'gagal'; }
    },
    /** Tandai aplikasi berhasil terbuka (menghapus penanda uji). */
    selesaiBuka() { if (status !== 'gagal') try { localStorage.removeItem(KEY_UJI); } catch (_) { /* abaikan */ } },

    /** Pasang paket baru (berlaku setelah muat ulang). Mengembalikan pesan galat atau null. */
    pasang(p, { izinkanSama = false, hanyaPeriksa = false } = {}) {
      const err = periksa(p);
      if (err) return err;
      const kini = simpanan.aktif;
      if (kini && !periksa(kini)) { const c = banding(p.versi, kini.versi); if (c < 0 || (c === 0 && !izinkanSama)) return `Versi ${p.versi} tidak lebih baru dari paket terpasang (${kini.versi}).`; }
      if (hanyaPeriksa) return null;
      simpanan = { aktif: rapikan(p), sebelumnya: kini && kini.versi !== p.versi ? kini : simpanan.sebelumnya };
      try { localStorage.removeItem(KEY_UJI); } catch (_) { /* abaikan */ }
      return tulis() ? null : 'Penyimpanan browser penuh; paket tidak tersimpan.';
    },
    /** Kembali ke paket sebelumnya (atau ke aplikasi dasar bila tidak ada). */
    kembalikan() { simpanan = { aktif: simpanan.sebelumnya, sebelumnya: null }; try { localStorage.removeItem(KEY_UJI); } catch (_) { /* abaikan */ } tulis(); },
    cobaLagi() { try { localStorage.removeItem(KEY_UJI); } catch (_) { /* abaikan */ } },
  };
})();
