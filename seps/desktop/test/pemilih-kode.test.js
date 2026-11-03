'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { daftarKandidat } = require('../pemilih-kode');

const ada = () => true;

test('tanpa paket terpasang → bawaan', () => {
  assert.deepEqual(daftarKandidat({ aktif: null, versiBawaan: '1.0.0', adaVersi: ada }), ['bawaan']);
});

test('paket terbaru dahulu, lalu versi terpasang lain, lalu bawaan', () => {
  const aktif = { versi: '1.2.0', riwayat: [{ versi: '1.1.0' }, { versi: '1.2.0' }], gagal: {} };
  assert.deepEqual(daftarKandidat({ aktif, versiBawaan: '1.0.0', adaVersi: ada }), ['1.2.0', '1.1.0', 'bawaan']);
});

test('versi yang gagal dilewati', () => {
  const aktif = { versi: '1.2.0', riwayat: [{ versi: '1.1.0' }, { versi: '1.2.0' }], gagal: { '1.2.0': { pesan: 'x' } } };
  assert.deepEqual(daftarKandidat({ aktif, versiBawaan: '1.0.0', adaVersi: ada }), ['1.1.0', 'bawaan']);
});

test('installer baru lebih baru dari paket → bawaan installer dipakai', () => {
  const aktif = { versi: '1.1.0', riwayat: [{ versi: '1.1.0' }], gagal: {} };
  assert.deepEqual(daftarKandidat({ aktif, versiBawaan: '1.3.0', adaVersi: ada }), ['bawaan']);
});

test('pengguna memilih "bawaan" → hanya bawaan; folder hilang dilewati', () => {
  assert.deepEqual(daftarKandidat({ aktif: { versi: 'bawaan', riwayat: [{ versi: '1.1.0' }] }, versiBawaan: '1.0.0', adaVersi: ada }), ['bawaan']);
  const aktif = { versi: '1.1.0', riwayat: [{ versi: '1.1.0' }] };
  assert.deepEqual(daftarKandidat({ aktif, versiBawaan: '1.0.0', adaVersi: () => false }), ['bawaan']);
});

test('pengguna memilih versi lama terpasang → versi itu dahulu', () => {
  const aktif = { versi: '1.1.0', riwayat: [{ versi: '1.1.0' }, { versi: '1.2.0' }] };
  assert.deepEqual(daftarKandidat({ aktif, versiBawaan: '1.0.0', adaVersi: ada }), ['1.1.0', '1.2.0', 'bawaan']);
});
