package com.hesabi.app.ui.common

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

/**
 * شاشة مسح الباركود — تعمل بالكامل بدون إنترنت عبر ML Kit.
 *
 * ملاحظات الاستقرار:
 * - تطلب إذن الكاميرا قبل فتحها؛ عند الرفض تظهر رسالة بديلة.
 * - تتحقق من توفر الكاميرا الخلفية أصلًا (أجهزة بدون كاميرا/محاكيات).
 * - أي فشل داخلي يعرض رسالة داخل التطبيق بدل الخروج المفاجئ.
 *
 * @param onBarcodeDetected تُستدعى مرة واحدة عند نجاح المسح
 * @param onCancel إلغاء المسح والرجوع
 */
@SuppressLint("UnsafeOptInUsageError")
@Composable
fun BarcodeScannerScreen(
    onBarcodeDetected: (String) -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    // 1. التحقق من توفر كاميرا خلفية أصلًا (أجهزة بلا كاميرا / محاكيات)
    val cameraAvailable = remember { isBackCameraAvailable(context) }

    // 2. التحقق من منح الإذن
    var permissionGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    // 3. launcher لطلب الإذن عند الحاجة
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        permissionGranted = granted
    }

    LaunchedEffect(Unit) {
        when {
            !cameraAvailable -> Unit // رسالة بديلة
            !permissionGranted -> permissionLauncher.launch(Manifest.permission.CAMERA)
            else -> Unit // الإذن ممنوح — فتح الكاميرا
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim)
    ) {
        when {
            !cameraAvailable -> {
                FallbackMessage(
                    title = "الكاميرا غير متوفرة",
                    message = "هذا الجهاز لا يحتوي على كاميرا خلفية قابلة للمسح. يمكنك إدخال الباركود يدويًا في حقل الباركود."
                )
            }
            !permissionGranted -> {
                FallbackMessage(
                    title = "إذن الكاميرا مطلوب",
                    message = "لمسح الباركود نحتاج إذن الكاميرا. وافق عليه من نافذة النظام وارجع إلى هنا، أو استخدم الإدخال اليدوي في حقل الباركود."
                )
            }
            else -> {
                ScannerSurface(
                    context = context,
                    lifecycleOwner = lifecycleOwner,
                    onBarcodeDetected = onBarcodeDetected,
                    onCancel = onCancel
                )
            }
        }
    }
}

/**
 * رسالة بديلة مع زر رجوع — تظهر عند تعذر فتح الكاميرا بدل الخروج المفاجئ.
 */
@Composable
private fun FallbackMessage(title: String, message: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            title,
            style = MaterialTheme.typography.headlineSmall,
            color = Color.White
        )
        Spacer(Modifier.height(12.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.85f),
            textAlign = TextAlign.Center
        )
        Text(
            "اضغط إلغاء للرجوع وإدخال الباركود يدويًا",
            modifier = Modifier.padding(top = 20.dp),
            style = MaterialTheme.typography.bodySmall,
            color = Color.White.copy(alpha = 0.7f)
        )
    }
}

/**
 * التحقق من وجود كاميرا خلفية.
 */
private fun isBackCameraAvailable(context: Context): Boolean {
    val pm = context.packageManager
    if (!pm.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) return false
    return try {
        val manager = context.getSystemService(Context.CAMERA_SERVICE) as? android.hardware.camera2.CameraManager
            ?: return true
        manager.cameraIdList.any { id ->
            manager.getCameraCharacteristics(id)
                .get(android.hardware.camera2.CameraCharacteristics.LENS_FACING) ==
                android.hardware.camera2.CameraCharacteristics.LENS_FACING_BACK
        }
    } catch (e: Exception) {
        true // عند أي خطأ في الفحص نترك الشيك الداخلي يتعامل معه
    }
}

/**
 * سطح المعاينة والتحليل — يُفتح فقط بعد منح الإذن وتوفر الكاميرا.
 */
@SuppressLint("UnsafeOptInUsageError")
@Composable
private fun ScannerSurface(
    context: Context,
    lifecycleOwner: androidx.lifecycle.LifecycleOwner,
    onBarcodeDetected: (String) -> Unit,
    onCancel: () -> Unit
) {
    val scanned = remember { java.util.concurrent.atomic.AtomicBoolean(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    if (errorMessage != null) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                "تعذّر فتح الكاميرا",
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White
            )
            Spacer(Modifier.height(8.dp))
            Text(
                errorMessage ?: "",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.85f),
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(16.dp))
            Button(onClick = onCancel) { Text("رجوع") }
        }
        return
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // معاينة الكاميرا
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }
            },
            modifier = Modifier.fillMaxSize(),
            update = { previewView ->
                val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
                cameraProviderFuture.addListener({
                    try {
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                        val imageAnalysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()

                        val analyzer = BarcodeScanning.getClient()

                        imageAnalysis.setAnalyzer(
                            Executors.newSingleThreadExecutor()
                        ) { imageProxy: ImageProxy ->
                            processImage(imageProxy, analyzer) { barcodeValue ->
                                if (!scanned.getAndSet(true)) {
                                    previewView.post {
                                        onBarcodeDetected(barcodeValue)
                                    }
                                }
                            }
                        }

                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_BACK_CAMERA,
                                preview,
                                imageAnalysis
                            )
                        } catch (e: Exception) {
                            previewView.post {
                                errorMessage = "تعذر ربط الكاميرا: ${e.localizedMessage}"
                            }
                        }
                    } catch (e: Exception) {
                        // فشل داخلي — عرض رسالة داخل التطبيق بدل الخروج
                        previewView.post {
                            errorMessage = e.message ?: "فشل فتح الكاميرا"
                        }
                    }
                }, ContextCompat.getMainExecutor(context))
            }
        )

        // تلميح علوي
        Text(
            "وجّه الكاميرا نحو الباركود",
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 48.dp),
            style = MaterialTheme.typography.bodyLarge,
            color = Color.White,
            textAlign = TextAlign.Center
        )

        // زر الإلغاء
        TextButton(
            onClick = onCancel,
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Text("إلغاء", color = Color.White)
        }
    }
}

private fun processImage(
    imageProxy: ImageProxy,
    analyzer: BarcodeScanner,
    onResult: (String) -> Unit
) {
    val mediaImage = imageProxy.image
    if (mediaImage != null) {
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        analyzer.process(image)
            .addOnSuccessListener { barcodes ->
                val value = barcodes.firstOrNull()?.rawValue
                if (!value.isNullOrBlank()) {
                    onResult(value)
                }
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    } else {
        imageProxy.close()
    }
}
