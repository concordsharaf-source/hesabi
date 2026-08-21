package com.hesabi.app.ui.common

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import com.hesabi.app.HesabiApp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack

/**
 * الوصول لمكونات التطبيق من داخل Compose.
 */
@Composable
fun androidx.lifecycle.ViewModel.app(): HesabiApp {
    return androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
}

/**
 * شريط علوي موحد لكل الشاشات.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HesabiTopBar(
    title: String,
    modifier: Modifier = Modifier,
    onBackClick: (() -> Unit)? = null,
    actions: @Composable () -> Unit = {}
) {
    TopAppBar(
        title = {
            Text(
                text = title,
                modifier = Modifier.fillMaxSize(),
                textAlign = TextAlign.Center,
                style = androidx.compose.material3.MaterialTheme.typography.titleMedium
            )
        },
        modifier = modifier,
        navigationIcon = {
            if (onBackClick != null) {
                androidx.compose.material3.IconButton(onClick = onBackClick) {
                    androidx.compose.material3.Icon(
                        Icons.AutoMirrored.Rounded.ArrowBack,
                        contentDescription = "رجوع"
                    )
                }
            }
        },
        actions = { actions() },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface,
            titleContentColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurface
        )
    )
}
