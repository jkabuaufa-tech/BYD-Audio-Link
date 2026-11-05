import json, re, base64, io, zipfile, sys
p = sys.argv[1]; d = json.load(open(p, encoding='utf-8')); js = d['js']
m = re.search(r'window\.__MP292_FORMAT = (\{.*?\});', js); F = json.loads(m.group(1))
ALAMAT = 'Gedung Waskita IDSurvey Tower Jl. M.T. Haryono Kavling No.10, Jatinegara, Jakarta Timur'.encode()
GANTI = {   # (templat, lama, baru, jumlah)
    'spm': [(b'<t>1000000007845820</t>', b'<t>1000000007845824</t>', 1),
            (b'<t>Jl. M.T. Haryono Kavling 10 RT.11/RW.11, Cipinang Cempedak, Jatinegara, Jakarta Timur 13340</t>', b'<t>' + ALAMAT + b'</t>', 1)],
    'bap': [(b'IDSurvey TowerJl.', b'IDSurvey Tower Jl.', 1)]}
n = 0
for k, L in GANTI.items():
    zi = zipfile.ZipFile(io.BytesIO(base64.b64decode(F[k]))); out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            data = zi.read(it.filename)
            if it.filename == 'xl/sharedStrings.xml':
                for a, b2, j in L:
                    assert data.count(a) == j, (k, a, data.count(a)); data = data.replace(a, b2); n += j
            zo.writestr(it, data)
    F[k] = base64.b64encode(out.getvalue()).decode()
js = js[:m.start(1)] + json.dumps(F, ensure_ascii=False) + js[m.end(1):]
assert all('MP2104' in js[:i][-20000:] for i in [k.start() for k in re.finditer('1000000007845820', js)])
d['js'] = js; json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False); print('templat SPM/BAP: NPWP & alamat KSO dikoreksi,', n, 'teks')
