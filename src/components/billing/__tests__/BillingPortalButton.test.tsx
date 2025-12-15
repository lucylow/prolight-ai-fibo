/**
 * Tests for BillingPortalButton component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillingPortalButton from "../BillingPortalButton";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock billing service
vi.mock("@/services/billingService", () => ({
  redirectToCustomerPortal: vi.fn(),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.location
const mockLocation = {
  href: "",
  assign: vi.fn(),
  replace: vi.fn(),
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("BillingPortalButton", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
  });

  it("renders with default label", () => {
    renderWithProviders(<BillingPortalButton />);
    expect(screen.getByText("Manage Subscription")).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    renderWithProviders(
      <BillingPortalButton label="Update Payment Method" />
    );
    expect(screen.getByText("Update Payment Method")).toBeInTheDocument();
  });

  it("shows loading state when clicked", async () => {
    const { redirectToCustomerPortal } = await import("@/services/billingService");
    const { supabase } = await import("@/integrations/supabase/client");

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user_123" } },
    });

    (redirectToCustomerPortal as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve("https://billing.stripe.com/test"), 100)
        )
    );

    renderWithProviders(<BillingPortalButton />);
    const button = screen.getByText("Manage Subscription");

    await userEvent.click(button);

    expect(screen.getByText("Opening...")).toBeInTheDocument();
  });

  it("redirects to portal URL on success", async () => {
    const { redirectToCustomerPortal } = await import("@/services/billingService");
    const { supabase } = await import("@/integrations/supabase/client");

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user_123" } },
    });

    (redirectToCustomerPortal as any).mockResolvedValue(
      "https://billing.stripe.com/test"
    );

    renderWithProviders(<BillingPortalButton />);
    const button = screen.getByText("Manage Subscription");

    await userEvent.click(button);

    await waitFor(() => {
      expect(mockLocation.href).toBe("https://billing.stripe.com/test");
    });
  });

  it("shows error when user is not authenticated", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { toast } = await import("sonner");

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
    });

    renderWithProviders(<BillingPortalButton />);
    const button = screen.getByText("Manage Subscription");

    await userEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Please sign in to access billing portal"
      );
    });
  });

  it("is disabled when disabled prop is true", () => {
    renderWithProviders(<BillingPortalButton disabled />);
    const button = screen.getByText("Manage Subscription");
    expect(button).toBeDisabled();
  });

  it("hides icon when showIcon is false", () => {
    renderWithProviders(<BillingPortalButton showIcon={false} />);
    const button = screen.getByText("Manage Subscription");
    // Icon should not be present
    expect(button.querySelector("svg")).not.toBeInTheDocument();
  });

  it("uses custom return URL", async () => {
    const { redirectToCustomerPortal } = await import("@/services/billingService");
    const { supabase } = await import("@/integrations/supabase/client");

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user_123" } },
    });

    (redirectToCustomerPortal as any).mockResolvedValue(
      "https://billing.stripe.com/test"
    );

    renderWithProviders(
      <BillingPortalButton returnUrl="/account/billing" />
    );
    const button = screen.getByText("Manage Subscription");

    await userEvent.click(button);

    await waitFor(() => {
      expect(redirectToCustomerPortal).toHaveBeenCalledWith("/account/billing");
    });
  });
});

