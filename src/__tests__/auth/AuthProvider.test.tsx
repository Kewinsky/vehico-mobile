import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { AuthProvider, useAuth } from "../../app/providers/AuthProvider";
import { supabase } from "../../test/supabaseMock";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthProvider", () => {
  it("ends loading and exposes session when getSession succeeds", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "a",
          refresh_token: "b",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: {
            id: "user-1",
            aud: "authenticated",
            role: "authenticated",
            email: "u@test.dev",
            app_metadata: {},
            user_metadata: {},
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.id).toBe("user-1");
  });

  it("treats getSession failure as signed out", async () => {
    supabase.auth.getSession.mockRejectedValue(new Error("corrupt session"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("signOut delegates to supabase.auth.signOut", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    supabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
