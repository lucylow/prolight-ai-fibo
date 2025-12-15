import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

// Mock auth service
vi.mock("@/services/auth", () => ({
  getSessionAPI: vi.fn(),
  signInAPI: vi.fn(),
  signOutAPI: vi.fn(),
}));

const TestComponent = () => {
  const { user, loading, api } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? "loading" : "ready"}</div>
      <div data-testid="user">{user ? user.email : "no user"}</div>
      <div data-testid="api">{api ? "api exists" : "no api"}</div>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides auth context with api instance", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("api")).toHaveTextContent("api exists");
    });
  });

  it("handles loading state", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should show loading
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });
  });
});

