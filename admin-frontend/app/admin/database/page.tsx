"use client";

import { useState, useEffect, useCallback } from "react";
import { createDefaultKrapi } from "@/lib/krapi";
import {
  Loader2,
  Database,
  RefreshCw,
  Download,
  FileJson,
  Table,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
    primaryKey: boolean;
  }>;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  error?: string;
  executionTime?: number;
}

export default function DatabasePage() {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [_queryLoading] = useState(false);
  const [dbStats, setDbStats] = useState<Record<string, unknown> | null>(null);

  const fetchDatabaseInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await createDefaultKrapi().admin.getDatabaseStats();
      if (response.success) {
        // Transform collections to match table interface
        const transformedTables = (response.data || []).map(
          (collection: unknown) => ({
            name: (collection as { name: string }).name,
            rowCount:
              (collection as { documentCount?: number }).documentCount || 0,
            columns: Object.keys(
              (collection as { schema?: Record<string, unknown> }).schema || {}
            ).map((key: string) => ({
              name: key,
              type:
                (
                  (collection as { schema?: Record<string, unknown> }).schema?.[
                    key
                  ] as { type?: string }
                )?.type || "string",
              nullable:
                (
                  (collection as { schema?: Record<string, unknown> }).schema?.[
                    key
                  ] as { nullable?: boolean }
                )?.nullable || false,
              defaultValue: (
                (collection as { schema?: Record<string, unknown> }).schema?.[
                  key
                ] as { default?: unknown }
              )?.default,
              primaryKey:
                (
                  (collection as { schema?: Record<string, unknown> }).schema?.[
                    key
                  ] as { primaryKey?: boolean }
                )?.primaryKey || false,
            })),
          })
        );
        setTables(transformedTables);
        setDbStats({ collections: response.data?.length || 0 });
      }
    } catch {
      // setError("Failed to fetch database info"); // Original code had this line commented out
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch database tables
  useEffect(() => {
    fetchDatabaseInfo();
  }, [fetchDatabaseInfo]);

  // Fetch table data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const fetchTableData = async (_tableName: string) => {
    try {
      setLoading(true);
      // Placeholder implementation - replace with actual API call when available
      setTableData({
        columns: ["id", "username", "email"],
        rows: [{ id: 1, username: "admin", email: "admin@krapi.local" }],
      });
    } catch {
      // setError(`Failed to fetch table data for ${tableName}`); // Original code had this line commented out
      setTableData({
        columns: [],
        rows: [],
        error: "Failed to fetch table data",
      });
    } finally {
      setLoading(false);
    }
  };

  const _executeQuery = async (_query: string) => {
    try {
      // setQueryLoading(true); // Original code had this line commented out
      // Note: Query execution is not implemented in the new API yet
      setQueryResult({
        columns: ["result"],
        rows: [{ result: "Query execution not implemented yet" }],
        executionTime: 0,
      });
    } catch {
      // setError("Failed to execute query"); // Original code had this line commented out
      setQueryResult({
        columns: [],
        rows: [],
        error: "Failed to execute query",
      });
    } finally {
      // setQueryLoading(false); // Original code had this line commented out
    }
  };

  const exportDatabase = async () => {
    try {
      // Note: Database export is not implemented in the new API yet
      // Placeholder implementation - replace with actual API call when available
      // console.log("Exporting database..."); // Original code had this line commented out
      // Create a dummy export
      const data = {
        tables: tables,
        stats: dbStats,
        exported_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `database-export-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // setError("Failed to export database"); // Original code had this line commented out
    }
  };

  const refreshDatabase = () => {
    fetchDatabaseInfo();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Database Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor your database
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={refreshDatabase} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={exportDatabase} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Database Stats */}
      {dbStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Users</p>
                  <p className="text-2xl font-bold">{dbStats.users || 0}</p>
                </div>
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Login Logs</p>
                  <p className="text-2xl font-bold">{dbStats.loginLogs || 0}</p>
                </div>
                <FileJson className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">System Settings</p>
                  <p className="text-2xl font-bold">
                    {dbStats.systemSettings || 0}
                  </p>
                </div>
                <Table className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Table className="mr-2 h-5 w-5" />
            Database Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading tables...</span>
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tables found
            </div>
          ) : (
            <div className="space-y-4">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTable === table.name
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTable(table.name)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{table.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {table.rowCount} rows • {table.columns.length} columns
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {table.columns.filter((col) => col.primaryKey).length} PK
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Data */}
      {selectedTable && tableData && (
        <Card>
          <CardHeader>
            <CardTitle>Table: {selectedTable}</CardTitle>
          </CardHeader>
          <CardContent>
            {tableData.error ? (
              <div className="text-red-600">{tableData.error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      {tableData.columns.map((column) => (
                        <th
                          key={column}
                          className="border border-border p-2 text-left"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, index) => (
                      <tr key={index}>
                        {tableData.columns.map((column) => (
                          <td key={column} className="border border-border p-2">
                            {String(row[column] || "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Query Results */}
      {queryResult && (
        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            {queryResult.executionTime !== undefined && (
              <p className="text-sm text-muted-foreground">
                Execution time: {queryResult.executionTime}ms
              </p>
            )}
          </CardHeader>
          <CardContent>
            {queryResult.error ? (
              <div className="text-red-600">{queryResult.error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      {queryResult.columns.map((column) => (
                        <th
                          key={column}
                          className="border border-border p-2 text-left"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, index) => (
                      <tr key={index}>
                        {queryResult.columns.map((column) => (
                          <td key={column} className="border border-border p-2">
                            {String(row[column] || "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
