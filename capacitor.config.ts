import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hesabi.app",
  appName: "حسابي",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
};

export default config;
