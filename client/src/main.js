/* اتجاه التصميم: دفتر التاجر الهادئ — تشغيل يومي عربي واضح، دافئ، وموجّه للأرقام. */
import "./style.css";
import { bootApp } from "./js/app.js";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch((error) => {
    console.warn("تعذر تسجيل عامل الخدمة", error);
  });
}

bootApp(document.querySelector("#app"));
