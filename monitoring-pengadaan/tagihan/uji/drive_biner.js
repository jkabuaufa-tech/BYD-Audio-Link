// Tiruan Drive biner untuk harness: Utilities.newBlob(byte[]) & base64Decode, berkas PDF hasil gabung terdaftar di folder proyek
// (sama dengan perilaku Apps Script: berkas dapat divalidasi cl217RefValid_ & dibuka ambilBerkas).
const vm = require('vm');
module.exports = function pasang(C, K, P) {
  C.Utilities.base64Decode = s => [...Buffer.from(String(s), 'base64')].map(b => b > 127 ? b - 256 : b);
  const nb = C.Utilities.newBlob; C.Utilities.newBlob = (s, tipe, nama) => typeof s === 'string' ? Object.assign(nb(s), { tipe, nama }) : { biner: true, bytes: s, tipe, nama };
  let n = 0; const folder = f => { if (f.__bl) return f; f.__bl = true; const asli = f.createFile;
    f.createFile = b => { if (!b.biner) return asli(b); const id = 'PDF' + (++n); C.__files[id] = { nama: b.nama, data: Buffer.from(b.bytes.map(x => x & 255)).toString('latin1'), biner: true, induk: f.getId(), diubah: Date.now() };
      return { getId: () => id, getName: () => b.nama, getUrl: () => 'drive://' + id, setDescription() { } }; };
    const cf = f.createFolder; f.createFolder = nm => folder(cf(nm)); return f; };
  const akar = vm.runInContext('folderBerkas_()', C); folder(akar); Object.values(akar.anak).forEach(folder); folder(K.folderProyek_(P));
};
