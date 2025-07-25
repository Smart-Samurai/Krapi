"use client";

import { useState, useEffect } from "react";
import { createDefaultKrapi } from "@/lib/krapi";
import {
  Loader2,
  Database,
  RefreshCw,
  Download,
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
      // Placeholder implementation - replace with actual API call when available
      const response = await createDefaultKrapi().database.listCollections();
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
  };

  const fetchTableData = async (tableName: string) => {
    try {
      setLoading(true);
      // Placeholder implementation - replace with actual API call when available
      const response = await createDefaultKrapi().database.listDocuments(
        tableName
      );
      if (response.success) {
        const columns =
          response.data && response.data.length > 0
            ? Object.keys(response.data[0])
            : [];
        setTableData({
          columns,
          rows: response.data || [],
        });
      }
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

  const executeQuery = async (_query: string) => {
    try {
      setQueryLoading(true);
      // Placeholder implementation - replace with actual API call when available
      // console.log("Executing query:", query); // Original code had this line commented out
      setQueryResult({
        columns: [],
        rows: [],
        error: "Query execution not implemented yet",
      });
    } catch {
      // setError("Failed to execute query"); // Original code had this line commented out
      setQueryResult({
        columns: [],
        rows: [],
        error: "Failed to execute query",
      });
    } finally {
      setQueryLoading(false);
    }
  };

  const exportDatabase = async () => {
    try {
      // Placeholder implementation - replace with actual API call when available
      // console.log("Exporting database..."); // Original code had this line commented out
      // Create a dummy export
      const data = {
        tables: tables,
        stats: dbStats,
        exportedAt: new Date().toISOString(),
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

      {/* Database Reset Component */}
      <div className="mt-8">
        {/* DatabaseReset component was removed, so this section is now empty */}
      </div>
    </div>
  );
}
