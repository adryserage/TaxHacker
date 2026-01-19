import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.taxhacker.app",
  appName: "TaxHacker",
  webDir: "out",
  server: {
    // For development, use local server
    // url: "http://localhost:3000",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    Keyboard: {
      resize: "body",
      style: "dark",
    },
  },
  ios: {
    scheme: "TaxHacker",
    contentInset: "always",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
}

export default config
