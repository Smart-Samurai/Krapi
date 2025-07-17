"use client";

import { useState, useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import {
  Code,
  Eye,
  Play,
  Save,
  History,
  Table,
  Plus,
  Trash2,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
  }>;
}

interface QueryBuilderProps {
  tables: TableInfo[];
  onExecute: (query: string) => void;
  isExecuting: boolean;
  initialQuery?: string;
}

interface VisualQuery {
  type: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  table: string;
  columns: string[];
  conditions: Array<{
    column: string;
    operator: string;
    value: string;
    logic?: "AND" | "OR";
  }>;
  joins: Array<{
    type: "INNER" | "LEFT" | "RIGHT" | "FULL";
    table: string;
    on: string;
  }>;
  orderBy: Array<{
    column: string;
    direction: "ASC" | "DESC";
  }>;
  groupBy: string[];
  limit?: number;
  insertValues?: Record<string, string>;
  updateValues?: Record<string, string>;
}

const QueryTemplates = {
  "Select All": "SELECT * FROM table_name;",
  "Select with Condition":
    "SELECT column1, column2 FROM table_name WHERE condition = value;",
  "Insert Record":
    "INSERT INTO table_name (column1, column2) VALUES (value1, value2);",
  "Update Record":
    "UPDATE table_name SET column1 = value1 WHERE condition = value;",
  "Delete Record": "DELETE FROM table_name WHERE condition = value;",
  "Join Tables":
    "SELECT t1.*, t2.* FROM table1 t1 JOIN table2 t2 ON t1.id = t2.table1_id;",
  "Count Records": "SELECT COUNT(*) FROM table_name;",
  "Group By": "SELECT column1, COUNT(*) FROM table_name GROUP BY column1;",
};

