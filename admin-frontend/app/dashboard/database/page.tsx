"use client";

import { useState, useEffect } from "react";
import { databaseAPI } from "@/lib/api";
import {
  Loader2,
  Database,
  RefreshCw,
  Download,
  Trash2,
  FileJson,
  Table,
} from "lucide-react";
import QueryBuilder from "@/components/QueryBuilder";

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
  const [queryLoading, setQueryLoading] = useState(false);
  const [dbStats, setDbStats] = useState<Record<string, unknown> | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Fetch database tables
  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  // Fetch table data when selected table changes
  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const fetchDatabaseInfo = async () => {
    try {
      setLoading(true);
      const response = await databaseAPI.getDatabaseInfo();
      if (response.success) {
        // Transform tables to match QueryBuilder interface
        const transformedTables = (response.tables || []).map((table: any) => ({
          name: table.name,
          rowCount: table.rowCount || 0,
          columns: (table.columns || []).map((col: any) => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable || false,
            defaultValue: col.defaultValue,
            primaryKey: col.primaryKey || false,
          })),
        }));
        setTables(transformedTables);
        setDbStats(response.stats || {});
      }
    } catch (error: unknown) {
      console.error("Failed to fetch database info:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName: string) => {
    try {
      setLoading(true);
      const response = await databaseAPI.getTableData(tableName);
      if (response.success) {
        setTableData(response);
      }
    } catch (error) {
      console.error(`Failed to fetch table data for ${tableName}:`, error);
      setTableData({
        columns: [],
        rows: [],
        error: "Failed to fetch table data",
      });
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async (query: string) => {
    if (!query.trim()) return;

    try {
      setQueryLoading(true);
      const response = await databaseAPI.executeQuery(query);
      if (response.success) {
        setQueryResult(response);
      } else {
        setQueryResult({
          columns: [],
          rows: [],
          error: response.error || "Query execution failed",
        });
      }
    } catch (error: unknown) {
      console.error("Query execution failed:", error);
      setQueryResult({
        columns: [],
        rows: [],
        error: "Query execution failed",
      });
    } finally {
      setQueryLoading(false);
    }
  };

  const exportDatabase = async () => {
    try {
      const response = await databaseAPI.exportDatabase();

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `krapi-db-export-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to export database:", error);
      alert("Failed to export database");
    }
  };

  const resetDatabase = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }

    try {
      const response = await databaseAPI.resetDatabase();
      if (response.success) {
        alert("Database has been reset successfully");
        setResetConfirm(false);
        fetchDatabaseInfo();
      } else {
        alert("Failed to reset database");
      }
    } catch (error) {
      console.error("Failed to reset database:", error);
      alert("Failed to reset database");
    }
  };

  const cancelReset = () => {
    setResetConfirm(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Database className="mr-2" /> Database Management
        </h1>
        <div className="flex gap-2">
          <button
            onClick={fetchDatabaseInfo}
            className="btn btn-sm btn-outline flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={exportDatabase}
            className="btn btn-sm btn-primary flex items-center gap-1"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          {resetConfirm ? (
            <div className="flex gap-2">
              <button
                onClick={resetDatabase}
                className="btn btn-sm btn-error flex items-center gap-1"
              >
                Confirm Reset
              </button>
              <button
                onClick={cancelReset}
                className="btn btn-sm btn-outline flex items-center gap-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={resetDatabase}
              className="btn btn-sm btn-warning flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" /> Reset DB
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Database Stats */}
          <div className="col-span-1 bg-background-100 dark:bg-background-100 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FileJson className="mr-2 h-5 w-5" /> Database Statistics
            </h2>
            {dbStats ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-background-50 rounded">
                  <span>File Size:</span>
                  <span className="font-medium">
                    {((dbStats.fileSize as number) / (1024 * 1024)).toFixed(2)}{" "}
                    MB
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background-50 rounded">
                  <span>Total Tables:</span>
                  <span className="font-medium">{tables.length}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background-50 rounded">
                  <span>Total Records:</span>
                  <span className="font-medium">
                    {(dbStats.totalRecords as number) || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background-50 rounded">
                  <span>Last Modified:</span>
                  <span className="font-medium">
                    {(dbStats.lastModified as string) || "N/A"}
                  </span>
                </div>
              </div>
            ) : (
              <p>No statistics available</p>
            )}
          </div>

          {/* Tables List */}
          <div className="col-span-1 bg-background-100 dark:bg-background-100 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Table className="mr-2 h-5 w-5" /> Tables
            </h2>
            <div className="max-h-80 overflow-y-auto">
              <ul className="divide-y divide-background-200">
                {tables.map((table) => (
                  <li
                    key={table.name}
                    className={`p-2 cursor-pointer hover:bg-primary-50 ${
                      selectedTable === table.name ? "bg-primary-100" : ""
                    }`}
                    onClick={() => setSelectedTable(table.name)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{table.name}</span>
                      <span className="text-xs bg-background-200 px-2 py-1 rounded-full">
                        {table.rowCount} rows
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Table Data / Query Result */}
          <div className="col-span-1 lg:col-span-2 bg-background-100 dark:bg-background-100 p-4 rounded-lg shadow">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <Table className="mr-2 h-5 w-5" />
                {selectedTable ? `Table: ${selectedTable}` : "SQL Query"}
              </h2>

              <QueryBuilder
                tables={tables}
                onExecute={executeQuery}
                isExecuting={queryLoading}
              />
            </div>

            <div className="border rounded overflow-hidden">
              {tableData || queryResult ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-background-200">
                    <thead className="bg-background-50">
                      <tr>
                        {(queryResult?.columns || tableData?.columns || []).map(
                          (column, i) => (
                            <th
                              key={i}
                              className="px-6 py-3 text-left text-xs font-medium text-text-500 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-background divide-y divide-background-200">
                      {(queryResult?.rows || tableData?.rows || []).map(
                        (row, i) => (
                          <tr key={i} className="hover:bg-background-50">
                            {Object.values(row).map((value: unknown, j) => (
                              <td
                                key={j}
                                className="px-6 py-2 whitespace-nowrap text-sm text-text-500"
                              >
                                {value === null ? (
                                  <span className="text-text-400 italic">
                                    null
                                  </span>
                                ) : typeof value === "object" ? (
                                  JSON.stringify(value)
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-text-500">
                  {selectedTable
                    ? "Select a table to view data"
                    : "Run a query to see results"}
                </div>
              )}

              {(queryResult?.error || tableData?.error) && (
                <div className="p-4 bg-destructive-50 text-destructive-700 border-t border-destructive-200">
                  Error: {queryResult?.error || tableData?.error}
                </div>
              )}

              {(queryResult || tableData) &&
                !(queryResult?.error || tableData?.error) && (
                  <div className="p-2 bg-background-50 text-sm text-text-500 border-t">
                    {queryResult?.executionTime && (
                      <span>
                        Execution time: {queryResult.executionTime}ms •{" "}
                      </span>
                    )}
                    <span>
                      {(queryResult?.rows || tableData?.rows || []).length} rows
                      returned
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
