/** export.js — Ekspor seluruh tampilan ke satu berkas Excel (SheetJS). */
(function () {
  'use strict';
  const JIAT = (window.JIAT = window.JIAT || {});

  JIAT.exportExcel = function (ctx) {
    if (!window.XLSX) return JIAT.ui.toast('Pustaka Excel tidak termuat', 'bad');
    const { view, state } = ctx, s = view.summary, X = window.XLSX;
    const divName = new Map(state.divisions.map((d) => [d.id, d.kode + ' - ' + d.nama]));
    const item = new Map(view.items.map((i) => [i.id, i]));
    const sheets = {
      'Rekap Action Plan': [
        [state.project.nama], [],
        ['Tanggal monitoring', s.tanggalMonitoring, '', 'Nilai Nego BOQ', s.totalNilai],
        ['Target Des 2026', s.targetDes, '', 'Realisasi s.d. tanggal', s.realisasiSd],
        ['Target linier s.d. tgl', s.targetLinier, '', 'Deviasi target', s.deviasi], [],
        ['No', 'Divisi Pekerjaan', 'Nilai BOQ (Rp)', 'Bobot BOQ', 'Target Des', 'Realisasi', 'Deviasi', 'PIC', 'Kendala Utama', 'Tindak Lanjut / Keputusan', 'Due Date', 'Status Action'],
        ...view.divisions.map((d) => [d.no, d.kode + ' - ' + d.nama, d.nilai, d.bobot, d.targetDes, d.realisasi, d.deviasi, d.pic, d.kendala, d.tindakLanjut, d.dueDate, d.statusAction]),
      ],
      'Rincian BOQ': [
        ['Kode', 'Divisi', 'Subbagian', 'Uraian BOQ', 'Sat', 'Vol BOQ', 'Harga Nego (Rp)', 'Nilai BOQ (Rp)', 'Bobot BOQ', 'Target Vol Des', 'Target Bobot Des', 'PIC', 'Mulai', 'Selesai', 'Kendala', 'Action Plan', 'Due Date', 'Realisasi s.d. tgl', 'Sisa Vol', 'Progres Item', 'Kontribusi Progres', 'Status'],
        ...view.items.map((i) => [i.id, divName.get(i.divisionId), i.subbagian, i.uraian, i.satuan, i.volume, i.hargaNego, i.nilai, i.bobot, i.targetVolDes, i.targetBobotDes, i.pic, i.mulai, i.selesai, i.kendala, i.actionPlan, i.dueDate, i.realisasi, i.sisa, i.progres, i.kontribusi, i.status]),
      ],
      'Monitoring Harian': [
        ['Tanggal', 'Target Kum', 'Real Hari', 'Real Kum', 'Deviasi', 'Nilai Progres Hari (Rp)', 'Kendala Harian', 'Action / PIC', 'Due Date', 'Status', 'Target Hari', 'Catatan Rapat'],
        ...view.daily.map((r) => { const n = r.note || {}; return [r.tanggal, r.targetKum, r.realHari, r.realKum, r.deviasi, r.nilaiHari, n.kendala, n.action, n.dueDate, n.status, r.targetHari, n.catatan]; }),
      ],
      'Input Harian': [
        ['Tanggal', 'Kode', 'Uraian BOQ', 'Sat', 'Volume', 'Nilai (Rp)', 'Diinput oleh', 'Diperbarui'],
        ...state.progress.slice().sort((a, b) => (a.tanggal + a.itemId).localeCompare(b.tanggal + b.itemId)).map((p) => {
          const i = item.get(p.itemId) || {}; return [p.tanggal, p.itemId, i.uraian, i.satuan, p.volume, p.volume * (i.hargaNego || 0), p.diinputOleh, p.updatedAt];
        }),
      ],
      'Pengadaan Penting': [
        ['Kelompok', 'Uraian', 'Kode BOQ', 'Sat', 'Total (BOQ)', 'Stock 2026', 'Target Des', 'MOS', 'Terpasang s.d. tgl', 'Catatan'],
        ...state.procurement.map((p) => { const i = item.get(p.itemId) || {}; return [p.kelompok, p.uraian, p.itemId, i.satuan, i.volume, p.stock2026, i.targetVolDes, p.mos, i.realisasi, p.catatan]; }),
      ],
      'Lokasi Sumur': [
        ['SBD', 'Kabupaten', 'Dominasi Tanah', 'Rekomtek', 'Tim', 'Vendor Pemboran', 'Status', 'Catatan'],
        ...state.wells.map((w) => [w.sbd, w.kabupaten, w.tanah, w.rekomtek, w.tim, w.vendorPemboran, w.status, w.catatan]),
      ],
    };
    const wb = X.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) {
      const ws = X.utils.aoa_to_sheet(rows.map((r) => r.map((c) => (c == null ? '' : c))));
      ws['!cols'] = rows[rows.length > 6 ? 6 : 0].map((_, c) => ({ wch: Math.min(60, Math.max(10, ...rows.slice(0, 60).map((r) => String(r[c] == null ? '' : r[c]).length + 2))) }));
      X.utils.book_append_sheet(wb, ws, name);
    }
    X.writeFile(wb, `Monitoring-JIAT-${s.tanggalMonitoring}.xlsx`);
    JIAT.ui.toast('Berkas Excel diunduh');
  };
})();
