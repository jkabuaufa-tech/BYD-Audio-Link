#!/usr/bin/env python3
"""Perbaiki template tagihan baku (BAP - format.xlsx & Master SPM) menjadi template berumus seragam & benar 100%.

  python3 -I tagihan/alat/perbaiki-template.py      → tagihan/template/BAP - format (2.9.8).xlsx
                                                      tagihan/template/Master SPM (2.9.8).xlsx

Sumber: template yang tertanam di asisten-ai-agen/pembaruan-2.9.7.json (window.__MP292_FORMAT, sama dengan berkas asli
tanpa sheet database "rekanan"). Penyuntingan langsung pada XML: kop/logo, gambar, Print Area, Page Setup, margin, merge cells,
gaya & lebar kolom tidak disentuh, kecuali yang tercantum di PERBAIKAN di bawah.

PERBAIKAN BAP - format
  1. lamp1 15–39 (25 baris): K = IF(COUNT(H,J)<2,"",H*J) seragam (contoh lama: K23/K35/K36 = 0, K15/K16/K25/K39 kosong); gaya baris
     seragam (baris 17); PPN K42 = K41 × DATA!B11 (dulu 0,11 tetap).
  2. rincian 13–37: rantai rumus seragam ke lamp1 baris +2 (B/C/D/N/O/P), Q…X, alokasi termin AL:AQ = REKAP PROGRES J:O (dulu baris
     21–22, 31–32, 35–36 tanpa alokasi), kontrol AS/AT ke baris sendiri (dulu merujuk N baris +1/+2); C12 kosong tanpa "0"; AL5 = DATA!B28 (termin aktif).
  3. BAPP 36–60: baris ke lamp1 baris −21 & rincian baris −23 (dulu baris 49–59 merujuk rincian S36…S46 — bergeser 10 baris);
     T8 = DATA!B28; nomor B10 = DATA!B30; uang muka N68 = ROUND(N66 × DATA!B46) & retensi K69 = DATA!B47 (dulu konstanta 0 / 5%), N69 dibulatkan.
  4. BAP 1: T9 = DATA!B28; nomor C11 = DATA!B31; retensi & UM yang lalu/saat ini (J36/J37/J41/J42 = %, M36/M41 = prestasi lalu) — dulu konstanta 0 / 5%.
  5. BAPR: G22 nilai kontrak (dulu #REF!), prestasi per termin J32:J37 = SUMPRODUCT(alokasi termin × harga) langsung dari rincian
     (dulu BAP 2–6 yang rusak), I42 tanpa #DIV/0! bila retensi 0%, jenis kontrak dinamis di narasi (dulu tertulis "SPKP"), tanggal termin kosong → "".
  6. DATA: B37 jenis dokumen kontrak (otomatis dari nomor: SPPP/SPKP/SPK), B46/B47 = B45/B44 (bawaan, dapat ditimpa).
  7. Sheet tersembunyi BAP 2–6, BAPP 2–6, rincian 2–6 dihapus: berisi #REF! (531/841 sel per sheet). Satu set sheet cetak mengikuti
     DATA!B28 Termin Aktif ("1 progres bulanan = 1 print"; aplikasi menyimpan 1 berkas per termin).
  8. Kop BAP 1 & BAPP: nama proyek satu baris (Arial tebal 11 pt, tanpa pindah baris) — dulu 2 baris menimpa garis & alamat kantor;
     garis merah tidak lagi mencoret alamat (BAPP: dinaikkan ke celah nama–alamat; BAP 1: garis kedua dihapus, satu garis seperti kop baku).
  9. Semua sheet: tanggal kosong dicetak "-" (bukan 00 Januari 1900); kalkulasi penuh saat dibuka.
PERBAIKAN Master SPM
  1. ITEM O:R (kunci urut narasi BAP): item terealisasi pada termin tsb. urut NILAI PROGRES (volume × harga) terbesar, lalu item kontrak
     bernilai terbesar → narasi BAP selalu min. 3 item (dulu urut harga satuan, hanya item termin itu).
  2. Semua sheet: tanggal kosong dicetak "-"; kalkulasi penuh saat dibuka.
"""
import base64, io, json, os, re, sys, zipfile
from openpyxl.formula.translate import Translator

