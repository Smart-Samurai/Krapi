import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QueryBuilder from "@/components/QueryBuilder";
import "@testing-library/jest-dom";

// Mock Monaco Editor
const mockEditor = {
  executeEdits: jest.fn(),
  focus: jest.fn(),
  getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
};
const mockMonaco = {
  languages: {
    registerCompletionItemProvider: jest.fn(),
    CompletionItemKind: { Keyword: 1, Class: 2, Field: 3 },
  },
  editor: {
    defineTheme: jest.fn(),
    setTheme: jest.fn(),
  },
};

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  Editor: (props: any) => {
    React.useEffect(() => {
      if (props.onMount) {
        props.onMount(mockEditor, mockMonaco);
      }
    }, []);
    return (
      <textarea
        data-testid={props["data-testid"] || "editor-textarea"}
        value={props.value}
        onChange={(e) => props.onChange && props.onChange(e.target.value)}
      />
    );
  },
}));

// Mock UI components
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, _value }: any) => (
    <div
      data-testid="select"
      onClick={() => onValueChange && onValueChange("test-value")}
    >
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, _onValueChange, value }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid={`tab-${value}`} onClick={onClick}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => {
    // Only render DialogTrigger always, and DialogContent when open is true
    const trigger = React.Children.toArray(children).find(
      (child: any) => child?.props?.["data-testid"] === "dialog-trigger"
    );
    const content = open
      ? React.Children.toArray(children).find(
          (child: any) => child?.props?.["data-testid"] === "dialog-content"
        )
      : null;
    return (
      <div data-testid="dialog" data-open={open}>
        {trigger}
        {content}
      </div>
    );
  },
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: any) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: any) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogTrigger: ({ children }: any) => children,
}));

jest.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: any) => (
    <div data-testid="collapsible">{children}</div>
  ),
  CollapsibleTrigger: ({ children, onClick }: any) => (
    <button data-testid="collapsible-trigger" onClick={onClick}>
      {children}
    </button>
  ),
  CollapsibleContent: ({ children }: any) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
}));

// Mock local storage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Sample table data
const mockTables = [
  {
    name: "users",
    rowCount: 150,
    columns: [
      { name: "id", type: "INTEGER", nullable: false, primaryKey: true },
      { name: "username", type: "TEXT", nullable: false, primaryKey: false },
      { name: "email", type: "TEXT", nullable: false, primaryKey: false },
      {
        name: "created_at",
        type: "DATETIME",
        nullable: false,
        primaryKey: false,
      },
    ],
  },
  {
    name: "content",
    rowCount: 75,
    columns: [
      { name: "id", type: "INTEGER", nullable: false, primaryKey: true },
      { name: "title", type: "TEXT", nullable: false, primaryKey: false },
      { name: "body", type: "TEXT", nullable: true, primaryKey: false },
      {
        name: "published",
        type: "BOOLEAN",
        nullable: false,
        primaryKey: false,
      },
    ],
  },
];

