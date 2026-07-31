import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { OnboardingScreen } from "../../screens/onboarding/OnboardingScreen";

const mockSignOut = jest.fn(async () => undefined);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

jest.mock("../../i18n/i18n", () => ({}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("expo-image", () => ({
  Image: "Image",
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn(),
}));

jest.mock("../../app/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      identities: [{ provider: "email", id: "1" }],
      user_metadata: {},
    },
    signOut: mockSignOut,
  }),
}));

jest.mock("../../app/providers/EntitlementsProvider", () => ({
  useEntitlements: () => ({
    vehiclesLimit: 1,
    isPremium: false,
    photosPerVehicleLimit: 6,
  }),
}));

jest.mock("../../app/hooks/useUnitDisplay", () => ({
  useUnitDisplay: () => ({ distanceUnitLabel: "km" }),
}));

jest.mock("../../services/vehicles/vehiclesRepo", () => ({
  createVehicle: jest.fn(),
  listVehicles: jest.fn(),
}));

jest.mock("../../services/vehicles/uploadPhoto", () => ({
  uploadVehiclePhoto: jest.fn(),
}));

jest.mock("../../services/auth/signInProviders", () => ({
  resolveOAuthUserDisplayName: () => "",
  shouldPromptDisplayNameInOnboarding: () => true,
}));

jest.mock("../../ui/ThemeProvider", () => {
  const theme = {
    colors: {
      bg: "#000",
      fg: "#fff",
      muted: "#888",
      accent: "#fc0",
      danger: "#f00",
      border: "#333",
      card: "#111",
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: { md: 8, xl: 16 },
    typography: {
      small: 12,
      body: 15,
      title: 18,
      largeTitle: 28,
      fontWeight: { bold: "700", medium: "500" },
    },
    layout: { contentPaddingHorizontal: 16 },
  };
  return {
    useTheme: () => ({ theme, mode: "dark" as const }),
  };
});

jest.mock("../../ui/components/branding/Logo", () => ({
  Logo: () => null,
}));

jest.mock("../../ui/components/dashboard/Glow", () => ({
  Glow: () => null,
}));

jest.mock("../../ui/components/branding/DecorativeBackground", () => ({
  DecorativeBackground: () => null,
}));

jest.mock("../../ui/components/layout/FormScreen", () => ({
  FormScreen: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../ui/components/common/Button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../ui/components/common/AttachmentSourcePicker", () => ({
  AttachmentSourcePicker: () => null,
}));

jest.mock("../../ui/components/common/Card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../ui/components/common/FormInputRow", () => ({
  FormInputRow: () => null,
}));

jest.mock("../../ui/components/layout/ContentHeader", () => ({
  ContentHeader: () => null,
}));

jest.mock("../../ui/toast/toast", () => ({
  toastCaughtError: jest.fn(),
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}));

jest.mock("../../ui/limits/entitlementAlerts", () => ({
  getPremiumUpgradeAlertButtons: () => [],
  handleAndShowLimitErrorAlert: () => false,
}));

describe("OnboardingScreen sign out", () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    mockSignOut.mockResolvedValue(undefined);
  });

  it("calls signOut when the welcome-step logout control is pressed", async () => {
    const { getByLabelText, getByText } = render(
      <OnboardingScreen
        navigation={{ replace: jest.fn(), navigate: jest.fn() } as any}
        route={{ key: "onboarding", name: "Onboarding" } as any}
      />,
    );

    expect(getByText("common.signOut")).toBeTruthy();
    fireEvent.press(getByLabelText("common.signOut"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
