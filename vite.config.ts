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
