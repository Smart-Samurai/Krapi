# Form Components

This directory contains reusable form components that integrate React Hook Form with Zod validation, following shadcn's recommended patterns.

## Components

### Form

A wrapper component that provides React Hook Form context with Zod validation.

```tsx
import { Form } from "@/components/forms";
import { userRegistrationSchema } from "@/lib/forms";

<Form
  schema={userRegistrationSchema}
  onSubmit={handleSubmit}
  defaultValues={{ email: "", password: "" }}
>
  {/* Form fields go here */}
</Form>;
```

### FormField

A reusable form field component that integrates with React Hook Form and displays validation errors.

```tsx
import { FormField } from "@/components/forms";

<FormField
  name="email"
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  required
/>;
```

### ExampleForm

Pre-built form examples for common use cases.

```tsx
import { ExampleForm } from "@/components/forms";

<ExampleForm type="registration" onSubmit={handleSubmit} />;
```

## Supported Field Types

- `text` - Text input
- `email` - Email input with validation
- `password` - Password input
- `number` - Number input
- `textarea` - Multi-line text input
- `select` - Dropdown selection
- `checkbox` - Checkbox input
- `radio` - Radio button group
- `date` - Date input

## Form Schemas

All form schemas are defined in `/lib/forms.ts` using Zod:

- `userRegistrationSchema` - User registration form
- `userLoginSchema` - User login form
- `projectCreationSchema` - Project creation form
- `collectionSchema` - Database collection form
- `apiKeySchema` - API key creation form
- `settingsSchema` - User settings form

## Usage Example

```tsx
import { Form, FormField } from "@/components/forms";
import { userLoginSchema, type UserLoginFormData } from "@/lib/forms";

function LoginForm() {
  const handleSubmit = (data: UserLoginFormData) => {
    console.log("Form data:", data);
    // Handle form submission
  };

  return (
    <Form
      schema={userLoginSchema}
      onSubmit={handleSubmit}
      defaultValues={{ email: "", password: "" }}
      className="space-y-6"
    >
      <FormField
        name="email"
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        required
      />

      <FormField
        name="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        required
      />

      <FormField name="rememberMe" label="Remember me" type="checkbox" />

      <Button type="submit">Login</Button>
    </Form>
  );
}
```

## Features

- **Type Safety**: Full TypeScript support with Zod schema inference
- **Validation**: Automatic validation with error display
- **Accessibility**: Proper labels, ARIA attributes, and keyboard navigation
- **Theme Support**: Works with light/dark themes
- **Responsive**: Mobile-friendly design
- **Customizable**: Extensible styling and behavior

## Validation

Forms automatically validate using Zod schemas and display errors below each field. Common validation rules:

- Required fields
- Email format validation
- Password strength requirements
- Custom validation rules
- Cross-field validation (e.g., password confirmation)

## Error Handling

Form errors are automatically displayed below each field. The `getFormError` utility function can be used to extract error messages:

```tsx
import { getFormError } from "@/lib/forms";

const errorMessage = getFormError(formError);
```

## Styling

Form components use the styled components from `/components/styled/` and follow the design system. They automatically adapt to light/dark themes and are fully responsive.
