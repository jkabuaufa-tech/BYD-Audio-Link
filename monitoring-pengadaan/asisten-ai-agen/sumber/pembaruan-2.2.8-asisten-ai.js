  /* ======================= 5. ASISTEN AI (2.2.8: agen aksi · multi-penyedia · perintah cepat) ======================= */
  const AI = { info: null, muat: false, buka: false, sibuk: false, prov: lsGet('MP227_AI_PROV', ''), kunci: '', konteks: lsGet('MP227_AI_KONTEKS', true), anSampai: 0, hapusProv: [], nBaru: 0, mem: {} };
  const kunciRiwayat = () => 'MP227_AI_' + pid() + '_' + ((sesi() || {}).nama || '');
  const riwayat = () => { const k = kunciRiwayat(), v = ssGet(k, null); return Array.isArray(v) ? v : JSON.parse(JSON.stringify(AI.mem[k] || [])); };   // cadangan memori bila sessionStorage diblokir
  const simpanRiwayat = L => { while (JSON.stringify(L).length > 400000 && L.length > 2) L.shift(); AI.mem[kunciRiwayat()] = L; ssSet(kunciRiwayat(), L); };
  const PROV_LAMA = { claude: 'anthropic', gemini: 'google' };
  const normProv = id => PROV_LAMA[id] || id || '';
  function daftarProv() {   // penyedia aktif (modul 1.5.0) atau Claude/Gemini (modul 1.4.0)
    const I = AI.info; if (!I) return [];
    if (Array.isArray(I.providers)) return I.providers;
    return ['claude', 'gemini'].filter(k => I.siap && I.siap[k]).map(k => ({ id: k, nama: k === 'claude' ? 'Claude' : 'Gemini', model: (I.model || {})[k] || '' }));
  }
  function pilihProv() {
    const L = daftarProv(), I = AI.info || {}, ada = id => L.some(p => p.id === id);
    if (!L.length) { AI.prov = ''; return; }
    if (ada(AI.prov)) return;
    if (ada(normProv(AI.prov))) { AI.prov = normProv(AI.prov); return; }
    const b = Array.isArray(I.providers) ? normProv(I.bawaanId || I.bawaan) : I.bawaan;
    AI.prov = ada(b) ? b : L[0].id;
  }
  const namaProv = id => { const p = daftarProv().find(x => x.id === id || x.id === normProv(id)); return p ? p.nama : id === 'gemini' ? 'Gemini' : id === 'claude' ? 'Claude' : (id || 'AI'); };
  const agenAda = () => !!(AI.info && AI.info.agen);
  const judulAksi = a => (AI.info && AI.info.agen && AI.info.agen.judul && AI.info.agen.judul[a]) || a;
  async function aiMuat(paksa) {
    if (!sesi() || typeof REG === 'undefined' || !REG.url) { AI.info = null; fab(); return; }
    const k = REG.url + '|' + pid() + '|' + sesi().nama; if (AI.kunci !== k) { AI.kunci = k; AI.info = null; AI.coba = 0; }
    if (AI.muat || (AI.info && !paksa)) { fab(); return; }
    if (!srv('asistenAI')) { if ((AI.coba = (AI.coba || 0) + 1) <= 15) setTimeout(() => aiMuat(), 2000); fab(); return; }   // tunggu ping fitur server
    AI.coba = 0;
    AI.muat = true;
    try { AI.info = await regAksi('aiInfo', {}); pilihProv(); if (AI.info.agen && AI.info.agen.sisaJeda) AI.anSampai = Date.now() + AI.info.agen.sisaJeda * 1000; }
    catch (err) { AI.info = null; }
    finally { AI.muat = false; fab(); menuAkun(); if (AI.buka) aiGambar(); }
  }
  function fab() {
    let b = document.getElementById('mp227AiFab');
    const tampil = !!(sesi() && AI.info && (AI.info.boleh || adm()));
    if (!tampil) { if (b) b.hidden = true; if (!sesi()) aiTutup(); return; }
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'mp227AiFab'; b.className = 'mp227-fab'; b.title = 'Asisten AI'; b.setAttribute('aria-label', 'Buka Asisten AI'); b.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i><span>Asisten AI</span>'; b.onclick = () => aiBuka(); document.body.appendChild(b); }
    b.hidden = AI.buka;
  }
  function aiBuka() {
    AI.buka = true; fab();
    let p = document.getElementById('mp227Ai');
    if (!p) { p = document.createElement('section'); p.id = 'mp227Ai'; p.className = 'mp227-ai'; p.setAttribute('aria-label', 'Asisten AI'); document.body.appendChild(p); }
    aiGambar(); setTimeout(() => { const t = document.getElementById('mp227AiIn'); if (t) t.focus(); }, 50);
  }
  window.mp227AiBuka = aiBuka;
  function aiTutup() { AI.buka = false; const p = document.getElementById('mp227Ai'); if (p) p.remove(); fab(); }
  window.mp227AiTutup = aiTutup;
  const SARAN = [['fa-bell', 'Ringkas yang perlu saya tindak lanjuti hari ini'], ['fa-boxes-stacked', 'Analisis stok material bulan ini dan nilai persediaannya'], ['fa-file-invoice-dollar', 'Tagihan mana yang dokumennya belum lengkap?'], ['fa-file-signature', 'Buatkan draf BA Klarifikasi dengan subkontraktor']];
  function aiGambar() {
    const p = document.getElementById('mp227Ai'); if (!p) return;
    const I = AI.info || { siap: {}, model: {} }, L = riwayat(), P = daftarProv(), siapApa = P.length > 0, bisa = siapApa && I.boleh, pv = P.find(x => x.id === AI.prov);
    const PC = bisa && agenAda() && Array.isArray(I.perintah) ? I.perintah : [];
    p.innerHTML = `<header class="mp227-ai-h"><div class="t"><span class="ik"><i class="fas fa-wand-magic-sparkles"></i></span><div><b>Asisten AI${agenAda() ? ' <span class="mp227-agen">agen</span>' : ''}</b><small>${pv ? E(pv.nama + (pv.model ? ' · ' + pv.model : '')) : 'belum dikonfigurasi'}${I.kuota ? ' · sisa ' + Math.max(0, I.kuota - I.terpakai) + '/' + I.kuota + ' hari ini' : ''}</small></div></div>
      <div class="a">${P.length ? `<select class="mp227-sel" id="mp227AiProv" aria-label="Pilih penyedia AI" title="Pilih penyedia AI" onchange="mp227AiProv(this.value)" ${AI.sibuk ? 'disabled' : ''}>${P.map(x => `<option value="${E(x.id)}" ${x.id === AI.prov ? 'selected' : ''}>${E(x.nama)}</option>`).join('')}</select>` : ''}
        ${adm() ? '<button type="button" class="mp227-ic" title="Setelan Asisten AI (Admin)" onclick="mp227AiSetel()"><i class="fas fa-gear"></i></button>' : ''}
        <button type="button" class="mp227-ic" title="Ekspor ringkasan (.md)" onclick="mp227AiEkspor()"><i class="fas fa-file-arrow-down"></i></button>
        <button type="button" class="mp227-ic" title="Percakapan baru" onclick="mp227AiBaru()"><i class="fas fa-rotate-left"></i></button>
        <button type="button" class="mp227-ic" title="Tutup" onclick="mp227AiTutup()"><i class="fas fa-xmark"></i></button></div></header>
      ${PC.length ? `<div class="mp227-pc" role="toolbar" aria-label="Perintah cepat"><span><i class="fas fa-bolt"></i> Perintah cepat</span>${PC.map(x => `<button type="button" onclick="mp227AiAnalisis('${E(x.id)}')" ${AI.sibuk ? 'disabled' : ''} title="${E(x.judul)}"><i class="fas ${E(x.ikon || 'fa-bolt')}"></i>${E(x.judul)}</button>`).join('')}</div>` : ''}
      <div class="mp227-ai-b" id="mp227AiLog">${!siapApa ? `<div class="mp227-ai-kosong"><i class="fas fa-key"></i><p>${adm() ? 'Isi API key minimal satu penyedia AI terlebih dahulu.' : 'Asisten AI belum dikonfigurasi Admin.'}</p>${adm() ? '<button type="button" class="btn btn-sm btn-primary" onclick="mp227AiSetel()"><i class="fas fa-gear me-1"></i>Buka setelan</button>' : ''}</div>`
        : !I.boleh ? '<div class="mp227-ai-kosong"><i class="fas fa-user-lock"></i><p>Asisten AI belum diaktifkan untuk peran Anda.</p></div>'
        : L.length ? L.map((m, i) => bubble(m, i)).join('') : `<div class="mp227-ai-kosong"><i class="fas fa-comments"></i><p>Tanyakan apa saja tentang kontrak, tagihan, gudang atau minta draf dokumen.${agenAda() ? ' Asisten dapat membaca data aplikasi dan menyiapkan usulan aksi untuk Anda setujui.' : ''}</p><div class="mp227-saran">${SARAN.map(s => `<button type="button" onclick="mp227AiKirim(${E(JSON.stringify(s[1]))})"><i class="fas ${s[0]}"></i>${E(s[1])}</button>`).join('')}</div></div>`}
        ${AI.sibuk ? '<div class="mp227-msg ai"><div><div class="mp227-ngetik" aria-label="Asisten sedang memproses"><span></span><span></span><span></span></div></div></div>' : ''}</div>
      <form class="mp227-ai-f" onsubmit="event.preventDefault();mp227AiKirim()"><textarea id="mp227AiIn" rows="2" placeholder="Tulis pertanyaan atau perintah… (Enter kirim, Shift+Enter baris baru)" ${bisa && !AI.sibuk ? '' : 'disabled'}></textarea>
        <div class="d-flex align-items-center gap-2"><label class="form-check small mb-0 flex-grow-1" title="Kirim ringkasan data aplikasi (kontrak, tagihan, stok, bon, notifikasi) agar jawaban sesuai data proyek"><input type="checkbox" class="form-check-input" id="mp227AiKtx" ${AI.konteks ? 'checked' : ''} onchange="mp227AiKonteks(this.checked)"> Sertakan data aplikasi</label>
        <button type="submit" class="btn btn-sm btn-primary" ${bisa && !AI.sibuk ? '' : 'disabled'}><i class="fas fa-paper-plane me-1"></i>Kirim</button></div></form>`;
    const ta = document.getElementById('mp227AiIn');
    if (ta) ta.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); window.mp227AiKirim(); } });
    const lg = document.getElementById('mp227AiLog'); if (lg) lg.scrollTop = lg.scrollHeight;
  }
  function md(t) {   // markdown ringan & aman
    const esc = s => E(s);
    const blok = []; t = String(t || '').replace(/```[\w-]*\n?([\s\S]*?)```/g, (m, k) => { blok.push(k); return '\u0000' + (blok.length - 1) + '\u0000'; });
    const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const baris = t.split('\n'), out = []; let i = 0;
    while (i < baris.length) {
      const b = baris[i];
      if (/^\s*\|.*\|\s*$/.test(b) && i + 1 < baris.length && /^\s*\|?\s*:?-{2,}/.test(baris[i + 1])) {
        const sel = r => r.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
        const h = sel(b); i += 2; const rows = []; while (i < baris.length && /^\s*\|.*\|\s*$/.test(baris[i])) rows.push(sel(baris[i++]));
        out.push(`<div class="mp227-tw"><table><thead><tr>${h.map(x => `<th>${inl(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${inl(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
      }
      if (/^\s*[-*•]\s+/.test(b)) { const L = []; while (i < baris.length && /^\s*[-*•]\s+/.test(baris[i])) L.push(baris[i++].replace(/^\s*[-*•]\s+/, '')); out.push('<ul>' + L.map(x => `<li>${inl(x)}</li>`).join('') + '</ul>'); continue; }
      if (/^\s*\d+[.)]\s+/.test(b)) { const L = []; while (i < baris.length && /^\s*\d+[.)]\s+/.test(baris[i])) L.push(baris[i++].replace(/^\s*\d+[.)]\s+/, '')); out.push('<ol>' + L.map(x => `<li>${inl(x)}</li>`).join('') + '</ol>'); continue; }
      const hd = /^(#{1,4})\s+(.*)$/.exec(b); if (hd) { out.push(`<h6>${inl(hd[2])}</h6>`); i++; continue; }
      if (/^\u0000\d+\u0000$/.test(b.trim())) { out.push(b.trim()); i++; continue; }
      if (b.trim()) out.push(`<p>${inl(b)}</p>`); i++;
    }
    return out.join('').replace(/\u0000(\d+)\u0000/g, (m, n) => `<pre>${esc(blok[+n])}</pre>`);
  }
  const LABEL_ST = { menunggu: 'menunggu persetujuan', diterapkan: 'diterapkan', dibatalkan: 'dibatalkan' };
  const kaki = (m, i) => `<div class="kaki"><span>${E(namaProv(m.prov))}${m.model ? ' · ' + E(m.model) : ''}</span><button type="button" onclick="mp227AiSalin(${i})" title="Salin"><i class="far fa-copy"></i> Salin</button></div>`;
  const rapiJSON = t => { try { return JSON.stringify(JSON.parse(t), null, 1); } catch (e) { return String(t || ''); } };
  function kartuUsulan(u, i) {
    const pr = u.pratinjau || {}, st = u.status || 'menunggu', bisaTerap = u.boleh && u.token && pr.siap;
    return `<div class="mp227-us ${E(st)}"><div class="h"><i class="fas fa-bolt"></i><b>Usulan: ${E(u.judul || u.aksi)}</b><span class="mp227-st ${E(st)}">${E(LABEL_ST[st] || st)}</span></div>
      ${u.alasan ? `<div class="al">${E(u.alasan)}</div>` : ''}
      <div class="pr"><span>Pratinjau (dry-run, belum ditulis)</span>${pr.ringkas ? `<div>${E(pr.ringkas)}</div>` : ''}${pr.galat ? `<div class="gl"><i class="fas fa-circle-xmark"></i> ${E(pr.galat)}</div>` : ''}${(pr.peringatan || []).map(w => `<div class="pw"><i class="fas fa-triangle-exclamation"></i> ${E(w)}</div>`).join('')}</div>
      <details><summary>Argumen <code>${E(u.aksi)}</code></summary><pre class="mp227-pre">${E(JSON.stringify(u.arg || {}, null, 1))}</pre></details>
      ${st === 'diterapkan' ? `<div class="hs"><i class="fas fa-circle-check"></i> ${E(u.ringkasTerap || 'Diterapkan & dicatat di Log (AI-AKSI).')}</div>` : ''}
      ${u.galatTerap ? `<div class="gl"><i class="fas fa-circle-xmark"></i> ${E(u.galatTerap)}</div>` : ''}
      ${st === 'menunggu' ? `<div class="b">${bisaTerap ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp227AiTerapkan(${i})" ${AI.sibuk ? 'disabled' : ''}><i class="fas fa-check me-1"></i>Terapkan</button>` : `<small>${E(u.catatan || 'Belum dapat diterapkan — lengkapi hal di atas.')}</small>`}<button type="button" class="btn btn-sm btn-light border" onclick="mp227AiBatal(${i})" ${AI.sibuk ? 'disabled' : ''}><i class="fas fa-xmark me-1"></i>Batal</button></div>` : ''}</div>`;
  }
  function kartuSaran(z, i, j, st) {
    return `<div class="mp227-sr ${E(st || '')}"><div class="t"><b>${E(z.judul || judulAksi(z.aksi))}</b>${z.aksi ? `<span class="ak ${E(z.jenis)}">${z.jenis === 'tulis' ? 'usulan tulis' : 'baca'} · ${E(z.aksi)}</span>` : ''}</div>
      ${z.dampak ? `<div class="d"><i class="fas fa-bullseye"></i> ${E(z.dampak)}</div>` : ''}
      <div class="b">${st === 'selesai' ? '<span class="mp227-st diterapkan"><i class="fas fa-check"></i> selesai</span>'
        : `${z.aksi ? `<button type="button" class="btn btn-sm btn-primary" onclick="mp227AiJalankan(${i},${j})" ${AI.sibuk ? 'disabled' : ''}><i class="fas fa-play me-1"></i>Jalankan</button>` : ''}<button type="button" class="btn btn-sm btn-light border" onclick="mp227AiSelesai(${i},${j})"><i class="fas fa-check me-1"></i>Tandai selesai</button>${st === 'dijalankan' ? '<small>sudah dijalankan</small>' : ''}`}</div></div>`;
  }
  function bubble(m, i) {
    if (m.role === 'user') return `<div class="mp227-msg u"><div>${E(m.teks).replace(/\n/g, '<br>')}</div></div>`;
    if (m.galat) return `<div class="mp227-msg ai galat"><div><i class="fas fa-triangle-exclamation me-1"></i>${E(m.teks)}</div></div>`;
    if (m.jenis === 'analisis') return `<div class="mp227-msg ai an"><div><div class="mp227-an-h"><i class="fas fa-magnifying-glass-chart"></i><b>${E(m.judul || 'Analisis')}</b></div>
      <div class="isi">${md(m.ringkasan || '')}</div>
      ${(m.temuan || []).length ? `<div class="mp227-an-s">Temuan (${m.temuan.length})</div><ul class="mp227-tm">${m.temuan.map(t => `<li class="${E(t.tingkat)}"><span class="tg">${E(t.tingkat)}</span><div><b>${E(t.judul)}</b>${t.detail ? `<div>${E(t.detail)}</div>` : ''}</div></li>`).join('')}</ul>` : ''}
      ${(m.saran || []).length ? `<div class="mp227-an-s">Saran (${m.saran.length})</div>${m.saran.map((z, j) => kartuSaran(z, i, j, (m.st || {})[j])).join('')}` : ''}${kaki(m, i)}</div></div>`;
    if (m.jenis === 'hasil') return `<div class="mp227-msg ai"><div><div class="mp227-an-h"><i class="fas fa-magnifying-glass"></i><b>Hasil: ${E(m.judul || judulAksi(m.aksi))}</b> <code>${E(m.aksi)}</code></div><pre class="mp227-pre">${E(rapiJSON(m.teks).slice(0, 6000))}</pre>${kaki(m, i)}</div></div>`;
    const lk = (m.langkah || []).length ? `<div class="mp227-lk" aria-label="Aksi yang dijalankan asisten">${m.langkah.map(l => `<span class="${l.ok ? 'ok' : 'gagal'}" title="${E((l.alasan || '') + (l.ringkas ? ' — ' + l.ringkas.slice(0, 160) : ''))}"><i class="fas ${l.ok ? 'fa-magnifying-glass' : 'fa-ban'}"></i>${E(judulAksi(l.aksi))}</span>`).join('')}</div>` : '';
    return `<div class="mp227-msg ai"><div>${lk}<div class="isi">${md(m.teks)}</div>${m.usulan ? kartuUsulan(m.usulan, i) : ''}${kaki(m, i)}</div></div>`;
  }
  function teksPesan(m) {   // teks polos untuk riwayat ke server, salin & ekspor
    if (m.jenis === 'analisis') return '**' + (m.judul || 'Analisis') + '**\n' + (m.ringkasan || '') +
      ((m.temuan || []).length ? '\n\nTemuan:\n' + m.temuan.map(t => '- [' + t.tingkat + '] ' + t.judul + (t.detail ? ': ' + t.detail : '')).join('\n') : '') +
      ((m.saran || []).length ? '\n\nSaran:\n' + m.saran.map((z, j) => '- ' + (z.judul || z.aksi) + (z.aksi ? ' (aksi ' + z.aksi + ')' : '') + (z.dampak ? ' — ' + z.dampak : '') + ((m.st || {})[j] ? ' [' + m.st[j] + ']' : '')).join('\n') : '');
    if (m.jenis === 'hasil') return 'Hasil aksi ' + m.aksi + ':\n' + String(m.teks || '').slice(0, 3000);
    return String(m.teks || '') + (m.usulan ? '\n[Usulan aksi ' + m.usulan.aksi + ': ' + (m.usulan.status || 'menunggu') + (m.usulan.pratinjau && m.usulan.pratinjau.ringkas ? ' — ' + m.usulan.pratinjau.ringkas : '') + ']' : '');
  }
  window.mp227AiSalin = i => { const m = riwayat()[i]; if (!m) return; (navigator.clipboard ? navigator.clipboard.writeText(teksPesan(m)) : Promise.reject()).then(() => pesan('Jawaban disalin.', 'ok'), () => pesan('Salin manual: pilih teks lalu Ctrl+C.', 'err')); };
  window.mp227AiProv = k => { AI.prov = k; lsSet('MP227_AI_PROV', k); aiGambar(); };
  window.mp227AiBaru = () => { simpanRiwayat([]); aiGambar(); };
  window.mp227AiKonteks = v => { AI.konteks = !!v; lsSet('MP227_AI_KONTEKS', AI.konteks); };
  function konteks() {
    const B = [], rp = n => 'Rp ' + Math.round(N(n)).toLocaleString('id-ID');
    try {
      const idt = typeof window.mp224Identitas === 'function' ? window.mp224Identitas() : {};
      const tab = [...document.querySelectorAll('.content-tab')].find(t => t.style.display !== 'none');
      B.push('PROYEK: ' + pid() + ' · ' + ((typeof PROYEK !== 'undefined' && (PROYEK.namaLengkap || PROYEK.nama)) || '') + ' · Pelaksana: ' + (idt.nama || '') + '\nMENU AKTIF: ' + ((document.getElementById('judulHalaman') || {}).textContent || (tab ? tab.id.replace('tab-', '') : '-')));
      if (typeof window.mp220NotifDaftar === 'function') { const L = window.mp220NotifDaftar(); if (L.length) B.push('NOTIFIKASI (' + L.length + '):\n' + L.slice(0, 40).map(x => '- [' + x.g + '] ' + x.judul + ' | ' + x.ket + ' | ' + x.nilai).join('\n')); }
      if (typeof window.semuaKontrak214 === 'function') {
        const K = window.semuaKontrak214(), st = {}; K.forEach(x => { st[x.statusKey || '-'] = (st[x.statusKey || '-'] || 0) + 1; });
        const tot = K.reduce((a, x) => a + N(x.nilai), 0), re = K.reduce((a, x) => a + N(x.realisasi), 0);
        B.push('KONTRAK: ' + K.length + ' kontrak · nilai ' + rp(tot) + ' · realisasi ' + rp(re) + ' · status ' + Object.keys(st).map(k => k + ' ' + st[k]).join(', ') + '\nDaftar (no kontrak | vendor | jenis | nilai | realisasi | status | PO):\n' +
          K.slice().sort((a, b) => N(b.nilai) - N(a.nilai)).slice(0, 120).map(x => '- ' + x.key + ' | ' + (x.vendor || '-') + ' | ' + (x.jenis || '-') + ' | ' + rp(x.nilai) + ' | ' + rp(x.realisasi) + ' | ' + (x.statusKey || '-') + ' | ' + (x.po || '-')).join('\n'));
      }
      if (typeof PROG !== 'undefined' && PROG.data) {
        const P = PROG.data, byr = {}; P.forEach(e => { const s = (e.bayar && e.bayar.status) || 'BELUM'; byr[s] = (byr[s] || 0) + 1; });
        B.push('TAGIHAN/BK: ' + P.length + ' entri · nilai ' + rp(P.reduce((a, e) => a + N(e.nilai), 0)) + ' · status bayar ' + Object.keys(byr).map(k => k + ' ' + byr[k]).join(', ') + '\n30 terbaru (nomor BA | kontrak | periode | ke | nilai | bayar):\n' +
          P.slice().sort((a, b) => N(b.periodeKey) - N(a.periodeKey) || String(b.dibuatPada || '').localeCompare(String(a.dibuatPada || ''))).slice(0, 30).map(e => '- ' + (e.nomorBA || '-') + ' | ' + (e.noKontrak || '-') + ' | ' + (e.periode || '-') + ' | ' + (e.tagihanKe || '-') + ' | ' + rp(e.nilai) + ' | ' + ((e.bayar && e.bayar.status) || 'BELUM')).join('\n'));
      }
      const G = window.mp227Gd;
      if (G && G.GD && G.GD.siap && typeof G.stokPeriode === 'function') {
        const bln = hariIni().slice(0, 7), S = G.stokPeriode(bln), nilai = S.reduce((a, z) => a + z.total, 0);
        B.push('STOK GUDANG per ' + tglK(hariIni()) + ': ' + S.length + ' material · nilai ' + rp(nilai) + '\n(kode | uraian | stok | satuan | harga | total):\n' + S.slice(0, 80).map(z => '- ' + (z.kode || '-') + ' | ' + z.uraian + ' | ' + z.stok + ' | ' + z.sat + ' | ' + rp(z.harga) + ' | ' + rp(z.total)).join('\n'));
        const gb = gudangSnap(); if (gb && gb.length) B.push('BON BELUM DITERIMA PENUH (' + gb.length + '):\n' + gb.slice(0, 30).map(x => '- ' + x.judul + ' | ' + x.ket + ' | umur ' + x.nilai).join('\n'));
        B.push('TRANSAKSI GUDANG: ' + G.GD.masuk.filter(r => r.status === 'AKTIF').length + ' penerimaan, ' + G.GD.keluar.filter(r => r.status === 'AKTIF').length + ' pengeluaran aktif.');
      }
    } catch (err) { B.push('(Sebagian data tidak dapat diringkas: ' + err.message + ')'); }
    let t = B.join('\n\n'); if (t.length > 55000) t = t.slice(0, 55000) + '\n…(dipotong)'; return t;
  }
  window.mp227AiKonteksTeks = konteks;
  window.mp227AiKirim = async teksAwal => {
    if (AI.sibuk) return; const ta = document.getElementById('mp227AiIn'), t = String(teksAwal || (ta && ta.value) || '').trim(); if (!t) return;
    const L = riwayat(); L.push({ role: 'user', teks: t }); simpanRiwayat(L); AI.sibuk = true; aiGambar();
    try {
      const kirim = L.filter(m => !m.galat).slice(-16).map(m => ({ role: m.role, teks: teksPesan(m) }));
      const r = await regAksi('aiTanya', { data: { provider: AI.prov, pesan: kirim, konteks: AI.konteks ? konteks() : '', agen: agenAda() } });
      L.push({ role: 'assistant', teks: r.teks, prov: r.providerId || r.provider, model: r.model, langkah: r.langkah || [], usulan: r.usulan || null });
      if (AI.info) AI.info.terpakai = AI.info.kuota - r.sisa;
    } catch (err) { L.push({ role: 'assistant', galat: true, teks: err.message }); }
    finally { simpanRiwayat(L); AI.sibuk = false; aiGambar(); }
  };
  /* ---------- perintah cepat (mode analisis) ---------- */
  window.mp227AiAnalisis = async id => {
    if (AI.sibuk) return; const I = AI.info;
    if (!I || !agenAda()) return pesan('Perintah cepat memerlukan Modul server 1.5.0.', 'err');
    const sisa = Math.ceil((AI.anSampai - Date.now()) / 1000); if (sisa > 0) return pesan('Analisis dibatasi 1× per ' + ((I.agen && I.agen.jedaAnalisis) || 60) + ' detik. Tunggu ' + sisa + ' detik.', 'err');
    const p = (I.perintah || []).find(x => x.id === id); if (!p) return;
    const L = riwayat(); L.push({ role: 'user', teks: '⚡ ' + p.judul }); simpanRiwayat(L); AI.sibuk = true; aiGambar();
    try {
      const r = await regAksi('aiTanya', { data: { mode: 'analisis', perintah: id, provider: AI.prov, konteks: AI.konteks && id === 'followup' ? konteks().slice(0, 15000) : '' } });
      AI.anSampai = Date.now() + (N(r.jeda) || 60) * 1000;
      L.push({ role: 'assistant', jenis: 'analisis', judul: r.judul || p.judul, ringkasan: r.ringkasan, temuan: r.temuan || [], saran: r.saran || [], st: {}, prov: r.providerId || r.provider, model: r.model, teks: r.ringkasan });
      if (AI.info) AI.info.terpakai = AI.info.kuota - r.sisa;
    } catch (err) {
      const j = /\[JEDA:(\d+)\]/.exec(err.message); if (j) AI.anSampai = Date.now() + N(j[1]) * 1000;
      L.push({ role: 'assistant', galat: true, teks: err.message.replace(/\s*\[JEDA:\d+\]/, '') });
    } finally { simpanRiwayat(L); AI.sibuk = false; aiGambar(); }
  };
  window.mp227AiJalankan = async (i, j) => {
    const L = riwayat(), m = L[i], z = m && m.saran && m.saran[j]; if (!z || !z.aksi || AI.sibuk) return;
    AI.sibuk = true; aiGambar();
    try {
      const r = await regAksi('aiAksi', { data: { aksi: z.aksi, arg: z.arg || {}, alasan: z.judul } });
      m.st = m.st || {}; m.st[j] = 'dijalankan';
      if (r.jenis === 'baca') L.push({ role: 'assistant', jenis: 'hasil', aksi: z.aksi, judul: r.judul, teks: r.ringkas, prov: m.prov, model: m.model });
      else L.push({ role: 'assistant', teks: 'Usulan dari saran **' + (z.judul || z.aksi) + '**. Periksa pratinjau, lalu tekan Terapkan atau Batal.', usulan: r.usulan, prov: m.prov, model: m.model });
    } catch (err) { L.push({ role: 'assistant', galat: true, teks: err.message }); }
    finally { simpanRiwayat(L); AI.sibuk = false; aiGambar(); }
  };
  window.mp227AiSelesai = (i, j) => { const L = riwayat(), m = L[i]; if (!m || !m.saran) return; m.st = m.st || {}; m.st[j] = 'selesai'; simpanRiwayat(L); aiGambar(); };
  /* ---------- usulan aksi tulis: Terapkan / Batal ---------- */
  function segarData(aksi) {
    try {
      if (aksi === 'gudangTerimaBon' && typeof window.mp223Muat === 'function') window.mp223Muat(true);
      else if (aksi === 'simpanMasterTambahan' && typeof window.muatTambahan214 === 'function') window.muatTambahan214(true);
      else if (typeof window.muatRegister === 'function') window.muatRegister(true);
    } catch (e) { console.warn('[2.2.8] segar data', e); }
  }
  window.mp227AiTerapkan = async i => {
    const L = riwayat(), m = L[i], u = m && m.usulan; if (!u || u.status !== 'menunggu' || !u.token || AI.sibuk) return;
    if (!confirm('Terapkan aksi "' + (u.judul || u.aksi) + '"?\n\n' + ((u.pratinjau || {}).ringkas || '').slice(0, 600) + '\n\nPerubahan ditulis ke data produksi dan dicatat di Log (AI-AKSI).')) return;
    AI.sibuk = true; aiGambar();
    try {
      const r = await regAksi('aiTerapkan', { data: { token: u.token } });
      Object.assign(u, { status: 'diterapkan', ringkasTerap: r.ringkas || '', galatTerap: '', token: '' });
      pesan('Aksi Asisten AI diterapkan.', 'ok'); segarData(u.aksi);
    } catch (err) { u.galatTerap = err.message; if (/kedaluwarsa|sudah diproses/i.test(err.message)) Object.assign(u, { status: 'dibatalkan', token: '' }); }
    finally { simpanRiwayat(L); AI.sibuk = false; aiGambar(); }
  };
  window.mp227AiBatal = async i => {
    const L = riwayat(), m = L[i], u = m && m.usulan; if (!u || u.status !== 'menunggu' || AI.sibuk) return;
    if (u.token) { try { await regAksi('aiTerapkan', { data: { token: u.token, batal: true } }); } catch (e) { } }
    Object.assign(u, { status: 'dibatalkan', token: '' }); simpanRiwayat(L); aiGambar();
  };
  /* ---------- ekspor ringkasan (.md) ---------- */
  window.mp227AiEkspor = () => {
    const L = riwayat(); if (!L.length) return pesan('Belum ada percakapan untuk diekspor.', 'err');
    const nmP = (typeof PROYEK !== 'undefined' && (PROYEK.nama || PROYEK.namaLengkap)) || '';
    const out = ['# Ringkasan Asisten AI', '', '- Proyek: ' + pid() + (nmP ? ' · ' + nmP : ''), '- Pengguna: ' + ((sesi() || {}).nama || '-'), '- Diekspor: ' + tglJam(new Date().toISOString()), ''];
    L.forEach(m => {
      if (m.role === 'user') out.push('## Pertanyaan', '', m.teks, '');
      else if (m.galat) out.push('> ⚠️ ' + m.teks, '');
      else out.push('### ' + (m.jenis === 'analisis' ? 'Analisis' : m.jenis === 'hasil' ? 'Hasil aksi' : 'Jawaban') + ' (' + namaProv(m.prov) + (m.model ? ' · ' + m.model : '') + ')', '', m.jenis === 'hasil' ? '```json\n' + rapiJSON(m.teks).slice(0, 6000) + '\n```' : teksPesan(m), '');
    });
    const url = URL.createObjectURL(new Blob([out.join('\n')], { type: 'text/markdown;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = 'asisten-ai-' + (pid() || 'proyek') + '-' + hariIni() + '.md'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  /* ---------- setelan Admin ---------- */
  const SARAN_MODEL = { anthropic: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'], google: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'], openai: ['gpt-5-mini', 'gpt-5'], deepseek: ['deepseek-chat', 'deepseek-reasoner'], groq: ['llama-3.3-70b-versatile'], openrouter: ['openrouter/auto'] };
  const PERAN_AI = [['ADMIN', 'Admin'], ['PENGADAAN', 'Pengadaan'], ['LIHAT', 'Lihat saja']];
  function barisProv(p, baru) {
    const id = E(p.id), fmt = p.format === 'anthropic' ? 'Anthropic' : p.format === 'google' ? 'Google' : 'OpenAI-compatible';
    return `<div class="mp227-pv" data-id="${id}" data-baru="${baru ? '1' : ''}">
      <div class="pv-h"><label class="form-check form-switch mb-0"><input type="checkbox" class="form-check-input pv-aktif" ${p.aktif !== false ? 'checked' : ''}> <b>${E(p.nama || (baru ? 'Penyedia baru' : p.id))}</b></label>
        <span class="mp227-tag">${E(fmt)}</span>${p.punyaKunci ? `<span class="mp220-bd hijau">key ${E(p.kunci)}</span>` : (baru ? '' : '<span class="mp227-tag abu">tanpa key</span>')}
        <span class="ms-auto d-flex gap-2">${p.punyaKunci ? `<a href="#" class="text-danger small" onclick="mp227AiHapusKunci('${id}');return false">Hapus key</a>` : ''}${!p.baku ? '<a href="#" class="text-danger small" onclick="mp227AiHapusProv(this);return false">Hapus penyedia</a>' : ''}</span></div>
      <div class="pv-g">${baru ? '<div><label>ID (huruf kecil)</label><input class="form-control form-control-sm pv-id" placeholder="mis. mistral" maxlength="24"></div>' : ''}
        <div><label>Nama tampilan</label><input class="form-control form-control-sm pv-nama" maxlength="40" value="${E(p.nama || '')}"></div>
        <div><label>Model</label><input class="form-control form-control-sm pv-model" list="mp227Lm_${id}" maxlength="120" value="${E(p.model || '')}" placeholder="nama model (bebas)"><datalist id="mp227Lm_${id}">${(SARAN_MODEL[p.id] || []).map(x => `<option value="${E(x)}">`).join('')}</datalist></div>
        <div><label>API key</label><input type="password" autocomplete="off" class="form-control form-control-sm pv-kunci" placeholder="${p.punyaKunci ? 'kosongkan = tidak diubah' : 'tempel API key'}"></div>
        <div class="pv-url"><label>Base URL ${p.baku ? '(opsional)' : '(wajib, …/chat/completions)'}</label><input class="form-control form-control-sm pv-base" value="${E(p.baseURL || '')}" placeholder="${E(p.urlBaku || 'https://…/v1/chat/completions')}"></div></div></div>`;
  }
  function kumpulProv() {
    return [...document.querySelectorAll('#mp227PvDaftar .mp227-pv')].map(el => {
      const q = c => el.querySelector(c), baru = !!el.dataset.baru;
      return { id: baru ? q('.pv-id').value.trim().toLowerCase() : el.dataset.id, nama: q('.pv-nama').value.trim(), model: q('.pv-model').value.trim(), kunci: q('.pv-kunci').value.trim(), baseURL: q('.pv-base').value.trim(), aktif: q('.pv-aktif').checked, format: 'openai' };
    }).filter(p => p.id);
  }
  window.mp227AiSetel = async (catatan) => {
    if (!adm()) return;
    await aiMuat(true); const I = AI.info; if (!I || !I.admin) return pesan('Setelan Asisten AI belum tersedia (modul server 1.4.0+).', 'err');
    if (!Array.isArray(I.admin.providers)) return setelLama();
    const A = I.admin; AI.hapusProv = [];
    lapis(`<div class="mp219-dh"><h5><i class="fas fa-wand-magic-sparkles me-2"></i>Setelan Asisten AI</h5><button type="button" class="btn-close" aria-label="Tutup" onclick="mp227Tutup()"></button></div>
      <div class="mp219-db">${!I.luar ? '<div class="mp220-info merah mb-2"><i class="fas fa-server"></i><div class="small">Server masih Code.gs 2.5.0 — Asisten AI butuh <b>Code.gs 2.5.1</b> (izin akses URL luar).</div></div>' : ''}
        <div class="small fw-semibold mb-1">Penyedia AI <span class="mp220-sub">— model diisi bebas, versi baru langsung didukung. Selain Anthropic & Google memakai format OpenAI-compatible.</span></div>
        <div id="mp227PvDaftar" class="mp227-pvs">${A.providers.map(p => barisProv(p, false)).join('')}</div>
        <button type="button" class="btn btn-sm btn-light border mt-1" onclick="mp227AiTambahProv()"><i class="fas fa-plus me-1"></i>Tambah penyedia (OpenAI-compatible)</button>
        <div class="row g-2 mt-1">
          <div class="col-md-4"><div class="mp219-fr"><label for="mp227ABw">Penyedia bawaan</label><select class="form-select form-select-sm" id="mp227ABw">${A.providers.map(p => `<option value="${E(p.id)}" ${p.id === I.bawaanId ? 'selected' : ''}>${E(p.nama)}</option>`).join('')}</select></div></div>
          <div class="col-md-4"><div class="mp219-fr"><label for="mp227AKq">Kuota per pengguna / hari</label><input type="number" min="1" max="1000" class="form-control form-control-sm" id="mp227AKq" value="${N(I.kuota)}"></div></div>
          <div class="col-md-4"><div class="mp219-fr"><label for="mp227AMt">Panjang jawaban maks. (token)</label><input type="number" min="256" max="8192" step="256" class="form-control form-control-sm" id="mp227AMt" value="${N(A.maksToken)}"></div></div>
          <div class="col-12"><label class="small fw-semibold d-block mb-1">Peran yang boleh memakai</label>${PERAN_AI.map(p => `<label class="form-check form-check-inline small"><input class="form-check-input mp227-ap" type="checkbox" value="${p[0]}" ${A.peran.includes(p[0]) ? 'checked' : ''}> ${p[1]}</label>`).join('')}</div>
        </div>
        <div class="mp220-sub mt-2"><i class="fas fa-shield-halved"></i> API key disimpan di Properti Skrip server (AI_KEY_&lt;PENYEDIA&gt;), tidak pernah dikirim ke perangkat staf. Biaya pemakaian ditagih penyedia sesuai akun API key. Aksi tulis dari Asisten selalu berupa usulan yang harus diterapkan Pengadaan/Admin dan tercatat di Log (AI-AKSI).</div>
        <div id="mp227AMsg" class="small mt-2">${catatan || ''}</div></div>
      <div class="mp219-df"><button type="button" class="btn btn-light border" onclick="mp227Tutup()">Tutup</button><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp227AiSimpan(true)"><i class="fas fa-vial"></i><span>Simpan &amp; uji</span></button><button type="button" class="btn btn-primary" onclick="mp227AiSimpan(false)">Simpan</button></div>`, 820);
  };
  window.mp227AiTambahProv = () => {
    const d = document.getElementById('mp227PvDaftar'), A = AI.info && AI.info.admin; if (!d) return;
    if (A && d.querySelectorAll('.mp227-pv').length >= (A.maksProvider || 12)) return pesan('Maksimal ' + (A.maksProvider || 12) + ' penyedia.', 'err');
    d.insertAdjacentHTML('beforeend', barisProv({ id: 'baru' + (++AI.nBaru), nama: '', model: '', format: 'openai', aktif: true, baku: false }, true));
    const el = d.lastElementChild.querySelector('.pv-id'); if (el) el.focus();
  };
  window.mp227AiHapusProv = a => {
    const el = a.closest('.mp227-pv'); if (!el) return;
    if (!el.dataset.baru) { if (!confirm('Hapus penyedia "' + el.dataset.id + '" beserta API key-nya saat disimpan?')) return; AI.hapusProv.push(el.dataset.id); const o = document.querySelector('#mp227ABw option[value="' + el.dataset.id + '"]'); if (o) o.remove(); }
    el.remove();
  };
  window.mp227AiHapusKunci = async k => {
    if (!confirm('Hapus API key ' + namaProv(k) + '?')) return;
    try {
      const A = AI.info && AI.info.admin, p = A && Array.isArray(A.providers) ? A.providers.find(x => x.id === k) : null;
      const data = p ? { providers: [{ id: p.id, nama: p.nama, model: p.model, baseURL: p.baseURL, aktif: p.aktif, kunci: '__HAPUS__' }] } : { [k === 'gemini' ? 'kunciGemini' : 'kunciClaude']: '__HAPUS__', bawaan: AI.info.bawaan };
      AI.info = await regAksi('aiSetel', { data }); pilihProv(); pesan('API key dihapus.', 'ok'); window.mp227AiSetel(); aiGambar();
    } catch (err) { pesan(err.message, 'err'); }
  };
  window.mp227AiSimpan = async uji => {
    const g = id => document.getElementById(id), msg = (m, t) => { const el = g('mp227AMsg'); if (el) el.innerHTML = `<div class="alert alert-${t} py-1 px-2 mb-0">${m}</div>`; };
    const lama = !document.getElementById('mp227PvDaftar');
    try {
      const umum = { kuota: N(g('mp227AKq').value), maksToken: N(g('mp227AMt').value), peran: [...document.querySelectorAll('.mp227-ap:checked')].map(c => c.value) };
      const data = lama ? Object.assign(umum, { kunciClaude: g('mp227AkC').value.trim(), kunciGemini: g('mp227AkG').value.trim(), modelClaude: g('mp227AmC').value.trim(), modelGemini: g('mp227AmG').value.trim(), bawaan: g('mp227ABw').value })
        : Object.assign(umum, { providers: kumpulProv(), hapus: AI.hapusProv.slice(), bawaanId: g('mp227ABw').value, bawaan: g('mp227ABw').value });
      if (!lama) { const salah = data.providers.find(p => !/^[a-z][a-z0-9_]{1,23}$/.test(p.id)); if (salah) throw new Error('ID penyedia "' + salah.id + '" tidak valid (huruf kecil/angka/_, 2–24 karakter).'); }
      AI.info = await regAksi('aiSetel', { data }); AI.hapusProv = []; pilihProv(); fab(); aiGambar();
      if (lama) { g('mp227AkC').value = ''; g('mp227AkG').value = ''; }
      let teks = 'Setelan tersimpan.', jenis = 'success';
      if (uji) {
        const hasil = [], P = daftarProv();
        for (const p of P) { try { const r = await regAksi('aiTanya', { data: { provider: p.id, agen: false, pesan: [{ role: 'user', teks: 'Balas singkat: "Koneksi OK".' }] } }); hasil.push('✓ ' + E(p.nama) + ': ' + E(String(r.teks).slice(0, 80))); } catch (err) { hasil.push('✗ ' + E(p.nama) + ': ' + E(err.message)); } }
        teks = hasil.join('<br>') || 'Belum ada penyedia aktif dengan API key untuk diuji.'; jenis = hasil.some(h => h.startsWith('✗')) || !hasil.length ? 'warning' : 'success';
      }
      if (lama) msg(teks, jenis); else window.mp227AiSetel(`<div class="alert alert-${jenis} py-1 px-2 mb-0">${teks}</div>`);
    } catch (err) { msg(E(err.message), 'danger'); }
  };
  function setelLama() {   // modul server 1.4.0 (Claude & Gemini saja)
    const I = AI.info, A = I.admin;
    lapis(`<div class="mp219-dh"><h5><i class="fas fa-wand-magic-sparkles me-2"></i>Setelan Asisten AI</h5><button type="button" class="btn-close" aria-label="Tutup" onclick="mp227Tutup()"></button></div>
      <div class="mp219-db"><div class="mp220-info mb-2"><i class="fas fa-circle-info"></i><div class="small">Server masih Modul 1.4.0 (Claude & Gemini). Unggah <b>Modul server 1.5.0</b> untuk penyedia lain, agen aksi & perintah cepat.</div></div>
        <div class="row g-2">
          <div class="col-md-6"><div class="mp219-fr"><label for="mp227AkC">API key Claude ${I.siap.claude ? '<span class="mp220-bd hijau">tersimpan ' + E(A.kunci.claude) + '</span>' : ''}</label><input type="password" autocomplete="off" class="form-control form-control-sm" id="mp227AkC" placeholder="${I.siap.claude ? 'kosongkan = tidak diubah' : 'sk-ant-…'}"></div>
            <div class="mp219-fr"><label for="mp227AmC">Model Claude</label><input class="form-control form-control-sm" id="mp227AmC" list="mp227LmC" value="${E(I.model.claude)}"><datalist id="mp227LmC">${SARAN_MODEL.anthropic.map(x => `<option value="${x}">`).join('')}</datalist></div></div>
          <div class="col-md-6"><div class="mp219-fr"><label for="mp227AkG">API key Gemini ${I.siap.gemini ? '<span class="mp220-bd hijau">tersimpan ' + E(A.kunci.gemini) + '</span>' : ''}</label><input type="password" autocomplete="off" class="form-control form-control-sm" id="mp227AkG" placeholder="${I.siap.gemini ? 'kosongkan = tidak diubah' : 'AIza…'}"></div>
            <div class="mp219-fr"><label for="mp227AmG">Model Gemini</label><input class="form-control form-control-sm" id="mp227AmG" list="mp227LmG" value="${E(I.model.gemini)}"><datalist id="mp227LmG">${SARAN_MODEL.google.map(x => `<option value="${x}">`).join('')}</datalist></div></div>
          <div class="col-md-4"><div class="mp219-fr"><label for="mp227ABw">Penyedia bawaan</label><select class="form-select form-select-sm" id="mp227ABw"><option value="claude" ${I.bawaan === 'claude' ? 'selected' : ''}>Claude</option><option value="gemini" ${I.bawaan === 'gemini' ? 'selected' : ''}>Gemini</option></select></div></div>
          <div class="col-md-4"><div class="mp219-fr"><label for="mp227AKq">Kuota per pengguna / hari</label><input type="number" min="1" max="1000" class="form-control form-control-sm" id="mp227AKq" value="${N(I.kuota)}"></div></div>
          <div class="col-md-4"><div class="mp219-fr"><label for="mp227AMt">Panjang jawaban maks. (token)</label><input type="number" min="256" max="8192" step="256" class="form-control form-control-sm" id="mp227AMt" value="${N(A.maksToken)}"></div></div>
          <div class="col-12"><label class="small fw-semibold d-block mb-1">Peran yang boleh memakai</label>${PERAN_AI.map(p => `<label class="form-check form-check-inline small"><input class="form-check-input mp227-ap" type="checkbox" value="${p[0]}" ${A.peran.includes(p[0]) ? 'checked' : ''}> ${p[1]}</label>`).join('')}</div>
        </div>
        <div class="d-flex gap-3 small mt-2"><a href="#" onclick="mp227AiHapusKunci('claude');return false" class="text-danger" ${I.siap.claude ? '' : 'hidden'}>Hapus key Claude</a><a href="#" onclick="mp227AiHapusKunci('gemini');return false" class="text-danger" ${I.siap.gemini ? '' : 'hidden'}>Hapus key Gemini</a></div>
        <div id="mp227AMsg" class="small mt-2"></div></div>
      <div class="mp219-df"><button type="button" class="btn btn-light border" onclick="mp227Tutup()">Tutup</button><button type="button" class="btn btn-sm mp219-btn-o" onclick="mp227AiSimpan(true)"><i class="fas fa-vial"></i><span>Simpan &amp; uji</span></button><button type="button" class="btn btn-primary" onclick="mp227AiSimpan(false)">Simpan</button></div>`, 720);
  }
