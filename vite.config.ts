import path from "node:path";
import { defineConfig } from "vite";

/* حسابي تطبيق ويب ثابت (PWA): لا خادم ولا إطار عمل ولا TypeScript في الواجهة.
   نقطة الدخول client/index.html → /src/main.js → وحدات ES في client/src/js/.
   المخرجات في dist/public لأن capacitor.config.ts وvercel.json يشيران إليها. */
export default defineConfig({
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
});
