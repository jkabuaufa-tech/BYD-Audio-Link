-- Data master awal (spreadsheet Proyek Pengarah Rukoh Lanjutan).
-- INSERT OR IGNORE: bila baris sudah ada (mis. sudah diubah pengguna), TIDAK ditimpa.
-- Harga Beli Jadi = CONTOH; perbarui lewat menu "Harga Beli Jadi".

INSERT OR IGNORE INTO m_unit_produksi (id, kode, nama, kapasitas_harian, satuan_kapasitas, sheet_acuan) VALUES
 (1, 'BP',  'Batching Plant',        NULL, 'm3',    'Batching Plant'),
 (2, 'SC',  'Stone Crusher',         NULL, 'm3',    'STONE CRUSHER'),
 (3, 'AGR', 'Agregat Blending',      NULL, 'm3',    'AGREGATE'),
 (4, 'AMP', 'Asphalt Mixing Plant',  NULL, 'Ton',   'AMP'),
 (5, 'ANG', 'Angkutan Material',     NULL, 'm3.km', 'UPAH ANGKUT'),
 (6, 'SRT', 'Quarry Sirtu',          NULL, 'm3',    'SIRTU'),
 (7, 'BTG', 'Quarry Batu Gelondong', NULL, 'm3',    'BATU GEL'),
 (8, 'HPD', 'Hampar & Padat',        NULL, 'm3',    'HAMPAR PADAT'),
 (9, 'GAL', 'Galian',                300,  'm3',    'GALIAN');

INSERT OR IGNORE INTO m_item (id, unit_id, kode, nama, satuan, spesifikasi, volume_rencana, hs_ahsp, overhead_pct) VALUES
 (1, 1, 'BP-K350',  'Beton Ready Mix K350',        'm3',    'JMF K350 slump 10±2 cm', 26762, 1448977.09, 0.03),
 (2, 2, 'SC-SPLIT', 'Batu Pecah 1-2 & 2-3',        'm3',    'Gradasi split 1-2 & 2-3', 3367,    90760.00, 0.03),
 (3, 3, 'AGR-BC',   'Agregat Base Course',         'm3',    'Agregat Kelas A/B',       7200,    74910.00, 0.03),
 (4, 4, 'AMP-HM',   'Aspal Hotmix',                'Ton',   'AC-WC / AC-BC',            872,  1261904.00, 0.03),
 (5, 5, 'ANG-DT',   'Angkutan Dump Truck',         'm3.km', NULL,                     50000,    16057.00, 0.03),
 (6, 6, 'SRT-01',   'Penggalian & Pemuatan Sirtu', 'm3',    NULL,                      8000,    79048.00, 0.03),
 (7, 7, 'BTG-01',   'Batu Gelondong',              'm3',    'Diameter 15-25 cm',       6000,    87405.00, 0.03),
 (8, 8, 'HPD-01',   'Hampar Padat',                'm3',    'Kepadatan ≥ 95% MDD',     7000,    38027.00, 0.03),
 (9, 9, 'GAL-01',   'Galian Excavator',            'm3',    'Tanah & batuan lunak',   42860,    15548.89, 0.03);

