# Form Design Guide

This document outlines the design patterns, styling guidelines, and best practices for forms in the KRAPI application.

## Design Principles

### Visual Hierarchy

- **Primary Color**: Use `text-primary` for section headers and important elements
- **Subtle Backgrounds**: Use `bg-background/50` or `bg-background/30` for form containers
- **Borders**: Use `border-secondary` or `border-accent` for proper visual separation
- **Spacing**: Consistent spacing with `space-y-6` for form sections

### Color Usage

- **Primary**: `text-primary` - Used for headers, labels, and important text
- **Background**: `bg-background` - Main page background
- **Secondary**: `bg-secondary` - Avoid strong backgrounds, use with opacity
- **Accent**: `bg-accent` - Used for submit buttons and call-to-action elements

## Form Container Styling

### Standard Form Container

```tsx
<div className="border border-secondary rounded-lg p-6 bg-background/50">
  <h3 className="text-lg font-semibold mb-4 text-primary">Form Title</h3>
  {/* Form content */}
</div>
```

### Form Guidelines Container

```tsx
<div className="mb-6 p-4 border border-secondary rounded-lg bg-background/30">
  <h3 className="text-lg font-medium mb-2 text-primary">Design Guidelines</h3>
  <ul className="text-sm space-y-1 text-text/80">
    <li>• Guideline 1</li>
    <li>• Guideline 2</li>
  </ul>
</div>
```

## Form Field Styling

### Using FormField Component

```tsx
<FormField
  name="email"
  label="Email Address"
  type="email"
  placeholder="Enter your email address"
  required
  inputSize="md"
/>
```

### Field Layout

- **Single Column**: Use `space-y-6` for vertical spacing
- **Two Columns**: Use `grid grid-cols-1 md:grid-cols-2 gap-6`
- **Responsive**: Always start with single column on mobile

### Label Styling

- Use `Label` component with `required` prop for required fields
- Labels should be clear and descriptive
- Required fields show an asterisk (\*)

## Input Types and Styling

### Text Inputs

```tsx
<FormField
  name="name"
  label="Full Name"
  type="text"
  placeholder="Enter your full name"
  required
/>
```

### Email Inputs

```tsx
<FormField
  name="email"
  label="Email Address"
  type="email"
  placeholder="Enter your email address"
  required
  autoComplete="email"
/>
```

### Password Inputs

```tsx
<FormField
  name="password"
  label="Password"
  type="password"
  placeholder="Enter your password"
  required
  autoComplete="current-password"
/>
```

### Textarea

```tsx
<FormField
  name="description"
  label="Description"
  type="textarea"
  placeholder="Enter a description"
/>
```

### Select Dropdowns

```tsx
<FormField
  name="category"
  label="Category"
  type="select"
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
  ]}
  required
/>
```

### Checkboxes

```tsx
<FormField
  name="acceptTerms"
  label="I accept the terms and conditions"
  type="checkbox"
  required
/>
```

### Radio Buttons

```tsx
<FormField
  name="preference"
  label="Preference"
  type="radio"
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
  ]}
  required
/>
```

## Validation and Error States

### Error Display

- Errors appear below the input field
- Use `text-red-600 dark:text-red-400` for error text
- Input fields show red border when in error state

### Success States

- Input fields show green border when valid
- Use subtle success indicators

### Autocomplete Attributes

For better user experience and accessibility, use appropriate `autoComplete` attributes:

```tsx
// Personal Information
<FormField name="firstName" autoComplete="given-name" />
<FormField name="lastName" autoComplete="family-name" />
<FormField name="email" autoComplete="email" />

// Passwords
<FormField name="password" autoComplete="current-password" />
<FormField name="newPassword" autoComplete="new-password" />

// Address Information
<FormField name="street" autoComplete="street-address" />
<FormField name="city" autoComplete="address-level2" />
<FormField name="zipCode" autoComplete="postal-code" />

// Phone Numbers
<FormField name="phone" autoComplete="tel" />

// Disable autocomplete for sensitive fields
<FormField name="projectId" autoComplete="off" />
```

Common autocomplete values:

- `given-name` - First name
- `family-name` - Last name
- `email` - Email address
- `current-password` - Current password
- `new-password` - New password
- `tel` - Phone number
- `street-address` - Street address
- `postal-code` - ZIP/Postal code
- `organization` - Company/Organization name
- `off` - Disable autocomplete

### Required Field Indicators

- Use `required` prop on FormField
- Labels automatically show asterisk (\*)

## Button Styling

### Submit Buttons

```tsx
<Button type="submit" variant="accent">
  Submit Form
</Button>
```

### Secondary Actions

