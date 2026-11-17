/*
 * Konfigurasi aplikasi.
 * API_URL kosong  → MODE LOKAL: data hanya di browser ini, tanpa login (seperti sebelumnya).
 * API_URL terisi  → MODE SERVER: wajib login (kode via email), data bersama di Google Sheet,
 *                   tetap bisa input saat offline (antre & terkirim otomatis saat online).
 * Isi dengan URL Web App Apps Script (diakhiri /exec). Lihat apps-script/PANDUAN.md.
 */
window.JIAT_CONFIG = {
  API_URL: '',
};
