"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";

interface SchemaFormGeneratorProps {
  schema: Record<string, unknown>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  readOnly?: boolean;
}

interface FormField {
  key: string;
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  properties?: Record<string, unknown>;
  items?: Record<string, unknown>;
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export default function SchemaFormGenerator({
  schema,
  value,
  onChange,
  readOnly = false,
}: SchemaFormGeneratorProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(
    value || {}
  );
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(
    () => {
      // Parse schema and generate field definitions
      const parsedFields = parseSchemaToFields(schema);
      setFields(parsedFields);

      // Initialize form data with defaults
      const initialData = { ...value };
      parsedFields.forEach((field) => {
        if (
          initialData[field.key] === undefined &&
          field.default !== undefined
        ) {
          initialData[field.key] = field.default;
        }
      });
      setFormData(initialData);
    },
    [schema] /* eslint-disable-line react-hooks/exhaustive-deps */
  );

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const parseSchemaToFields = (
    schema: Record<string, unknown>
  ): FormField[] => {
    const fields: FormField[] = [];

    if (schema.type === "object" && schema.properties) {
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;
      const required = (schema.required as string[]) || [];

      Object.entries(properties).forEach(([key, fieldSchema]) => {
        fields.push({
          key,
          type: (fieldSchema.type as string) || "string",
          title: (fieldSchema.title as string) || key,
          description: fieldSchema.description as string,
          default: fieldSchema.default,
          required: required.includes(key),
          properties: fieldSchema.properties as Record<string, unknown>,
          items: fieldSchema.items as Record<string, unknown>,
          enum: fieldSchema.enum as unknown[],
          format: fieldSchema.format as string,
          minimum: fieldSchema.minimum as number,
          maximum: fieldSchema.maximum as number,
          minLength: fieldSchema.minLength as number,
          maxLength: fieldSchema.maxLength as number,
        });
      });
    }

    return fields;
  };

  const updateFieldValue = (key: string, newValue: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [key]: newValue,
    }));
  };

  const addArrayItem = (fieldKey: string) => {
    const currentArray = (formData[fieldKey] as unknown[]) || [];
    const field = fields.find((f) => f.key === fieldKey);

    let defaultItem: unknown = "";
    if (field?.items?.type === "object") {
      defaultItem = {};
    } else if (field?.items?.type === "number") {
      defaultItem = 0;
    } else if (field?.items?.type === "boolean") {
      defaultItem = false;
    }

    updateFieldValue(fieldKey, [...currentArray, defaultItem]);
  };

  const removeArrayItem = (fieldKey: string, index: number) => {
    const currentArray = (formData[fieldKey] as unknown[]) || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    updateFieldValue(fieldKey, newArray);
  };

  const updateArrayItem = (
    fieldKey: string,
    index: number,
    newValue: unknown
  ) => {
    const currentArray = (formData[fieldKey] as unknown[]) || [];
    const newArray = [...currentArray];
    newArray[index] = newValue;
    updateFieldValue(fieldKey, newArray);
  };

  const renderField = (field: FormField) => {
    const fieldValue = formData[field.key];
    const fieldId = `field-${field.key}`;

    const baseClasses = `w-full px-3 py-2 border border-background-300 dark:border-background-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      readOnly ? "bg-background-100 dark:bg-background-100 cursor-not-allowed" : ""
    }`;

    switch (field.type) {
      case "string":
        if (field.enum) {
          // Enum/Select
          return (
            <select
              id={fieldId}
              value={(fieldValue as string) || ""}
              onChange={(e) => updateFieldValue(field.key, e.target.value)}
              className={baseClasses}
              disabled={readOnly}
            >
              <option value="">Select an option</option>
              {field.enum.map((option, index) => (
                <option key={index} value={String(option)}>
                  {String(option)}
                </option>
              ))}
            </select>
          );
        } else if (field.format === "date") {
          // Date input
          return (
            <div className="relative">
              <input
                id={fieldId}
                type="date"
                value={(fieldValue as string) || ""}
                onChange={(e) => updateFieldValue(field.key, e.target.value)}
                className={baseClasses}
                disabled={readOnly}
                min={
                  field.minimum
                    ? new Date(field.minimum).toISOString().split("T")[0]
                    : undefined
                }
                max={
                  field.maximum
                    ? new Date(field.maximum).toISOString().split("T")[0]
                    : undefined
                }
              />
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-text-400 dark:text-text-600 pointer-events-none" />
            </div>
          );
        } else if (field.format === "email") {
          // Email input
          return (
            <input
              id={fieldId}
              type="email"
              value={(fieldValue as string) || ""}
              onChange={(e) => updateFieldValue(field.key, e.target.value)}
              className={baseClasses}
              disabled={readOnly}
              minLength={field.minLength}
              maxLength={field.maxLength}
            />
          );
        } else if (field.format === "uri") {
          // URL input
          return (
            <input
              id={fieldId}
              type="url"
              value={(fieldValue as string) || ""}
              onChange={(e) => updateFieldValue(field.key, e.target.value)}
              className={baseClasses}
              disabled={readOnly}
            />
          );
        } else {
          // Regular text input or textarea
          const isLongText = field.maxLength && field.maxLength > 100;
          return isLongText ? (
            <textarea
              id={fieldId}
              value={(fieldValue as string) || ""}
              onChange={(e) => updateFieldValue(field.key, e.target.value)}
              className={baseClasses}
              disabled={readOnly}
              rows={4}
              minLength={field.minLength}
              maxLength={field.maxLength}
            />
          ) : (
            <input
              id={fieldId}
              type="text"
              value={(fieldValue as string) || ""}
              onChange={(e) => updateFieldValue(field.key, e.target.value)}
              className={baseClasses}
              disabled={readOnly}
              minLength={field.minLength}
              maxLength={field.maxLength}
            />
          );
        }

      case "number":
      case "integer":
        return (
          <input
            id={fieldId}
            type="number"
            value={(fieldValue as number) || ""}
            onChange={(e) =>
              updateFieldValue(
                field.key,
                e.target.value ? Number(e.target.value) : null
              )
            }
            className={baseClasses}
            disabled={readOnly}
            min={field.minimum}
            max={field.maximum}
            step={field.type === "integer" ? 1 : "any"}
          />
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <input
              id={fieldId}
              type="checkbox"
              checked={Boolean(fieldValue)}
              onChange={(e) => updateFieldValue(field.key, e.target.checked)}
              className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-background-300 dark:border-background-300 rounded"
              disabled={readOnly}
            />
            <label htmlFor={fieldId} className="text-sm text-text-700 dark:text-text-300">
              {field.title}
            </label>
          </div>
        );

      case "array":
        const arrayValue = (fieldValue as unknown[]) || [];
        return (
          <div className="space-y-2">
            {arrayValue.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  {field.items?.type === "string" ? (
                    <input
                      type="text"
                      value={(item as string) || ""}
                      onChange={(e) =>
                        updateArrayItem(field.key, index, e.target.value)
                      }
                      className={baseClasses.replace("w-full", "w-auto flex-1")}
                      disabled={readOnly}
                    />
                  ) : field.items?.type === "number" ? (
                    <input
                      type="number"
                      value={(item as number) || ""}
                      onChange={(e) =>
                        updateArrayItem(
                          field.key,
                          index,
                          Number(e.target.value)
                        )
                      }
                      className={baseClasses.replace("w-full", "w-auto flex-1")}
                      disabled={readOnly}
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(item) || ""}
                      onChange={(e) =>
                        updateArrayItem(field.key, index, e.target.value)
                      }
                      className={baseClasses.replace("w-full", "w-auto flex-1")}
                      disabled={readOnly}
                    />
                  )}
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem(field.key, index)}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                type="button"
                onClick={() => addArrayItem(field.key)}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" />
                <span>Add item</span>
              </button>
            )}
          </div>
        );

      default:
        return (
          <input
            id={fieldId}
            type="text"
            value={String(fieldValue) || ""}
            onChange={(e) => updateFieldValue(field.key, e.target.value)}
            className={baseClasses}
            disabled={readOnly}
          />
        );
    }
  };

  if (fields.length === 0) {
    return (
      <div className="p-8 text-center text-text-500 dark:text-text-500">
        <div className="mb-2">No schema defined</div>
        <div className="text-sm">
          Add a schema to automatically generate form fields
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <label
            htmlFor={`field-${field.key}`}
            className="block text-sm font-medium text-text-700 dark:text-text-300"
          >
            {field.title}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.description && (
            <p className="text-sm text-text-500 dark:text-text-500">{field.description}</p>
          )}

          {field.type !== "boolean" && renderField(field)}
          {field.type === "boolean" && (
            <div className="mt-1">{renderField(field)}</div>
          )}
        </div>
      ))}
    </div>
  );
}
