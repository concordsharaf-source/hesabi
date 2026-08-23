package com.hesabi.app.domain

import com.hesabi.app.data.repository.UserRepository
import com.hesabi.app.domain.model.User
import com.hesabi.app.domain.model.UserRole
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

sealed class AuthResult {
    data class Success(val user: User) : AuthResult()
    data class Failure(val message: String) : AuthResult()
}

class AuthUseCase(private val userRepository: UserRepository) {

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    suspend fun login(username: String, pin: String): AuthResult {
        val user = userRepository.authenticate(username, pin)
        return if (user != null) {
            _currentUser.value = user
            AuthResult.Success(user)
        } else {
            AuthResult.Failure("اسم المستخدم أو رقم PIN غير صحيح")
        }
    }

    fun logout() {
        _currentUser.value = null
    }

    fun isAdmin(): Boolean = _currentUser.value?.role == UserRole.ADMIN

    fun isLoggedIn(): Boolean = _currentUser.value != null
}
