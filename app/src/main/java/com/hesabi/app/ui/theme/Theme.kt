package com.hesabi.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.hesabi.app.R

// ألوان التطبيق الأساسية — أخضر تجاري احترافي
private val GreenPrimary = Color(0xFF1B5E20)
private val GreenSecondary = Color(0xFF2E7D32)
private val GreenTertiary = Color(0xFFA5D6A7)

private val LightColorScheme = lightColorScheme(
    primary = GreenPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFC8E6C9),
    onPrimaryContainer = Color(0xFF0D3311),
    secondary = GreenSecondary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE8F5E9),
    onSecondaryContainer = Color(0xFF1B3B1F),
    tertiary = GreenTertiary,
    background = Color(0xFFFAFCF9),
    onBackground = Color(0xFF1A1C1A),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1A1C1A),
    surfaceVariant = Color(0xFFF1F5F0),
    onSurfaceVariant = Color(0xFF44494A),
    outline = Color(0xFFD7E2D4),
    error = Color(0xFFB3261E),
    onError = Color.White
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF81C784),
    onPrimary = Color(0xFF0A2E10),
    primaryContainer = Color(0xFF1B5E20),
    onPrimaryContainer = Color(0xFFC8E6C9),
    secondary = Color(0xFFA5D6A7),
    onSecondary = Color(0xFF1B3B1F),
    secondaryContainer = Color(0xFF2E4A2E),
    onSecondaryContainer = Color(0xFFD5E9D2),
    background = Color(0xFF121412),
    onBackground = Color(0xFFE3E5E1),
    surface = Color(0xFF1A1C1A),
    onSurface = Color(0xFFE3E5E1),
    surfaceVariant = Color(0xFF252A25),
    onSurfaceVariant = Color(0xFFBFC8C0),
    outline = Color(0xFF3F4540),
    error = Color(0xFFF2B8B5),
    onError = Color(0xFF601410)
)

val AppFontFamily = FontFamily(
    Font(R.font.tajawal_regular, FontWeight.Normal),
    Font(R.font.tajawal_medium, FontWeight.Medium),
    Font(R.font.tajawal_bold, FontWeight.Bold)
)

@Composable
fun HesabiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
