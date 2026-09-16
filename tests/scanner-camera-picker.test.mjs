import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getScannerCameraConstraints } from "../client/src/js/scanner-session.js";

test("قيود الكاميرا الافتراضية تفضل الكاميرا الخلفية دون تحديد جهاز", () => {
  const constraints = getScannerCameraConstraints();
  assert.deepEqual(constraints.video.facingMode, { ideal: "environment" });
  assert.equal(constraints.video.deviceId, undefined);
  assert.equal(constraints.audio, false);
});

test("عند اختيار كاميرا محددة تُستخدم deviceId بدقة بدل facingMode", () => {
  const constraints = getScannerCameraConstraints("cam-123");
  assert.deepEqual(constraints.video.deviceId, { exact: "cam-123" });
  assert.equal(constraints.video.facingMode, undefined);
  assert.equal(constraints.video.width.ideal, 1280);
});

test("القيمة الفارغة تعامل كغياب اختيار وتبقي الكاميرا الخلفية", () => {
  const constraints = getScannerCameraConstraints("");
  assert.deepEqual(constraints.video.facingMode, { ideal: "environment" });
  assert.equal(constraints.video.deviceId, undefined);
});

test("واجهة الماسح تضم قائمة اختيار الكاميرا مع تذكر الاختيار والتراجع عند التعطل", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /hesabi-scanner-camera/);
  assert.match(app, /function preferredScannerCameraId/);
  assert.match(app, /function rememberScannerCamera/);
  assert.match(app, /async function listScannerCameras/);
  assert.match(app, /enumerateDevices/);
  assert.match(app, /device\.kind === "videoinput"/);
  assert.match(app, /renderScannerCameraPicker/);
  assert.match(app, /scanner-camera-slot/);
  assert.match(app, /scanner-camera-select/);
  // التراجع: عند فشل الكاميرا المختارة ينسى الاختيار ويجرب الخلفية ثم أي كاميرا
  assert.match(app, /if \(desiredDeviceId\) rememberScannerCamera\(""\)/);
  // القائمة تظهر أيضًا في حالة تعذر فتح الكاميرا ليجرب المستخدم كاميرا أخرى
  assert.match(app, /جرّب كاميرا أخرى من القائمة/);
});

test("الكاميرا لا تُحفظ إلا بعد قراءة ناجحة بها — لا علوق على عدسة لا تقرأ", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  // مفتاح تخزين جديد v2 يتجاهل الاختيار المعطوب المحفوظ بالمنطق القديم
  assert.match(app, /hesabi-scanner-camera-v2/);
  // معالج تغيير القائمة يجرّب الكاميرا فقط ولا يحفظها
  const picker = app.slice(app.indexOf("function renderScannerCameraPicker"), app.indexOf("async function startCameraScanner"));
  assert.doesNotMatch(picker, /rememberScannerCamera\(deviceId\)/, "الاختيار يُحفظ قبل التأكد أن الكاميرا تقرأ — يعلق الماسح على عدسة معطوبة");
  // الحفظ يحدث فقط عند نجاح القراءة داخل حلقة المسح
  assert.match(app, /if \(code\) \{\n[\s\S]{0,220}if \(activeDeviceId\) rememberScannerCamera\(activeDeviceId\);/, "لا حفظ للكاميرا بعد أول قراءة ناجحة");
});

test("القائمة لا تظهر إلا عند وجود أكثر من كاميرا", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /cameras\.length < 2\) return/);
});

test("أنماط CSS لقائمة الكاميرا موجودة مع دعم الوضع الداكن", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\.scanner-camera-picker \{/);
  assert.match(css, /\.scanner-camera-picker select/);
  assert.match(css, /\[data-theme="dark"\] \.scanner-camera-picker/);
});

test("نافذة المسح المتواصل بلا نص وصفي والوصف اختياري في القالب", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /أضف عدة منتجات إلى السلة في جلسة واحدة/);
  assert.doesNotMatch(app, /المسح المتواصل مفعّل: أبعد الرمز/);
  assert.match(app, /\$\{description \? `<p class="dialog__subtext">\$\{description\}<\/p>` : ""\}/);
});

test("نافذة الكاميرا أقصر مع تكيف إضافي للشاشات القصيرة", async () => {
  const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
  assert.match(css, /\.scanner-box \{ aspect-ratio:16\/10; max-height:min\(46vh, 340px\); \}/);
  assert.match(css, /@media \(max-height:700px\)/);
});

test("تسميات الكاميرات عربية وتميز الجهة والعدسة وترقم كاميرات نفس الجهة", async () => {
  const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
  assert.match(app, /back\|rear\|environment\|خلفي/);
  assert.match(app, /front\|user\|selfie\|أمامي/);
  assert.match(app, /فائقة العرض/);
  assert.match(app, /مقربة/);
  assert.match(app, /ماكرو/);
  assert.match(app, /scannerCameraLabel\(camera, index, cameras\)/);
});
