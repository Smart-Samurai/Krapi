"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { AlertCircle, CheckCircle, Lightbulb } from "lucide-react";

interface JsonSchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
}

export default function JsonSchemaEditor({
  value,
  onChange,
  placeholder = "",
  height = "400px",
}: JsonSchemaEditorProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(true);
  const editorRef = useRef<unknown>(null);

  const validateJsonSchema = (
    jsonString: string
  ): { valid: boolean; errors: ValidationError[] } => {
    if (!jsonString.trim()) {
      return { valid: true, errors: [] };
    }

    try {
      const parsed = JSON.parse(jsonString);

      // Basic JSON Schema validation
      const errors: ValidationError[] = [];

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        errors.push({
          line: 1,
          column: 1,
          message: "Schema must be an object",
        });
      } else {
        // Check for common JSON Schema properties
        if (
          !parsed.type &&
          !parsed.properties &&
          !parsed.$ref &&
          !parsed.allOf &&
          !parsed.anyOf &&
          !parsed.oneOf
        ) {
          errors.push({
            line: 1,
            column: 1,
            message:
              "Schema should have at least one of: type, properties, $ref, allOf, anyOf, or oneOf",
          });
        }

        // Validate specific patterns
        if (
          parsed.type &&
          typeof parsed.type !== "string" &&
          !Array.isArray(parsed.type)
        ) {
          errors.push({
            line: 1,
            column: 1,
            message: 'Property "type" must be a string or array of strings',
          });
        }

        if (parsed.properties && typeof parsed.properties !== "object") {
          errors.push({
            line: 1,
            column: 1,
            message: 'Property "properties" must be an object',
          });
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid JSON";
      const match = errorMessage.match(/at position (\d+)/);
      const position = match ? parseInt(match[1]) : 0;

      // Convert position to line/column (approximation)
      const lines = jsonString.substring(0, position).split("\n");
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      return {
        valid: false,
        errors: [
          {
            line,
            column,
            message: errorMessage,
          },
        ],
      };
    }
  };

  useEffect(() => {
    const validation = validateJsonSchema(value);
    setErrors(validation.errors);
    setIsValid(validation.valid);
  }, [value]);

  const handleEditorDidMount = (editor: unknown, monaco: unknown) => {
    editorRef.current = editor;

    // Configure JSON Schema for the editor using type assertion for Monaco's API
    const monacoInstance = monaco as {
      languages: {
        json: {
          jsonDefaults: {
            setDiagnosticsOptions: (options: {
              validate?: boolean;
              allowComments?: boolean;
              schemas?: Array<{
                uri: string;
                fileMatch: string[];
                schema: Record<string, unknown>;
              }>;
            }) => void;
          };
        };
      };
    };

    monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [
        {
          uri: "http://myserver/foo-schema.json",
          fileMatch: ["*"],
          schema: {
            type: "object",
            properties: {
              type: {
                enum: [
                  "object",
                  "array",
                  "string",
                  "number",
                  "boolean",
                  "null",
                ],
              },
              properties: {
                type: "object",
              },
              required: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
          },
        },
      ],
    });
  };

  const getDefaultSchema = () => {
    return JSON.stringify(
      {
        type: "object",
        properties: {
          username: {
            type: "string",
            description: "User's username",
            default: "",
          },
          password: {
            type: "string",
            description: "User's password",
            default: "",
          },
        },
        required: ["username", "password"],
        additionalProperties: false,
      },
      null,
      2
    );
  };

  const insertExample = () => {
    onChange(getDefaultSchema());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span
            className={`text-sm font-medium ${
              isValid ? "text-green-700" : "text-red-700"
            }`}
          >
            {isValid
              ? "Valid JSON Schema"
              : `${errors.length} error${errors.length !== 1 ? "s" : ""} found`}
          </span>
        </div>
        <button
          type="button"
          onClick={insertExample}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
        >
          <Lightbulb className="h-4 w-4" />
          <span>Insert Example</span>
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Schema Errors:
          </h4>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                <span className="font-mono bg-red-100 px-1 rounded">
                  Line {error.line}, Column {error.column}:
                </span>{" "}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Editor
          height={height}
          defaultLanguage="json"
          value={value || placeholder}
          onChange={(val: string | undefined) => onChange(val || "")}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: "on",
            lineNumbers: "on",
            folding: true,
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true,
          }}
          theme="vs"
        />
      </div>

      <div className="text-xs text-text-500 dark:text-text-500 space-y-1">
        <p>
          <strong>Tip:</strong> Use Ctrl+Space for autocomplete, Ctrl+Shift+F to
          format
        </p>
        <p>
          <strong>Common types:</strong> &quot;string&quot;, &quot;number&quot;,
          &quot;integer&quot;, &quot;boolean&quot;, &quot;array&quot;,
          &quot;object&quot;, &quot;null&quot;
        </p>
      </div>
    </div>
  );
}