T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(os.path.dirname(T), 'asisten-ai-agen')
KELUAR = os.path.join(T, 'template')
NAMA = {'bap': 'BAP - format (2.9.8).xlsx', 'spm': 'Master SPM (2.9.8).xlsx'}

esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
unesc = lambda s: s.replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('&apos;', "'").replace('&amp;', '&')
def kolno(h):
    n = 0
    for ch in h: n = n * 26 + ord(ch) - 64
    return n
def pisah(ref):
    m = re.fullmatch(r'([A-Z]+)(\d+)', ref); return m.group(1), int(m.group(2))

def template_dasar():
    js = json.load(open(os.path.join(R, 'pembaruan-2.9.7.json'), encoding='utf-8'))['js']
    F = json.loads(re.search(r'window\.__MP292_FORMAT = (\{.*\});?\n', js).group(1))
    out = {}
    for k, v in F.items():
        z = zipfile.ZipFile(io.BytesIO(base64.b64decode(v)))
        out[k] = ([i.filename for i in z.infolist()], {n: z.read(n) for n in z.namelist()})
    return out

class Buku:
    def __init__(self, urutan, isi):
        self.urutan, self.F = urutan, isi
    def t(self, p): return self.F[p].decode('utf-8')
    def set(self, p, s): self.F[p] = s.encode('utf-8')
    def peta(self):
        rels = self.t('xl/_rels/workbook.xml.rels')
        rid = {}
        for rel in re.findall(r'<Relationship [^>]*/>', rels):
            i = re.search(r'Id="([^"]+)"', rel).group(1); tg = re.search(r'Target="([^"]+)"', rel).group(1)
            rid[i] = 'xl/' + tg.lstrip('/').replace('xl/', '', 1) if not tg.startswith('/') else tg.lstrip('/')
        return [(unesc(n), r, rid[r]) for n, r in re.findall(r'<sheet [^>]*?name="([^"]*)"[^>]*?r:id="([^"]+)"', self.t('xl/workbook.xml'))]
    def path(self, nama): return {n: p for n, r, p in self.peta()}[nama]
    def ubah(self, nama, fn): p = self.path(nama); self.set(p, fn(self.t(p)))
    def simpan(self, p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED) as z:
            for n in [x for x in self.urutan if x in self.F] + [x for x in self.F if x not in self.urutan]:
                z.writestr(n, self.F[n])

# ---------- XML lembar ----------
def lepas_shared(xml):
    """Rumus bersama (t="shared") → rumus eksplisit per sel, agar sel induk aman diganti."""
    induk = {}
    for m in re.finditer(r'<c r="([A-Z]+\d+)"[^>]*>\s*<f([^>]*)t="shared"([^>]*)>([^<]*)</f>', xml):
        si = re.search(r'si="(\d+)"', m.group(2) + m.group(3)).group(1); induk[si] = (m.group(1), unesc(m.group(4)))
    def anak(m):
        ref, at1, at2 = m.group(1), m.group(3), m.group(4)
        si = re.search(r'si="(\d+)"', at1 + at2).group(1); o, f = induk[si]
        g = Translator('=' + f, origin=o).translate_formula(ref)[1:]
        lain = re.sub(r'\s(t|si|ref)="[^"]*"', '', at1 + at2)
        return m.group(0)[:m.start(2) - m.start(0)] + '<f%s>%s</f>' % (lain, esc(g))
    xml = re.sub(r'<c r="([A-Z]+\d+)"[^>]*>\s*()<f([^>]*)t="shared"([^>]*)/>', anak, xml)
    xml = re.sub(r'<f([^>]*?)\st="shared"([^>]*?)>', lambda m: '<f%s>' % re.sub(r'\s(si|ref)="[^"]*"', '', m.group(1) + m.group(2)), xml)
    return xml

