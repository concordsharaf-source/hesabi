import path from "node:path";
import { defineConfig } from "vite";

/* حسابي تطبيق ويب ثابت (PWA): لا خادم ولا إطار عمل ولا TypeScript في الواجهة.
   نقطة الدخول client/index.html → /src/main.js → وحدات ES في client/src/js/.
   المخرجات في dist/public لأن capacitor.config.ts وvercel.json يشيران إليها. */

/* Vercel يحقن تلقائيًا كل متغيراته ببادئة VITE_، وفيت ينسخ كل ما بادئته VITE_ إلى
   الحزمة المشحونة للمتصفح. النتيجة كانت تسريب 19 متغيرًا لا يستخدمها التطبيق:
   معرّف المشروع ومعرّف المستودع والمالك واسم صاحب الالتزام ورسالته ورابط النشر.

   والأثر العملي أخطر من الخصوصية: رسالة الالتزام تدخل ضمن محتوى الحزمة، فأي دفع
   يغيّر اسم ملف index-*.js حتى لو لم تتغير الشيفرة. هذا يُبطل كاش المتصفح وعامل
   الخدمة بلا سبب، ويُصعّب التحقق من النشر بمقارنة أسماء الحزم.

   لذلك يُنسخ المتغيران اللذان تستعملهما الشيفرة فعلًا وحدهما:
     VITE_PUSH_VAPID_PUBLIC_KEY  — app.js
     VITE_FIREBASE_CONFIG_JSON   — firebase-sync.js وfirebase-backup.js
   وتُترك مفاتيح فيت القياسية (DEV وPROD وMODE وBASE_URL وSSR) لفيت نفسه،
   فهي لا تحمل بيانات نشر ولا تتغير بين الالتزامات. */
const PUBLIC_ENV_PREFIX = "VITE_";
const ALLOWED_ENV_KEYS = ["VITE_PUSH_VAPID_PUBLIC_KEY", "VITE_FIREBASE_CONFIG_JSON"];

/* تُنسخ المتغيرات المسموحة وحدها إلى الحزمة. التعريف لكل متغير على حدة لا لكائن
   import.meta.env كله: فيت يبني ذلك الكائن من متغيرات البيئة المحمّلة ويحقنه هو،
   فتعريف الكائن كاملًا لا يمنعه (يُدمج ما حقنناه مع ما حقنه). أما تعريف المفتاح
   المحدد فيُستبدل نصيًا في موضع استعماله ولا يبقى في الكائن.

   ملاحظة: لا يجوز إفراغ envPrefix، لأنه يمنع تحميل .env أصلًا فيسقط
   VITE_FIREBASE_CONFIG_JSON وVITE_PUSH_VAPID_PUBLIC_KEY من الحزمة صامتًا. */
const definePublicEnv = () => {
  const exposed: Record<string, string> = {};
  for (const key of ALLOWED_ENV_KEYS) {
    if (!key.startsWith(PUBLIC_ENV_PREFIX)) continue; /* حارس: لا يُنسخ ما ليس عامًّا بطبيعته */
    exposed[`import.meta.env.${key}`] = JSON.stringify(process.env[key] ?? "");
  }
  return exposed;
};

export default defineConfig(() => ({
  define: definePublicEnv(),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  envDir: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist", "public"),
    emptyOutDir: true,
    /* الحزم الثقيلة ثابتة بين الإصدارات، وفصلها عن شيفرة التطبيق يجعل تحديثًا في
       app.js لا يُبطل كاش المتصفح وعامل الخدمة لها. عامل الخدمة يكتشف هذه الملفات
       تلقائيًا (نمطه يشمل /assets/) فتبقى متاحة دون اتصال. */
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](xlsx)[\\/]/.test(id)) return "vendor-xlsx";
          if (/[\\/]node_modules[\\/](jspdf|html2canvas|canvg|dompurify|fflate)[\\/]/.test(id)) return "vendor-pdf";
          if (/[\\/]@?firebase[\\/]/.test(id) || id.includes("@firebase")) return "vendor-firebase";
          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    /* لا يوجد خادم خلفي ولا أسرار في التطبيق (PWA ثابت)، فقبول أي مضيف في التطوير
       يسهّل المعاينة من بيئات مختلفة بلا قائمة نطاقات يجب صيانتها. */
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
}));
