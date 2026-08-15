import { resetSupabaseMock } from "./src/test/supabaseMock";

jest.mock("./src/config/env", () => ({
  ENV: {
    APP_ENV: "development",
    SUPABASE_URL: "https://supabase.test",
    SUPABASE_ANON_KEY: "anon",
    REPORTS_APP_URL: "https://reports.test",
    REVENUECAT_API_KEY: "revenuecat-public-key-test",
    WEB_APP_URL: "https://web.test",
    SUPPORT_EMAIL: "support@test.dev",
    TURNSTILE_SITE_KEY: undefined,
  },
}));

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    WebView: React.forwardRef((props: object, ref: unknown) =>
      React.createElement(View, { ...props, ref }),
    ),
    default: React.forwardRef((props: object, ref: unknown) =>
      React.createElement(View, { ...props, ref }),
    ),
  };
});

jest.mock("react-native-purchases", () => {
  const api = {
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    getProducts: jest.fn(),
    getAppUserID: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    isAnonymous: jest.fn(),
    setAttributes: jest.fn(),
    setEmail: jest.fn(),
    setDisplayName: jest.fn(),
    syncPurchasesForResult: jest.fn(),
    restorePurchases: jest.fn(),
    purchasePackage: jest.fn(),
    purchaseStoreProduct: jest.fn(),
    isConfigured: jest.fn(),
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    PRODUCT_CATEGORY: {
      SUBSCRIPTION: "SUBSCRIPTION",
      NON_SUBSCRIPTION: "NON_SUBSCRIPTION",
    },
    LOG_LEVEL: { DEBUG: "DEBUG", INFO: "INFO" },
    PURCHASES_ERROR_CODE: {
      PURCHASE_CANCELLED_ERROR: "PURCHASE_CANCELLED_ERROR",
    },
  };
  return {
    __esModule: true,
    default: api,
  };
});

jest.mock("react-native-purchases-ui", () => {
  const ui = {
    presentPaywall: jest.fn(),
    presentPaywallIfNeeded: jest.fn(),
    presentCustomerCenter: jest.fn(),
  };
  return {
    __esModule: true,
    default: ui,
    PAYWALL_RESULT: {
      PURCHASED: "PURCHASED",
      RESTORED: "RESTORED",
      CANCELLED: "CANCELLED",
      NOT_PRESENTED: "NOT_PRESENTED",
      ERROR: "ERROR",
    },
  };
});

jest.mock("./src/services/supabase/client", () => ({
  supabase: require("./src/test/supabaseMock").supabase,
}));

beforeEach(() => {
  resetSupabaseMock();
});
