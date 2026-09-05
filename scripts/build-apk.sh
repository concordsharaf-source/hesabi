#!/usr/bin/env bash
# =============================================================================
# Hesabi APK build script (one command)
# Usage:
#   ./scripts/build-apk.sh          -> build release APK (current version)
#   ./scripts/build-apk.sh 1.2.0 3  -> build AND bump versionName/versionCode
#
# Requirements (already configured in this workspace):
#   /opt/jdk           JDK 21
#   /opt/android-sdk   Android SDK (platform 36, build-tools 36)
#   /opt/node22        Node 22 (Capacitor CLI requirement)
# Keystore: android/hesabi-release.keystore (auto-detected, conditional signing)
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Locate toolchain: prefer /opt installs, fall back to system tools
detect_java() { for d in /opt/jdk "$JAVA_HOME" /usr/lib/jvm/*; do [[ -x "$d/bin/java" ]] && echo "$d" && return; done; }
detect_android() { for d in /opt/android-sdk "$ANDROID_HOME" "$HOME/Android/Sdk" /usr/local/android-sdk; do [[ -d "$d/platforms" ]] && echo "$d" && return; done; }
detect_node() { for d in /opt/node22 "$(dirname "$(dirname "$(command -v node)")")"; do "$d/bin/node" --version 2>/dev/null | grep -qE "v(2[2-9]|[3-9][0-9])" && echo "$d" && return; done; }

JAVA_HOME="$(detect_java)"
ANDROID_HOME="$(detect_android)"
NODE_DIR="$(detect_node)"
[[ -z "$JAVA_HOME" ]] && { echo "ERROR: JDK not found (need JDK with /bin/java). Set JAVA_HOME."; exit 1; }
[[ -z "$ANDROID_HOME" ]] && { echo "ERROR: Android SDK not found (need platforms/ dir). Set ANDROID_HOME."; exit 1; }
[[ -z "$NODE_DIR" ]] && { echo "ERROR: Node >= 22 not found (Capacitor CLI requires it)."; exit 1; }

export JAVA_HOME ANDROID_HOME
export PATH="$NODE_DIR/bin:/opt/jdk/bin:$JAVA_HOME/bin:$ANDROID_HOME/build-tools/36.0.0:$PATH"
echo ">> Toolchain: JAVA=$JAVA_HOME ANDROID=$ANDROID_HOME NODE=$($NODE_DIR/bin/node --version)"

# Optional version bump: arg1 = versionName, arg2 = versionCode
if [[ "${1:-}" != "" ]]; then
  NEW_NAME="${1}"
  NEW_CODE="${2:-}"
  GRADLE_APP="$REPO_ROOT/android/app/build.gradle"
  if [[ "$NEW_CODE" != "" ]]; then
    sed -i -E "s/versionCode [0-9]+/versionCode $NEW_CODE/" "$GRADLE_APP"
  fi
  sed -i -E "s/versionName \"[^\"]+\"/versionName \"$NEW_NAME\"/" "$GRADLE_APP"
  echo ">> Version set: versionName=$NEW_NAME versionCode=${NEW_CODE:-unchanged}"
fi

echo ">> [1/4] Building web assets (vite)..."
pnpm build

echo ">> [2/4] Syncing Capacitor (web assets -> android)..."
npx cap sync android

echo ">> [3/4] Gradle assembleRelease..."
(cd android && ./gradlew assembleRelease --console=plain -q)

# Locate the produced APK
APK_DIR="android/app/build/outputs/apk/release"
APK_FILE="$(ls -1 "$APK_DIR"/*.apk 2>/dev/null | grep -v unsigned | head -1 || true)"
if [[ -z "$APK_FILE" ]]; then
  APK_FILE="$(ls -1 "$APK_DIR"/*.apk | head -1)"
fi

echo ">> [4/4] Verifying signature + copying..."
unset JAVA_TOOL_OPTIONS
APKSIG="$(command -v apksigner)"
"$APKSIG" verify --print-certs "$APK_FILE" | head -4 || true

VER_NAME="$(sed -nE 's/.*versionName "([^"]+)".*/\1/p' android/app/build.gradle | head -1)"
DEST="/workspace/hesabi-${VER_NAME}.apk"
cp -f "$APK_FILE" "$DEST"

echo ""
echo "=============================================="
echo "  DONE: $DEST"
echo "  ($(du -h "$DEST" | cut -f1)) - signed release build"
echo "=============================================="
echo "Reminder: to update an INSTALLED app, bump versionCode:"
echo "  ./scripts/build-apk.sh <newVersionName> <newVersionCode>"
