package id.kso.monitoringsap;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.SequenceInputStream;
import java.nio.charset.StandardCharsets;

/**
 * Pembungkus Android untuk aplikasi web Monitoring SAP / Monitoring Pengadaan.
 * Satu layar WebView tanpa bilah alamat. Sumber halaman (urutan prioritas):
 *   1. alamat yang disimpan pengguna di perangkat (layar "Alamat aplikasi"),
 *   2. alamat yang ditanam saat build (BuildConfig.APP_URL),
 *   3. berkas aplikasi (Monitoring_SAP.html / index.html) yang diimpor pengguna ke penyimpanan aplikasi — mode tanpa hosting;
 *      alamat server Apps Script (…/exec) disajikan sebagai config.json di sampingnya,
 *   4. salinan aplikasi di dalam APK (assets/www/index.html),
 *   5. layar "Alamat aplikasi" (assets/atur.html).
 * Yang tidak dikerjakan WebView secara bawaan dan ditangani di sini: pilih berkas & kamera, unduhan (termasuk blob: hasil
 * "Unduh Excel"), cetak (window.print, iframe pratinjau, jendela cetak), dan tautan ke luar aplikasi.
 */
public class MainActivity extends Activity {
    private static final String PREF = "atur", K_URL = "url";
    private static final String ATUR = "file:///android_asset/atur.html";
    private static final String HOST_LOKAL = "appassets.androidplatform.net";
    private static final String LOKAL = "https://" + HOST_LOKAL + "/assets/www/index.html";
    private static final String IMPOR = "https://" + HOST_LOKAL + "/app/index.html";
    private static final String K_SERVER = "server";
    private static final String POLA_SERVER = "https://script\\.google(usercontent)?\\.com/macros/s/[A-Za-z0-9_-]+/exec";
    private static final String POLA_GOOGLE = "(?i)(.*\\.)?(docs|drive|sheets|script)\\.google\\.com";
    private static final int MINTA_BERKAS = 11, MINTA_KAMERA = 12, MINTA_HTML = 13;

