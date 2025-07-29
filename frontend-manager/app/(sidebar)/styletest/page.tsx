"use client";

import React, { useState } from "react";
import { IconButton, SidebarToggle } from "@/components/styled";
import { Form, FormField, ExampleForm } from "@/components/forms";
import {
  userRegistrationSchema,
  type UserRegistrationFormData,
} from "@/lib/forms";
import { useToast } from "@/hooks/useToast";
import {
  Button,
  TextButton,
  InfoBlock,
  ExpandableList,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  Input,
  TextInput,
  NumberInput,
  EmailInput,
  PasswordInput,
  Textarea,
  Select,
  Radio,
  Checkbox,
  Label,
} from "@/components/styled";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiUser,
  FiSettings,
} from "react-icons/fi";

export default function StyleTestPage() {
  const { toasts, toast, dismiss } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    text: "",
    number: "",
    email: "",
    password: "",
    textarea: "",
    select: "",
    radio: "",
    checkbox: false,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const showToast = () => {
    toast({
      title: "Toast Notification",
      description: "This is a sample toast notification.",
      variant: "success",
    });
  };

  const handleFormSubmit = (data: UserRegistrationFormData) => {
    console.log("Form submitted:", data);
    toast({
      title: "Form Submitted",
      description: "Registration form submitted successfully!",
      variant: "success",
    });
  };

  const handleExampleFormSubmit = (data: any) => {
    console.log("Example form submitted:", data);
    toast({
      title: "Form Submitted",
      description: "Example form submitted successfully!",
      variant: "success",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 text-text p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Theme Toggle and Sidebar Toggle */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Style Test Page</h1>
          <div className="flex items-center space-x-4">
            <SidebarToggle />
          </div>
        </div>

        {/* Buttons Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Buttons</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Button Variants</h3>
              <div className="space-y-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="confirm">Confirm</Button>
                <Button variant="cancel">Cancel</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Button Sizes</h3>
              <div className="space-y-2">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Icon Buttons</h3>
              <div className="flex gap-2">
                <IconButton icon={FiUser} size="sm" />
                <IconButton icon={FiSettings} size="md" />
                <IconButton icon={FiMail} size="lg" />
              </div>
              <div className="flex gap-2">
                <IconButton icon={FiUser} variant="secondary" />
                <IconButton icon={FiSettings} variant="accent" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Text Buttons</h3>
              <div className="space-y-2">
                <TextButton>Primary Text Button</TextButton>
                <TextButton variant="link">Link Text Button</TextButton>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Disabled States</h3>
              <div className="space-y-2">
                <Button disabled>Disabled Button</Button>
                <IconButton icon={FiUser} disabled />
              </div>
            </div>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">
            Input Components
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Text Inputs</h3>
              <div className="space-y-4">
                <div>
                  <Label>Text Input</Label>
                  <TextInput
                    placeholder="Enter text..."
                    value={formData.text}
                    onChange={(e) => handleInputChange("text", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Number Input</Label>
                  <NumberInput
                    placeholder="Enter number..."
                    value={formData.number}
                    onChange={(e) =>
                      handleInputChange("number", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Email Input</Label>
                  <EmailInput
                    placeholder="Enter email..."
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Password Input</Label>
                  <div className="relative">
                    <PasswordInput
                      placeholder="Enter password..."
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                    />
                    <IconButton
                      icon={showPassword ? FiEyeOff : FiEye}
                      onClick={() => setShowPassword(!showPassword)}
                      variant="secondary"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Other Inputs</h3>
              <div className="space-y-4">
                <div>
                  <Label>Textarea</Label>
                  <Textarea
                    placeholder="Enter long text..."
                    value={formData.textarea}
                    onChange={(e) =>
                      handleInputChange("textarea", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Select</Label>
                  <Select
                    options={[
                      { value: "option1", label: "Option 1" },
                      { value: "option2", label: "Option 2" },
                      { value: "option3", label: "Option 3" },
                    ]}
                    value={formData.select}
                    onChange={(e) =>
                      handleInputChange("select", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Radio Buttons</Label>
                  <div className="space-y-2">
                    <Radio
                      name="radio"
                      value="option1"
                      label="Option 1"
                      checked={formData.radio === "option1"}
                      onChange={(e) =>
                        handleInputChange("radio", e.target.value)
                      }
                    />
                    <Radio
                      name="radio"
                      value="option2"
                      label="Option 2"
                      checked={formData.radio === "option2"}
                      onChange={(e) =>
                        handleInputChange("radio", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <Checkbox
                    label="Accept terms and conditions"
                    checked={formData.checkbox}
                    onChange={(e) =>
                      handleInputChange("checkbox", e.target.checked)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Input Variants Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">
            Input Variants
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Input Sizes</h3>
              <div className="space-y-2">
                <Input inputSize="sm" placeholder="Small input" />
                <Input inputSize="md" placeholder="Medium input" />
                <Input inputSize="lg" placeholder="Large input" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Input States</h3>
              <div className="space-y-2">
                <Input placeholder="Default state" />
                <Input variant="error" placeholder="Error state" />
                <Input variant="success" placeholder="Success state" />
                <Input disabled placeholder="Disabled state" />
              </div>
            </div>
          </div>
        </section>

        {/* Info Block Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">
            Info Blocks
          </h2>

          <div className="space-y-4">
            <InfoBlock title="Information" variant="info">
              This is an informational message for users.
            </InfoBlock>
            <InfoBlock title="Success" variant="success">
              Operation completed successfully!
            </InfoBlock>
            <InfoBlock title="Warning" variant="warning">
              Please review your input before proceeding.
            </InfoBlock>
            <InfoBlock title="Error" variant="error">
              Something went wrong. Please try again.
            </InfoBlock>
          </div>
        </section>

        {/* Expandable List Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">
            Expandable Lists
          </h2>

          <div className="space-y-4">
            <ExpandableList title="Basic Expandable List">
              <p>
                This is the content inside the expandable list. You can put any
                content here.
              </p>
            </ExpandableList>

            <ExpandableList
              title="List with Default Expanded State"
              defaultExpanded
            >
              <div className="space-y-2">
                <p>This list starts expanded by default.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Item 1</li>
                  <li>Item 2</li>
                  <li>Item 3</li>
                </ul>
              </div>
            </ExpandableList>

            <ExpandableList title="Complex Content">
              <div className="space-y-4">
                <p>
                  You can include complex content like forms, buttons, or other
                  components.
                </p>
                <div className="flex gap-2">
                  <Button size="sm">Action 1</Button>
                  <Button size="sm" variant="outline">
                    Action 2
                  </Button>
                </div>
              </div>
            </ExpandableList>
          </div>
        </section>

        {/* Dialog Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Dialogs</h2>

          <div className="space-y-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sample Dialog</DialogTitle>
                  <DialogDescription>
                    This is a sample dialog showcasing the dialog component.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p>
                    Dialog content goes here. You can put any content inside the
                    dialog.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Toast Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">Toasts</h2>

          <div className="space-y-4">
            <Button onClick={showToast}>Show Success Toast</Button>
            <Button
              onClick={() =>
                toast({
                  title: "Error Toast",
                  description: "This is an error notification.",
                  variant: "error",
                })
              }
              variant="destructive"
            >
              Show Error Toast
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: "Warning Toast",
                  description: "This is a warning notification.",
                  variant: "warning",
                })
              }
              variant="outline"
            >
              Show Warning Toast
            </Button>

            {toasts.map((toastItem) => (
              <Toast
                key={toastItem.id}
                variant={toastItem.variant || "default"}
              >
                <div className="flex-1">
                  <ToastTitle>{toastItem.title}</ToastTitle>
                  <ToastDescription>{toastItem.description}</ToastDescription>
                </div>
                <ToastClose onClick={() => dismiss(toastItem.id)} />
              </Toast>
            ))}
          </div>
        </section>

        {/* Form Examples Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">
            Form Examples (Zod + React Hook Form)
          </h2>

          <div className="mb-6 p-4 border border-secondary rounded-lg bg-background/30">
            <h3 className="text-lg font-medium mb-2 text-primary">
              Form Design Guidelines
            </h3>
            <ul className="text-sm space-y-1 text-text/80">
              <li>
                • Forms use proper borders with secondary/accent colors for
                better visual separation
              </li>
              <li>• Labels are clearly marked with required indicators</li>
              <li>
                • Input fields have proper focus states and validation feedback
              </li>
              <li>• Submit buttons use accent colors to stand out</li>
              <li>• Error messages appear below fields with red styling</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ExampleForm
              type="registration"
              onSubmit={handleExampleFormSubmit}
            />

            <ExampleForm type="login" onSubmit={handleExampleFormSubmit} />
          </div>

          <div className="mt-8">
            <ExampleForm type="project" onSubmit={handleExampleFormSubmit} />
          </div>
        </section>

        {/* Current Form Data Display */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-primary">
            Current Form Data
          </h2>
          <div className="border border-secondary p-4 rounded-lg bg-background/50">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