```tsx
<Button variant="outline" onClick={handleCancel}>
  Cancel
</Button>
```

### Button Layout

```tsx
<div className="flex justify-end gap-2">
  <Button variant="outline" onClick={handleCancel}>
    Cancel
  </Button>
  <Button type="submit" variant="accent">
    Submit
  </Button>
</div>
```

## Form Layout Examples

### Simple Form

```tsx
<Form schema={formSchema} onSubmit={handleSubmit}>
  <div className="space-y-6">
    <FormField name="name" label="Name" type="text" required />
    <FormField name="email" label="Email" type="email" required />
    <div className="flex justify-end">
      <Button type="submit" variant="accent">
        Submit
      </Button>
    </div>
  </div>
</Form>
```

### Two-Column Form

```tsx
<Form schema={formSchema} onSubmit={handleSubmit}>
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField name="firstName" label="First Name" type="text" required />
      <FormField name="lastName" label="Last Name" type="text" required />
    </div>
    <FormField name="email" label="Email Address" type="email" required />
    <div className="flex justify-end">
      <Button type="submit" variant="accent">
        Submit
      </Button>
    </div>
  </div>
</Form>
```

### Complex Form with Sections

```tsx
<Form schema={formSchema} onSubmit={handleSubmit}>
  <div className="space-y-8">
    {/* Personal Information */}
    <div>
      <h3 className="text-lg font-medium mb-4 text-primary">
        Personal Information
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField name="firstName" label="First Name" required />
          <FormField name="lastName" label="Last Name" required />
        </div>
        <FormField name="email" label="Email" type="email" required />
      </div>
    </div>

    {/* Preferences */}
    <div>
      <h3 className="text-lg font-medium mb-4 text-primary">Preferences</h3>
      <div className="space-y-4">
        <FormField
          name="newsletter"
          label="Subscribe to newsletter"
          type="checkbox"
        />
        <FormField
          name="notifications"
          label="Notification preference"
          type="radio"
          options={[
            { value: "email", label: "Email" },
            { value: "sms", label: "SMS" },
            { value: "none", label: "None" },
          ]}
        />
      </div>
    </div>

    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={handleCancel}>
        Cancel
      </Button>
      <Button type="submit" variant="accent">
        Submit
      </Button>
    </div>
  </div>
</Form>
```

## Accessibility Guidelines

### Labels

- Always use proper labels with `htmlFor` attribute
- Labels should be descriptive and clear
- Use `required` prop for required field indicators

### Focus States

- All interactive elements have visible focus states
- Use `focus:ring-2 focus:ring-primary` for focus indicators

### Error Messages

- Error messages are associated with their respective fields
- Use clear, actionable error messages
- Provide suggestions for fixing errors when possible

### Keyboard Navigation

- All form elements are keyboard accessible
- Tab order follows logical form flow
- Use proper ARIA attributes where needed

## Responsive Design

### Mobile First

- Start with single column layout
- Use `md:` breakpoint for two-column layouts
- Ensure touch targets are at least 44px

### Breakpoints

- **Mobile**: Single column, full width
- **Tablet**: Two columns where appropriate
- **Desktop**: Multi-column layouts with proper spacing

## Best Practices

### Form Structure

1. Group related fields together
2. Use clear section headers
3. Order fields logically (personal info → preferences → actions)
4. Keep forms concise and focused

### Validation

1. Validate on blur and submit
2. Show real-time feedback
3. Use clear error messages
4. Prevent submission until valid

### User Experience

1. Use appropriate input types
2. Provide helpful placeholder text
3. Show progress indicators for long forms
4. Allow users to save drafts

### Performance

1. Use proper form validation libraries (Zod + React Hook Form)
2. Debounce validation where appropriate
3. Optimize re-renders with proper memoization
4. Use proper loading states

## Color Palette

### Primary Colors

- `text-primary`: Main brand color for headers and important text
- `bg-primary`: Primary background color
- `border-primary`: Primary border color

### Background Colors

- `bg-background`: Main page background
- `bg-background/50`: Semi-transparent background for containers
- `bg-background/30`: Very light background for guidelines

### Border Colors

- `border-secondary`: Standard borders for containers and forms
- `border-accent`: Accent borders for highlights
- `border-primary`: Primary borders for important elements

### Text Colors

- `text-text`: Main text color
- `text-text/80`: Secondary text color
- `text-primary`: Important text and headers

### Toast Colors

- **Light Mode**: White background with dark text for optimal readability
- **Dark Mode**: Dark background with light text for optimal readability
- **Consistent Contrast**: Toast text colors are explicitly set to ensure readability in both themes

This guide ensures consistent, accessible, and user-friendly forms throughout the KRAPI application.