def isi_sel(xml, ref, nilai, gaya=None):
    """nilai: ('f', rumus) | angka | teks | None. Gaya sel lama dipertahankan kecuali `gaya` diberikan."""
    kh, r = pisah(ref); kn = kolno(kh)
    def sel(s):
        s = (' s="%s"' % gaya) if gaya is not None else s
        if nilai is None: return '<c r="%s"%s/>' % (ref, s)
        if isinstance(nilai, tuple): return '<c r="%s"%s><f>%s</f></c>' % (ref, s, esc(nilai[1].lstrip('=')))
        if isinstance(nilai, (int, float)): return '<c r="%s"%s><v>%s</v></c>' % (ref, s, repr(nilai) if isinstance(nilai, float) else nilai)
        return '<c r="%s"%s t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>' % (ref, s, esc(str(nilai)))
    m = re.search(r'<c r="%s"(\s[^>]*?)?(?:/>|>[\s\S]*?</c>)' % ref, xml)
    if m:
        s = re.search(r'\ss="\d+"', m.group(1) or ''); return xml[:m.start()] + sel(s.group(0) if s else '') + xml[m.end():]
    b = re.search(r'<row r="%d"(\s[^>]*)?(?:/>|>([\s\S]*?)</row>)' % r, xml)
    if b:
        isi = b.group(2) or ''; pos = len(isi)
        for c in re.finditer(r'<c r="([A-Z]+)\d+"', isi):
            if kolno(c.group(1)) > kn: pos = c.start(); break
        return xml[:b.start()] + '<row r="%d"%s>' % (r, b.group(1) or '') + isi[:pos] + sel('') + isi[pos:] + '</row>' + xml[b.end():]
    akhir = xml.index('</sheetData>'); pos = akhir
    for x in re.finditer(r'<row r="(\d+)"', xml):
        if int(x.group(1)) > r: pos = x.start(); break
    return xml[:pos] + '<row r="%d">%s</row>' % (r, sel('')) + xml[pos:]

def gaya_baris(xml, baris):
    b = re.search(r'<row r="%d"([^>]*)>([\s\S]*?)</row>' % baris, xml)
    g = {c: s for c, s in re.findall(r'<c r="([A-Z]+)%d"[^>]*?\ss="(\d+)"' % baris, b.group(2))}
    ht = re.search(r'\sht="([\d.]+)"', b.group(1)); return g, (ht.group(1) if ht else None)
def tinggi_baris(xml, baris, ht):
    if not ht: return xml
    return re.sub(r'<row r="%d"([^>]*)>' % baris, lambda m: '<row r="%d"%s ht="%s" customHeight="1">' % (baris, re.sub(r'\s(ht|customHeight)="[^"]*"', '', m.group(1)), ht), xml, count=1)

def baris_seragam(xml, baris, model, isi):
    """Isi baris `baris` dengan gaya baris `model` (kolom bergaya model) + isi {kolom: nilai}; kolom lain di rentang model dikosongkan."""
    g, ht = gaya_baris(xml, model)
    for k in sorted(set(g) | set(isi), key=kolno):
        xml = isi_sel(xml, '%s%d' % (k, baris), isi.get(k), g.get(k))
    return tinggi_baris(xml, baris, ht)

TGL = re.compile(r'(^|[^A-Z])TEXT\(([^(),]+),(&quot;|")((?:\[\$-\d+\])?dd? mmmm yyyy)\3\)')
def tanggal_aman(xml):
    ganti = lambda t: '%sIF(N(%s)&lt;1,%s-%s,TEXT(%s,%s%s%s))' % (t.group(1), t.group(2), t.group(3), t.group(3), t.group(2), t.group(3), t.group(4), t.group(3))
    return re.sub(r'<f(\s[^>]*)?>([^<]*)</f>', lambda m: m.group(0) if 'TEXT(' not in m.group(2) else '<f%s>%s</f>' % (m.group(1) or '', TGL.sub(ganti, m.group(2))), xml)

def hitung_penuh(B):
    wb = B.t('xl/workbook.xml')
    if '<calcPr' in wb: wb = re.sub(r'<calcPr([^>]*?)\s*/>', lambda m: '<calcPr%s fullCalcOnLoad="1"/>' % re.sub(r'\sfullCalcOnLoad="[^"]*"', '', m.group(1)), wb, count=1)
    else: wb = wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>')
    B.set('xl/workbook.xml', wb)

