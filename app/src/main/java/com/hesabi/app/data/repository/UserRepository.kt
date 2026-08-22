package com.hesabi.app.data.repository

import com.hesabi.app.data.dao.UserDao
import com.hesabi.app.domain.model.User
import com.hesabi.app.domain.model.UserRole
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull

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
            userDao.insert(
                User(
                    username = "admin",
                    passwordHash = "1234", // PIN افتراضي بسيط
                    fullName = "مدير النظام",
                    role = UserRole.ADMIN
                )
            )
        }
    }
}
