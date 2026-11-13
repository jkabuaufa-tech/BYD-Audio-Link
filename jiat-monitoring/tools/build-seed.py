#!/usr/bin/env python3
"""Bangun js/data/seed.js dari file Excel monitoring JIAT.

Pemakaian:  python3 tools/build-seed.py "<path ke 4._Monitoring_Action_Plan_JIAT.xlsx>"

Skrip ini hanya dipakai saat BOQ sumber berubah. Aplikasi sendiri tidak
bergantung pada Python maupun pada file Excel.
"""
import json, re, sys, warnings, datetime, pathlib
import openpyxl

warnings.simplefilter("ignore")
wb = openpyxl.load_workbook(sys.argv[1])
rekap, rinci, peng, sumur = (wb[n] for n in ("Rekap Action Plan", "Rincian Harian", "Pengadaan Penting", "Sheet1"))

iso = lambda d: d.strftime("%Y-%m-%d") if isinstance(d, datetime.datetime) else None
txt = lambda v: re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""

# --- Divisi -----------------------------------------------------------------
divisions, div_by_name = [], {}
for r in range(14, 25):
    name = txt(rekap.cell(r, 2).value)
    code, title = [s.strip() for s in name.split(" - ", 1)]
    d = {"id": "DIV-%02d" % (r - 13), "no": r - 13, "kode": code, "nama": title,
         "pic": txt(rekap.cell(r, 8).value), "kendala": txt(rekap.cell(r, 9).value),
         "tindakLanjut": txt(rekap.cell(r, 10).value), "dueDate": iso(rekap.cell(r, 11).value),
         "statusAction": txt(rekap.cell(r, 12).value) or "OPEN"}
    divisions.append(d)
    div_by_name[name] = d["id"]

# --- Item BOQ + progres harian ------------------------------------------------
def eval_formula(f, vol):
    """Hitung rumus Target Vol Des (mis. =F40/52*15) menjadi angka."""
    if f is None or f == "":
        return None
    if isinstance(f, (int, float)):
        return float(f)
    expr = re.sub(r"F\d+", repr(float(vol)), f.lstrip("="))
    expr = re.sub(r"(\d+(?:\.\d+)?)%", r"(\1/100)", expr)
    if not re.fullmatch(r"[0-9eE.+\-*/() ]+", expr):
        raise ValueError("rumus tidak dikenal: " + f)
    return round(eval(expr), 6)

date_cols = {c: iso(rinci.cell(9, c).value) for c in range(23, rinci.max_column + 1) if iso(rinci.cell(9, c).value)}
items, progress, row_to_item = [], [], {}
for r in range(10, 199):
    kode = rinci.cell(r, 1).value
    if not kode:
        continue
    vol = rinci.cell(r, 6).value
    mulai = rinci.cell(r, 13).value
    selesai = rinci.cell(r, 14).value
    if isinstance(selesai, str):  # =M40+10
        m = re.fullmatch(r"=M\d+\+(\d+)", selesai)
        selesai = mulai + datetime.timedelta(days=int(m.group(1))) if m and mulai else None
    items.append({"id": kode, "divisionId": div_by_name[txt(rinci.cell(r, 2).value)],
                  "subbagian": txt(rinci.cell(r, 3).value), "uraian": txt(rinci.cell(r, 4).value),
                  "satuan": txt(rinci.cell(r, 5).value), "volume": vol, "hargaNego": rinci.cell(r, 7).value,
                  "targetVolDes": eval_formula(rinci.cell(r, 10).value, vol),
                  "pic": txt(rinci.cell(r, 12).value), "mulai": iso(mulai), "selesai": iso(selesai),
                  "kendala": txt(rinci.cell(r, 15).value), "actionPlan": txt(rinci.cell(r, 16).value),
                  "dueDate": iso(rinci.cell(r, 17).value)})
    row_to_item[r] = kode
    for c, d in date_cols.items():
        v = rinci.cell(r, c).value
        if isinstance(v, (int, float)) and v != 0:
            progress.append({"itemId": kode, "tanggal": d, "volume": v})