def hapus_sheet(B, nama):
    P = B.peta(); buang = [x for x in P if x[0] in nama]; sisa = [x for x in P if x[0] not in nama]
    assert len(buang) == len(nama), 'sheet tidak ditemukan'
    lama = {x[0]: i for i, x in enumerate(P)}; baru = {x[0]: i for i, x in enumerate(sisa)}
    wb = B.t('xl/workbook.xml')
    for n, r, p in buang: wb = re.sub(r'<sheet [^>]*?r:id="%s"[^>]*/>' % r, '', wb)
    def dn(m):
        a, txt = m.group(1), m.group(2); ls = re.search(r'localSheetId="(\d+)"', a)
        if ls:
            nm = P[int(ls.group(1))][0]
            if nm in nama: return ''
            a = a.replace(ls.group(0), 'localSheetId="%d"' % baru[nm])
        if any("'%s'!" % n in unesc(txt) for n in nama): return ''
        return '<definedName%s>%s</definedName>' % (a, txt)
    wb = re.sub(r'<definedName([^>]*)>([^<]*)</definedName>', dn, wb)
    wb = re.sub(r'<definedNames>\s*</definedNames>', '', wb)
    at = re.search(r'activeTab="(\d+)"', wb)
    if at:
        nm = P[int(at.group(1))][0]; wb = wb.replace(at.group(0), 'activeTab="%d"' % baru.get(nm, 0))
    wb = re.sub(r'firstSheet="\d+"', 'firstSheet="0"', wb)
    B.set('xl/workbook.xml', wb)
    rels = B.t('xl/_rels/workbook.xml.rels')
    for n, r, p in buang: rels = re.sub(r'<Relationship [^>]*Id="%s"[^>]*/>' % r, '', rels)
    B.set('xl/_rels/workbook.xml.rels', rels)
    # bagian yang hanya dipakai sheet yang dihapus
    hapus = set()
    for n, r, p in buang:
        hapus.add(p); rp = p.replace('worksheets/', 'worksheets/_rels/') + '.rels'
        if rp in B.F: hapus.add(rp)
    def rujukan(tanpa):
        acuan = set()
        for k, v in B.F.items():
            if k in tanpa or not k.endswith('.rels'): continue
            dasar = os.path.dirname(os.path.dirname(k))
            for tg in re.findall(rb'Target="([^"]+)"', v):
                tg = tg.decode()
                if tg.startswith('http') or 'External' in tg: continue
                acuan.add(os.path.normpath(os.path.join(dasar, tg)).replace('\\', '/') if not tg.startswith('/') else tg.lstrip('/'))
        return acuan
    while True:   # buang bagian yatim (drawing, printerSettings, media, …) berulang
        acuan = rujukan(hapus)
        yatim = {k for k in B.F if k not in hapus and k.startswith('xl/') and (k.startswith('xl/drawings/') or k.startswith('xl/printerSettings/') or k.startswith('xl/media/') or k.startswith('xl/comments') or k.startswith('xl/webextensions/'))
                 and not k.endswith('.rels') and k not in acuan}
        yatim |= {k for k in B.F if k.endswith('.rels') and '/_rels/' in k and k.replace('_rels/', '')[:-5] in (yatim | hapus)}
        if not (yatim - hapus): break
        hapus |= yatim
    for k in hapus: B.F.pop(k, None)
    ct = B.t('[Content_Types].xml')
    for k in hapus: ct = re.sub(r'<Override [^>]*PartName="/%s"[^>]*/>' % re.escape(k), '', ct)
    B.set('[Content_Types].xml', ct)
    if 'xl/calcChain.xml' in B.F:
        B.F.pop('xl/calcChain.xml'); B.set('[Content_Types].xml', re.sub(r'<Override [^>]*calcChain[^>]*/>', '', B.t('[Content_Types].xml')))
        B.set('xl/_rels/workbook.xml.rels', re.sub(r'<Relationship [^>]*calcChain[^>]*/>', '', B.t('xl/_rels/workbook.xml.rels')))
    if 'docProps/app.xml' in B.F:
        a = B.t('docProps/app.xml')
        for n in nama: a = a.replace('<vt:lpstr>%s</vt:lpstr>' % esc(n), '')
        m = re.search(r'<TitlesOfParts><vt:vector size="(\d+)"', a)
        if m: a = a.replace(m.group(0), '<TitlesOfParts><vt:vector size="%d"' % len(re.findall(r'<vt:lpstr>', a.split('<TitlesOfParts>')[1])))
        a = re.sub(r'(<vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>)\d+', lambda m: m.group(1) + str(len(sisa)), a)
        B.set('docProps/app.xml', a)
    return len(hapus)

