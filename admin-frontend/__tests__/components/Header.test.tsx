// Create a shared mock instance for axios
const mockApiInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

jest.mock("axios", () => {
  const actualAxios = jest.requireActual("axios");
  return {
    ...actualAxios,
    create: jest.fn(() => mockApiInstance),
    default: actualAxios.default,
    isAxiosError: actualAxios.isAxiosError,
  };
});

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "@/components/Header";
import { AuthContext } from "@/contexts/AuthContext";
import { useNotification } from "@/hooks/useNotification";
import "@testing-library/jest-dom";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock the hooks and modules
jest.mock("@/hooks/useNotification");
jest.mock("@/lib/api", () => ({
  get: jest.fn(),
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock UserSettingsModal
jest.mock("@/components/UserSettingsModal", () => {
  return function MockUserSettingsModal({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="user-settings-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null;
  };
});

// Mock Sidebar component
jest.mock("@/components/Sidebar", () => {
  return function MockSidebar() {
    return <div data-testid="mobile-menu">Mobile Menu Content</div>;
  };
});

const mockNotification = useNotification as jest.MockedFunction<
  typeof useNotification
>;

// Mock auth context values
const mockAuthUser = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  role: "admin" as const,
  permissions: ["read", "write"],
  first_name: "Test",
  last_name: "User",
  status: "active" as const,
  active: true,
  email_verified: true,
  phone: undefined,
  phone_verified: false,
  two_factor_enabled: false,
  last_login: "2024-01-01T12:00:00Z",
  created_at: "2024-01-01T12:00:00Z",
  updated_at: "2024-01-01T12:00:00Z",
};

const mockAuthContextValue = {
  user: mockAuthUser,
  token: "test-token",
  socket: null,
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  refreshUser: jest.fn(),
};

// Mock API responses
const mockSearchResults = {
  results: [
    {
      type: "content" as const,
      id: 1,
      title: "Test Content",
      description: "Test description",
      url: "/content/1",
      relevance: 0.9,
    },
    {
      type: "user" as const,
      id: 2,
      title: "John Doe",
      description: "Admin user",
      url: "/users/2",
      relevance: 0.8,
    },
  ],
  total: 2,
  query: "test",
  took: 10,
};

const mockNotifications = {
  total: 2,
  unread: 1,
  notifications: [
    {
      id: 1,
      user_id: 1,
      type: "system_alert" as const,
      title: "System Update",
      message: "System will be updated tonight",
      read: false,
      created_at: "2024-01-01T12:00:00Z",
    },
    {
      id: 2,
      user_id: 1,
      type: "content_created" as const,
      title: "New Content",
      message: "New article was published",
      read: true,
      created_at: "2024-01-01T11:00:00Z",
    },
  ],
};

const renderHeader = (authValue = mockAuthContextValue) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <Header />
    </AuthContext.Provider>
  );
};

describe("Header Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Don't redeclare authValue here since we have mockAuthContextValue above

    mockNotification.mockReturnValue({
      notifications: [],
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showWarning: jest.fn(),
      showInfo: jest.fn(),
      removeNotification: jest.fn(),
      clearAll: jest.fn(),
      handleError: jest.fn(),
    });

    mockApiInstance.get.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({
          data: { success: true, data: mockSearchResults },
        });
      }
      if (url.includes("/notifications")) {
        return Promise.resolve({
          data: { success: true, data: mockNotifications },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    mockApiInstance.patch.mockResolvedValue({ data: { success: true } });
    mockApiInstance.delete.mockResolvedValue({ data: { success: true } });
  });

  describe("Basic Rendering", () => {
    it("renders the header with logo and navigation items", () => {
      renderHeader();

      expect(screen.getByText("Krapi CMS")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /search/i })
      ).toBeInTheDocument();
      expect(screen.getByTestId("notifications-button")).toBeInTheDocument();
      expect(screen.getByTestId("user-menu-button")).toBeInTheDocument();
    });

    it("displays user information when authenticated", () => {
      renderHeader();

      expect(screen.getByText("testuser")).toBeInTheDocument();
      // Email is not displayed in the Header component
    });

    it("shows loading state when auth is loading", () => {
      renderHeader({
        ...mockAuthContextValue,
        isLoading: true,
        user: null as any,
        isAuthenticated: false,
      });

      expect(screen.getByTestId("header-loading")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("shows search input and allows typing", async () => {
      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test query");

      expect(searchInput).toHaveValue("test query");
    });

    it("displays search results when typing", async () => {
      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByText("Test Content")).toBeInTheDocument();
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
    });

    it("shows loading spinner during search", async () => {
      mockApiInstance.get.mockImplementation((url: string) => {
        if (url.includes("/search")) {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { success: true, data: mockSearchResults },
                }),
              500
            )
          );
        }
        if (url.includes("/notifications")) {
          return Promise.resolve({
            data: { success: true, data: mockNotifications },
          });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      // Now the search input should be available
      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test");

      // Wait for loading spinner to appear
      expect(await screen.findByTestId("search-loading")).toBeInTheDocument();
    });

    it("handles search API errors gracefully", async () => {
      mockApiInstance.get.mockImplementation((url: string) => {
        if (url.includes("/search")) {
          return Promise.reject(new Error("Search failed"));
        }
        if (url.includes("/notifications")) {
          return Promise.resolve({
            data: { success: true, data: mockNotifications },
          });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      // Now the search input should be available
      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(
          screen.getByText("Failed to perform search. Please try again.")
        ).toBeInTheDocument();
      });
    });

    it("closes search results when clicking outside", async () => {
      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      // Now the search input should be available
      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByText("Test Content")).toBeInTheDocument();
      });

      // Click outside
      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText("Test Content")).not.toBeInTheDocument();
      });
    });

    it("navigates to result when clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      // Now the search input should be available
      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByText("Test Content")).toBeInTheDocument();
      });

      const contentResult = screen.getByText("Test Content");
      await user.click(contentResult);

      // Should navigate and close search
      await waitFor(() => {
        expect(screen.queryByText("Test Content")).not.toBeInTheDocument();
      });
    });
  });

  describe("Notifications", () => {
    it("displays notification count badge", async () => {
      renderHeader();

      await waitFor(() => {
        // Check for desktop badge (since we're testing desktop view)
        expect(
          screen.getByTestId("desktop-notification-badge")
        ).toBeInTheDocument();
      });
    });

    it("opens notification dropdown when clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      const notificationButton = screen.getByTestId("notifications-button");
      await user.click(notificationButton);

      await waitFor(() => {
        expect(screen.getByText("System Update")).toBeInTheDocument();
        expect(screen.getByText("New Content")).toBeInTheDocument();
      });
    });

    it("marks notification as read when clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      const notificationButton = screen.getByTestId("notifications-button");
      await user.click(notificationButton);

      await waitFor(() => {
        expect(screen.getByText("System Update")).toBeInTheDocument();
      });

      const markReadButton = screen.getByTestId("mark-read-1");
      await user.click(markReadButton);

      expect(mockApiInstance.patch).toHaveBeenCalledWith(
        "/notifications/1/read"
      );
    });

    it("marks all notifications as read", async () => {
      const user = userEvent.setup();
      renderHeader();

      const notificationButton = screen.getByTestId("notifications-button");
      await user.click(notificationButton);

      await waitFor(() => {
        const markAllReadButton = screen.getByText("Mark all read");
        expect(markAllReadButton).toBeInTheDocument();
      });

      const markAllReadButton = screen.getByText("Mark all read");
      await user.click(markAllReadButton);

      expect(mockApiInstance.patch).toHaveBeenCalledWith(
        "/notifications/mark-all-read"
      );
    });

    it("deletes notification when delete button clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      const notificationButton = screen.getByTestId("notifications-button");
      await user.click(notificationButton);

      await waitFor(() => {
        expect(screen.getByTestId("delete-notification-1")).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId("delete-notification-1");
      await user.click(deleteButton);

      expect(mockApiInstance.delete).toHaveBeenCalledWith("/notifications/1");
    });
  });

  describe("User Menu", () => {
    it("opens user menu when clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      const userMenuButton = screen.getByTestId("user-menu-button");
      await user.click(userMenuButton);

      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Log out")).toBeInTheDocument();
    });

    it("opens settings modal when settings clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      const userMenuButton = screen.getByTestId("user-menu-button");
      await user.click(userMenuButton);

      const settingsButton = screen.getByText("Settings");
      await user.click(settingsButton);

      expect(screen.getByTestId("user-settings-modal")).toBeInTheDocument();
    });

    it("closes settings modal when requested", async () => {
      const user = userEvent.setup();
      renderHeader();

      // Open user menu and settings
      const userMenuButton = screen.getByTestId("user-menu-button");
      await user.click(userMenuButton);

      const settingsButton = screen.getByText("Settings");
      await user.click(settingsButton);

      expect(screen.getByTestId("user-settings-modal")).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText("Close Modal");
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId("user-settings-modal")
        ).not.toBeInTheDocument();
      });
    });

    it("calls logout when sign out clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      const userMenuButton = screen.getByTestId("user-menu-button");
      await user.click(userMenuButton);

      const signOutButton = screen.getByText("Log out");
      await user.click(signOutButton);

      expect(mockAuthContextValue.logout).toHaveBeenCalled();
    });
  });

  describe("Mobile Responsiveness", () => {
    it("shows mobile menu button on mobile", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderHeader();

      expect(screen.getByTestId("mobile-menu-button")).toBeInTheDocument();
    });

    it("toggles mobile menu when button clicked", async () => {
      const user = userEvent.setup();
      renderHeader();

      const mobileMenuButton = screen.getByTestId("mobile-menu-button");
      await user.click(mobileMenuButton);

      expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    it("supports keyboard navigation in search results", async () => {
      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      // Now the search input should be available
      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByText("Test Content")).toBeInTheDocument();
      });

      // Press Enter should navigate to first result
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.queryByText("Test Content")).not.toBeInTheDocument();
      });
    });

    it("closes search results with Escape key", async () => {
      const user = userEvent.setup();
      renderHeader();

      // First click the search button to open search mode
      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      // Now the search input should be available
      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.getByText("Test Content")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByText("Test Content")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles notification loading errors", async () => {
      mockApiInstance.get.mockImplementation((url: string) => {
        if (url.includes("/notifications")) {
          return Promise.reject(new Error("Failed to load notifications"));
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      const user = userEvent.setup();
      renderHeader();

      const notificationButton = screen.getByTestId("notifications-button");
      await user.click(notificationButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load notifications")
        ).toBeInTheDocument();
      });
    });

    it("handles unauthenticated state gracefully", () => {
      renderHeader({
        ...mockAuthContextValue,
        user: null as any,
        isAuthenticated: false,
      });

      // Should not crash and should show search button
      expect(
        screen.getByRole("button", { name: /search/i })
      ).toBeInTheDocument();
    });
  });
});
