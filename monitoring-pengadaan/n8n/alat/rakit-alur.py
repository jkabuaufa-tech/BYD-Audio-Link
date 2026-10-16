#!/usr/bin/env python3
"""Merakit 3 berkas alur n8n (siap Import from File) dari sumber/*.js.

Jalankan dari folder mana pun:  python3 monitoring-pengadaan/n8n/alat/rakit-alur.py
Hasil: alur-1-laporan-harian.json, alur-2-webhook-perintah.json, alur-3-penangan-galat.json
"""
import json
import pathlib
import uuid

AKAR = pathlib.Path(__file__).resolve().parent.parent
SUMBER = AKAR / "sumber"
URL_SERVER = "https://script.google.com/macros/s/AKfycbw8BVKneCCEQJyaGQP89lNANJjrmryK3Lb23PUFlb-sjpUp0o5YySOg7yhbdrjHtgf7xQ/exec"
KRED_BOT = {"httpCustomAuth": {"id": "", "name": "Monitoring SAP – Akun Bot"}}
KRED_TG = {"telegramApi": {"id": "", "name": "Telegram – Bot Laporan Monitoring"}}
KRED_SMTP = {"smtp": {"id": "", "name": "SMTP – Email Laporan"}}
KRED_SHEETS = {"googleSheetsOAuth2Api": {"id": "", "name": "Google Sheets – Log Otomasi"}}
KRED_WEBHOOK = {"httpHeaderAuth": {"id": "", "name": "Webhook Monitoring SAP – Header"}}


def uid(nama):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "monitoring-sap-n8n/" + nama))


def js(nama):
    return (SUMBER / nama).read_text(encoding="utf-8")


def node(nama, jenis, versi, posisi, param, **lain):
    n = {"parameters": param, "id": uid(nama), "name": nama, "type": jenis, "typeVersion": versi, "position": posisi}
    n.update(lain)
    return n


def sticky(nama, posisi, isi, lebar=420, tinggi=260, warna=7):
    return node(nama, "n8n-nodes-base.stickyNote", 1, posisi,
                {"content": isi, "width": lebar, "height": tinggi, "color": warna})


def nilai(nama, tipe, isi):
    return {"id": uid("set/" + nama), "name": nama, "type": tipe, "value": isi}


def opsi_http(timeout):
    return {"redirect": {"redirect": {"followRedirects": True, "maxRedirects": 5}},
            "response": {"response": {"responseFormat": "json"}}, "timeout": timeout}


def panggil(nama, posisi, aksi_expr, data_expr="{}", timeout=120000, lanjut_bila_galat=True):
    """POST ke Web App Apps Script. Nama & PIN disuntikkan oleh kredensial Custom Auth (bukan di node)."""
    lain = {"credentials": KRED_BOT, "retryOnFail": True, "maxTries": 3, "waitBetweenTries": 5000,
            "notes": "POST JSON {action, proyek, data}; nama & pin ditambahkan kredensial Custom Auth. "
                     "Apps Script menjawab 302 → diikuti otomatis (GET) ke googleusercontent.",
            "notesInFlow": False}
    if lanjut_bila_galat:
        lain["onError"] = "continueRegularOutput"
    return node(nama, "n8n-nodes-base.httpRequest", 4.2, posisi, {
        "method": "POST",
        "url": "={{ $('Konfigurasi').first().json.urlServer }}",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpCustomAuth",
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ action: " + aksi_expr + ", proyek: $('Konfigurasi').first().json.proyek, data: " + data_expr + " }) }}",
        "options": opsi_http(timeout),
    }, **lain)


def sambung(*pasangan):
    hasil = {}
    for asal, tujuan, *keluar in pasangan:
        idx = keluar[0] if keluar else 0
        main = hasil.setdefault(asal, {"main": []})["main"]
        while len(main) <= idx:
            main.append([])
        main[idx].append({"node": tujuan, "type": "main", "index": 0})
    return hasil


def alur(nama, nodes, koneksi, catatan, tag):
    return {
        "name": nama, "nodes": nodes, "connections": koneksi, "active": False,
        "settings": {"executionOrder": "v1", "timezone": "Asia/Jakarta", "saveManualExecutions": True,
                     "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all", "callerPolicy": "workflowsFromSameOwner"},
        "pinData": {}, "meta": {"templateCredsSetupCompleted": False, "catatan": catatan},
        "tags": [{"name": t} for t in tag],
    }