# ---------- BAP - format ----------
def perbaiki_bap(B):
    J = 'JKLMNO'; AL = ['AL', 'AM', 'AN', 'AO', 'AP', 'AQ']
    for sh in ('lamp1', 'rincian ', 'BAPP', 'BAP  1', 'BAPR ', 'DATA'): B.ubah(sh, lepas_shared)
    def lamp1(x):
        for r in range(15, 40):
            x = baris_seragam(x, r, 17, {'K': ('f', 'IF(COUNT(H%d,J%d)<2,"",H%d*J%d)' % (r, r, r, r))})
        return isi_sel(x, 'K42', ('f', 'K41*DATA!$B$11'))
    B.ubah('lamp1', lamp1)
    def rincian(x):
        for rr in range(13, 38):
            r = rr + 2; q = 'Q%d' % rr
            isi = {'B': ('f', 'IF(lamp1!B{r}="","",lamp1!B{r})'), 'C': ('f', 'IF(lamp1!C{r}="","",lamp1!C{r})'), 'D': ('f', 'IF(lamp1!D{r}="","",lamp1!D{r})'),
                   'N': ('f', 'IF(lamp1!H{r}="","",lamp1!H{r})'), 'O': ('f', 'IF(lamp1!I{r}="","",lamp1!I{r})'), 'P': ('f', 'IF(lamp1!J{r}="","",lamp1!J{r})'),
                   'Q': ('f', 'IF(COUNT(N{rr},P{rr})<2,"",P{rr}*N{rr})'), 'R': ('f', 'IF({q}="","",IFERROR({q}/$Q$38,0))'),
                   'S': ('f', 'IF({q}="","",IF($AL$5<=1,0,SUM(OFFSET($AL{rr},0,0,1,$AL$5-1))))'), 'T': ('f', 'IF({q}="","",IFERROR(S{rr}/N{rr}*R{rr},0))'),
                   'U': ('f', 'IF({q}="","",IFERROR(INDEX($AL{rr}:$AQ{rr},$AL$5),0))'), 'V': ('f', 'IF({q}="","",IFERROR(U{rr}/N{rr}*R{rr},0))'),
                   'W': ('f', 'IF({q}="","",S{rr}+U{rr})'), 'X': ('f', 'IF({q}="","",T{rr}+V{rr})'), 'AR': ('f', 'SUM($AL{rr}:$AQ{rr})'),
                   'AS': ('f', 'IF(N(N{rr})=0,"",N{rr}-AR{rr})'),
                   'AT': ('f', 'IF(N(N{rr})=0,IF(AR{rr}>0,"DITOLAK - BARIS BUKAN ITEM",""),IF(AR{rr}>N{rr},"DITOLAK - MELEBIHI KONTRAK",IF(AR{rr}=N{rr},"HABIS - 100%","")))')}
            isi = {k: ('f', v[1].format(r=r, rr=rr, q=q)) for k, v in isi.items()}
            for k, kk in zip(AL, J): isi[k] = ('f', "'REKAP PROGRES'!%s%d" % (kk, rr - 8))
            x = baris_seragam(x, rr, 15, isi)
        x = isi_sel(x, 'C12', ('f', 'IF(lamp1!C14="","",lamp1!C14)'))   # dulu =lamp1!C14 → "0" bila kosong
        return isi_sel(x, 'AL5', ('f', 'DATA!$B$28'))
    B.ubah('rincian ', rincian)
    def rekap(x):
        for r in range(5, 30):
            for k in J: x = isi_sel(x, '%s%d' % (k, r), None)
        return x
    B.ubah('REKAP PROGRES', rekap)
    def bapp(x):
        for rb in range(36, 61):
            r, rr = rb - 21, rb - 23
            isi = {'B': 'IF(lamp1!B{r}="","",lamp1!B{r})', 'C': 'IF(lamp1!C{r}="","",lamp1!C{r})', 'D': 'IF(lamp1!D{r}="","",lamp1!D{r})', 'J': 'IF(lamp1!H{r}="","",lamp1!H{r})',
                   'K': 'IF(J{rb}="","",\'rincian \'!S{rr})', 'L': 'IF(J{rb}="","",\'rincian \'!U{rr})', 'M': 'IF(J{rb}="","",K{rb}+L{rb})', 'N': 'IF(J{rb}="","",L{rb})',
                   'O': 'IF(J{rb}="","",J{rb}-M{rb})', 'P': 'IF(lamp1!J{r}="","",lamp1!J{r})', 'Q': 'IF(COUNT(N{rb},P{rb})<2,"",N{rb}*P{rb})'}
            x = baris_seragam(x, rb, 38, {k: ('f', v.format(r=r, rr=rr, rb=rb)) for k, v in isi.items()})
        x = isi_sel(x, 'C35', ('f', 'IF(lamp1!C14="","",lamp1!C14)'))
        for ref, f in (('Q61', 'SUM(Q36:Q60)'), ('T8', 'DATA!$B$28'), ('B10', 'DATA!$B$30'), ('N68', 'ROUND(N66*DATA!$B$46,0)'), ('K69', 'DATA!$B$47'), ('N69', 'ROUND(N66*K69,0)')):
            x = isi_sel(x, ref, ('f', f))
        return x
    B.ubah('BAPP', bapp)
    def bap1(x):
        for ref, f in (('T9', 'DATA!$B$28'), ('C11', 'DATA!$B$31'), ('J36', '$K$27'), ('M36', 'P31'), ('J37', '$K$27'), ('J41', '$K$26'), ('M41', 'P31'), ('J42', '$K$26')):
            x = isi_sel(x, ref, ('f', f))
        return x
    B.ubah('BAP  1', bap1)
    def bapr(x):
        x = isi_sel(x, 'G22', ('f', 'lamp1!$K$41'))
        x = isi_sel(x, 'I42', ('f', 'IF(N(K42)=0,0,O42/K42)'))   # dulu O42/K42 → #DIV/0! bila retensi 0%
        for k in range(1, 7):
            r = 31 + k
            x = isi_sel(x, 'J%d' % r, ('f', "SUMPRODUCT(INDEX('rincian '!$AL$13:$AQ$37,0,%d),'rincian '!$P$13:$P$37)" % k))
            x = isi_sel(x, 'H%d' % r, ('f', 'IF(N(INDEX(DATA!$B$99:$B$104,%d))<1,"",INDEX(DATA!$B$99:$B$104,%d))' % (k, k)))
        x = isi_sel(x, 'B29', ('f', '"Menyatakan bahwa masa pemeliharaan atas "&DATA!$B$37&" tersebut diatas telah selesai sesuai BAST, maka Pihak Kedua berhak menerima pembayaran Retensi "&TEXT(DATA!$B$44*100,"General")&" % dengan perincian sebagai berikut :"'))
        return x
    B.ubah('BAPR ', bapr)
    def data(x):
        j = 'IFERROR(UPPER(TRIM(MID($B$4,FIND("/",$B$4)+1,FIND("/",$B$4,FIND("/",$B$4)+1)-FIND("/",$B$4)-1))),"")'
        x = isi_sel(x, 'A37', 'Jenis Dokumen Kontrak (otomatis dari Nomor Kontrak)')
        x = isi_sel(x, 'B37', ('f', 'IF({j}="SPPP","Surat Perjanjian Pemborongan Pekerjaan (SPPP)",IF({j}="SPKP","Surat Perjanjian Konsultan Perencana (SPKP)",IF({j}="SPK","Surat Perintah Kerja (SPK)",TRIM("Kontrak "&{j}))))'.format(j=j)))
        x = isi_sel(x, 'B46', ('f', '$B$45')); x = isi_sel(x, 'B47', ('f', '$B$44'))
        return x
    B.ubah('DATA', data)
    n = hapus_sheet(B, ['BAP  %d' % i for i in range(2, 7)] + ['BAPP %d' % i for i in range(2, 7)] + ['rincian %d' % i for i in range(2, 7)])
    assert rapikan_kop(B) == 2, 'kotak teks nama proyek di kop BAP 1 & BAPP tidak ditemukan'
    rapikan_garis_kop(B, 'BAP  1', 'hapus'); rapikan_garis_kop(B, 'BAPP', 'naik')
    for nm, r, p in B.peta(): B.set(p, tanggal_aman(B.t(p)))
    hitung_penuh(B)
    return n

