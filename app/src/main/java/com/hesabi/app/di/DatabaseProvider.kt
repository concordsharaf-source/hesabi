package com.hesabi.app.di

import android.content.Context
import androidx.room.Room
import com.hesabi.app.data.db.AppDatabase
import com.hesabi.app.data.db.MIGRATION_1_2
import com.hesabi.app.data.db.MIGRATION_2_3
import com.hesabi.app.data.db.MIGRATION_3_4
import com.hesabi.app.data.db.MIGRATION_4_5
import com.hesabi.app.data.db.MIGRATION_5_6
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
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6)
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
