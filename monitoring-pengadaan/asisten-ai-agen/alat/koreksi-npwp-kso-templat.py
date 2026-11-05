import json, re, base64, io, zipfile, sys
p = sys.argv[1]; d = json.load(open(p, encoding='utf-8')); js = d['js']
m = re.search(r'window\.__MP292_FORMAT = (\{.*?\});', js); F = json.loads(m.group(1))
b = base64.b64decode(F['spm']); zi = zipfile.ZipFile(io.BytesIO(b)); out = io.BytesIO(); n = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zo:
    for it in zi.infolist():
        data = zi.read(it.filename)
        if it.filename == 'xl/sharedStrings.xml':
            n = data.count(b'<t>1000000007845820</t>'); data = data.replace(b'<t>1000000007845820</t>', b'<t>1000000007845824</t>')
        zo.writestr(it, data)
assert n == 1, n
F['spm'] = base64.b64encode(out.getvalue()).decode()
js = js[:m.start(1)] + json.dumps(F, ensure_ascii=False) + js[m.end(1):]
assert all('MP2104' in js[:i][-20000:] for i in [k.start() for k in re.finditer('1000000007845820', js)])
d['js'] = js; json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False); print('templat SPM: NPWP KSO dikoreksi', n, 'sel')