# --- Catatan rapat harian (hanya baris yang terisi) ----------------------------
daily_notes = []
for r in range(35, 87):
    vals = [txt(rekap.cell(r, c).value) for c in (7, 8, 10, 12)]
    due = iso(rekap.cell(r, 9).value)
    if any(vals) or due:
        daily_notes.append({"tanggal": iso(rekap.cell(r, 1).value), "kendala": vals[0], "action": vals[1],
                            "dueDate": due, "status": vals[2], "catatan": vals[3]})

# --- Pengadaan penting --------------------------------------------------------
# Kelompok C (Pipa Jaringan) di Excel belum ditautkan ke BOQ; ditautkan di sini
# berdasarkan kesamaan uraian dengan Divisi VII.
C_LINK = {"Pipa HDPE": "N170", "GATE VALVE": "N171", "Bend 45": "N172", "Tee 4": "N173",
          "Street Box": "N174", "Stub Flange": "N175", "Mur dan Baut": "N177", "Rubber Packing": "N178"}
procurement, group = [], None
for r in range(6, peng.max_row + 1):
    no, uraian = peng.cell(r, 2).value, txt(peng.cell(r, 3).value)
    if not uraian:
        continue
    if isinstance(no, str) and re.fullmatch(r"[A-Z]", no):
        group = "%s. %s" % (no, uraian.title() if uraian.isupper() else uraian)
        continue
    if uraian in ("MOS", "Terpasang"):  # sub-baris; dihitung otomatis di aplikasi
        continue
    ref = peng.cell(r, 5).value
    m = re.search(r"!F(\d+)", ref) if isinstance(ref, str) else None
    item_id = row_to_item[int(m.group(1))] if m else next((v for k, v in C_LINK.items() if uraian.startswith(k)), None)
    vol = next(i["volume"] for i in items if i["id"] == item_id)
    stock = vol / 2 if isinstance(peng.cell(r, 6).value, str) else None  # Excel: Stock 2026 = Total/2
    procurement.append({"id": "PGD-%02d" % (len(procurement) + 1), "kelompok": group, "uraian": uraian,
                        "itemId": item_id, "stock2026": stock, "mos": None, "catatan": ""})

# --- Lokasi sumur ---------------------------------------------------------------
wells, tim = [], ""
for r in range(4, sumur.max_row + 1):
    sbd = txt(sumur.cell(r, 3).value)
    if not sbd:
        continue
    tim = txt(sumur.cell(r, 7).value) or tim
    wells.append({"id": sbd.replace(" ", "-"), "sbd": sbd, "kabupaten": txt(sumur.cell(r, 4).value),
                  "tanah": txt(sumur.cell(r, 5).value), "rekomtek": txt(sumur.cell(r, 6).value),
                  "tim": tim, "vendorPemboran": txt(sumur.cell(r, 8).value), "status": "BELUM MULAI", "catatan": ""})

seed = {"project": {"nama": txt(rekap["A1"].value), "targetDes": rekap["D5"].value,
                    "baselineMulai": iso(rekap["D6"].value), "baselineAkhir": iso(rekap["D7"].value)},
        "divisions": divisions, "items": items, "progress": progress, "dailyNotes": daily_notes,
        "procurement": procurement, "wells": wells}

out = pathlib.Path(__file__).resolve().parent.parent / "js" / "data" / "seed.js"
out.write_text("/* DIBUAT OTOMATIS oleh tools/build-seed.py dari Excel monitoring — jangan diedit manual. */\n"
               "window.JIAT = window.JIAT || {};\nJIAT.SEED = " +
               json.dumps(seed, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
total = sum(i["volume"] * i["hargaNego"] for i in items)
tgt = sum((i["targetVolDes"] or 0) / i["volume"] * i["volume"] * i["hargaNego"] / total for i in items)
print("item=%d progres=%d pengadaan=%d sumur=%d total=%.2f targetDetail=%.4f%%" %
      (len(items), len(progress), len(procurement), len(wells), total, tgt * 100))
