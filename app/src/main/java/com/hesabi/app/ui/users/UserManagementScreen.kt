package com.hesabi.app.ui.users

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.model.User
import com.hesabi.app.domain.model.UserRole
import com.hesabi.app.ui.common.HesabiTopBar
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserManagementScreen(
    onBack: () -> Unit
) {
    val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as HesabiApp
    val userRepository = app.userRepository
    val users by userRepository.getAllActive().collectAsStateWithLifecycle(initialValue = emptyList())
    val scope = rememberCoroutineScope()
    
    var showAddDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { HesabiTopBar(title = "إدارة المستخدمين", onBackClick = onBack) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Rounded.Add, contentDescription = "إضافة مستخدم")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(users) { user ->
                UserItemRow(user = user, onDelete = {
                    scope.launch { userRepository.deleteUser(user) }
                })
            }
        }
    }

    if (showAddDialog) {
        AddUserDialog(
            onDismiss = { showAddDialog = false },
            onAdd = { username, fullName, pin, role ->
                scope.launch {
                    userRepository.saveUser(
                        User(
                            username = username,
                            fullName = fullName,
                            passwordHash = pin,
                            role = role
                        )
                    )
                }
                showAddDialog = false
            }
        )
    }
}

@Composable
private fun UserItemRow(user: User, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Rounded.Person, contentDescription = null, modifier = Modifier.size(40.dp))
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(user.fullName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("${user.role.label} (@${user.username})", style = MaterialTheme.typography.bodySmall)
            }
            if (user.username != "admin") {
                IconButton(onClick = onDelete) {
                    Icon(Icons.Rounded.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
private fun AddUserDialog(onDismiss: () -> Unit, onAdd: (String, String, String, UserRole) -> Unit) {
    var username by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var role by remember { mutableStateOf(UserRole.CASHIER) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("إضافة مستخدم جديد") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = fullName, onValueChange = { fullName = it }, label = { Text("الاسم الكامل") })
                OutlinedTextField(value = username, onValueChange = { username = it }, label = { Text("اسم المستخدم") })
                OutlinedTextField(value = pin, onValueChange = { pin = it }, label = { Text("رقم PIN") })
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = role == UserRole.ADMIN, onClick = { role = UserRole.ADMIN })
                    Text("مدير")
                    Spacer(Modifier.width(16.dp))
                    RadioButton(selected = role == UserRole.CASHIER, onClick = { role = UserRole.CASHIER })
                    Text("كاشير")
                }
            }
        },
        confirmButton = {
            Button(onClick = { onAdd(username, fullName, pin, role) }, enabled = username.isNotBlank() && pin.isNotBlank()) {
                Text("إضافة")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("إلغاء") } }
    )
}
