/**
 * Tests for CheckoutButton component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckoutButton from "../CheckoutButton";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock billing service
vi.mock("@/services/billingService", () => ({
  createCheckoutSession: vi.fn(),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
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

describe("CheckoutButton", () => {
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
    renderWithProviders(<CheckoutButton planName="pro" />);
    expect(screen.getByText("Subscribe")).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    renderWithProviders(
      <CheckoutButton planName="pro" label="Buy Pro Plan" />
    );
    expect(screen.getByText("Buy Pro Plan")).toBeInTheDocument();
  });

  it("shows loading state when clicked", async () => {
    const { createCheckoutSession } = await import("@/services/billingService");
    const { supabase } = await import("@/integrations/supabase/client");

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user_123" } },
    });

    (createCheckoutSession as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                checkout_url: "https://checkout.stripe.com/test",
                session_id: "cs_test_123",
              }),
            100
          )
        )
    );

    renderWithProviders(<CheckoutButton planName="pro" />);
    const button = screen.getByText("Subscribe");

    await userEvent.click(button);

    expect(screen.getByText("Starting...")).toBeInTheDocument();
  });

  it("redirects to checkout URL on success", async () => {
    const { createCheckoutSession } = await import("@/services/billingService");
    const { supabase } = await import("@/integrations/supabase/client");

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { email: "test@example.com", id: "user_123" } },
    });

    (createCheckoutSession as any).mockResolvedValue({
      checkout_url: "https://checkout.stripe.com/test",
      session_id: "cs_test_123",
    });

    renderWithProviders(<CheckoutButton planName="pro" />);
    const button = screen.getByText("Subscribe");

    await userEvent.click(button);

    await waitFor(() => {
      expect(mockLocation.href).toBe("https://checkout.stripe.com/test");
    });
  });

  it("shows error when user is not authenticated", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { toast } = await import("sonner");

    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
    });

    renderWithProviders(<CheckoutButton planName="pro" />);
    const button = screen.getByText("Subscribe");

    await userEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please sign in to continue");
    });
  });

  it("shows error when neither planName nor priceId is provided", async () => {
    const { toast } = await import("sonner");

    renderWithProviders(<CheckoutButton />);
    const button = screen.getByText("Subscribe");

    await userEvent.click(button);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Either planName or priceId must be provided"
      );
    });
  });

  it("is disabled when disabled prop is true", () => {
    renderWithProviders(<CheckoutButton planName="pro" disabled />);
    const button = screen.getByText("Subscribe");
    expect(button).toBeDisabled();
  });

  it("handles one-time payment mode", () => {
    renderWithProviders(
      <CheckoutButton priceId="price_123" mode="payment" label="Buy Now" />
    );
    expect(screen.getByText("Buy Now")).toBeInTheDocument();
  });
});
