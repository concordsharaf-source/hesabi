package com.hesabi.app.ui.inventory

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.StockMovement
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatQuantity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun StockMovementScreen(
    onBack: () -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val movements by app.stockMovementDao.observeAll().collectAsStateWithLifecycle(emptyList())

    Scaffold(
        topBar = { HesabiTopBar(title = "حركة المخزون (Audit Trail)", onBackClick = onBack) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(movements, key = { it.id }) { movement ->
                MovementItem(movement)
            }
        }
    }
}

@Composable
private fun MovementItem(movement: StockMovement) {
    val dateFormat = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.getDefault())
    val dateStr = dateFormat.format(Date(movement.date))

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = when(movement.type) {
                        MovementType.INITIAL -> "رصيد أول المدة"
                        MovementType.PURCHASE -> "شراء"
                        MovementType.SALE -> "بيع"
                        MovementType.ADJUSTMENT -> "تعديل يدوي"
                        MovementType.PURCHASE_RETURN -> "مرتجع شراء"
                        MovementType.SALE_RETURN -> "مرتجع بيع"
                    },
                    style = MaterialTheme.typography.labelLarge,
                    color = when(movement.type) {
                        MovementType.SALE, MovementType.PURCHASE_RETURN -> MaterialTheme.colorScheme.error
                        else -> MaterialTheme.colorScheme.primary
                    }
                )
                Text(dateStr, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(4.dp))
            Text("الكمية: ${movement.quantity.formatQuantity()}", fontWeight = FontWeight.Bold)
            Text("السابق: ${movement.previousQuantity.formatQuantity()} -> الجديد: ${movement.newQuantity.formatQuantity()}", 
                style = MaterialTheme.typography.bodySmall)
            if (!movement.note.isNullOrBlank()) {
                Text("ملاحظة: ${movement.note}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