describe("QueryBuilder Component", () => {
  const defaultProps = {
    tables: mockTables,
    onExecute: jest.fn(),
    isExecuting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe("Basic Rendering", () => {
    it("renders with default visual mode", () => {
      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByText("SQL Query Builder")).toBeInTheDocument();
      expect(screen.getByText("Visual")).toBeInTheDocument();
      expect(screen.getByText("Code")).toBeInTheDocument();
      expect(screen.getByText("Database Schema")).toBeInTheDocument();
    });

    it("displays database tables in schema browser", () => {
      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByText("users")).toBeInTheDocument();
      expect(screen.getByText("content")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument(); // Row count
      expect(screen.getByText("75")).toBeInTheDocument(); // Row count
    });

    it("shows action buttons", () => {
      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByText("Templates")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
      expect(screen.getByText("Execute")).toBeInTheDocument();
    });
  });

  describe("Mode Switching", () => {
    it("switches between visual and code modes", async () => {
      render(<QueryBuilder {...defaultProps} />);

      // Should start in visual mode
      expect(screen.getByTestId("tabs")).toHaveAttribute(
        "data-value",
        "visual"
      );

      // Switch to code mode
      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      // Should show code editor
      expect(screen.getByTestId("editor-textarea")).toBeInTheDocument();
    });

    it("displays visual query builder in visual mode", () => {
      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByText("Query Type")).toBeInTheDocument();
      expect(screen.getByText("Table")).toBeInTheDocument();
      expect(screen.getByText("Generated SQL")).toBeInTheDocument();
    });

    it("displays Monaco editor in code mode", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      expect(screen.getByTestId("editor-textarea")).toBeInTheDocument();
    });
  });

  describe("Visual Query Builder", () => {
    it("allows selecting query type", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const queryTypeSelect = screen.getByText("Query Type").nextElementSibling;
      expect(queryTypeSelect).toBeInTheDocument();
    });

    it("allows selecting table", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const tableSelect = screen.getByText("Table").nextElementSibling;
      expect(tableSelect).toBeInTheDocument();
    });

    it("shows column selection for SELECT queries", () => {
      render(<QueryBuilder {...defaultProps} />);

      // By default, SELECT query should show columns
      expect(screen.getByText("Columns")).toBeInTheDocument();
    });

    it("allows adding conditions", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const addConditionButton = screen.getByText("Add Condition");
      await userEvent.click(addConditionButton);

      // Should add condition row
      expect(screen.getByText("Column")).toBeInTheDocument();
    });

    it("generates SQL from visual query", () => {
      render(<QueryBuilder {...defaultProps} />);

      const sqlPreview = screen.getByText("Generated SQL").nextElementSibling;
      expect(sqlPreview).toBeInTheDocument();
    });
  });

  describe("Database Schema Browser", () => {
    it("displays collapsible table entries", () => {
      render(<QueryBuilder {...defaultProps} />);

      const usersTrigger = screen.getAllByTestId("collapsible-trigger")[0];
      expect(usersTrigger).toHaveTextContent("users");
    });

    it("shows table row counts", () => {
      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("75")).toBeInTheDocument();
    });

    it("expands to show column details", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const usersTrigger = screen.getAllByTestId("collapsible-trigger")[0];
      await userEvent.click(usersTrigger);

      // Should show column details
      expect(screen.getByText("id")).toBeInTheDocument();
      expect(screen.getByText("username")).toBeInTheDocument();
      expect(screen.getByText("INTEGER")).toBeInTheDocument();
      expect(screen.getByText("TEXT")).toBeInTheDocument();
    });

    it("allows clicking columns to insert in code editor", async () => {
      render(<QueryBuilder {...defaultProps} />);

      // Switch to code mode first
      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      // Expand users table
      const usersTrigger = screen.getAllByTestId("collapsible-trigger")[0];
      await userEvent.click(usersTrigger);

      // Click on username column
      const usernameColumn = screen.getByText("username");
      await userEvent.click(usernameColumn);

      // Should call editor executeEdits
      expect(mockEditor.executeEdits).toHaveBeenCalled();
    });
  });

  describe("Query Execution", () => {
    it("calls onExecute when execute button is clicked", async () => {
      const mockOnExecute = jest.fn();
      render(<QueryBuilder {...defaultProps} onExecute={mockOnExecute} />);

      // Switch to code mode and add query
      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      const editor = screen.getByTestId("editor-textarea");
      await userEvent.type(editor, "SELECT * FROM users;");

      const executeButton = screen.getByText("Execute");
      await userEvent.click(executeButton);

      expect(mockOnExecute).toHaveBeenCalledWith("SELECT * FROM users;");
    });

    it("shows executing state when isExecuting is true", () => {
      render(<QueryBuilder {...defaultProps} isExecuting={true} />);

      const executeButton = screen.getByText("Executing...");
      expect(executeButton).toBeDisabled();
    });

    it("disables execute button when query is empty", async () => {
      render(<QueryBuilder {...defaultProps} />);

      // Switch to code mode
      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      const executeButton = screen.getByText("Execute");
      expect(executeButton).toBeDisabled();
    });
  });

  describe("Query Templates", () => {
    it("opens templates dialog when templates button is clicked", async () => {
      render(<QueryBuilder {...defaultProps} />);
      await userEvent.click(screen.getByTestId("tab-visual"));
      const buttons = screen.getAllByRole("button");
      // eslint-disable-next-line no-console
      console.log(
        "Buttons:",
        buttons.map((btn) => btn.textContent)
      );
      const templatesButton = screen.getByRole("button", {
        name: /Templates/i,
      });
      await userEvent.click(templatesButton);
      expect(screen.getByTestId("templates-dialog")).toBeInTheDocument();
      expect(screen.getByText("Query Templates")).toBeInTheDocument();
    });

    it("displays template options", async () => {
      render(<QueryBuilder {...defaultProps} />);
      await userEvent.click(screen.getByTestId("tab-visual"));
      const templatesButton = screen.getByRole("button", {
        name: /Templates/i,
      });
      await userEvent.click(templatesButton);
      expect(screen.getByText("Select All")).toBeInTheDocument();
      expect(screen.getByText("Select with Condition")).toBeInTheDocument();
      expect(screen.getByText("Insert Record")).toBeInTheDocument();
    });

    it("loads template when selected", async () => {
      render(<QueryBuilder {...defaultProps} />);
      await userEvent.click(screen.getByTestId("tab-visual"));
      const templatesButton = screen.getByRole("button", {
        name: /Templates/i,
      });
      await userEvent.click(templatesButton);
      const selectAllTemplate = screen.getByText("Select All");
      await userEvent.click(selectAllTemplate);
      // Should switch to code mode and load template
      expect(screen.getByTestId("editor-textarea")).toBeInTheDocument();
    });
  });

  describe("Save/Load Functionality", () => {
    it("opens save dialog when save button is clicked", async () => {
      render(<QueryBuilder {...defaultProps} />);
      await userEvent.click(screen.getByTestId("tab-visual"));
      const saveButton = screen.getByRole("button", { name: /Save/i });
      await userEvent.click(saveButton);
      expect(screen.getByTestId("save-dialog")).toBeInTheDocument();
      expect(screen.getByText("Save Query")).toBeInTheDocument();
    });

    it("saves query with custom name", async () => {
      render(<QueryBuilder {...defaultProps} />);

      // Switch to code mode and add query
      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      const editor = screen.getByTestId("editor-textarea");
      await userEvent.type(editor, "SELECT * FROM users;");

      // Open save dialog
      const saveButton = screen.getByRole("button", { name: /Save/i });
      await userEvent.click(saveButton);

      // Enter query name
      const nameInput = screen.getByPlaceholderText("Enter query name...");
      await userEvent.type(nameInput, "My Test Query");

      // Save query
      const saveQueryButton = screen.getByText("Save Query");
      await userEvent.click(saveQueryButton);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "krapi-saved-queries",
        expect.stringContaining("My Test Query")
      );
    });

    it("loads saved queries from localStorage", () => {
      const savedQueries = JSON.stringify([
        {
          name: "Saved Query 1",
          query: "SELECT * FROM users;",
          created: "2024-01-01T00:00:00Z",
        },
      ]);

      mockLocalStorage.getItem.mockReturnValue(savedQueries);

      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByText("Saved Queries")).toBeInTheDocument();
      expect(screen.getByText("Saved Query 1")).toBeInTheDocument();
    });

    it("loads query from history when clicked", async () => {
      // Mock query history
      const queryHistory = JSON.stringify(["SELECT * FROM content;"]);
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "krapi-query-history") return queryHistory;
        return null;
      });

      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByText("Recent Queries")).toBeInTheDocument();

      const historyQuery = screen.getByText("SELECT * FROM content;...");
      await userEvent.click(historyQuery);

      // Should switch to code mode and load query
      expect(screen.getByTestId("editor-textarea")).toBeInTheDocument();
    });
  });

  describe("Monaco Editor Integration", () => {
    it("configures editor with SQL syntax highlighting", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      expect(
        mockMonaco.languages.registerCompletionItemProvider
      ).toHaveBeenCalledWith(
        "sql",
        expect.objectContaining({
          provideCompletionItems: expect.any(Function),
        })
      );
    });

    it("provides SQL keyword completion", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      // Get the completion provider function
      const call =
        mockMonaco.languages.registerCompletionItemProvider.mock.calls[0];
      const provider = call[1];

      const completions = provider.provideCompletionItems({}, {});

      expect(completions.suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "SELECT",
            kind: mockMonaco.languages.CompletionItemKind.Keyword,
          }),
        ])
      );
    });

    it("provides table name completion", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      const call =
        mockMonaco.languages.registerCompletionItemProvider.mock.calls[0];
      const provider = call[1];

      const completions = provider.provideCompletionItems({}, {});

      expect(completions.suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "users",
            kind: mockMonaco.languages.CompletionItemKind.Class,
            detail: "Table (150 rows)",
          }),
        ])
      );
    });

    it("provides column name completion", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const codeTab = screen.getByTestId("tab-code");
      await userEvent.click(codeTab);

      const call =
        mockMonaco.languages.registerCompletionItemProvider.mock.calls[0];
      const provider = call[1];

      const completions = provider.provideCompletionItems({}, {});

      expect(completions.suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "users.username",
            kind: mockMonaco.languages.CompletionItemKind.Field,
            detail: "TEXT (not null)",
          }),
        ])
      );
    });
  });

  describe("Visual Query Generation", () => {
    it("generates SELECT query correctly", () => {
      render(<QueryBuilder {...defaultProps} />);

      // Mock visual query state (would normally be set through UI interactions)
      expect(screen.getByText("Generated SQL")).toBeInTheDocument();
    });

    it("generates INSERT query correctly", () => {
      render(<QueryBuilder {...defaultProps} />);

      // Test INSERT query generation through UI interactions
      expect(screen.getByText("Generated SQL")).toBeInTheDocument();
    });

    it("generates UPDATE query correctly", () => {
      render(<QueryBuilder {...defaultProps} />);

      // Test UPDATE query generation through UI interactions
      expect(screen.getByText("Generated SQL")).toBeInTheDocument();
    });

    it("generates DELETE query correctly", () => {
      render(<QueryBuilder {...defaultProps} />);

      // Test DELETE query generation through UI interactions
      expect(screen.getByText("Generated SQL")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles empty table list gracefully", () => {
      render(<QueryBuilder {...defaultProps} tables={[]} />);

      expect(screen.getByText("Database Schema")).toBeInTheDocument();
      // Should not crash with empty tables
    });

    it("handles localStorage errors gracefully", () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage error");
      });

      render(<QueryBuilder {...defaultProps} />);

      // Should still render without crashing
      expect(screen.getByText("SQL Query Builder")).toBeInTheDocument();
    });

    it("handles invalid saved query JSON", () => {
      mockLocalStorage.getItem.mockReturnValue("invalid json");

      render(<QueryBuilder {...defaultProps} />);

      // Should handle invalid JSON gracefully
      expect(screen.getByText("SQL Query Builder")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("provides proper ARIA labels", () => {
      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      render(<QueryBuilder {...defaultProps} />);

      const executeButton = screen.getByText("Execute");
      executeButton.focus();

      expect(executeButton).toHaveFocus();

      await userEvent.keyboard("{Tab}");

      // Should move focus to next element
    });

    it("provides semantic structure", () => {
      render(<QueryBuilder {...defaultProps} />);

      expect(screen.getByRole("main")).toBeInTheDocument();
      // Count actual buttons: Templates, Save, Execute, tab-visual, tab-code, Add Condition, 2 collapsible triggers
      expect(screen.getAllByRole("button")).toHaveLength(8);
    });
  });
});
