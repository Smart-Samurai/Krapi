# Styled Components

This directory contains reusable styled components built on top of shadcn/ui components and customized with our KRAPI design system.

## Components

### Button Components

#### IconButton

Round buttons with icons from react-icons.

```tsx
import { IconButton } from '@/components/styled';
import { FiPlus, FiEdit, FiTrash } from 'react-icons/fi';

// Basic usage
<IconButton icon={FiPlus} onClick={() => console.log('clicked')} />

// With variants and sizes
<IconButton
  icon={FiEdit}
  variant="secondary"
  size="lg"
  title="Edit item"
/>
```

#### TextButton

Neutral text buttons for navigation and menus.

```tsx
import { TextButton } from '@/components/styled';

// Basic usage
<TextButton onClick={() => console.log('clicked')}>
  Open Menu
</TextButton>

// With variants
<TextButton variant="ghost" size="sm">
  Cancel
</TextButton>
```

#### Button

Comprehensive button component with multiple variants.

```tsx
import { Button } from '@/components/styled';

// Primary button
<Button onClick={() => console.log('clicked')}>
  Save Changes
</Button>

// Confirmation buttons
<Button variant="confirm">Confirm</Button>
<Button variant="cancel">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Outline style
<Button variant="outline">Edit</Button>
```

### Content Components

#### InfoBlock

Information blocks and articles.

```tsx
import { InfoBlock } from '@/components/styled';
import { FiInfo } from 'react-icons/fi';

// Basic usage
<InfoBlock title="Important Information">
  This is some important information for users.
</InfoBlock>

// With variants
<InfoBlock
  variant="success"
  title="Success"
  icon={<FiInfo />}
>
  Operation completed successfully!
</InfoBlock>
```

#### ExpandableList

Collapsible content sections.

```tsx
import { ExpandableList } from "@/components/styled";
import { FiFolder } from "react-icons/fi";

<ExpandableList
  title="Project Files"
  icon={<FiFolder />}
  defaultExpanded={true}
>
  <ul>
    <li>file1.txt</li>
    <li>file2.txt</li>
  </ul>
</ExpandableList>;
```

### Modal Components

#### Dialog

Modal dialogs for forms and confirmations.

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/styled";
import { Button } from "@/components/styled";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>Make changes to your profile here.</DialogDescription>
    </DialogHeader>
    <div className="py-4">{/* Form content */}</div>
    <DialogFooter>
      <Button variant="cancel">Cancel</Button>
      <Button variant="confirm">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

### Toast Components

#### Toast

Notifications and alerts.

```tsx
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction
} from '@/components/styled';

// Wrap your app with ToastProvider
<ToastProvider>
  <YourApp />
  <ToastViewport />
</ToastProvider>

// Use in components
<Toast variant="success">
  <ToastTitle>Success!</ToastTitle>
  <ToastDescription>Your changes have been saved.</ToastDescription>
  <ToastAction altText="Undo">Undo</ToastAction>
</Toast>
```

### Input Components

#### Form Inputs

Various input field types.

```tsx
import {
  TextInput,
  NumberInput,
  EmailInput,
  PasswordInput,
  Textarea,
  Select,
  Radio,
  Checkbox,
  Label
} from '@/components/styled';

// Text input
<div>
  <Label htmlFor="name">Name</Label>
  <TextInput id="name" placeholder="Enter your name" />
</div>

// Number input
<NumberInput placeholder="Enter age" min={0} max={120} />

// Email input
<EmailInput placeholder="Enter email" />

// Password input
<PasswordInput placeholder="Enter password" />

// Textarea
<Textarea placeholder="Enter description" />

// Select dropdown
<Select
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
/>

// Radio buttons
<div>
  <Radio name="gender" value="male" label="Male" />
  <Radio name="gender" value="female" label="Female" />
</div>

// Checkbox
<Checkbox label="I agree to terms" />
```

## Styling

All components use our KRAPI color system:

- `bg-background` for backgrounds
- `border-primary` for borders
- `text-text` for text
- `bg-primary text-background` for primary buttons
- `bg-secondary text-text` for secondary elements
- `text-accent` for links and highlights

## Accessibility

Components include:

- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- High contrast support

## TypeScript

All components are fully typed with TypeScript interfaces for props and variants.