    private WebView web;
    private WebView webCetak;            // ditahan selama pencetakan dokumen HTML
    private WebViewAssetLoader pemuat;
    private ValueCallback<Uri[]> berkasCb;
    private Uri fotoUri;
    private PermissionRequest izinWeb;
    private Intent pemilihTunda;
    private String jembatan = "";
    private volatile String urlKini = "";
    private volatile String hostApp = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle simpanan) {
        super.onCreate(simpanan);
        pemuat = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).addPathHandler("/app/", new JalurApp()).build();
        jembatan = bacaAset("jembatan.js");
        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setBackgroundColor(0xFF0B1F3A);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setAllowFileAccess(false);      // file:///android_asset/ (layar alamat) tetap dapat dimuat
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " MonitoringSAP-APK/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new Jembatan(), "AndroidApp");
        web.setWebViewClient(new Klien());
        web.setWebChromeClient(new Krom());
        web.setDownloadListener((url, ua, disposisi, mime, panjang) -> unduh(url, ua, disposisi, mime));

        String awal = alamatAwal();
        Uri ua = Uri.parse(awal);
        if ("https".equals(ua.getScheme()) && ua.getHost() != null) hostApp = ua.getHost();
        if (simpanan != null && web.restoreState(simpanan) != null) return;
        muat(awal);
    }

    /* ---------- alamat ---------- */
    private SharedPreferences pref() { return getSharedPreferences(PREF, MODE_PRIVATE); }

    private boolean adaSalinanLokal() {
        try (InputStream in = getAssets().open("www/index.html")) { return true; } catch (Exception e) { return false; }
    }

    private File berkasImpor() { return new File(new File(getFilesDir(), "app"), "index.html"); }

    private boolean adaImpor() { return berkasImpor().isFile() && berkasImpor().length() > 1024; }

    private String alamatAwal() {
        String u = pref().getString(K_URL, "");
        if (u != null && u.matches(POLA_SERVER)) {   // APK lama: alamat server tersimpan sebagai alamat aplikasi
            pref().edit().putString(K_SERVER, u).remove(K_URL).apply(); u = "";
        }
        if (u != null && !u.isEmpty()) {
            String h = Uri.parse(u).getHost();
            if (h != null && h.matches(POLA_GOOGLE)) return ATUR + "?salah=1";
            return u;
        }
        if (!BuildConfig.APP_URL.isEmpty()) return BuildConfig.APP_URL;
        if (adaImpor()) return IMPOR;
        if (adaSalinanLokal()) return LOKAL;
        return ATUR;
    }

    /** Menyajikan berkas aplikasi hasil impor + config.json (alamat server) di https://appassets.androidplatform.net/app/ */
    private class JalurApp implements WebViewAssetLoader.PathHandler {
        @Override
        public WebResourceResponse handle(String jalur) {
            try {
                if (jalur.isEmpty()) jalur = "index.html";
                if (jalur.equals("config.json")) {
                    String sv = pref().getString(K_SERVER, "");
                    String j = "{\"server\":\"" + (sv == null ? "" : sv.replace("\\", "").replace("\"", "")) + "\"}";
                    return new WebResourceResponse("application/json", "UTF-8", new ByteArrayInputStream(j.getBytes(StandardCharsets.UTF_8)));
                }
                if (jalur.equals("index.html") && adaImpor()) return new WebResourceResponse("text/html", "UTF-8", denganAwal(berkasImpor()));
                if (jalur.equals("apk-awal.js")) return new WebResourceResponse("text/javascript", "UTF-8", getAssets().open("apk-awal.js"));
            } catch (Exception e) { /* jatuh ke 404 */ }
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream(new byte[0]));
        }
    }

    /** index.html hasil impor + <script src="apk-awal.js"> tepat setelah <head> (tanpa mengubah berkas tersimpan). */
    private InputStream denganAwal(File f) throws Exception {
        FileInputStream in = new FileInputStream(f);
        byte[] b = new byte[8192]; int n = 0, r;
        while (n < b.length && (r = in.read(b, n, b.length - n)) > 0) n += r;
        String k = new String(b, 0, n, StandardCharsets.ISO_8859_1).toLowerCase();
        int i = k.indexOf("<head"), j = i < 0 ? -1 : k.indexOf('>', i);
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        if (j >= 0) { o.write(b, 0, j + 1); o.write("<script src=\"apk-awal.js\"></script>".getBytes(StandardCharsets.UTF_8)); o.write(b, j + 1, n - j - 1); }
        else o.write(b, 0, n);
        return new SequenceInputStream(new ByteArrayInputStream(o.toByteArray()), in);
    }

    private File berkasPaket() { return new File(new File(getFilesDir(), "app"), "paket.json"); }

    private void imporHtml(Uri sumber) {
        pesan("Menyalin berkas aplikasi …");
        new Thread(() -> {
            File tuju = berkasImpor(), tmp = new File(tuju.getParentFile(), "index.tmp");
            try {
                if (!tuju.getParentFile().exists() && !tuju.getParentFile().mkdirs()) throw new Exception("penyimpanan tidak tersedia");
                long total = 0; byte[] awal = new byte[4096]; int nAwal = 0;
                try (InputStream in = getContentResolver().openInputStream(sumber); FileOutputStream out = new FileOutputStream(tmp)) {
                    if (in == null) throw new Exception("berkas tidak dapat dibaca");
                    byte[] b = new byte[65536]; int n;
                    while ((n = in.read(b)) > 0) { if (nAwal < awal.length) { int c = Math.min(n, awal.length - nAwal); System.arraycopy(b, 0, awal, nAwal, c); nAwal += c; } out.write(b, 0, n); total += n; }
                }
                String kepala = new String(awal, 0, nAwal, StandardCharsets.UTF_8).toLowerCase();
                if (total < 50000 || !(kepala.contains("<!doctype html") || kepala.contains("<html"))) throw new Exception("ini bukan berkas aplikasi (Monitoring_SAP.html / index.html)");
                if (tuju.exists() && !tuju.delete()) throw new Exception("berkas lama tidak dapat diganti");
                if (!tmp.renameTo(tuju)) throw new Exception("gagal menyimpan");
                runOnUiThread(() -> { pref().edit().remove(K_URL).apply(); web.clearCache(true); web.clearHistory(); muat(IMPOR); });
            } catch (Exception e) {
                tmp.delete();
                runOnUiThread(() -> pesan("Impor gagal: " + e.getMessage()));
            }
        }).start();
    }

    private void muat(String url) {
        Uri u = Uri.parse(url);
        if ("https".equals(u.getScheme()) && u.getHost() != null) hostApp = u.getHost();
        web.loadUrl(url);
    }

    private boolean diLayarAtur() { return urlKini.startsWith(ATUR); }

    private boolean halamanAplikasi(String url) {
        if (url == null) return false;
        if (url.startsWith(ATUR)) return true;
        Uri u = Uri.parse(url);
        return "https".equals(u.getScheme()) && u.getHost() != null && (u.getHost().equals(hostApp) || u.getHost().equals(HOST_LOKAL));
    }

    /* ---------- klien halaman ---------- */
    private class Klien extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
            return HOST_LOKAL.equals(r.getUrl().getHost()) ? pemuat.shouldInterceptRequest(r.getUrl()) : null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            String skema = u.getScheme() == null ? "" : u.getScheme();
            if (skema.equals("blob") || skema.equals("data") || skema.equals("about") || skema.equals("javascript")) return false;
            if (!r.isForMainFrame()) return !(skema.equals("https") || skema.equals("http")) && bukaLuar(u);
            if (halamanAplikasi(u.toString())) return false;
            bukaLuar(u);   // tautan ke luar aplikasi (Drive, WhatsApp, e-mail, …) → aplikasi lain
            return true;
        }

        @Override
        public void onPageStarted(WebView v, String url, Bitmap ikon) { urlKini = url == null ? "" : url; }

        @Override
        public void doUpdateVisitedHistory(WebView v, String url, boolean muatUlang) { urlKini = url == null ? "" : url; }

        @Override
        public void onPageFinished(WebView v, String url) {
            urlKini = url == null ? "" : url;
            if (halamanAplikasi(url) && !jembatan.isEmpty()) v.evaluateJavascript(jembatan, null);
        }

        @Override
        public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
            if (!r.isForMainFrame() || r.getUrl().toString().startsWith("file:")) return;
            // halaman utama gagal dimuat (alamat salah / tanpa sinyal & belum pernah dibuka) → layar alamat dengan pesan
            String pesan = e.getDescription() == null ? "" : e.getDescription().toString();
            v.loadUrl(ATUR + "?galat=" + Uri.encode(pesan) + "&alamat=" + Uri.encode(r.getUrl().toString()));
        }
    }

    private boolean bukaLuar(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return true; }
        catch (Exception e) { pesan("Tidak ada aplikasi untuk membuka tautan ini."); return true; }
    }

    /* ---------- pilih berkas, kamera, izin ---------- */
    private class Krom extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (berkasCb != null) berkasCb.onReceiveValue(null);
            berkasCb = cb;
            Intent pilih;
            try { pilih = p.createIntent(); } catch (Exception e) { pilih = new Intent(Intent.ACTION_GET_CONTENT).setType("*/*"); }
            pilih.addCategory(Intent.CATEGORY_OPENABLE);
            if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) pilih.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            String[] jenis = p.getAcceptTypes();
            boolean gambar = false, lain = false;
            if (jenis != null) for (String j : jenis) { if (j == null || j.isEmpty()) continue; if (j.startsWith("image/") || j.matches("\\.(jpe?g|png)")) gambar = true; else lain = true; }
            if (jenis != null && jenis.length > 1) { pilih.setType(gambar && !lain ? "image/*" : "*/*"); }
            Intent pemilih = Intent.createChooser(pilih, "Pilih berkas");
            if (gambar) {
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    pemilihTunda = pemilih;
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, MINTA_KAMERA);
                    return true;
                }
                tambahKamera(pemilih);
            }
            return mulaiPemilih(pemilih);
        }

        @Override
        public void onPermissionRequest(PermissionRequest minta) {
            // kamera untuk halaman aplikasi sendiri (mis. pindai / foto langsung lewat getUserMedia)
            boolean kamera = false;
            for (String r : minta.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) kamera = true;
            if (!kamera || !halamanAplikasi(urlKini)) { minta.deny(); return; }
            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) minta.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else { izinWeb = minta; requestPermissions(new String[]{Manifest.permission.CAMERA}, MINTA_KAMERA); }
        }
    }

    private void tambahKamera(Intent pemilih) {
        try {
            File dir = new File(getCacheDir(), "foto");
            if (!dir.exists() && !dir.mkdirs()) return;
            File f = new File(dir, "foto-" + System.currentTimeMillis() + ".jpg");
            fotoUri = FileProvider.getUriForFile(this, getPackageName() + ".berkas", f);
            Intent kam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, fotoUri);
            kam.setClipData(ClipData.newRawUri("", fotoUri));
            kam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            pemilih.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{kam});
        } catch (Exception e) { fotoUri = null; }
    }

    private boolean mulaiPemilih(Intent pemilih) {
        try { startActivityForResult(pemilih, MINTA_BERKAS); return true; }
        catch (ActivityNotFoundException e) { if (berkasCb != null) berkasCb.onReceiveValue(null); berkasCb = null; pesan("Tidak ada aplikasi pemilih berkas."); return true; }
    }

    @Override
    public void onRequestPermissionsResult(int kode, String[] izin, int[] hasil) {
        super.onRequestPermissionsResult(kode, izin, hasil);
        if (kode != MINTA_KAMERA) return;
        boolean boleh = hasil.length > 0 && hasil[0] == PackageManager.PERMISSION_GRANTED;
        if (izinWeb != null) { if (boleh) izinWeb.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE}); else izinWeb.deny(); izinWeb = null; }
        if (pemilihTunda != null) { Intent p = pemilihTunda; pemilihTunda = null; if (boleh) tambahKamera(p); mulaiPemilih(p); }
    }

    @Override
    protected void onActivityResult(int kode, int hasil, Intent data) {
        super.onActivityResult(kode, hasil, data);
        if (kode == MINTA_HTML) { if (hasil == RESULT_OK && data != null && data.getData() != null) imporHtml(data.getData()); return; }
        if (kode != MINTA_BERKAS || berkasCb == null) return;
        Uri[] out = null;
        if (hasil == RESULT_OK) {
            if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                ClipData c = data.getClipData(); out = new Uri[c.getItemCount()];
                for (int i = 0; i < out.length; i++) out[i] = c.getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) out = new Uri[]{data.getData()};
            else if (fotoUri != null) out = new Uri[]{fotoUri};   // hasil kamera
        }
        berkasCb.onReceiveValue(out);
        berkasCb = null; fotoUri = null;
    }

    /* ---------- unduhan ---------- */
    private void unduh(String url, String ua, String disposisi, String mime) {
        if (url.startsWith("blob:") || url.startsWith("data:")) {
            // cadangan bila tautan tidak tertangkap jembatan.js (nama berkas tidak diketahui WebView)
            String nama = "unduhan-" + System.currentTimeMillis();
            web.evaluateJavascript("window.__apkUnduh&&window.__apkUnduh(" + kutip(url) + "," + kutip(nama) + ")", null);
            return;
        }
        try {
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            String nama = URLUtil.guessFileName(url, disposisi, mime);
            String kuki = CookieManager.getInstance().getCookie(url);
            if (kuki != null) r.addRequestHeader("Cookie", kuki);
            r.addRequestHeader("User-Agent", ua);
            r.setMimeType(mime); r.setTitle(nama);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, nama);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
            pesan("Mengunduh " + nama + " …");
        } catch (Exception e) { bukaLuar(Uri.parse(url)); }
    }

    private static String kutip(String s) { return "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ") + "'"; }

    private static String namaAman(String nama) {
        String n = nama == null ? "" : nama.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        return n.isEmpty() ? "unduhan-" + System.currentTimeMillis() : (n.length() > 120 ? n.substring(n.length() - 120) : n);
    }

    private void simpanBerkas(byte[] isi, String mime, String nama) throws Exception {
        nama = namaAman(nama);
        if (mime == null || mime.isEmpty() || "application/octet-stream".equals(mime)) {
            String ext = MimeTypeMap.getFileExtensionFromUrl(Uri.encode(nama));
            String m = ext == null ? null : MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase());
            mime = m == null ? "application/octet-stream" : m;
        }
        Uri uri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Downloads.DISPLAY_NAME, nama);
            cv.put(MediaStore.Downloads.MIME_TYPE, mime);
            cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MonitoringSAP");
            uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new Exception("penyimpanan tidak tersedia");
            try (OutputStream os = getContentResolver().openOutputStream(uri)) { if (os == null) throw new Exception("tidak dapat menulis"); os.write(isi); }
        } else {
            File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) throw new Exception("penyimpanan tidak tersedia");
            File f = new File(dir, nama);
            try (FileOutputStream os = new FileOutputStream(f)) { os.write(isi); }
            uri = FileProvider.getUriForFile(this, getPackageName() + ".berkas", f);
        }
        final Uri u = uri; final String m = mime, n = nama;
        runOnUiThread(() -> {
            pesan("Tersimpan: Download/MonitoringSAP/" + n);
            try { startActivity(Intent.createChooser(new Intent(Intent.ACTION_VIEW).setDataAndType(u, m).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION), "Buka " + n)); }
            catch (Exception e) { /* tidak ada aplikasi pembuka — berkas tetap tersimpan */ }
        });
    }

    /* ---------- cetak ---------- */
    private void cetak(WebView w, String judul) {
        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
        if (pm == null) { pesan("Layanan cetak tidak tersedia di perangkat ini."); return; }
        String nama = "Monitoring SAP" + (judul == null || judul.trim().isEmpty() ? "" : " - " + judul.trim());
        pm.print(nama, w.createPrintDocumentAdapter(nama), new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void cetakHtml(String html, String judul) {
        WebView w = new WebView(this);
        w.getSettings().setJavaScriptEnabled(false);
        w.getSettings().setAllowFileAccess(false);
        w.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) { cetak(v, judul); }
        });
        webCetak = w;
        String dasar = urlKini.startsWith("https://") ? urlKini : "https://" + HOST_LOKAL + "/";
        w.loadDataWithBaseURL(dasar, html, "text/html", "UTF-8", null);
    }

    /* ---------- jembatan JavaScript (hanya dilayani untuk halaman aplikasi) ---------- */
    private class Jembatan {
        @JavascriptInterface public void simpan(String base64, String mime, String nama) {
            if (!halamanAplikasi(urlKini)) return;
            try { simpanBerkas(Base64.decode(base64, Base64.DEFAULT), mime, nama); }
            catch (Exception e) { runOnUiThread(() -> pesan("Unduhan gagal: " + e.getMessage())); }
        }
        @JavascriptInterface public void cetak() { if (halamanAplikasi(urlKini)) runOnUiThread(() -> MainActivity.this.cetak(web, web.getTitle())); }
        @JavascriptInterface public void cetakHtml(String html, String judul) { if (halamanAplikasi(urlKini)) runOnUiThread(() -> MainActivity.this.cetakHtml(html, judul)); }
        @JavascriptInterface public void bukaLuar(String url) {
            if (!halamanAplikasi(urlKini) || url == null) return;
            Uri u = Uri.parse(url); String s = u.getScheme() == null ? "" : u.getScheme();
            if (s.equals("https") || s.equals("http") || s.equals("mailto") || s.equals("tel")) runOnUiThread(() -> MainActivity.this.bukaLuar(u));
        }
        @JavascriptInterface public void pesan(String teks) { runOnUiThread(() -> MainActivity.this.pesan(teks)); }
        @JavascriptInterface public String versi() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public int kode() { return BuildConfig.VERSION_CODE; }
        /* layar "Alamat aplikasi" */
        @JavascriptInterface public String alamat() { String u = pref().getString(K_URL, ""); return u == null || u.isEmpty() ? BuildConfig.APP_URL : u; }
        @JavascriptInterface public boolean adaLokal() { return adaSalinanLokal(); }
        @JavascriptInterface public void simpanAlamat(String url) {
            if (!diLayarAtur() || url == null) return;
            String u = url.trim();
            if (u.equals("lokal")) { if (!adaSalinanLokal()) return; pref().edit().remove(K_URL).apply(); runOnUiThread(() -> muat(LOKAL)); return; }
            Uri p = Uri.parse(u);
            if (!"https".equals(p.getScheme()) || p.getHost() == null || p.getHost().isEmpty()) { runOnUiThread(() -> MainActivity.this.pesan("Alamat harus diawali https://")); return; }
            if (u.matches(POLA_SERVER)) {   // alamat server Apps Script → disimpan sebagai server; aplikasinya dari berkas impor
                pref().edit().putString(K_SERVER, u).remove(K_URL).apply();
                runOnUiThread(() -> { if (adaImpor()) { web.clearHistory(); muat(IMPOR); } else web.loadUrl(ATUR + "?langkah=2"); });
                return;
            }
            if (p.getHost().matches(POLA_GOOGLE)) { runOnUiThread(() -> MainActivity.this.pesan("Itu tautan Google Sheet / Drive, bukan alamat aplikasi.")); return; }
            pref().edit().putString(K_URL, u).apply();
            runOnUiThread(() -> { web.clearHistory(); muat(u); });
        }
        /* paket pembaruan aplikasi web disimpan sebagai berkas (lihat apk-awal.js) */
        @JavascriptInterface public String bacaPaket() {
            if (!halamanAplikasi(urlKini) || !berkasPaket().isFile()) return "";
            try (FileInputStream in = new FileInputStream(berkasPaket()); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] b = new byte[65536]; int n; while ((n = in.read(b)) > 0) out.write(b, 0, n);
                return new String(out.toByteArray(), StandardCharsets.UTF_8);
            } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public void simpanPaket(String isi) {
            if (!halamanAplikasi(urlKini) || isi == null) return;
            File f = berkasPaket(), tmp = new File(f.getParentFile(), "paket.tmp");
            try { f.getParentFile().mkdirs(); try (FileOutputStream os = new FileOutputStream(tmp)) { os.write(isi.getBytes(StandardCharsets.UTF_8)); } f.delete(); tmp.renameTo(f); }
            catch (Exception e) { tmp.delete(); }
        }
        @JavascriptInterface public void hapusPaket() { if (halamanAplikasi(urlKini)) berkasPaket().delete(); }
        @JavascriptInterface public String server() { String v = pref().getString(K_SERVER, ""); return v == null ? "" : v; }
        @JavascriptInterface public boolean adaApp() { return adaImpor(); }
        @JavascriptInterface public void bukaApp() { if (diLayarAtur() && adaImpor()) runOnUiThread(() -> { web.clearHistory(); muat(IMPOR); }); }
        @JavascriptInterface public void pilihHtml() {
            if (!diLayarAtur()) return;
            runOnUiThread(() -> {
                try { startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"text/html", "application/xhtml+xml", "application/octet-stream"}), MINTA_HTML); }
                catch (Exception e) { MainActivity.this.pesan("Tidak ada aplikasi pemilih berkas."); }
            });
        }
        /* dipanggil dari aplikasi web (mis. konsol / tautan bantuan): AndroidApp.gantiAlamat() */
        @JavascriptInterface public void gantiAlamat() { if (halamanAplikasi(urlKini)) runOnUiThread(() -> web.loadUrl(ATUR + "?ganti=1")); }
    }

    /* ---------- lain-lain ---------- */
    private void pesan(String teks) { Toast.makeText(this, teks, Toast.LENGTH_LONG).show(); }

    private String bacaAset(String nama) {
        try (InputStream in = getAssets().open(nama); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0) out.write(b, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception e) { return ""; }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack() && !diLayarAtur()) web.goBack(); else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle b) { super.onSaveInstanceState(b); if (web != null) web.saveState(b); }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); if (web != null) web.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } if (webCetak != null) { webCetak.destroy(); webCetak = null; } super.onDestroy(); }
}
