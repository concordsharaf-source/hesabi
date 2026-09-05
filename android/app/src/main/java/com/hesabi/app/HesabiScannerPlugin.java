package com.hesabi.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.CornerPathEffect;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.core.resolutionselector.AspectRatioStrategy;
import androidx.camera.core.resolutionselector.ResolutionSelector;
import androidx.camera.core.resolutionselector.ResolutionStrategy;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LifecycleOwner;

import com.google.android.gms.tasks.Task;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import android.util.Size;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native barcode scanner plugin for Hesabi (حسابي).
 * Uses CameraX + ML Kit barcode scanning in a full-screen native overlay with
 * torch toggle, zoom, beep sound, vibration, and continuous mode.
 */
@CapacitorPlugin(
    name = "HesabiScanner",
    permissions = {
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera"),
    }
)
public class HesabiScannerPlugin extends Plugin {

    private static final String TAG = "HesabiScanner";
    private static final long DUPLICATE_SUPPRESSION_MS = 1500;
    private static final long CONTINUOUS_RELEASE_MS = 650;
    private static final long VIBRATION_MS = 45;
    private static final int UI_COLOR_DARK = 0xEE1B1B1B;
    private static final int UI_COLOR_TEXT = 0xFFF4F4F5;
    private static final int UI_COLOR_LIGHT = 0x66FFFFFF;

    private FrameLayout scannerOverlay;
    private PreviewView previewView;
    private TextView statusView;
    private Button torchButton;
    private Button manualButton;
    private ProcessCameraProvider cameraProvider;
    private Camera camera;
    private BarcodeScanner mlKitScanner;
    private ExecutorService analysisExecutor;
    private ToneGenerator toneGenerator;
    private Vibrator vibrator;
    private boolean torchOn = false;
    private boolean continuousMode = false;
    private boolean wantBeep = true;
    private boolean wantVibrate = true;
    private boolean scannerOpen = false;
    private boolean pendingShowTorch = true;
    private boolean pendingShowManual = true;
    private String lastCode = "";
    private long lastCodeAt = 0L;
    private long absentSince = 0L;
    private final AtomicBoolean analyzing = new AtomicBoolean(false);

    @Override
    public void load() {
        super.load();
        try {
            toneGenerator = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 85);
        } catch (RuntimeException e) {
            toneGenerator = null;
        }
        vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("mode", "mlkit");
        ret.put("platform", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void openScanner(PluginCall call) {
        String mode = call.getString("mode", "single");
        boolean showTorch = Boolean.TRUE.equals(call.getBoolean("showTorch", true));
        boolean beep = Boolean.TRUE.equals(call.getBoolean("beep", true));
        boolean vibrate = Boolean.TRUE.equals(call.getBoolean("vibrate", true));
        boolean showManualEntry = Boolean.TRUE.equals(call.getBoolean("showManualEntry", true));
        continuousMode = "continuous".equals(mode) || "sale".equals(mode);
        wantBeep = beep;
        wantVibrate = vibrate;
        pendingShowTorch = showTorch;
        pendingShowManual = showManualEntry;
        if (!hasCameraPermission()) {
            saveCall(call);
            requestPermissionForAlias("camera", call, "cameraPermissionCallback");
            return;
        }
        openCameraOverlay(call);
    }

    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        if (!hasCameraPermission()) {
            JSObject data = new JSObject();
            data.put("message", "camera-permission-denied");
            notifyListeners("permissionDenied", data);
            call.reject("camera permission denied");
            return;
        }
        openCameraOverlay(call);
    }

    private void openCameraOverlay(PluginCall call) {
        final PluginCall finalCall = call;
        getActivity().runOnUiThread(() -> {
            try {
                buildScannerUi();
                finalCall.resolve();
            } catch (Exception e) {
                Logger.error(TAG, "Failed to build scanner UI", e);
                finalCall.reject("تعذر فتح الماسح: " + e.getMessage());
            }
        });
    }

    // ─── Scanner UI ────────────────────────────────────────────────────────

