import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Sidebar from "../../components/Sidebar";

// Mock the navigation module
jest.mock("../../lib/navigation", () => ({
  navigation: [
    {
      name: "Content",
      href: "/dashboard/content",
      icon: () => <span data-testid="file-icon">File</span>,
      category: "content",
    },
    {
      name: "Users",
      href: "/dashboard/users",
      icon: () => <span data-testid="users-icon">Users</span>,
      category: "admin",
    },
    {
      name: "Database",
      href: "/dashboard/database",
      icon: () => <span data-testid="database-icon">Database</span>,
      category: "admin",
    },
    {
      name: "API Test",
      href: "/dashboard/api-test",
      icon: () => <span data-testid="code-icon">API</span>,
      category: "tools",
      badge: "New",
    },
  ],
  categories: {
    content: "Content Management",
    admin: "Administration",
    tools: "Tools",
  },
}));

// Mock the icons
jest.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="chevron-left">‹</span>,
  ChevronRight: () => <span data-testid="chevron-right">›</span>,
  Database: () => <span data-testid="database-logo">Database</span>,
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    prefetch: mockPrefetch,
  }),
  usePathname: () => "/dashboard/content",
}));

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders sidebar with navigation items", () => {
    render(<Sidebar />);

    expect(screen.getByText("Krapi CMS")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /database/i })).toBeInTheDocument();
    expect(screen.getByText("API Test")).toBeInTheDocument();
  });

  it("renders category headers when expanded", () => {
    render(<Sidebar />);

    expect(screen.getByText("Content Management")).toBeInTheDocument();
    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
  });

  it("renders navigation item badges", () => {
    render(<Sidebar />);

    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("highlights active navigation item", () => {
    render(<Sidebar />);

    const contentLink = screen.getByRole("link", { name: /content/i });
    expect(contentLink).toHaveClass("bg-blue-50", "text-blue-700");
  });

  it("hides text content when collapsed", () => {
    render(<Sidebar collapsed={true} />);

    expect(screen.queryByText("Krapi CMS")).not.toBeInTheDocument();
    expect(screen.queryByText("Content Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("shows only logo icon when collapsed", () => {
    render(<Sidebar collapsed={true} />);

    expect(screen.getByTestId("database-logo")).toBeInTheDocument();
  });

  it("adjusts width based on collapsed state", () => {
    const { rerender } = render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("w-64");

    rerender(<Sidebar collapsed={true} />);
    expect(sidebar).toHaveClass("w-16");
  });

  it("renders toggle button", () => {
    render(<Sidebar />);

    const toggleButton = screen.getByRole("button", {
      name: /collapse sidebar/i,
    });
    expect(toggleButton).toBeInTheDocument();
  });

  it("calls onToggle when toggle button is clicked", () => {
    const onToggle = jest.fn();
    render(<Sidebar onToggle={onToggle} />);

    const toggleButton = screen.getByRole("button", {
      name: /collapse sidebar/i,
    });
    fireEvent.click(toggleButton);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows correct toggle icon based on collapsed state", () => {
    const { rerender } = render(<Sidebar />);

    expect(screen.getByLabelText("Collapse sidebar")).toBeInTheDocument();

    rerender(<Sidebar collapsed={true} />);
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /content/i })).toHaveAttribute(
      "href",
      "/dashboard/content"
    );
    expect(screen.getByRole("link", { name: /users/i })).toHaveAttribute(
      "href",
      "/dashboard/users"
    );
    expect(screen.getByRole("link", { name: /database/i })).toHaveAttribute(
      "href",
      "/dashboard/database"
    );
    expect(screen.getByRole("link", { name: /api test/i })).toHaveAttribute(
      "href",
      "/dashboard/api-test"
    );
  });

  it("applies correct styling to active navigation item", () => {
    render(<Sidebar />);

    const activeLink = screen.getByRole("link", { name: /content/i });
    expect(activeLink).toHaveClass("bg-blue-50", "text-blue-700");

    const inactiveLink = screen.getByRole("link", { name: /users/i });
    expect(inactiveLink).toHaveClass("text-gray-600");
  });

  it("groups navigation items by category", () => {
    render(<Sidebar />);

    const contentSection = screen
      .getByText("Content Management")
      .closest("div");
    const adminSection = screen.getByText("Administration").closest("div");
    const toolsSection = screen.getByText("Tools").closest("div");

    expect(contentSection).toContainElement(
      screen.getByRole("link", { name: /content/i })
    );
    expect(adminSection).toContainElement(
      screen.getByRole("link", { name: /users/i })
    );
    expect(adminSection).toContainElement(
      screen.getByRole("link", { name: /database/i })
    );
    expect(toolsSection).toContainElement(
      screen.getByRole("link", { name: /api test/i })
    );
  });

  it("applies correct styling to different badge types", () => {
    render(<Sidebar />);

    const newBadge = screen.getByText("New");
    expect(newBadge).toHaveClass("bg-green-100", "text-green-700");
  });

  it("positions badges correctly in navigation items", () => {
    render(<Sidebar />);

    const apiTestLink = screen.getByRole("link", { name: /api test/i });
    const newBadge = screen.getByText("New");

    expect(apiTestLink).toContainElement(newBadge);
    expect(newBadge).toHaveClass("ml-2");
  });

  it("maintains proper structure on different screen sizes", () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("h-full", "border-r", "bg-white");
  });

  it("handles overflow with scrollable navigation", () => {
    render(<Sidebar />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("overflow-y-auto");
  });

  it("provides proper ARIA labels for navigation", () => {
    render(<Sidebar />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  it("maintains keyboard navigation support", () => {
    render(<Sidebar />);

    const firstLink = screen.getByRole("link", { name: /content/i });
    firstLink.focus();

    expect(firstLink).toHaveFocus();
  });

  it("provides proper semantic structure", () => {
    render(<Sidebar />);

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders icons for all navigation items", () => {
    render(<Sidebar />);

    expect(screen.getByTestId("file-icon")).toBeInTheDocument();
    expect(screen.getAllByTestId("users-icon")[0]).toBeInTheDocument();
    expect(screen.getAllByTestId("database-icon")[0]).toBeInTheDocument();
    expect(screen.getByTestId("code-icon")).toBeInTheDocument();
  });

  it("applies correct icon styling", () => {
    render(<Sidebar />);

    const contentIcon = screen.getByTestId("file-icon");
    expect(contentIcon.parentElement).toHaveClass("h-5", "w-5");
  });

  it("adjusts icon spacing based on collapsed state", () => {
    const { rerender } = render(<Sidebar />);

    const contentIcon = screen.getByTestId("file-icon");
    expect(contentIcon.parentElement).toHaveClass("mr-3");

    rerender(<Sidebar collapsed={true} />);
    // In collapsed state, the icon container should not have mr-3
    const collapsedIcon = screen.getByTestId("file-icon");
    expect(collapsedIcon.parentElement).not.toHaveClass("mr-3");
  });

  it("applies transition classes for smooth animations", () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("transition-all", "duration-300");
  });

  it("maintains transition during collapse/expand", () => {
    const { rerender } = render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar).toHaveClass("transition-all");

    rerender(<Sidebar collapsed={true} />);
    expect(sidebar).toHaveClass("transition-all");
  });
});
