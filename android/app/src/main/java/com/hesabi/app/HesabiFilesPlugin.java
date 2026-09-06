package com.hesabi.app;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.Manifest;
import android.content.pm.PackageManager;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Native file saving, sharing and printing for Hesabi.
 * Replaces unsupported WebView blob-download paths so exports
 * (Excel, CSV, PDF, JSON backups) work on Android without a server.
 */
@CapacitorPlugin(
    name = "HesabiFiles",
    permissions = {
        // Only needed for public Downloads writes on Android 9 and older.
        @Permission(
            strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE },
            alias = "storage")
    }
)
public class HesabiFilesPlugin extends Plugin {

    private static final String AUTHORITY_SUFFIX = ".fileprovider";

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("platform", "android");
        ret.put("save", true);
        ret.put("share", true);
        ret.put("print", true);
        call.resolve(ret);
    }

    /**
     * Save a base64 payload to the public Downloads directory.
     * Options: { data: base64 (raw or data URL), filename, mimeType }
     */
    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (data == null || data.isEmpty()) {
            call.reject("data is required");
            return;
        }
        if (filename == null || filename.isEmpty()) {
            call.reject("filename is required");
            return;
        }
        if (needsLegacyStoragePermission()) {
            saveCall(call);
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }
        saveNow(call, data, filename, mimeType);
    }

    private boolean needsLegacyStoragePermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED;
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        if (needsLegacyStoragePermission()) {
            call.reject("storage permission denied");
            return;
        }
        saveNow(call, data, filename, mimeType);
    }

    private void saveNow(PluginCall call, String data, String filename, String mimeType) {
        String pureData = data;
        int commaIndex = data.indexOf(',');
        if (data.startsWith("data:") && commaIndex > 0) {
            pureData = data.substring(commaIndex + 1);
        }
        try {
            byte[] bytes = Base64.decode(pureData, Base64.DEFAULT);
            Uri savedUri = saveToDownloads(filename, mimeType, bytes);
            JSObject ret = new JSObject();
            ret.put("uri", savedUri.toString());
            ret.put("path", savedUri.getPath());
            ret.put("filename", filename);
            ret.put("size", bytes.length);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("فشل حفظ الملف: " + e.getMessage());
        }
    }

    private Uri saveToDownloads(String filename, String mimeType, byte[] bytes) throws Exception {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            Uri itemUri = context.getContentResolver().insert(collection, values);
            if (itemUri == null) {
                throw new Exception("MediaStore insert failed");
            }
            try (OutputStream out = context.getContentResolver().openOutputStream(itemUri)) {
                if (out == null) {
                    throw new Exception("Failed to open output stream");
                }
                out.write(bytes);
                out.flush();
            }
            return itemUri;
        }
        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
            throw new Exception("Cannot create Downloads directory");
        }
        File target = new File(downloadsDir, filename);
        try (FileOutputStream out = new FileOutputStream(target)) {
            out.write(bytes);
            out.flush();
        }
        return Uri.fromFile(target);
    }

    /**
     * Share a base64 payload through the Android share sheet via FileProvider.
     * Options: { data, filename, mimeType, title, dialogTitle }
     */
    @PluginMethod
    public void share(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String title = call.getString("title", "حسابي");
        if (data == null || data.isEmpty()) {
            call.reject("data is required");
            return;
        }
        if (filename == null || filename.isEmpty()) {
            call.reject("filename is required");
            return;
        }
        String pureData = data;
        int commaIndex = data.indexOf(',');
        if (data.startsWith("data:") && commaIndex > 0) {
            pureData = data.substring(commaIndex + 1);
        }
        try {
            byte[] bytes = Base64.decode(pureData, Base64.DEFAULT);
            String cacheSubdir = "shared";
            File sharedDir = new File(getContext().getCacheDir(), cacheSubdir);
            if (!sharedDir.exists() && !sharedDir.mkdirs()) {
                throw new Exception("Cannot create share directory");
            }
            File sharedFile = new File(sharedDir, filename);
            try (FileOutputStream out = new FileOutputStream(sharedFile)) {
                out.write(bytes);
                out.flush();
            }
            String authority = getContext().getPackageName() + AUTHORITY_SUFFIX;
            Uri contentUri = FileProvider.getUriForFile(getContext(), authority, sharedFile);
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_TEXT, title);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(shareIntent, title);
            Intent withFlags = chooser.putExtra(Intent.EXTRA_LOCAL_ONLY, true);
            withFlags.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            JSObject ret = new JSObject();
            ret.put("completed", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("فشل مشاركة الملف: " + e.getMessage());
        }
    }

    /**
     * Print HTML content through the system print dialog.
     * Options: { html, jobName }
     * Renders the HTML in an offscreen WebView and waits for it to finish
     * loading before handing it to the system PrintManager.
     */
    @PluginMethod
    public void print(PluginCall call) {
        String html = call.getString("html");
        String jobName = call.getString("jobName", "حسابي");
        if (html == null || html.isEmpty()) {
            call.reject("html is required");
            return;
        }
        // Plugin methods run on the Capacitor bridge thread, but WebView
        // creation AND PrintManager MUST run on the UI/main thread — doing
        // this off-thread crashes with CalledFromWrongThreadException.
        android.app.Activity activity = getActivity();
        if (activity == null) {
            call.reject("فشل بدء الطباعة: النشاط غير متاح");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                android.webkit.WebView printWebView = new android.webkit.WebView(getContext());
                printWebView.getSettings().setJavaScriptEnabled(false);
                printWebView.getSettings().setTextZoom(100);
                printWebView.setWebViewClient(new android.webkit.WebViewClient() {
                    private boolean printed = false;

                    @Override
                    public void onPageFinished(android.webkit.WebView view, String url) {
                        if (printed) return;
                        printed = true;
                        try {
                            android.print.PrintAttributes attrs =
                                new android.print.PrintAttributes.Builder()
                                    .setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4)
                                    .build();
                            android.print.PrintManager printManager =
                                (android.print.PrintManager) getContext()
                                    .getSystemService(Context.PRINT_SERVICE);
                            if (printManager == null) {
                                call.reject("Print service unavailable on this device");
                                return;
                            }
                            android.print.PrintDocumentAdapter adapter =
                                view.createPrintDocumentAdapter(jobName);
                            printManager.print(jobName, adapter, attrs);
                            JSObject ret = new JSObject();
                            ret.put("started", true);
                            call.resolve(ret);
                        } catch (Exception e) {
                            call.reject("فشل بدء الطباعة: " + message(e));
                        } finally {
                            // Release the offscreen WebView once printing starts;
                            // the print adapter snapshots the page itself.
                            view.postDelayed(() -> {
                                try {
                                    ((android.view.ViewGroup) view.getParent()).removeView(view);
                                    view.destroy();
                                } catch (Exception ignored) {
                                    // Already detached — nothing to clean up.
                                }
                            }, 60000L);
                        }
                    }
                });
                String baseUrl = getBridge().getWebView().getUrl();
                printWebView.loadDataWithBaseURL(baseUrl, html, "text/html", "utf-8", null);
            } catch (Exception e) {
                call.reject("فشل بدء الطباعة: " + message(e));
            }
        });
    }

    /**
     * Share plain text through the Android share sheet.
     * Options: { text, title }
     */
    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text");
        String title = call.getString("title", "\u062d\u0633\u0627\u0628\u064a");
        if (text == null || text.isEmpty()) {
            call.reject("text is required");
            return;
        }
        try {
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            shareIntent.putExtra(Intent.EXTRA_TEXT, text);
            shareIntent.putExtra(Intent.EXTRA_TITLE, title);
            Intent chooser = Intent.createChooser(shareIntent, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            JSObject ret = new JSObject();
            ret.put("completed", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("\u0641\u0634\u0644 \u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0646\u0635: " + message(e));
        }
    }

    private String message(Exception e) {
        return e.getMessage() == null ? "unknown error" : e.getMessage();
    }
}
