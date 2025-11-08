/**
 * Styled Input Components
 * 
 * Styled input components with variants and specialized input types.
 * Provides Input, TextInput, NumberInput, EmailInput, PasswordInput, and Textarea.
 * 
 * @module components/styled/Input
 * @example
 * <Input variant="default" inputSize="md" placeholder="Enter text" />
 * <EmailInput placeholder="Enter email" />
 */
import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { cn } from "@/lib/utils";

/**
 * Input Variants
 * 
 * @constant {Function} inputVariants
 */
// Base Input Component
const inputVariants = cva(
  "flex w-full  border border-primary bg-background px-3 py-2 text-base text-text ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-text/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        error: "border-red-500 focus-visible:ring-red-500",
        success: "border-green-500 focus-visible:ring-green-500",
      },
      inputSize: {
        sm: "h-8 px-2 text-base",
        md: "h-10 px-3 text-base",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

/**
 * Input Props Interface
 * 
 * @interface InputProps
 * @extends {Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">}
 * @extends {VariantProps<typeof inputVariants>}
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

/**
 * Base Input Component
 * 
 * Base input component with variants and sizes.
 * 
 * @param {InputProps} props - Component props
 * @returns {JSX.Element} Input component
 * 
 * @example
 * <Input variant="default" inputSize="md" type="text" />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

/**
 * Text Input Component
 * 
 * Specialized text input component.
 * 
 * @param {InputProps} props - Component props
 * @returns {JSX.Element} Text input
 */
// Text Input
export const TextInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <Input ref={ref} type="text" {...props} />
);
TextInput.displayName = "TextInput";

/**
 * Number Input Component
 * 
 * Specialized number input component.
 * 
 * @param {InputProps} props - Component props
 * @returns {JSX.Element} Number input
 */
// Number Input
export const NumberInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <Input ref={ref} type="number" {...props} />
);
NumberInput.displayName = "NumberInput";

/**
 * Email Input Component
 * 
 * Specialized email input component with email-specific attributes.
 * 
 * @param {InputProps} props - Component props
 * @returns {JSX.Element} Email input
 */
// Email Input
export const EmailInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => (
    <Input
      ref={ref}
      type="email"
      autoComplete="email"
      inputMode="email"
      {...props}
    />
  )
);
EmailInput.displayName = "EmailInput";

/**
 * Password Input Component
 * 
 * Specialized password input component.
 * 
 * @param {InputProps} props - Component props
 * @returns {JSX.Element} Password input
 */
// Password Input
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => (
    <Input
      ref={ref}
      type="password"
      autoComplete="current-password"
      {...props}
    />
  )
);
PasswordInput.displayName = "PasswordInput";

/**
 * Textarea Props Interface
 * 
 * @interface TextareaProps
 * @extends {Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">}
 * @extends {VariantProps<typeof inputVariants>}
 */
// Textarea Component
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof inputVariants> {}

/**
 * Textarea Component
 * 
 * Multi-line text input component.
 * 
 * @param {TextareaProps} props - Component props
 * @returns {JSX.Element} Textarea component
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, inputSize, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          inputVariants({ variant, inputSize, className }),
          "min-h-[80px] resize-vertical"
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// Select Component
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof inputVariants> {
  options: Array<{ value: string; label: string }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, inputSize, options, ...props }, ref) => {
    return (
      <select
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);
Select.displayName = "Select";

// Radio Button Component
export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: boolean;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="radio"
          className={cn(
            "h-4 w-4 text-primary border-primary focus:ring-primary focus:ring-2",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        <span className="text-base text-text">{label}</span>
      </label>
    );
  }
);
Radio.displayName = "Radio";

// Checkbox Component
export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          className={cn(
            "h-4 w-4 text-primary border-primary rounded focus:ring-primary focus:ring-2",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        <span className="text-base text-text">{label}</span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

// Label Component
export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        className={cn(
          "text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-text",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);
Label.displayName = "Label";

export { Input, Textarea, Select, Radio, Checkbox, Label, inputVariants };
