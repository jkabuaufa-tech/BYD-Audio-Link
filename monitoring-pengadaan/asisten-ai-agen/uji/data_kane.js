// Data uji 2.10.16 — kasus nyata PT Kane Perkasa Indonesia (Pekerjaan Penyelidikan Tanah): kontrak awal 015/SPPP Rp 81.700.000 (s.d. 27 Agu 2026),
// BAP 1 (12 Agu 2026, 20%), Addendum 1 Rp 136.800.000 (s.d. 30 Nov 2026; item baru Uji Kuat Tekan Beton), BAP 2 (11 Nov 2026, 100%).
// Angka acuan = dokumen tagihan bertanda tangan (BAP 1 kontrak awal & BAP Add.1).
const T = '/WK-NK.KSO/PDBJ/1726012/2026', NO = '015/SPPP' + T, ADD = '015/ADD1/SPPP' + T;
const J = u => ({ itemPekerjaan: u }), I = (u, v, s, h) => ({ itemPekerjaan: u, volume: v, satuan: s, hargaSatuan: h });
const AWAL = [J('Pekerjaan Penyelidikan Tanah'), J('Mobilisasi dan Akomodasi'), I('Mob-Demob Mesin+Alat(untuk 2 unit alat)', 2, 'trip/unit', 2250000), I('Mob-Demob Tim (estimasi 10 orang)', 2, 'trip/unit', 800000),
  I('Transportasi Lokal', 1, 'ls', 2500000), I('Mess (Kontrakan)', 1, 'ls', 1800000), I('APD and Safety', 1, 'ls', 0), J('Man Month Engineering'), I('Engineer Geoteknik', 1, 'ls', 0), I('Asisten Engineer Geoteknik', 1, 'ls', 0),
  J('Field Investigation'), I('Coring (Drilling Sampai Lapisan Armor ( 4 - 12 meter atau lebih)', 192, 'titik/meter', 300000), I('Corebox Sampling', 24, 'titik/bor', 125000), I('Coring Beton (40 cm sd 100 cm)', 6, 'titik/titik', 950000),
  J('Report'), I('Factual Report Drilling Investigation', 1, 'ls', 5000000)];
const ADD1 = [J('Pekerjaan Penyelidikan Tanah'), J('Mobilisasi dan Akomodasi'), I('Mob-Demob Mesin+Alat(untuk 2 unit alat)', 4, 'trip/unit', 2250000), I('Mob-Demob Tim (estimasi 10 orang)', 4, 'trip/unit', 800000),
  I('Transportasi Lokal', 1, 'ls', 2500000), I('Mess (Kontrakan)', 1, 'ls', 1800000), I('APD and Safety', 1, 'ls', 0), J('Man Month Engineering'), I('Engineer Geoteknik', 1, 'ls', 0), I('Asisten Engineer Geoteknik', 1, 'ls', 0),
  J('Field Investigation'), I('Coring (Drilling Sampai Lapisan Armor ( 4 - 12 meter atau lebih)', 328.5, 'titik/meter', 300000), I('Corebox Sampling', 82, 'titik/bor', 125000), I('Coring Beton (40 cm sd 100 cm)', 5, 'titik/titik', 950000),
  I('Uji Kuat Tekan Beton (Cutting, Capping, Test Tekan)', 5, 'sampel', 350000), J('Report'), I('Factual Report Drilling Investigation', 1, 'ls', 5000000)];
// BK 1 (kontrak awal, 20%): volume per item kontrak awal — id = <nomor kontrak>#<indeks item>
const v1 = { 2: 0.4, 3: 0.4, 4: 0.2, 5: 0.2, 11: 38.4, 12: 4.8, 13: 1.2, 15: 0.2 }, BK1 = {}; Object.keys(v1).forEach(i => { BK1[NO + '#' + i] = v1[i]; });
// BK 2 (addendum, sisa s.d. 100%): item lanjutan memakai id kontrak awal; item baru (Uji Kuat Tekan) memakai id addendum
const v2 = { 2: 3.6, 3: 3.6, 4: 0.8, 5: 0.8, 6: 1, 8: 1, 9: 1, 11: 290.1, 12: 77.2, 13: 3.8, 15: 0.8 }, BK2 = {}; Object.keys(v2).forEach(i => { BK2[NO + '#' + i] = v2[i]; }); BK2[ADD + '#14'] = 5;
const PROG = [
  { id: 'BK1', noKontrak: NO, tagihanKe: 1, periode: '2026-08', periodeKey: 202608, tanggal: '2026-08-12', tanggalBA: '2026-08-12', nomorBA: '01/BAPP/' + NO, items: BK1, nilai: 16340000, baTerbit: '2026-08-12', dibuatPada: '2026-08-12T03:00:00.000Z' },
  { id: 'BK2', noKontrak: NO, tagihanKe: 2, periode: '2026-11', periodeKey: 202611, tanggal: '2026-11-11', tanggalBA: '2026-11-11', nomorBA: '02/BAPP/' + NO, items: BK2, nilai: 120460000, baTerbit: '2026-11-11', dibuatPada: '2026-11-11T03:00:00.000Z' }];
const VENDOR = 'Kane Perkasa Indonesia, PT';
const grup = () => [
  { key: NO, namaVendor: VENDOR, idVendor: '2100099', nilai: 81700000, realisasi: 136800000, tglMulai: '2026-08-07', tglSelesai: '2026-08-27', items: JSON.parse(JSON.stringify(AWAL)), entriProgres: JSON.parse(JSON.stringify(PROG)), statusKey: 'berjalan' },
  { key: ADD, namaVendor: VENDOR, idVendor: '2100099', nilai: 136800000, realisasi: 0, tglMulai: '2026-08-27', tglSelesai: '2026-11-30', items: JSON.parse(JSON.stringify(ADD1)), entriProgres: [], statusKey: 'berjalan' }];
const regItem = L => L.map(i => ({ uraian: i.itemPekerjaan, vol: i.volume || 0, sat: i.satuan || '', harga: i.hargaSatuan || 0 }));
const REG = [
  { id: 'R15', noKontrak: NO, namaVendor: VENDOR, idVendor: '2100099', nilai: 81700000, diposting: true, tglKontrak: '2026-08-07', tglSelesai: '2026-08-27', dibuatPada: '2026-08-07T02:00:00.000Z', items: regItem(AWAL) },
  { id: 'R15A', noKontrak: ADD, namaVendor: VENDOR, idVendor: '2100099', nilai: 136800000, diposting: true, tglKontrak: '2026-08-27', tglSelesai: '2026-11-30', dibuatPada: '2026-11-10T02:00:00.000Z', dipostingPada: '2026-11-10T02:30:00.000Z', items: regItem(ADD1) }];
module.exports = { T, NO, ADD, AWAL, ADD1, PROG, VENDOR, grup, REG };
