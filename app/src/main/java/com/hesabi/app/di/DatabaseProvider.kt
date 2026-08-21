package com.hesabi.app.di

import android.content.Context
import androidx.room.Room
import com.hesabi.app.data.db.AppDatabase
import java.util.concurrent.atomic.AtomicReference

/**
 * مزود قاعدة البيانات (بديل بسيط لـ Hilt).
 * Singleton يضمن وجود نسخة واحدة من AppDatabase طوال عمر التطبيق.
 */
object DatabaseProvider {

    private val instanceRef = AtomicReference<AppDatabase?>(null)

    fun get(context: Context): AppDatabase {
        instanceRef.get()?.let { return it }
        synchronized(this) {
            instanceRef.get()?.let { return it }
            val db = Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                "hesabi_database"
            )
                .fallbackToDestructiveMigration()
                .build()
            instanceRef.set(db)
            return db
        }
    }

    /** للتحميل السريع داخل الاختبارات */
    fun getInMemory(context: Context): AppDatabase {
        synchronized(this) {
            val db = Room.inMemoryDatabaseBuilder(
                context.applicationContext,
                AppDatabase::class.java
            ).allowMainThreadQueries().build()
            instanceRef.set(db)
            return db
        }
    }

    fun clear() {
        instanceRef.set(null)
    }
}