# ------------------------------------------------------------------ 1. Laporan Harian
def laporan_harian():
    y = 300
    N = [
        sticky("Catatan Alur", [-60, -80], "## Laporan Harian Monitoring SAP\n"
               "Senin–Sabtu 07.30 WIB: ping → **gerbang login** → baca Verifikasi Tagihan, Kantor AI, "
               "Notifikasi → nilai prioritas → Telegram + Email + Log Google Sheets.\n\n"
               "Hanya **aksi baca** — tidak mengubah data & tidak memakai kuota AI.\n"
               "Isi node **Konfigurasi** & 4 kredensial sebelum mengaktifkan.", 520, 220, 4),
        node("Jadwal 07.30 WIB (Sen–Sab)", "n8n-nodes-base.scheduleTrigger", 1.2, [0, y],
             {"rule": {"interval": [{"field": "cronExpression", "expression": "30 7 * * 1-6"}]}}),
        node("Jalankan Manual", "n8n-nodes-base.manualTrigger", 1, [0, y + 180], {}),
        node("Konfigurasi", "n8n-nodes-base.set", 3.4, [240, y], {"assignments": {"assignments": [
            nilai("urlServer", "string", URL_SERVER),
            nilai("proyek", "string", "ISI_ID_PROYEK"),
            nilai("namaProyek", "string", "ISI NAMA PROYEK"),
            nilai("akunAdmin", "boolean", True),
            nilai("telegramChatId", "string", "ISI_CHAT_ID"),
            nilai("emailPengirim", "string", "monitoring@contoh.co.id"),
            nilai("emailTujuan", "string", "kapro@contoh.co.id, kasi.keuangan@contoh.co.id"),
            nilai("urlAplikasi", "string", ""),
            nilai("versiModulMinimal", "string", "1.8.6"),
            nilai("maksButirPerGrup", "number", 6),
        ]}, "options": {}}, notes="Satu-satunya tempat mengubah alamat server, proyek & penerima."),
        node("Ping Server", "n8n-nodes-base.httpRequest", 4.2, [480, y], {
            "url": "={{ $json.urlServer }}", "sendQuery": True,
            "queryParameters": {"parameters": [{"name": "action", "value": "ping"}, {"name": "t", "value": "={{ Date.now() }}"}]},
            "options": opsi_http(30000)}, retryOnFail=True, maxTries=3, waitBetweenTries=10000, onError="continueRegularOutput"),
        node("Server Hidup?", "n8n-nodes-base.if", 2.2, [720, y], {"conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
            "conditions": [{"id": uid("if/ping"), "leftValue": "={{ $json.ok }}", "rightValue": True,
                            "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
            "combinator": "and"}, "options": {}}),
        node("Server Tidak Menjawab", "n8n-nodes-base.stopAndError", 1, [960, y + 200], {
            "errorMessage": "=[SERVER] Ping gagal: {{ $json.error ? JSON.stringify($json.error).slice(0, 300) : 'jawaban bukan JSON / ok=false' }} → cek deployment Web App (akses \"Siapa saja\") & URL /exec."}),
        panggil("Diagnostik Server", [960, y], "'diagServer'", lanjut_bila_galat=True),
        node("Gerbang Login", "n8n-nodes-base.code", 2, [1200, y], {"jsCode": js("cek-login.js")},
             notes="Hentikan alur bila Nama/PIN ditolak — mencegah akun bot terkunci (5x gagal = kunci 5 menit)."),
        panggil("Ringkasan Verifikasi Tagihan", [1440, y], "'vtRingkas'"),
        panggil("Ringkasan Kantor AI", [1680, y], "'timRingkas'"),
        node("Akun Admin?", "n8n-nodes-base.if", 2.2, [1920, y], {"conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
            "conditions": [{"id": uid("if/admin"), "leftValue": "={{ $('Konfigurasi').first().json.akunAdmin }}", "rightValue": True,
                            "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
            "combinator": "and"}, "options": {}}),
        panggil("Pratinjau Notifikasi", [2160, y - 120], "'notifInfo'"),
        node("Susun Laporan", "n8n-nodes-base.code", 2, [2400, y], {"jsCode": js("susun-laporan.js")}),
        node("Pecah Pesan Telegram", "n8n-nodes-base.splitOut", 1, [2640, y - 200], {"fieldToSplitOut": "pesanTelegram", "options": {}}),
        node("Kirim Telegram", "n8n-nodes-base.telegram", 1.2, [2880, y - 200], {
            "chatId": "={{ $('Konfigurasi').first().json.telegramChatId }}", "text": "={{ $json.pesanTelegram }}",
            "additionalFields": {"appendAttribution": False, "parse_mode": "HTML", "disable_web_page_preview": True}},
            credentials=KRED_TG, retryOnFail=True, maxTries=3, waitBetweenTries=5000, onError="continueRegularOutput"),
        node("Kirim Email", "n8n-nodes-base.emailSend", 2.1, [2640, y], {
            "fromEmail": "={{ $('Konfigurasi').first().json.emailPengirim }}",
            "toEmail": "={{ $('Konfigurasi').first().json.emailTujuan }}",
            "subject": "={{ $json.subjekEmail }}", "emailFormat": "html", "html": "={{ $json.emailHtml }}", "options": {}},
            credentials=KRED_SMTP, retryOnFail=True, maxTries=2, waitBetweenTries=10000, onError="continueRegularOutput"),
        node("Siapkan Baris Log", "n8n-nodes-base.set", 3.4, [2640, y + 200], {"mode": "raw", "jsonOutput": "={{ JSON.stringify($json.log) }}", "options": {}}),
        node("Catat ke Google Sheets", "n8n-nodes-base.googleSheets", 4.5, [2880, y + 200], {
            "operation": "append",
            "documentId": {"__rl": True, "mode": "url", "value": "https://docs.google.com/spreadsheets/d/ISI_ID_SPREADSHEET_LOG/edit"},
            "sheetName": {"__rl": True, "mode": "name", "value": "Log n8n"},
            "columns": {"mappingMode": "autoMapInputData", "value": {}, "matchingColumns": [], "schema": []}, "options": {}},
            credentials=KRED_SHEETS, disabled=True, onError="continueRegularOutput",
            notes="Aktifkan setelah membuat spreadsheet log (baris 1 = judul kolom, lihat README)."),
    ]
    K = sambung(
        ("Jadwal 07.30 WIB (Sen–Sab)", "Konfigurasi"), ("Jalankan Manual", "Konfigurasi"),
        ("Konfigurasi", "Ping Server"), ("Ping Server", "Server Hidup?"),
        ("Server Hidup?", "Diagnostik Server", 0), ("Server Hidup?", "Server Tidak Menjawab", 1),
        ("Diagnostik Server", "Gerbang Login"), ("Gerbang Login", "Ringkasan Verifikasi Tagihan"),
        ("Ringkasan Verifikasi Tagihan", "Ringkasan Kantor AI"), ("Ringkasan Kantor AI", "Akun Admin?"),
        ("Akun Admin?", "Pratinjau Notifikasi", 0), ("Akun Admin?", "Susun Laporan", 1),
        ("Pratinjau Notifikasi", "Susun Laporan"),
        ("Susun Laporan", "Pecah Pesan Telegram"), ("Susun Laporan", "Kirim Email"), ("Susun Laporan", "Siapkan Baris Log"),
        ("Pecah Pesan Telegram", "Kirim Telegram"), ("Siapkan Baris Log", "Catat ke Google Sheets"),
    )
    return alur("Monitoring SAP · 1 · Laporan Harian", N, K,
                "Untuk server modul 1.8.6 / aplikasi 2.5.8 (kernel Code.gs 2.5.x).", ["Monitoring SAP", "Laporan"])


# ------------------------------------------------------------------ 2. Webhook Perintah
def webhook_perintah():
    y = 300
    N = [
        sticky("Catatan Alur", [-60, -60], "## Webhook Perintah\nPOST `/webhook/monitoring-sap/perintah`\n"
               "Header rahasia wajib. Body: `{\"perintah\":\"ringkas|kantor|diagnostik|notifikasi|timjalan|verifikasi\", \"id\":\"…\"}`\n\n"
               "Hanya perintah daftar putih yang diteruskan ke server.", 520, 200, 4),
        node("Webhook Perintah", "n8n-nodes-base.webhook", 2, [0, y], {
            "httpMethod": "POST", "path": "monitoring-sap/perintah", "authentication": "headerAuth",
            "responseMode": "responseNode", "options": {}}, credentials=KRED_WEBHOOK, webhookId=uid("webhook")),
        node("Validasi Perintah", "n8n-nodes-base.code", 2, [240, y], {"jsCode": js("validasi-perintah.js")}),
        node("Perintah Sah?", "n8n-nodes-base.if", 2.2, [480, y], {"conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
            "conditions": [{"id": uid("if/sah"), "leftValue": "={{ $json.sah }}", "rightValue": True,
                            "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
            "combinator": "and"}, "options": {}}),
        node("Konfigurasi", "n8n-nodes-base.set", 3.4, [720, y - 100], {"assignments": {"assignments": [
            nilai("urlServer", "string", URL_SERVER), nilai("proyek", "string", "ISI_ID_PROYEK")]},
            "includeOtherFields": True, "options": {}}),
        panggil("Panggil Server", [960, y - 100], "$json.action", "$json.data", timeout=330000),
        node("Jawab Hasil", "n8n-nodes-base.respondToWebhook", 1.1, [1200, y - 100], {
            "respondWith": "json", "responseBody": "={{ JSON.stringify({ perintah: $('Validasi Perintah').first().json.perintah, hasil: $json }) }}", "options": {}}),
        node("Jawab Ditolak", "n8n-nodes-base.respondToWebhook", 1.1, [720, y + 120], {
            "respondWith": "json", "responseBody": "={{ JSON.stringify($json.jawaban) }}", "options": {"responseCode": 400}}),
    ]
    K = sambung(("Webhook Perintah", "Validasi Perintah"), ("Validasi Perintah", "Perintah Sah?"),
                ("Perintah Sah?", "Konfigurasi", 0), ("Perintah Sah?", "Jawab Ditolak", 1),
                ("Konfigurasi", "Panggil Server"), ("Panggil Server", "Jawab Hasil"))
    return alur("Monitoring SAP · 2 · Webhook Perintah", N, K,
                "timJalan bisa > 1 menit (batas Apps Script 6 menit) → timeout 330 detik.", ["Monitoring SAP", "Webhook"])


# ------------------------------------------------------------------ 3. Penangan Galat
def penangan_galat():
    N = [
        sticky("Catatan Alur", [-60, -40], "## Penangan Galat\nPasang sebagai **Error Workflow** di Settings alur 1 & 2.\n"
               "Mengirim alert Telegram berisi alur, node, pesan & tautan eksekusi.", 460, 160, 3),
        node("Saat Alur Gagal", "n8n-nodes-base.errorTrigger", 1, [0, 240], {}),
        node("Format Galat", "n8n-nodes-base.code", 2, [240, 240], {"jsCode": js("format-galat.js")}),
        node("Alert Telegram", "n8n-nodes-base.telegram", 1.2, [480, 240], {
            "chatId": "ISI_CHAT_ID_ADMIN", "text": "={{ $json.teks }}",
            "additionalFields": {"appendAttribution": False, "parse_mode": "HTML", "disable_web_page_preview": True}},
            credentials=KRED_TG, retryOnFail=True, maxTries=3, waitBetweenTries=5000),
    ]
    K = sambung(("Saat Alur Gagal", "Format Galat"), ("Format Galat", "Alert Telegram"))
    return alur("Monitoring SAP · 3 · Penangan Galat", N, K, "Error workflow bersama.", ["Monitoring SAP", "Galat"])


if __name__ == "__main__":
    for berkas, wf in [("alur-1-laporan-harian.json", laporan_harian()),
                       ("alur-2-webhook-perintah.json", webhook_perintah()),
                       ("alur-3-penangan-galat.json", penangan_galat())]:
        (AKAR / berkas).write_text(json.dumps(wf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("ditulis", berkas, len(wf["nodes"]), "node")