INSERT OR IGNORE INTO m_sumber_daya (kode, nama, kategori, sifat, satuan, tarif_standar, keterangan) VALUES
 ('MAT-01', 'Pasir Cor',            'MATERIAL', 'VARIABEL', 'm3',   132000, 'Bahan beton ready mix'),
 ('MAT-02', 'Batu Split 1-2',       'MATERIAL', 'VARIABEL', 'm3',   330000, 'Agregat kasar BP'),
 ('MAT-03', 'Batu Split 2-3',       'MATERIAL', 'VARIABEL', 'm3',   330000, 'Agregat kasar BP'),
 ('MAT-04', 'Semen Portland (PC)',  'MATERIAL', 'VARIABEL', 'kg',     1575, 'Semen curah / sak'),
 ('MAT-05', 'Sirtu Material',       'MATERIAL', 'VARIABEL', 'm3',    40000, 'Material base course'),
 ('EBM-01', 'Solar Industri (BBM)', 'BBM',      'VARIABEL', 'ltr',   18000, 'Harga BBM tunggal untuk semua unit'),
 ('ALT-01', 'Sewa Excavator',       'ALAT',     'TETAP',    'jam',  210000, 'Excavator 20T'),
 ('ALT-02', 'Sewa Wheel Loader',    'ALAT',     'TETAP',    'jam',  200000, 'Loader agregat BP'),
 ('ALT-03', 'Sewa Truck Mixer',     'ALAT',     'TETAP',    'jam',  350000, 'Kapasitas 5 m3'),
 ('ALT-04', 'Sewa Batching Plant',  'ALAT',     'TETAP',    'jam',  600000, 'Unit BP dry/wet mix'),
 ('ALT-05', 'Sewa Dump Truck',      'ALAT',     'TETAP',    'jam',   95568, 'DT angkut material'),
 ('UPH-01', 'Upah Operator',        'UPAH',     'TETAP',    'hari', 300000, 'Operator alat utama'),
 ('UPH-02', 'Upah Mekanik',         'UPAH',     'TETAP',    'hari', 240000, 'Mekanik lapangan'),
 ('OPS-01', 'Listrik PLN BP',       'OVERHEAD_LAIN', 'TETAP', 'hari', 1250000, 'Genset / daya PLN BP');

INSERT OR IGNORE INTO m_koefisien_ahsp (item_id, sumber_daya_kode, koefisien, waste_pct) VALUES
 (1, 'MAT-01', 0.407143, 0.02),
 (1, 'MAT-02', 0.300000, 0.02),
 (1, 'MAT-03', 0.300000, 0.02),
 (1, 'MAT-04', 520.000000, 0.02);

INSERT OR IGNORE INTO m_parameter_evaluasi (kunci, nilai, keterangan) VALUES
 ('periode_berturut',   '3',        'Jumlah minggu berturut-turut HS Swakelola+OH > Beli Jadi untuk memicu alert'),
 ('ambang_waspada_pct', '2',        'Efisiensi (%) di bawah nilai ini = WASPADA'),
 ('granularitas',       'mingguan', 'Periode evaluasi: mingguan Senin–Minggu'),
 ('metode_benchmark',   'TERENDAH', 'TERENDAH atau RATA_RATA dari SPH yang memenuhi spesifikasi');

INSERT OR IGNORE INTO t_benchmark_beli_jadi (id, item_id, vendor, harga_satuan, biaya_angkut_per_satuan, berlaku_mulai, sumber, keterangan) VALUES
 (1,  1, 'Vendor Ready Mix A (contoh)',   1470000,     0, '2026-07-01', 'SPH', 'CONTOH — ganti dengan SPH riil'),
 (2,  1, 'Vendor Ready Mix B (contoh)',   1515000,     0, '2026-07-01', 'SPH', 'CONTOH'),
 (3,  2, 'Supplier Split A (contoh)',       88000,  9000, '2026-07-01', 'SPH', 'CONTOH'),
 (4,  3, 'Supplier Agregat A (contoh)',     82000,  9000, '2026-07-01', 'SPH', 'CONTOH'),
 (5,  4, 'AMP Pihak Ketiga A (contoh)',   1225000, 35000, '2026-07-01', 'SPH', 'CONTOH'),
 (6,  5, 'Rental Dump Truck A (contoh)',    18200,     0, '2026-07-01', 'SPH', 'CONTOH'),
 (7,  6, 'Quarry Sirtu A (contoh)',         76000,  8000, '2026-07-01', 'SPH', 'CONTOH'),
 (8,  7, 'Quarry Batu A (contoh)',          82000,  9500, '2026-07-01', 'SPH', 'CONTOH'),
 (9,  8, 'Subkon Hampar Padat A (contoh)',  44500,     0, '2026-07-01', 'SPH', 'CONTOH'),
 (10, 9, 'Subkon Galian A (contoh)',        17800,     0, '2026-07-01', 'SPH', 'CONTOH');
