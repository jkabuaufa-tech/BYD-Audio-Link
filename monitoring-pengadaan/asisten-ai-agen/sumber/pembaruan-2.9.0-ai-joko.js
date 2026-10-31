/* MP290 — RILIS D: AI KHUSUS AKUN JOKO SUPRIYONO · AI HANYA VERIFIKASI DOKUMEN · KANTOR AI "TIM PROYEK PERKUATAN DERMAGA BARAT JICT"
 *  (pasangan Modul server 1.10.3 · fitur "aiAkunKhusus": server menolak aksi AI dari akun lain)
 *  A. Akun selain akun ber-akses AI (bawaan Joko Supriyono; daftar dari server aiInfo.akunAI): Asisten AI, dock & Meja Kerja Agen AI,
 *     Kantor Agen (Live), Tim AI Proyek, tab Verifikasi Dokumen (AI), tombol "Minta saran Asisten AI" & pencarian Ctrl+K AI disembunyikan.
 *  B. Checklist kelengkapan tagihan: unggah PDF per baris; AI tidak memisahkan dokumen menurut judul — AI memverifikasi isi dokumen (blok ganti).
 *  C. Kantor Live: papan nama tim, ruang Manager Joko Supriyono & Ilham, teras kolam renang & taman (blok ganti MP2614). */
(function () {
  'use strict';
  if (window.__MP290__) return; window.__MP290__ = true;
  const sesi = () => (typeof REG !== 'undefined' && REG.sesi) || null;
  const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const S = { akun: ['Joko Supriyono'], dari: '', minta: '' };
  window.MP290 = S;
  const boleh = () => { const s = sesi(); return !!(s && S.akun.some(a => norm(a) === norm(s.nama))); };
  window.mp290AksesAI = boleh;

  function terapkan() {
    const b = document.body; if (!b) return;
    const ya = boleh();
    b.classList.toggle('mp290-tanpa-ai', !!sesi() && !ya);
    if (!ya) {
      ['mp2614Lapis', 'mp2613Pn', 'mp250Lapis', 'mp227Ai'].forEach(id => { const w = document.getElementById(id); if (w) w.remove(); });
      const L = document.getElementById('mp230Lapis'); if (L && L.querySelector('.mp230-dlg, [data-vt-ai]')) L.remove();
    }
  }
  async function muatAkun() {   // daftar akun ber-akses AI dari server (Script Property AI_AKUN); bawaan Joko Supriyono
    const s = sesi(); if (!s || typeof window.regAksi !== 'function') return;
    const k = (s.nama || '') + '|' + ((typeof PROYEK !== 'undefined' && PROYEK && PROYEK.id) || '');
    if (S.minta === k) return; S.minta = k;
    try { const r = await window.regAksi('aiInfo', {}); if (r && Array.isArray(r.akunAI) && r.akunAI.length) { S.akun = r.akunAI.slice(0, 10); S.dari = 'server'; } } catch (e) { }
    terapkan();
  }
  const tolak = () => { if (typeof notif === 'function') notif('Fitur AI hanya tersedia untuk akun ' + S.akun.join(', ') + '.', 'err'); };
  function jaga(nama) {
    const f = window[nama]; if (typeof f !== 'function' || f.__mp290) return;
    const g = function () { if (!boleh()) { tolak(); return; } return f.apply(this, arguments); };
    g.__mp290 = true; window[nama] = g;
  }
  const PINTU = ['mp227AiBuka', 'mp2613Buka', 'mp2613Dock', 'mp2613Kerja', 'mp2614Kantor', 'mp250Buka', 'mp230ClTab', 'mp230Jalan', 'mp230Massal', 'mp230KeAi', 'mp270AI', 'mp2620Manual'];
  function pasang() {
    PINTU.forEach(jaga);
    const cmd = window.itemCmdk;   // Ctrl+K: buang hasil grup Asisten AI untuk akun lain
    if (typeof cmd === 'function' && !cmd.__mp290) { const g = function () { const out = cmd.apply(this, arguments) || []; return boleh() ? out : out.filter(x => !/asisten ai|agen ai|kantor/i.test(String((x && (x.grup || '')) + ' ' + (x && x.l || '')))); }; g.__mp290 = true; window.itemCmdk = g; }
    terapkan();
  }
  let _t = 0; const jadwal = () => { clearTimeout(_t); _t = setTimeout(() => { try { pasang(); if (sesi()) muatAkun(); } catch (e) { } }, 250); };
  const awasi = () => { if (!document.body) return; pasang(); new MutationObserver(m => { if (m.some(x => x.addedNodes && x.addedNodes.length)) jadwal(); }).observe(document.body, { childList: true, subtree: true }); jadwal(); };
  if (document.body) awasi(); else document.addEventListener('DOMContentLoaded', awasi);
  window.addEventListener('load', jadwal);
})();
