# Keep Room entities and migrations intact
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *

# Keep entities' fields for Room reflection (using KSP, but safe)
-keepnames class com.hesabi.app.domain.model.**

# ML Kit
-keep class com.google.mlkit.** { *; }