def rapikan_kop(B):
    """Kop BAP 1 & BAPP: kotak teks nama proyek (14 pt, font "72 Condensed" yang jarang terpasang) terpecah 2 baris dan menimpa garis
    merah & alamat kantor di bawahnya. → Arial tebal 11 pt (diukur: 444 pt ≤ lebar kotak 466 pt) dan tanpa pindah baris (wrap none)."""
    n = 0
    for k in [k for k in B.F if re.fullmatch(r'xl/drawings/drawing\d+\.xml', k)]:
        x = B.t(k)
        def satu(m):
            nonlocal n
            a = m.group(0); teks = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', a))
            if not (teks.startswith('Pekerjaan Design') and 'Tanjung Priok' in teks): return a
            n += 1
            a = re.sub(r'(<a:bodyPr[^>]*?)\swrap="square"', r'\1 wrap="none"', a)
            a = re.sub(r'(<a:(?:rPr|endParaRPr)[^>]*?)\ssz="\d+"', r'\1 sz="1100"', a)
            return re.sub(r'<a:(latin|cs) typeface="72 Condensed"[^/]*/>', r'<a:\1 typeface="Arial"/>', a)
        x = re.sub(r'<xdr:(twoCellAnchor|oneCellAnchor)\b[\s\S]*?</xdr:\1>', satu, x)
        B.set(k, x)
    return n

