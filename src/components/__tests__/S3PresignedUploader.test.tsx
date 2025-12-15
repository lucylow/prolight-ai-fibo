import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import S3PresignedUploader from "../S3PresignedUploader";
import { useAuth } from "@/contexts/AuthContext";

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock axios
vi.mock("axios", async () => {
  const actual = await vi.importActual("axios");
  return {
    ...actual,
    default: {
      put: vi.fn(),
      post: vi.fn(),
    },
  };
});

describe("S3PresignedUploader", () => {
  const mockApi = {
    post: vi.fn(),
    defaults: { baseURL: "http://localhost:8000/api" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ api: mockApi });
  });

  it("renders upload button", () => {
    render(<S3PresignedUploader />);
    expect(screen.getByText("Choose Files")).toBeInTheDocument();
  });

  it("shows progress during upload", async () => {
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const user = userEvent.setup();

    mockApi.post.mockResolvedValue({
      data: {
        url: "https://s3.amazonaws.com/bucket/test.pdf",
        key: "test.pdf",
        publicUrl: "https://s3.amazonaws.com/bucket/test.pdf",
      },
    });

    const axios = await import("axios");
    (axios.default.put as any).mockImplementation((url, file, config) => {
      // Simulate progress
      if (config?.onUploadProgress) {
        config.onUploadProgress({ loaded: 50, total: 100 });
        setTimeout(() => {
          config.onUploadProgress({ loaded: 100, total: 100 });
        }, 100);
      }
      return Promise.resolve({ status: 200 });
    });

    render(<S3PresignedUploader />);
    const input = screen.getByRole("button", { name: /choose files/i })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/uploads/presign", {
        filename: "test.pdf",
        contentType: "application/pdf",
        size: 4,
      });
    });
  });

  it("validates file size when maxSize is provided", async () => {
    const largeFile = new File(["x".repeat(10 * 1024 * 1024)], "large.pdf", {
      type: "application/pdf",
    });
    const user = userEvent.setup();

    render(<S3PresignedUploader maxSize={5 * 1024 * 1024} />);
    const input = screen.getByRole("button", { name: /choose files/i })
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, largeFile);

    await waitFor(() => {
      const { toast } = require("sonner");
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("File size exceeds")
      );
    });
  });
});
