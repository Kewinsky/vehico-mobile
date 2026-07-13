import { Alert } from "react-native";

import {
  alertCaughtError,
  getUserFacingErrorMessage,
} from "../../ui/errors/userFacingError";

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

const fallback = "Something went wrong";

describe("getUserFacingErrorMessage", () => {
  it("returns fallback for empty or technical messages", () => {
    expect(getUserFacingErrorMessage(null, fallback)).toBe(fallback);
    expect(
      getUserFacingErrorMessage(
        new Error("Invalid JWT: Auth session missing from supabase client"),
        fallback,
      ),
    ).toBe(fallback);
    expect(
      getUserFacingErrorMessage(
        new Error("POST https://xyz.supabase.co/rest/v1/vehicles 401"),
        fallback,
      ),
    ).toBe(fallback);
  });

  it("keeps short user-facing validation messages", () => {
    expect(
      getUserFacingErrorMessage(new Error("Camera permission denied"), fallback),
    ).toBe("Camera permission denied");
  });

  it("returns fallback for very long messages", () => {
    expect(
      getUserFacingErrorMessage(new Error("x".repeat(200)), fallback),
    ).toBe(fallback);
  });
});

describe("alertCaughtError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows sanitized message in Alert.alert", () => {
    alertCaughtError(
      "Error",
      new Error("Invalid JWT from supabase"),
      fallback,
    );
    expect(Alert.alert).toHaveBeenCalledWith("Error", fallback);
  });

  it("passes through short user-facing messages", () => {
    alertCaughtError("Error", new Error("Camera permission denied"), fallback);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Camera permission denied",
    );
  });
});
