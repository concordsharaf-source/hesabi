package com.hesabi.app.ui.inventory

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.Product
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatMoney
import com.hesabi.app.util.formatQuantity
import com.hesabi.app.ui.inventory.InventoryViewModelFactory

/**
 * شاشة المخزون — تعرض لكل منتج:
 * الاسم، الكمية، الوحدة، سعر الشراء، قيمة المخزون، حالة المخزون.
 */
@Composable
fun InventoryScreen(
    onProductClick: (Long) -> Unit,
    
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: InventoryViewModel = viewModel(factory = InventoryViewModelFactory(app))

    val products by viewModel.products.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { HesabiTopBar(title = "المخزون") }
    ) { padding ->
        if (products.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "لا توجد منتجات في المخزون",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(products, key = { it.id }) { product ->
                    InventoryCard(
                        product = product,
                        onClick = { onProductClick(product.id) }
                    )
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
private fun InventoryCard(product: Product, onClick: () -> Unit) {
    val status = when {
        product.quantity <= 0 -> StockStatus.OUT_OF_STOCK
        product.quantity <= product.minQuantity -> StockStatus.LOW
        else -> StockStatus.AVAILABLE
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        product.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        "${product.quantity.formatQuantity()} ${product.unit}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                StatusChip(status)
            }
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    "سعر الشراء: ${product.purchasePrice.formatMoney()}",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    "قيمة المخزون: ${(product.purchasePrice * product.quantity.toLong()).formatMoney()}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

enum class StockStatus(val label: String) {
    AVAILABLE("متوفر"),
    LOW("منخفض"),
    OUT_OF_STOCK("نافد")
}

@Composable
private fun StatusChip(status: StockStatus) {

    val (color, backgroundColor) = when (status) {
        StockStatus.AVAILABLE ->
            MaterialTheme.colorScheme.onSurface to MaterialTheme.colorScheme.secondaryContainer
        StockStatus.LOW ->
            MaterialTheme.colorScheme.tertiary to MaterialTheme.colorScheme.surfaceVariant
        StockStatus.OUT_OF_STOCK ->
            MaterialTheme.colorScheme.onError to MaterialTheme.colorScheme.errorContainer
    }
    Card(
        colors = CardDefaults.cardColors(containerColor = backgroundColor)
    ) {
        Text(
            status.label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}
