import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hesabi.app",
  appName: "حسابي",
  webDir: "dist/public",
  bundledWebRuntime: false,
  backgroundColor: "#101D18",
  server: {
    androidScheme: "https",
  },
};

export default config;
