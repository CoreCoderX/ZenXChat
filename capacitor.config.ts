import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yourname.openrouterchat",
  appName: "ZenXChat",
  // Points to the built static files — bundled inside the APK
  webDir: "out",

  // NO server.url here — that was only for dev live reload
  // Remove it so the app uses bundled assets instead

  android: {
    allowMixedContent: true,
    backgroundColor: "#0a0a0a",
    // Allow HTTPS calls to OpenRouter
    webContentsDebuggingEnabled: false,
  },

  ios: {
    backgroundColor: "#0a0a0a",
    contentInset: "automatic",
  },

  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
