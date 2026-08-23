package com.hesabi.app.data.repository

import com.hesabi.app.data.dao.UserDao
import com.hesabi.app.domain.model.User
import com.hesabi.app.domain.model.UserRole
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

class UserRepository(private val userDao: UserDao) {

    fun getAllActive(): Flow<List<User>> = userDao.getAllActive()

    suspend fun getByUsername(username: String): User? = userDao.getByUsername(username)

    suspend fun getById(id: Long): User? = userDao.getById(id)

    suspend fun saveUser(user: User): Long {
        return if (user.id == 0L) {
            userDao.insert(user)
        } else {
            userDao.update(user)
            user.id
        }
    }

    suspend fun deleteUser(user: User) {
        userDao.update(user.copy(isActive = false))
    }

    suspend fun hasUsers(): Boolean = userDao.count() > 0

    suspend fun createFirstAdminIfNeeded() {
        if (userDao.count() == 0) {
            val salt = generateSalt()
            userDao.insert(
                User(
                    username = "admin",
                    passwordHash = hashPin("1234", salt),
                    passwordSalt = salt,
                    fullName = "مدير النظام",
                    role = UserRole.ADMIN,
                    mustChangePassword = true
                )
            )
        }
    }

    fun hashPin(pin: String, salt: String): String {
        val bytes = (pin + salt).toByteArray()
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        return Base64.getEncoder().encodeToString(digest)
    }

    fun generateSalt(): String {
        val random = SecureRandom()
        val salt = ByteArray(16)
        random.nextBytes(salt)
        return Base64.getEncoder().encodeToString(salt)
    }

    suspend fun authenticate(username: String, pin: String): User? {
        val user = userDao.getByUsername(username) ?: return null
        if (!user.isActive) return null
        
        // دعم تسجيل الدخول القديم (بدون salt) للمهاجرة السلسة إذا لزم الأمر
        if (user.passwordSalt.isEmpty()) {
            if (user.passwordHash == pin) {
                // تحديث المستخدم لاستخدام التشفير الجديد فوراً
                val newSalt = generateSalt()
                val updatedUser = user.copy(
                    passwordHash = hashPin(pin, newSalt),
                    passwordSalt = newSalt,
                    updatedAt = System.currentTimeMillis()
                )
                userDao.update(updatedUser)
                return updatedUser
            }
            return null
        }

        val hashed = hashPin(pin, user.passwordSalt)
        return if (user.passwordHash == hashed) user else null
    }
}
