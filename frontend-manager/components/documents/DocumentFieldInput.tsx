"use client";
/* eslint-disable import/order, @typescript-eslint/no-unused-vars, react/jsx-no-leaked-render, prefer-template */

import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CollectionField } from "@/lib/krapi";
import { FieldType } from "@/lib/krapi-constants";

interface DocumentFieldInputProps {
  field: CollectionField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  placeholder?: string;
}

export function DocumentFieldInput({
  field,
  value,
  onChange,
  error,
  placeholder,
}: DocumentFieldInputProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  const handleChange = (newValue: unknown) => {
    onChange(newValue);
  };

  // Date, datetime, timestamp fields
  if (
    field.type === FieldType.date ||
    field.type === FieldType.datetime ||
    field.type === FieldType.timestamp
  ) {
    const dateValue = value
      ? typeof value === "string"
        ? new Date(value)
        : value instanceof Date
        ? value
        : null
      : null;

    const formatDate = (date: Date | null): string => {
      if (!date) return "";
      if (field.type === FieldType.datetime || field.type === FieldType.timestamp) {
        return format(date, "yyyy-MM-dd'T'HH:mm");
      }
      return format(date, "yyyy-MM-dd");
    };

    const handleDateSelect = (selectedDate: Date | undefined) => {
      if (selectedDate) {
        if (field.type === FieldType.datetime || field.type === FieldType.timestamp) {
          // For datetime, use the current time if not provided
          const datetime = new Date(selectedDate);
          if (field.type === FieldType.timestamp) {
            handleChange(datetime.toISOString());
          } else {
            handleChange(format(datetime, "yyyy-MM-dd'T'HH:mm"));
          }
        } else {
          handleChange(format(selectedDate, "yyyy-MM-dd"));
        }
        setDateOpen(false);
      }
    };

    return (
      <div className="space-y-2">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              data-testid={`document-field-input-${field.name}`}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateValue && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue ? formatDate(dateValue) : <span>{placeholder || "Pick a date"}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue || undefined}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Boolean fields
  if (field.type === FieldType.boolean) {
    const boolValue = value === true || value === "true" || value === "1";
    return (
      <div className="flex items-center space-x-2">
        <Checkbox
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          checked={boolValue}
          onCheckedChange={(checked) => handleChange(checked === true)}
        />
        <Label htmlFor={field.name} className="text-sm font-normal">
          {boolValue ? "Yes" : "No"}
        </Label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Number, integer fields
  if (field.type === FieldType.number || field.type === FieldType.integer) {
    const numValue =
      value === null || value === undefined || value === ""
        ? ""
        : String(value);
    return (
      <div className="space-y-2">
        <Input
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          type="number"
          step={field.type === FieldType.integer ? "1" : "any"}
          value={numValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              handleChange("");
            } else {
              const num = field.type === FieldType.integer ? parseInt(val, 10) : parseFloat(val);
              handleChange(isNaN(num) ? "" : num);
            }
          }}
          placeholder={placeholder || `Enter ${field.name}`}
          required={field.required}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Float, decimal fields
  if (field.type === FieldType.float || field.type === FieldType.decimal) {
    const numValue =
      value === null || value === undefined || value === ""
        ? ""
        : String(value);
    return (
      <div className="space-y-2">
        <Input
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          type="number"
          step="any"
          value={numValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              handleChange("");
            } else {
              const num = parseFloat(val);
              handleChange(isNaN(num) ? "" : num);
            }
          }}
          placeholder={placeholder || `Enter ${field.name}`}
          required={field.required}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Email fields with validation
  if (field.type === FieldType.email) {
    const validateEmail = (email: string): boolean => {
      if (!email) return true; // Empty is valid if not required
      // More robust email validation regex (RFC 5322 compliant subset)
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      return emailRegex.test(email.trim().toLowerCase());
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      handleChange(newValue);
      
      // Real-time validation
      if (newValue && !validateEmail(newValue)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError(undefined);
      }
    };

    const displayError = emailError || error;

    return (
      <div className="space-y-2">
        <Input
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          type="email"
          value={String(value || "")}
          onChange={handleEmailChange}
          onBlur={() => {
            const emailValue = String(value || "");
            if (emailValue && !validateEmail(emailValue)) {
              setEmailError("Please enter a valid email address");
            } else {
              setEmailError(undefined);
            }
          }}
          placeholder={placeholder || `Enter ${field.name} (e.g., user@example.com)`}
          required={field.required}
          className={displayError ? "border-destructive" : ""}
        />
        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
      </div>
    );
  }

  // Phone number fields with validation and formatting
  if (field.type === FieldType.phone) {

    const formatPhoneNumber = (value: string): string => {
      // Remove all non-digit characters
      const digitsOnly = value.replace(/\D/g, "");
      
      // Format as (XXX) XXX-XXXX for US numbers, or keep international format
      if (digitsOnly.length <= 10) {
        if (digitsOnly.length <= 3) return digitsOnly;
        if (digitsOnly.length <= 6) {
          return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
        }
        return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
      }
      // For international numbers, keep original format but allow + prefix
      return value;
    };

    const validatePhone = (phone: string): boolean => {
      if (!phone) return true; // Empty is valid if not required
      // Remove all non-digit characters for validation
      const digitsOnly = phone.replace(/\D/g, "");
      // Phone numbers should have 7-15 digits (international format)
      return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      
      // Allow + at the start for international numbers
      if (newValue.startsWith("+")) {
        // Keep + and format the rest
        const withoutPlus = newValue.slice(1);
        const digitsOnly = withoutPlus.replace(/\D/g, "");
        if (digitsOnly.length <= 10) {
          newValue = "+" + formatPhoneNumber(withoutPlus);
        } else {
          newValue = "+" + withoutPlus.replace(/\D/g, "");
        }
      } else {
        // Format as US number
        newValue = formatPhoneNumber(newValue);
      }
      
      handleChange(newValue);
      
      // Real-time validation
      if (newValue && !validatePhone(newValue)) {
        setPhoneError("Please enter a valid phone number (7-15 digits)");
      } else {
        setPhoneError(undefined);
      }
    };

    const displayError = phoneError || error;

    return (
      <div className="space-y-2">
        <Input
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          type="tel"
          value={String(value || "")}
          onChange={handlePhoneChange}
          onBlur={() => {
            const phoneValue = String(value || "");
            if (phoneValue && !validatePhone(phoneValue)) {
              setPhoneError("Please enter a valid phone number (7-15 digits)");
            } else {
              setPhoneError(undefined);
            }
          }}
          placeholder={placeholder || `Enter ${field.name} (e.g., (555) 123-4567 or +1 555 123 4567)`}
          required={field.required}
          className={displayError ? "border-destructive" : ""}
        />
        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
      </div>
    );
  }

  // URL fields with validation
  if (field.type === FieldType.url) {
    const [urlError, setUrlError] = useState<string | undefined>(undefined);

    const validateUrl = (url: string): boolean => {
      if (!url) return true; // Empty is valid if not required
      try {
        // Try to create a URL object to validate
        new URL(url);
        return true;
      } catch {
        // Also accept URLs without protocol (will add https://)
        const urlWithProtocol = url.startsWith("http://") || url.startsWith("https://") 
          ? url 
          : `https://${url}`;
        try {
          new URL(urlWithProtocol);
          return true;
        } catch {
          return false;
        }
      }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      handleChange(newValue);
      
      // Real-time validation
      if (newValue && !validateUrl(newValue)) {
        setUrlError("Please enter a valid URL");
      } else {
        setUrlError(undefined);
      }
    };

    const displayError = urlError || error;

    return (
      <div className="space-y-2">
        <Input
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          type="url"
          value={String(value || "")}
          onChange={handleUrlChange}
          onBlur={() => {
            const urlValue = String(value || "");
            if (urlValue && !validateUrl(urlValue)) {
              setUrlError("Please enter a valid URL");
            } else {
              setUrlError(undefined);
            }
          }}
          placeholder={placeholder || `Enter ${field.name} (e.g., https://example.com)`}
          required={field.required}
          className={displayError ? "border-destructive" : ""}
        />
        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}
      </div>
    );
  }

  // Password fields
  if (field.type === FieldType.password) {
    return (
      <div className="space-y-2">
        <Input
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          type="password"
          value={String(value || "")}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder || `Enter ${field.name}`}
          required={field.required}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Text fields (long text)
  if (field.type === FieldType.text) {
    return (
      <div className="space-y-2">
        <Textarea
          id={field.name}
          data-testid={`document-field-input-${field.name}`}
          value={String(value || "")}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder || `Enter ${field.name}`}
          required={field.required}
          rows={4}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // Default: string and other text-based fields
  return (
    <div className="space-y-2">
      <Input
        id={field.name}
        data-testid={`document-field-input-${field.name}`}
        type="text"
        value={String(value || "")}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || `Enter ${field.name}`}
        required={field.required}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
