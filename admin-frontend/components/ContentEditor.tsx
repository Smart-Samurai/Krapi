"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { FileText, Code, Eye, EyeOff } from "lucide-react";

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  contentType: string;
  schema?: Record<string, unknown>;
  height?: string;
  placeholder?: string;
}

type EditorMode = "edit" | "preview";

export default function ContentEditor({
  value,
  onChange,
  contentType,
  height = "400px",
  placeholder = "",
}: ContentEditorProps) {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [isPreviewSupported, setIsPreviewSupported] = useState(false);

  useEffect(() => {
    // Determine if preview is supported for this content type
    setIsPreviewSupported(
      contentType === "markdown" ||
        contentType === "html" ||
        contentType === "json"
    );
  }, [contentType]);

  const getEditorLanguage = () => {
    switch (contentType.toLowerCase()) {
      case "markdown":
      case "md":
        return "markdown";
      case "html":
        return "html";
      case "json":
        return "json";
      case "javascript":
      case "js":
        return "javascript";
      case "typescript":
      case "ts":
        return "typescript";
      case "css":
        return "css";
      case "yaml":
      case "yml":
        return "yaml";
      case "xml":
        return "xml";
      case "sql":
        return "sql";
      case "python":
      case "py":
        return "python";
      default:
        return "plaintext";
    }
  };

  const getEditorOptions = () => {
    const baseOptions = {
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      wordWrap: "on" as const,
      lineNumbers: "on" as const,
      folding: true,
      tabSize: 2,
      insertSpaces: true,
      automaticLayout: true,
    };

    // Content-type specific options
    switch (contentType.toLowerCase()) {
      case "markdown":
      case "md":
        return {
          ...baseOptions,
          wordWrap: "wordWrapColumn" as const,
          wordWrapColumn: 80,
          rulers: [80],
        };
      case "json":
        return {
          ...baseOptions,
          formatOnPaste: true,
          formatOnType: true,
        };
      case "text":
      case "plaintext":
        return {
          ...baseOptions,
          lineNumbers: "off" as const,
          folding: false,
        };
      default:
        return baseOptions;
    }
  };

  const renderPreview = () => {
    if (!value.trim()) {
      return (
        <div className="flex items-center justify-center h-full text-text-500 dark:text-text-500">
          No content to preview
        </div>
      );
    }

    switch (contentType.toLowerCase()) {
      case "markdown":
      case "md":
        return (
          <div className="prose prose-sm max-w-none p-4 h-full overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }} />
          </div>
        );
      case "html":
        return (
          <div className="p-4 h-full overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: value }} />
          </div>
        );
      case "json":
        return (
          <div className="p-4 h-full overflow-auto">
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(JSON.parse(value), null, 2)}
            </pre>
          </div>
        );
      default:
        return (
          <div className="p-4 h-full overflow-auto">
            <pre className="whitespace-pre-wrap text-sm">{value}</pre>
          </div>
        );
    }
  };

  // Simple markdown parser (you might want to use a proper library like marked)
  const parseMarkdown = (markdown: string): string => {
    return markdown
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      .replace(/!\[([^\]]*)\]\(([^\)]*)\)/gim, '<img alt="$1" src="$2" />')
      .replace(/\[([^\]]*)\]\(([^\)]*)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, "<br>");
  };

  const getContentTypeIcon = () => {
    switch (contentType.toLowerCase()) {
      case "markdown":
      case "md":
        return <FileText className="h-4 w-4" />;
      case "json":
      case "javascript":
      case "typescript":
      case "html":
      case "css":
        return <Code className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getContentTypeLabel = () => {
    switch (contentType.toLowerCase()) {
      case "markdown":
      case "md":
        return "Markdown";
      case "html":
        return "HTML";
      case "json":
        return "JSON";
      case "javascript":
      case "js":
        return "JavaScript";
      case "typescript":
      case "ts":
        return "TypeScript";
      case "css":
        return "CSS";
      case "yaml":
      case "yml":
        return "YAML";
      case "xml":
        return "XML";
      case "sql":
        return "SQL";
      case "python":
      case "py":
        return "Python";
      default:
        return "Plain Text";
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-background-50 dark:bg-background-50 border-b">
        <div className="flex items-center space-x-2">
          {getContentTypeIcon()}
          <span className="text-sm font-medium text-text-700 dark:text-text-300">
            {getContentTypeLabel()}
          </span>
        </div>

        {isPreviewSupported && (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`px-2 py-1 text-xs rounded ${
                mode === "edit"
                  ? "bg-blue-100 text-blue-700"
                  : "text-text-500 dark:text-text-500 hover:text-text-700 dark:text-text-300"
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`px-2 py-1 text-xs rounded flex items-center space-x-1 ${
                mode === "preview"
                  ? "bg-blue-100 text-blue-700"
                  : "text-text-500 dark:text-text-500 hover:text-text-700 dark:text-text-300"
              }`}
            >
              {mode === "preview" ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              <span>Preview</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ height }}>
        {mode === "edit" ? (
          <Editor
            height="100%"
            language={getEditorLanguage()}
            value={value || placeholder}
            onChange={(val: string | undefined) => onChange(val || "")}
            options={getEditorOptions()}
            theme="vs"
          />
        ) : (
          renderPreview()
        )}
      </div>

      {/* Footer with hints */}
      {mode === "edit" && (
        <div className="px-3 py-2 bg-background-50 dark:bg-background-50 border-t">
          <div className="text-xs text-text-500 dark:text-text-500">
            {contentType.toLowerCase() === "markdown" && (
              <span>
                <strong>Markdown tips:</strong> # Heading, **bold**, *italic*,
                [link](url), ![image](url)
              </span>
            )}
            {contentType.toLowerCase() === "json" && (
              <span>
                <strong>JSON tips:</strong> Use Ctrl+Shift+F to format,
                Ctrl+Space for autocomplete
              </span>
            )}
            {(contentType.toLowerCase() === "text" ||
              contentType.toLowerCase() === "plaintext") && (
              <span>
                <strong>Plain text:</strong> Enter your content as plain text
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
