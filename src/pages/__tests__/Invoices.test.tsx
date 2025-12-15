import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Invoices from "../Invoices";
import { useAuth } from "@/contexts/AuthContext";

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("Invoices", () => {
  const mockApi = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ api: mockApi });
  });

  it("renders invoices page", () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });
    render(<Invoices />);
    expect(screen.getByText("Payment History & Invoices")).toBeInTheDocument();
  });

  it("displays pagination controls", async () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });
    render(<Invoices />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });
  });

  it("filters invoices by status", async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValue({ response: { status: 404 } });

    render(<Invoices />);

    await waitFor(() => {
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    await user.click(select);

    const paidOption = screen.getByText("Paid");
    await user.click(paidOption);

    // Should reset to page 1 when filter changes
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });
  });

  it("searches invoices", async () => {
    const user = userEvent.setup();
    mockApi.get.mockRejectedValue({ response: { status: 404 } });

    render(<Invoices />);

    const searchInput = screen.getByPlaceholderText("Search invoices...");
    await user.type(searchInput, "INV-1042");

    // Wait for debounce
    await waitFor(
      () => {
        expect(mockApi.get).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });
});