export default function QueryBuilder({
  tables,
  onExecute,
  isExecuting,
  initialQuery = "",
}: QueryBuilderProps) {
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [query, setQuery] = useState(initialQuery);
  const [visualQuery, setVisualQuery] = useState<VisualQuery>({
    type: "SELECT",
    table: "",
    columns: [],
    conditions: [],
    joins: [],
    orderBy: [],
    groupBy: [],
  });
  const [savedQueries, setSavedQueries] = useState<
    Array<{
      name: string;
      query: string;
      created: string;
    }>
  >([]);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const editorRef = useRef<{ editor: unknown; monaco: unknown } | null>(null);

  // Load saved queries and history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("krapi-saved-queries");
      if (saved) {
        setSavedQueries(JSON.parse(saved));
      }
    } catch {
      setSavedQueries([]);
    }
    try {
      const history = localStorage.getItem("krapi-query-history");
      if (history) {
        setQueryHistory(JSON.parse(history));
      }
    } catch {
      setQueryHistory([]);
    }
  }, []);

  // Save queries and history to localStorage
  const saveToLocalStorage = (
    queries: Array<{ name: string; query: string; created: string }>,
    history: string[]
  ) => {
    localStorage.setItem("krapi-saved-queries", JSON.stringify(queries));
    localStorage.setItem("krapi-query-history", JSON.stringify(history));
  };

  // Generate SQL from visual query
  const generateSQL = (vq: VisualQuery): string => {
    let sql = "";

    switch (vq.type) {
      case "SELECT":
        sql = `SELECT ${
          vq.columns.length > 0 ? vq.columns.join(", ") : "*"
        } FROM ${vq.table}`;

        // Add JOINs
        vq.joins.forEach((join) => {
          sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
        });

        // Add WHERE conditions
        if (vq.conditions.length > 0) {
          sql += " WHERE ";
          vq.conditions.forEach((condition, index) => {
            if (index > 0) {
              sql += ` ${condition.logic || "AND"} `;
            }
            sql += `${condition.column} ${condition.operator} '${condition.value}'`;
          });
        }

        // Add GROUP BY
        if (vq.groupBy.length > 0) {
          sql += ` GROUP BY ${vq.groupBy.join(", ")}`;
        }

        // Add ORDER BY
        if (vq.orderBy.length > 0) {
          sql += " ORDER BY ";
          vq.orderBy.forEach((order, index) => {
            if (index > 0) sql += ", ";
            sql += `${order.column} ${order.direction}`;
          });
        }

        // Add LIMIT
        if (vq.limit) {
          sql += ` LIMIT ${vq.limit}`;
        }
        break;

      case "INSERT":
        if (vq.insertValues) {
          const columns = Object.keys(vq.insertValues);
          const values = Object.values(vq.insertValues);
          sql = `INSERT INTO ${vq.table} (${columns.join(
            ", "
          )}) VALUES (${values.map((v) => `'${v}'`).join(", ")})`;
        }
        break;

      case "UPDATE":
        if (vq.updateValues) {
          const updates = Object.entries(vq.updateValues)
            .map(([key, value]) => `${key} = '${value}'`)
            .join(", ");
          sql = `UPDATE ${vq.table} SET ${updates}`;

          if (vq.conditions.length > 0) {
            sql += " WHERE ";
            vq.conditions.forEach((condition, index) => {
              if (index > 0) {
                sql += ` ${condition.logic || "AND"} `;
              }
              sql += `${condition.column} ${condition.operator} '${condition.value}'`;
            });
          }
        }
        break;

      case "DELETE":
        sql = `DELETE FROM ${vq.table}`;
        if (vq.conditions.length > 0) {
          sql += " WHERE ";
          vq.conditions.forEach((condition, index) => {
            if (index > 0) {
              sql += ` ${condition.logic || "AND"} `;
            }
            sql += `${condition.column} ${condition.operator} '${condition.value}'`;
          });
        }
        break;
    }

    return sql + ";";
  };

  // Update query when visual query changes
  useEffect(() => {
    if (mode === "visual" && visualQuery.table) {
      const sql = generateSQL(visualQuery);
      setQuery(sql);
    }
  }, [visualQuery, mode]);

  // Execute query
  const handleExecute = () => {
    if (query.trim()) {
      onExecute(query);

      // Add to history
      const newHistory = [
        query,
        ...queryHistory.filter((q) => q !== query),
      ].slice(0, 50);
      setQueryHistory(newHistory);
      saveToLocalStorage(savedQueries, newHistory);
    }
  };

  // Save query
  const handleSaveQuery = () => {
    if (saveQueryName.trim() && query.trim()) {
      const newQuery = {
        name: saveQueryName.trim(),
        query: query,
        created: new Date().toISOString(),
      };
      const newSavedQueries = [
        newQuery,
        ...savedQueries.filter((q) => q.name !== newQuery.name),
      ];
      setSavedQueries(newSavedQueries);
      saveToLocalStorage(newSavedQueries, queryHistory);
      setSaveQueryName("");
      setShowSaveDialog(false);
    }
  };

  // Load saved query
  const loadSavedQuery = (savedQuery: string) => {
    setQuery(savedQuery);
    setMode("code");
  };

  // Load template
  const loadTemplate = (template: string) => {
    setQuery(template);
    setMode("code");
    setShowTemplates(false);
  };

  // Add condition to visual query
  const addCondition = () => {
    setVisualQuery((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          column: "",
          operator: "=",
          value: "",
          logic: "AND",
        },
      ],
    }));
  };

  // Remove condition
  const removeCondition = (index: number) => {
    setVisualQuery((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  // Update condition
  const updateCondition = (index: number, field: string, value: string) => {
    setVisualQuery((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) =>
        i === index ? { ...condition, [field]: value } : condition
      ),
    }));
  };

  // Configure Monaco Editor
  const configureEditor = (editor: unknown, monaco: unknown) => {
    editorRef.current = { editor, monaco };

    // Define SQL language
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (monaco as any).languages.registerCompletionItemProvider("sql", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provideCompletionItems: (_model: any, _position: any) => {
        const suggestions = [
          // SQL Keywords
          ...[
            "SELECT",
            "FROM",
            "WHERE",
            "INSERT",
            "UPDATE",
            "DELETE",
            "JOIN",
            "LEFT JOIN",
            "RIGHT JOIN",
            "INNER JOIN",
            "ORDER BY",
            "GROUP BY",
            "HAVING",
            "LIMIT",
            "COUNT",
            "SUM",
            "AVG",
            "MAX",
            "MIN",
          ].map((keyword) => ({
            label: keyword,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            kind: (monaco as any).languages.CompletionItemKind.Keyword,
            insertText: keyword,
          })),
          // Table names
          ...tables.map((table) => ({
            label: table.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            kind: (monaco as any).languages.CompletionItemKind.Class,
            insertText: table.name,
            detail: `Table (${table.rowCount} rows)`,
          })),
          // Column names (for all tables)
          ...tables.flatMap((table) =>
            table.columns.map((column) => ({
              label: `${table.name}.${column.name}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              kind: (monaco as any).languages.CompletionItemKind.Field,
              insertText: column.name,
              detail: `${column.type} ${
                column.nullable ? "(nullable)" : "(not null)"
              }`,
            }))
          ),
        ];

        return { suggestions };
      },
    });

    // Add SQL syntax highlighting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (monaco as any).editor.defineTheme("sql-theme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword.sql", foreground: "0000ff", fontStyle: "bold" },
        { token: "string.sql", foreground: "008000" },
        { token: "number.sql", foreground: "800080" },
      ],
      colors: {},
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (monaco as any).editor.setTheme("sql-theme");
  };

  const selectedTable = tables.find((t) => t.name === visualQuery.table);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">SQL Query Builder</h3>
          <Badge variant="secondary">
            {mode === "visual" ? "Visual" : "Code"}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mode Toggle */}
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "visual" | "code")}
          >
            <TabsList>
              <TabsTrigger
                value="visual"
                className="flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>Visual</span>
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center space-x-1">
                <Code className="h-4 w-4" />
                <span>Code</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Templates */}
          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                data-testid="templates-button"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="templates-dialog">
              <DialogHeader>
                <DialogTitle>Query Templates</DialogTitle>
                <DialogDescription>
                  Choose a template to get started quickly
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                {Object.entries(QueryTemplates).map(([name, template]) => (
                  <Button
                    key={name}
                    variant="outline"
                    onClick={() => loadTemplate(template)}
                    className="justify-start"
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Save Query */}
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="save-button">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="save-dialog">
              <DialogHeader>
                <DialogTitle>Save Query</DialogTitle>
                <DialogDescription>
                  Give your query a name to save it for later use
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="queryName">Query Name</Label>
                  <Input
                    id="queryName"
                    value={saveQueryName}
                    onChange={(e) => setSaveQueryName(e.target.value)}
                    placeholder="Enter query name..."
                  />
                </div>
                <Button onClick={handleSaveQuery} className="w-full">
                  Save Query
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Execute */}
          <Button
            onClick={handleExecute}
            disabled={isExecuting || !query.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-1" />
            {isExecuting ? "Executing..." : "Execute"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" role="main">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tables */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center">
              <Table className="h-4 w-4 mr-2" />
              Database Schema
            </h4>
            <div className="space-y-2">
              {tables.map((table) => (
                <Collapsible key={table.name}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <ChevronRight className="h-3 w-3" />
                      <span className="font-medium">{table.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {table.rowCount}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-1">
                    {table.columns.map((column) => (
                      <div
                        key={column.name}
                        className="flex items-center justify-between text-sm p-1 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => {
                          if (mode === "code" && editorRef.current) {
                            const { editor } = editorRef.current;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const position = (editor as any).getPosition();
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (editor as any).executeEdits("", [
                              {
                                range: {
                                  startLineNumber: position.lineNumber,
                                  startColumn: position.column,
                                  endLineNumber: position.lineNumber,
                                  endColumn: position.column,
                                },
                                text: column.name,
                              },
                            ]);
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (editor as any).focus();
                          }
                        }}
                      >
                        <span className="text-gray-600">{column.name}</span>
                        <span className="text-xs text-gray-400">
                          {column.type}
                        </span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Saved Queries */}
          {savedQueries.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center">
                <Save className="h-4 w-4 mr-2" />
                Saved Queries
              </h4>
              <div className="space-y-1">
                {savedQueries.slice(0, 5).map((saved, index) => (
                  <div
                    key={index}
                    className="p-2 text-sm hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => loadSavedQuery(saved.query)}
                  >
                    <div className="font-medium truncate">{saved.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(saved.created).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query History */}
          {queryHistory.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center">
                <History className="h-4 w-4 mr-2" />
                Recent Queries
              </h4>
              <div className="space-y-1">
                {queryHistory.slice(0, 3).map((historyQuery, index) => (
                  <div
                    key={index}
                    className="p-2 text-xs hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() =>
                      loadSavedQuery(
                        typeof historyQuery === "string" ? historyQuery : ""
                      )
                    }
                  >
                    <code className="text-gray-600 truncate block">
                      {typeof historyQuery === "string"
                        ? historyQuery.substring(0, 50)
                        : ""}
                      ...
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Query Area */}
        <div className="lg:col-span-3">
          {mode === "visual" ? (
            /* Visual Query Builder */
            <div
              className="bg-white border rounded-lg p-4 space-y-4"
              role="tabpanel"
              aria-label="Visual Query Builder"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Query Type */}
                <div>
                  <Label>Query Type</Label>
                  <Select
                    value={visualQuery.type}
                    onValueChange={(value) =>
                      setVisualQuery((prev) => ({
                        ...prev,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        type: value as any,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELECT">SELECT - Read Data</SelectItem>
                      <SelectItem value="INSERT">INSERT - Add Data</SelectItem>
                      <SelectItem value="UPDATE">
                        UPDATE - Modify Data
                      </SelectItem>
                      <SelectItem value="DELETE">
                        DELETE - Remove Data
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table Selection */}
                <div>
                  <Label>Table</Label>
                  <Select
                    value={visualQuery.table}
                    onValueChange={(value) =>
                      setVisualQuery((prev) => ({ ...prev, table: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select table..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.name} value={table.name}>
                          {table.name} ({table.rowCount} rows)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Columns (for SELECT) */}
              {visualQuery.type === "SELECT" && selectedTable && (
                <div>
                  <Label>Columns</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {selectedTable.columns.map((column) => (
                      <label
                        key={column.name}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={visualQuery.columns.includes(column.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVisualQuery((prev) => ({
                                ...prev,
                                columns: [...prev.columns, column.name],
                              }));
                            } else {
                              setVisualQuery((prev) => ({
                                ...prev,
                                columns: prev.columns.filter(
                                  (c) => c !== column.name
                                ),
                              }));
                            }
                          }}
                        />
                        <span className="text-sm">{column.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Conditions</Label>
                  <Button onClick={addCondition} size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Condition
                  </Button>
                </div>
                <div className="space-y-2">
                  {visualQuery.conditions.map((condition, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-6 gap-2 items-center"
                    >
                      {index > 0 && (
                        <Select
                          value={condition.logic}
                          onValueChange={(value) =>
                            updateCondition(index, "logic", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {index === 0 && <div></div>}

                      <Select
                        value={condition.column}
                        onValueChange={(value) =>
                          updateCondition(index, "column", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedTable?.columns.map((column) => (
                            <SelectItem key={column.name} value={column.name}>
                              {column.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition(index, "operator", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="=">=</SelectItem>
                          <SelectItem value="!=">!=</SelectItem>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                          <SelectItem value=">=">&gt;=</SelectItem>
                          <SelectItem value="<=">&lt;=</SelectItem>
                          <SelectItem value="LIKE">LIKE</SelectItem>
                          <SelectItem value="IN">IN</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) =>
                          updateCondition(index, "value", e.target.value)
                        }
                      />

                      <Button
                        onClick={() => removeCondition(index)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limit (for SELECT) */}
              {visualQuery.type === "SELECT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Limit Results</Label>
                    <Input
                      type="number"
                      placeholder="Number of rows"
                      value={visualQuery.limit || ""}
                      onChange={(e) =>
                        setVisualQuery((prev) => ({
                          ...prev,
                          limit: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Generated SQL Preview */}
              <div>
                <Label>Generated SQL</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded border font-mono text-sm">
                  {visualQuery.table
                    ? generateSQL(visualQuery)
                    : "Select a table to see generated SQL..."}
                </div>
              </div>
            </div>
          ) : (
            /* Code Editor */
            <div
              className="bg-white border rounded-lg overflow-hidden"
              role="tabpanel"
              aria-label="Code Editor"
            >
              <div className="h-96">
                <Editor
                  height="100%"
                  defaultLanguage="sql"
                  value={query}
                  onChange={(value) => setQuery(value || "")}
                  onMount={configureEditor}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    roundedSelection: false,
                    automaticLayout: true,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    wordBasedSuggestions: "allDocuments",
                  }}
                  data-testid="editor-textarea"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
