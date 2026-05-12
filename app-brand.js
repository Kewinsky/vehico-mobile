/**
 * Single source of truth for the default user-visible app name.
 * Used by Expo native config (app.config.js) and the JS bundle (see src/config/appBrand.ts).
 * Override at build/runtime with EXPO_PUBLIC_APP_DISPLAY_NAME.
 */
const DEFAULT_APP_DISPLAY_NAME = "Vericar";

function getAppDisplayName() {
  const fromEnv = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME?.trim();
  return fromEnv || DEFAULT_APP_DISPLAY_NAME;
}

module.exports = { DEFAULT_APP_DISPLAY_NAME, getAppDisplayName };
