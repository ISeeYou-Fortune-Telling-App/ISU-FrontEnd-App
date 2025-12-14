// Dynamic Expo config - reads from app.json and injects env vars at build time
const baseConfig = require("./app.json");

module.exports = ({ config }) => {
  return {
    ...config,
    ...baseConfig.expo,
    extra: {
      ...baseConfig.expo.extra,
      // CometChat config - reads from process.env at build time (EAS injects these)
      cometChat: {
        appId: process.env.EXPO_PUBLIC_COMETCHAT_APP_ID,
        region: process.env.EXPO_PUBLIC_COMETCHAT_REGION,
        authKey: process.env.EXPO_PUBLIC_COMETCHAT_AUTH_KEY,
        variantId: process.env.EXPO_PUBLIC_COMETCHAT_VARIANT_ID,
      },
    },
  };
};
