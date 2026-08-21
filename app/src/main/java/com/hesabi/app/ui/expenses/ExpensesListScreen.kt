package com.hesabi.app.ui.expenses

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.hesabi.app.ui.common.HesabiTopBar
import com.hesabi.app.util.formatDateTime
import com.hesabi.app.util.formatMoney

/**
 * شاشة قائمة المصروفات + زر إضافة مصروف جديد.
 */
@Composable
fun ExpensesListScreen(
    onAddExpense: () -> Unit,
    onBack: () -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val viewModel: ExpensesListViewModel = viewModel(factory = ExpensesListViewModelFactory(app))
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { HesabiTopBar(title = "المصروفات", onBackClick = onBack) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddExpense,
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Rounded.Add, contentDescription = "إضافة مصروف")
            }
        }
    ) { padding ->
        if (state.expenses.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "لا توجد مصروفات مسجلة\nاضغط + لإضافة مصروف",
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
                items(state.expenses, key = { it.id }) { expense ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "${expense.type.label} ${if (expense.description.isNotBlank() && expense.description != expense.type.label) "— ${expense.description}" else ""}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    expense.date.formatDateTime(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                expense.amount.formatMoney(state.currencySymbol),
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(Modifier.width(8.dp))
                            IconButton(onClick = { viewModel.deleteExpense(expense.id) }) {
                                Icon(
                                    Icons.Rounded.Delete,
                                    contentDescription = "حذف المصروف",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(96.dp)) }
            }
        }
    }
}
