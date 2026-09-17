/* بوابة التثبيت: التطبيق يعمل مثبتًا فقط (PWA/أندرويد/سطح المكتب) — المتصفح العادي يرى شاشة تثبيت إرشادية.
   - وضع standalone أو fullscreen أو minimal-ui أو navigator.standalone (iOS) => مثبت.
   - أغلفة Capacitor (أندرويد) وTauri (ويندوز) ليست متصفحًا => تمر دائمًا.
   - أندرويد/كروم/إيدج: التقاط beforeinstallprompt وربطه بزر «تثبيت التطبيق».
   - iOS سفاري: لا يوجد beforeinstallprompt => إخفاء الزر وعرض خطوات «إضافة إلى الشاشة الرئيسية». */

const STANDALONE_QUERIES = ["(display-mode: standalone)", "(display-mode: fullscreen)", "(display-mode: minimal-ui)", "(display-mode: window-controls-overlay)"];

export const isStandaloneDisplay = () =>
  STANDALONE_QUERIES.some((query) => window.matchMedia?.(query)?.matches) || window.navigator.standalone === true;

/* أغلفة التطبيق الأصلية: Capacitor على أندرويد وTauri على سطح المكتب — ليست "متصفحًا" ولا تُحجب أبدًا. */
export const isNativeShell = () => Boolean(window.Capacitor || window.__TAURI__ || window.__TAURI_INTERNALS__);

/* iPadOS الحديثة تعرّف نفسها MacIntel لكن بشاشة لمس. */
export const isIosSafari = () => {
  const ua = window.navigator.userAgent || "";
  const iosDevice = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iosDevice && !window.MSStream;
};

export const shouldBlockBrowserAccess = () => {
  if (import.meta.env.DEV) return false; /* بيئة التطوير لا تُحجب */
  if (isNativeShell()) return false;
  return !isStandaloneDisplay();
};

export function mountInstallGate() {
  const appContent = document.querySelector("#app-content");
  const screen = document.querySelector("#install-screen");
  if (!screen) return;
  if (appContent) appContent.hidden = true;
  screen.hidden = false;
  document.documentElement.classList.add("is-install-gated");

  const installButton = screen.querySelector("#install-app-btn");
  const iosSteps = screen.querySelector("#ios-install-steps");
  const manualNote = screen.querySelector("#manual-install-note");
  const doneNote = screen.querySelector("#install-done-note");

  if (isIosSafari()) {
    /* iOS: لا beforeinstallprompt — نخفي الزر ونعرض الخطوات المصوّرة. */
    if (installButton) installButton.hidden = true;
    if (iosSteps) iosSteps.hidden = false;
    return;
  }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) { installButton.hidden = false; installButton.disabled = false; }
    if (manualNote) manualNote.hidden = true;
  });

  installButton?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    installButton.disabled = true;
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome !== "accepted") installButton.disabled = false;
    } catch { installButton.disabled = false; }
    deferredPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    if (installButton) installButton.hidden = true;
    if (manualNote) manualNote.hidden = true;
    if (doneNote) doneNote.hidden = false;
  });

  /* إن لم يصل الحدث خلال ثوانٍ (متصفح لا يدعمه أو التطبيق مثبت سابقًا) نعرض الإرشاد اليدوي. */
  window.setTimeout(() => {
    if (!deferredPrompt && installButton?.hidden !== false && manualNote) manualNote.hidden = false;
  }, 3500);
}