    private void buildScannerUi() {
        AppCompatActivity activity = getActivity();
        if (activity == null) return;
        if (scannerOverlay != null) {
            dismissScannerUi();
        }

        scannerOverlay = new FrameLayout(activity);
        scannerOverlay.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        scannerOverlay.setBackgroundColor(0xFF000000);

        previewView = new PreviewView(activity);
        previewView.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        scannerOverlay.addView(previewView, 0);

        GuideOverlayView guide = new GuideOverlayView(activity);
        guide.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        scannerOverlay.addView(guide, 1);

        LinearLayout controlPanel = new LinearLayout(activity);
        controlPanel.setOrientation(LinearLayout.VERTICAL);
        FrameLayout.LayoutParams panelParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        controlPanel.setLayoutParams(panelParams);
        controlPanel.setBackground(makePanelBackground());
        int padH = dp(20);
        int padV = dp(16);
        controlPanel.setPadding(padH, padV, padH, dp(36));

        statusView = new TextView(activity);
        statusView.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        statusView.setText(getStartHint());
        statusView.setTextColor(UI_COLOR_TEXT);
        statusView.setTextSize(16f);
        statusView.setGravity(Gravity.CENTER);
        statusView.setPadding(0, 0, 0, dp(10));
        controlPanel.addView(statusView);

        LinearLayout controlBar = new LinearLayout(activity);
        controlBar.setOrientation(LinearLayout.HORIZONTAL);
        controlBar.setGravity(Gravity.CENTER);
        controlBar.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        controlBar.addView(button(activity, "إغلاق", v -> closeScannerUi("user-dismissed")));
        manualButton = button(activity, "إدخال يدوي", v -> {
            JSObject data = new JSObject();
            data.put("message", "manual-entry-requested");
            notifyListeners("manualEntryRequested", data);
        });
        if (pendingShowManual) controlBar.addView(manualButton);
        torchButton = button(activity, "إضاءة", v -> toggleTorch());
        if (pendingShowTorch) controlBar.addView(torchButton);
        controlPanel.addView(controlBar);

        scannerOverlay.addView(controlPanel, 2);
        torchOn = false;
        camera = null;
        scannerOpen = true;

        activity.addContentView(scannerOverlay, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        startCamera();
    }

    private String getStartHint() {
        return continuousMode
            ? "المسح المتواصل مفعّل: أمسح المنتجات واحداً تلو الآخر ثم اختر إنهاء المسح"
            : "وجّه الكاميرا نحو الباركود داخل الإطار";
    }

    private int dp(float value) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, value, getContext().getResources().getDisplayMetrics()));
    }

    private Button button(AppCompatActivity activity, String label, View.OnClickListener listener) {
        Button b = new Button(activity, null, 0);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextColor(UI_COLOR_TEXT);
        b.setTextSize(15f);
        b.setBackground(makeButtonBackground());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        int m = dp(6);
        lp.setMargins(m, m, m, m);
        b.setLayoutParams(lp);
        b.setPadding(dp(12), dp(10), dp(12), dp(10));
        b.setOnClickListener(listener);
        return b;
    }

    private void dismissScannerUi() {
        AppCompatActivity activity = getActivity();
        if (activity == null || scannerOverlay == null) return;
        releaseCameraQuietly();
        ViewGroup parent = (ViewGroup) scannerOverlay.getParent();
        if (parent != null) parent.removeView(scannerOverlay);
        scannerOverlay = null;
        previewView = null;
        statusView = null;
        torchButton = null;
        manualButton = null;
    }

    // ─── Camera lifecycle ──────────────────────────────────────────────────

    private void startCamera() {
        AppCompatActivity activity = getActivity();
        if (activity == null) return;
        if (!hasCameraPermission()) {
            showStatus("تعذر فتح الكاميرا: لم يُمنح الإذن", true);
            return;
        }
        if (cameraProvider != null) {
            bindCameraUseCases();
            return;
        }
        final ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(activity);
        future.addListener(() -> {
            try {
                cameraProvider = future.get();
                bindCameraUseCases();
            } catch (Exception e) {
                Logger.error(TAG, "Failed to init CameraX", e);
                showStatus("تعذر تهيئة الكاميرا: " + e.getMessage(), true);
            }
        }, ContextCompat.getMainExecutor(activity));
    }

    private void bindCameraUseCases() {
        AppCompatActivity activity = getActivity();
        if (cameraProvider == null || previewView == null || activity == null) return;
        try {
            cameraProvider.unbindAll();
            ResolutionSelector resolutionSelector = new ResolutionSelector.Builder()
                .setAspectRatioStrategy(AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY)
                .setResolutionStrategy(new ResolutionStrategy(
                    new Size(1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER))
                .build();
            Preview preview = new Preview.Builder().build();
            preview.setSurfaceProvider(previewView.getSurfaceProvider());
            ImageAnalysis analysis = new ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setResolutionSelector(resolutionSelector)
                .build();
            analysisExecutor = Executors.newSingleThreadExecutor();
            analysis.setAnalyzer(analysisExecutor, image -> {
                try {
                    analyzeFrame(image);
                } finally {
                    image.close();
                }
            });
            CameraSelector selector = new CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                .build();
            camera = cameraProvider.bindToLifecycle(
                (LifecycleOwner) activity, selector, preview, analysis);
            updateTorchUi();
        } catch (Exception e) {
            Logger.error(TAG, "Failed to bind camera", e);
            showStatus("تعذر تشغيل الكاميرا: " + e.getMessage(), true);
        }
    }

    @androidx.camera.core.ExperimentalGetImage
    private void analyzeFrame(ImageProxy image) {
        if (image.getImage() == null) return;
        if (!analyzing.compareAndSet(false, true)) return;
        try {
            BarcodeScanner scanner = mlKitScanner;
            if (scanner == null) {
                BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                    .setBarcodeFormats(
                        Barcode.FORMAT_EAN_13,
                        Barcode.FORMAT_EAN_8,
                        Barcode.FORMAT_UPC_A,
                        Barcode.FORMAT_UPC_E,
                        Barcode.FORMAT_CODE_128,
                        Barcode.FORMAT_CODE_39)
                    .build();
                scanner = BarcodeScanning.getClient(options);
                mlKitScanner = scanner;
            }
            int rotation = image.getImageInfo().getRotationDegrees();
            InputImage input = InputImage.fromMediaImage(image.getImage(), rotation);
            Task<List<Barcode>> task = scanner.process(input);
            task.addOnSuccessListener(barcodes -> {
                try {
                    if (barcodes != null && !barcodes.isEmpty()) {
                        String raw = barcodes.get(0).getRawValue();
                        if (raw != null && !raw.isEmpty()) {
                            handleBarcode(raw.trim());
                        }
                    } else {
                        handleNoBarcode();
                    }
                } catch (Exception ignored) {
                }
            });
            task.addOnFailureListener(e -> handleNoBarcode());
        } finally {
            analyzing.set(false);
        }
    }

    private void handleNoBarcode() {
        long now = System.currentTimeMillis();
        if (continuousMode && !lastCode.isEmpty() && now - lastCodeAt >= CONTINUOUS_RELEASE_MS) {
            lastCode = "";
            lastCodeAt = 0L;
        }
    }

    private void handleBarcode(String rawCode) {
        long now = System.currentTimeMillis();
        if (continuousMode) {
            boolean sameAsLast = rawCode.equals(lastCode);
            if (sameAsLast) {
                lastCodeAt = now;
                return;
            }
            if (!lastCode.isEmpty() && now - lastCodeAt < DUPLICATE_SUPPRESSION_MS) {
                lastCodeAt = now;
                return;
            }
        } else if (rawCode.equals(lastCode) && now - lastCodeAt < DUPLICATE_SUPPRESSION_MS) {
            lastCodeAt = now;
            return;
        }
        lastCode = rawCode;
        lastCodeAt = now;
        feedback();
        emitBarcode(rawCode);
    }

    private void feedback() {
        if (wantVibrate && vibrator != null && vibrator.hasVibrator()) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(VIBRATION_MS, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(VIBRATION_MS);
                }
            } catch (Exception ignored) {
            }
        }
        if (wantBeep && toneGenerator != null) {
            try {
                toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP2, 140);
            } catch (Exception ignored) {
            }
        }
    }

    private void emitBarcode(String code) {
        JSObject data = new JSObject();
        data.put("barcode", code);
        data.put("code", code);
        data.put("continuous", continuousMode);
        data.put("at", System.currentTimeMillis());
        notifyListeners("barcode", data);
        if (continuousMode) {
            showStatus("\u062a\u0645\u0627\u0633\u0643 \u0627\u0644\u0645\u0646\u062a\u062c: " + code, false);
        } else {
            showStatus("\u062a\u0645 \u0627\u0644\u0627\u0643\u062a\u0634\u0627\u0641: " + code, false);
        }
    }

    private void showStatus(String message, boolean isError) {
        if (statusView == null) return;
        AppCompatActivity activity = getActivity();
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            if (statusView != null) {
                statusView.setText(message);
                statusView.setTextColor(isError ? 0xFFF87171 : UI_COLOR_TEXT);
            }
        });
    }

    private void toggleTorch() {
        if (camera == null) return;
        boolean next = !torchOn;
        try {
            camera.getCameraControl().enableTorch(next);
            torchOn = next;
        } catch (Exception e) {
            Logger.error(TAG, "Torch toggle failed", e);
        }
        updateTorchUi();
    }

    private void updateTorchUi() {
        if (torchButton == null) return;
        AppCompatActivity activity = getActivity();
        if (activity == null) return;
        boolean hasFlash = activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH);
        activity.runOnUiThread(() -> {
            if (torchButton != null) {
                torchButton.setVisibility(hasFlash ? View.VISIBLE : View.GONE);
                torchButton.setText(torchOn ? "\u0625\u0637\u0641\u0627\u0621 \u0627\u0644\u0625\u0636\u0627\u0621\u0629" : "\u0625\u0636\u0627\u0621\u0629");
            }
        });
    }

    @PluginMethod
    public void setTorch(PluginCall call) {
        boolean enable = Boolean.TRUE.equals(call.getBoolean("enable", false));
        if (camera == null) {
            call.reject("Scanner is not open");
            return;
        }
        try {
            camera.getCameraControl().enableTorch(enable);
            torchOn = enable;
            updateTorchUi();
            JSObject ret = new JSObject();
            ret.put("enabled", torchOn);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to toggle torch: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setZoom(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void setStatus(PluginCall call) {
        String message = call.getString("message");
        if (message == null || message.isEmpty()) {
            call.reject("message is required");
            return;
        }
        boolean isError = Boolean.TRUE.equals(call.getBoolean("isError", false));
        showStatus(message, isError);
        call.resolve();
    }

    @PluginMethod
    public void closeScanner(PluginCall call) {
        closeScannerUi("closed-from-web");
        call.resolve();
    }

    private void closeScannerUi(String reason) {
        notifyListeners("scannerClosed", new JSObject().put("reason", reason));
        releaseCameraQuietly();
        dismissScannerUi();
    }

    private void releaseCameraQuietly() {
        try {
            if (cameraProvider != null) {
                cameraProvider.unbindAll();
            }
        } catch (Exception ignored) {
        }
        try {
            if (analysisExecutor != null) {
                analysisExecutor.shutdown();
            }
        } catch (Exception ignored) {
        }
        analysisExecutor = null;
        try {
            if (mlKitScanner != null) {
                mlKitScanner.close();
            }
        } catch (Exception ignored) {
        }
        mlKitScanner = null;
        camera = null;
        cameraProvider = null;
        scannerOpen = false;
        torchOn = false;
        lastCode = "";
        lastCodeAt = 0L;
        analyzing.set(false);
    }

    @Override
    public void handleOnPause() {
        super.handleOnPause();
        if (scannerOpen) {
            closeScannerUi("activity-paused");
        }
    }

    @Override
    public void handleOnResume() {
        super.handleOnResume();
    }

    @Override
    public void handleOnDestroy() {
        super.handleOnDestroy();
        if (scannerOpen) {
            releaseCameraQuietly();
        }
        try {
            if (toneGenerator != null) {
                toneGenerator.release();
            }
        } catch (Exception ignored) {
        }
        toneGenerator = null;
    }

    private GradientDrawable makePanelBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(0xEE1B1B1B);
        drawable.setCornerRadius(dp(18));
        return drawable;
    }

    private GradientDrawable makeButtonBackground() {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(0x66FFFFFF);
        drawable.setCornerRadius(dp(12));
        return drawable;
    }

    private class GuideOverlayView extends View {
        private final Paint strokePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint hintPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF frameRect = new RectF();
        private String hintText = "";

        GuideOverlayView(Context context) {
            super(context);
            strokePaint.setColor(0xFFF4F4F5);
            strokePaint.setStyle(Paint.Style.STROKE);
            strokePaint.setStrokeWidth(dp(3f));
            strokePaint.setPathEffect(new CornerPathEffect(dp(14f)));
            hintPaint.setColor(0xCCFFFFFF);
            hintPaint.setTextSize(dp(15f));
            hintPaint.setTextAlign(Paint.Align.CENTER);
        }

        void setHint(String text) {
            hintText = text;
            invalidate();
        }

        @Override
        protected void onDraw(@NonNull Canvas canvas) {
            super.onDraw(canvas);
            int w = getWidth();
            int h = getHeight();
            if (w == 0 || h == 0) return;
            float side = Math.min(w * 0.8f, h * 0.45f);
            float left = (w - side) / 2f;
            float top = h * 0.28f;
            frameRect.set(left, top, left + side, top + side);
            canvas.drawRoundRect(frameRect, dp(14f), dp(14f), strokePaint);
            if (!hintText.isEmpty()) {
                canvas.drawText(hintText, w / 2f, top + side + dp(34f), hintPaint);
            }
        }
    }
}
