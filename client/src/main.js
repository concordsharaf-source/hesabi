/* اتجاه التصميم: دفتر التاجر الهادئ — تشغيل يومي عربي واضح، دافئ، وموجّه للأرقام. */
import "./style.css";
/* طبقة تصميم «حاسب» البصرية (ألوان، خط، بطاقات، أزرار، تنقل) — بعد style.css لتكون لها الأولوية */
import "./theme-haseb.css";
import { bootApp } from "./js/app.js";

if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    /* وضع التطوير: أزل أي عامل خدمة وكاش سابق حتى لا تُعرض نسخة قديمة من الكود بدل التعديلات الجارية. */
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => (typeof caches === "undefined" ? [] : caches.keys()))
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch((error) => console.warn("تعذر تنظيف عامل الخدمة في وضع التطوير", error));
  } else {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("تعذر تسجيل عامل الخدمة", error);
    });
  }
}

const appRoot = document.querySelector("#app");
bootApp(appRoot);

/* حماية من الصفحة الفارغة: إن لم يظهر أي محتوى خلال 12 ثانية (تخزين محجوب أو إطار معاينة مقيّد)
   نعرض رسالة عربية واضحة بدل شاشة بيضاء صامتة. */
window.setTimeout(() => {
  if (!appRoot || appRoot.childElementCount) return;
  appRoot.innerHTML = `<main class="fatal-state"><h1>لم يبدأ حسابي على هذه الصفحة</h1><p>يحدث هذا غالبًا داخل معاينة مقيّدة لا تسمح بحفظ البيانات المحلية. افتح التطبيق في تبويب مستقل من المتصفح ثم أعد المحاولة.</p><button class="button button--primary" onclick="location.reload()">إعادة المحاولة</button></main>`;
}, 12000);
