/**
 * Form Field Component
 * 
 * Reusable form field component that works with react-hook-form.
 * Supports multiple input types: text, email, password, number, textarea, select, checkbox, radio, date.
 * 
 * @module components/forms/FormField
 * @example
 * <FormField
 *   name="email"
 *   label="Email"
 *   type="email"
 *   required
 * />
 */
import React from "react";
import { useFormContext } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Form Field Props
 * 
 * @interface FormFieldProps
 * @property {string} name - Field name (must match form schema)
 * @property {string} [label] - Field label
 * @property {string} [description] - Field description/help text
 * @property {"text" | "email" | "password" | "number" | "textarea" | "select" | "checkbox" | "radio" | "date"} [type="text"] - Input type
 * @property {string} [placeholder] - Placeholder text
 * @property {boolean} [required=false] - Whether field is required
 * @property {React.ComponentType} [icon] - Optional icon component
 * @property {boolean} [disabled=false] - Whether field is disabled
 * @property {Array<{value: string, label: string}>} [options] - Options for select/radio
 * @property {string} [className] - Additional CSS classes
 * @property {string} [autoComplete] - Autocomplete attribute
 */
interface FormFieldProps {
  name: string;
  label?: string;
  description?: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "date";
  placeholder?: string;
  required?: boolean;
  icon?: React.ComponentType;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  autoComplete?: string;
}

/**
 * Form Field Component
 * 
 * Reusable form field that integrates with react-hook-form.
 * 
 * @param {FormFieldProps} props - Component props
 * @returns {JSX.Element} Form field component
 * 
 * @example
 * <FormField name="email" label="Email" type="email" required />
 */
export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  description,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  options = [],
  className,
  autoComplete,
}) => {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = useFormContext();

  const error = errors[name];
  const value = watch(name);
  const hasError = !!error;

  const renderInput = () => {
    const commonProps = {
      ...register(name),
      placeholder,
      disabled,
      className: cn(hasError && "border-destructive", className),
      autoComplete,
    };

    switch (type) {
      case "textarea":
        return <Textarea {...commonProps} />;

      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => setValue(name, val)}
            disabled={disabled}
          >
            <SelectTrigger className={cn(hasError && "border-destructive", className)}>
              <SelectValue placeholder={placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={name}
              checked={value}
              onCheckedChange={(checked) => setValue(name, checked)}
              disabled={disabled}
            />
            {label && (
              <Label
                htmlFor={name}
                className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </Label>
            )}
          </div>
        );

      case "radio":
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => setValue(name, val)}
            disabled={disabled}
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <Label htmlFor={`${name}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "email":
        return <Input {...commonProps} type="email" />;

      case "password":
        return <Input {...commonProps} type="password" />;

      case "number":
        return <Input {...commonProps} type="number" />;

      case "date":
        return <Input {...commonProps} type="date" />;

      default:
        return <Input {...commonProps} type="text" />;
    }
  };

  return (
    <div className="space-y-2">
      {label && type !== "checkbox" && (
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {description && (
        <p className="text-base text-muted-foreground">{description}</p>
      )}

      {renderInput()}

      {hasError && (
        <p className="text-base text-destructive">
          {error.message as string}
        </p>
      )}
    </div>
  );
};
