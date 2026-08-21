package com.hesabi.app.ui.common

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

/**
 * شاشة مسح الباركود — تعمل بالكامل بدون إنترنت عبر ML Kit.
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
    val scanned = remember { java.util.concurrent.atomic.AtomicBoolean(false) }

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

                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    CameraSelector.DEFAULT_BACK_CAMERA,
                                    preview,
                                    imageAnalysis
                                )
                            } catch (e: Exception) {
                                // فشل الكاميرا — العودة
                                previewView.post { onCancel() }
                            }
                        }, context.mainExecutor)
                }
        )

        // تلميح علوي
        Text(
            "وجّه الكاميرا نحو الباركود",
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 48.dp),
            style = MaterialTheme.typography.bodyLarge,
            color = androidx.compose.ui.graphics.Color.White,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )

        // زر الإلغاء
        androidx.compose.material3.TextButton(
            onClick = onCancel,
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Text("إلغاء", color = androidx.compose.ui.graphics.Color.White)
        }
    }
}

private fun processImage(
    imageProxy: ImageProxy,
    analyzer: com.google.mlkit.vision.barcode.BarcodeScanner,
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