def rapikan_garis_kop(B, nama_sheet, aksi):
    """Garis merah kop (connector) yang memotong teks alamat kantor: aksi 'hapus' (garis kedua BAP 1, baris 6) atau
    'naik' (BAPP: dipindah ke celah antara nama proyek & alamat, baris 5 + 7 pt)."""
    p = B.path(nama_sheet); rel = B.t(p.replace('worksheets/', 'worksheets/_rels/') + '.rels')
    d = 'xl/drawings/' + re.search(r'drawings/(drawing\d+\.xml)', rel).group(1); x = B.t(d); n = 0
    def satu(m):
        nonlocal n
        a = m.group(0)
        if '<xdr:cxnSp' not in a: return a
        fr = re.search(r'<xdr:from><xdr:col>(\d+)</xdr:col><xdr:colOff>-?\d+</xdr:colOff><xdr:row>(\d+)</xdr:row><xdr:rowOff>(-?\d+)</xdr:rowOff>', a)
        col, row, off = int(fr.group(1)), int(fr.group(2)), int(fr.group(3))
        if aksi == 'hapus' and (col, row) == (7, 6): n += 1; return ''
        if aksi == 'naik' and row == 5 and off > 200000:
            n += 1; return re.sub(r'(<xdr:(?:from|to)><xdr:col>\d+</xdr:col><xdr:colOff>-?\d+</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>)-?\d+', r'\g<1>88900', a)
        return a
    x = re.sub(r'<xdr:twoCellAnchor\b[\s\S]*?</xdr:twoCellAnchor>', satu, x)
    assert n == 1, 'garis kop %s (%s) tidak ditemukan' % (nama_sheet, aksi)
    B.set(d, x)

def perbaiki_spm(B):
    B.ubah('ITEM', lepas_shared)
    def item(x):
        for r in range(4, 104):
            for k, v in zip('OPQR', 'GHIJ'):
                x = isi_sel(x, '%s%d' % (k, r), ('f', 'IF($B{r}="","",IF(N({v}{r})>0,1E+12+MIN(N({v}{r})*N($E{r}),9E+11),MIN(N($D{r})*N($E{r}),9E+11))-ROW()/1000)'.format(r=r, v=v)))
        return x
    B.ubah('ITEM', item)
    for nm, r, p in B.peta(): B.set(p, tanggal_aman(B.t(p)))
    hitung_penuh(B)

if __name__ == '__main__':
    D = template_dasar()
    b = Buku(*D['bap']); n = perbaiki_bap(b); b.simpan(os.path.join(KELUAR, NAMA['bap']))
    s = Buku(*D['spm']); perbaiki_spm(s); s.simpan(os.path.join(KELUAR, NAMA['spm']))
    print('BAP - format: %d bagian sheet rusak dihapus · %d sheet tersisa → %s' % (n, len(b.peta()), NAMA['bap']))
    print('Master SPM → %s' % NAMA['spm'])
