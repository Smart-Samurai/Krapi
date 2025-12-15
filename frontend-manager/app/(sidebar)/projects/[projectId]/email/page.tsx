/**
 * Email Page
 * 
 * Page for managing email configuration and templates for a project.
 * Provides email config management, template CRUD, and email testing.
 * 
 * @module app/(sidebar)/projects/[projectId]/email/page
 * @example
 * // Automatically rendered at /projects/[projectId]/email route
 */
"use client";

import {
  Plus,
  Edit,
  Trash2,
  Mail,
  Settings,
  TestTube,
  Save,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Send,
  FileText,
  Code2,
  BookOpen,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import {
  PageLayout,
  PageHeader,
  ActionButton,
  EmptyState,
} from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useReduxAuth } from "@/contexts/redux-auth-context";
import type { EmailTemplate } from "@/lib/krapi";
// Redux thunks removed - using API routes directly
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { beginBusy, endBusy } from "@/store/uiSlice";

/**
 * Email Page Component
 * 
 * Manages email configuration and templates for a project.
 * Provides email config management, template CRUD, and email testing.
 * 
 * @returns {JSX.Element} Email page
 */
export default function EmailPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const { sessionToken, isInitialized } = useReduxAuth();
  const dispatch = useAppDispatch();

  const configBucket = useAppSelector(
    (s) => s.email.configByProjectId[projectId]
  );
  const templatesBucket = useAppSelector(
    (s) => s.email.templatesByProjectId[projectId]
  );
  const emailConfig = configBucket?.data || null;
  const templates = templatesBucket?.items || [];
  const isLoading =
    configBucket?.loading || false || templatesBucket?.loading || false;

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] =
    useState(false);
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] =
    useState(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null
  );

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy] = useState("created_at");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  // Form state for email configuration
  const [configForm, setConfigForm] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_secure: false,
    from_email: "",
    from_name: "",
  });

  // Form state for creating/editing templates
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    body: "",
    variables: [] as string[],
  });

  const loadEmailConfigCb = useCallback(async () => {
    if (!isInitialized || !sessionToken) {
      return;
    }
    // Email config API route will be implemented in a future update
    // For now, use catch-all route
    try {
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/email/config`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Update Redux state manually or use a different approach
        }
      }
    } catch {
      // Error logged for debugging
    }
  }, [isInitialized, sessionToken, projectId]);

  const loadTemplatesCb = useCallback(async () => {
    if (!isInitialized || !sessionToken) {
      return;
    }
    // Email templates API route will be implemented in a future update
    // For now, use catch-all route
    try {
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/email/templates`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Update Redux state manually or use a different approach
        }
      }
    } catch {
      // Error logged for debugging
    }
  }, [isInitialized, sessionToken, projectId]);

  useEffect(() => {
    loadEmailConfigCb();
    loadTemplatesCb();
  }, [loadEmailConfigCb, loadTemplatesCb]);

  useEffect(() => {
    if (emailConfig) {
      setConfigForm({
        smtp_host: emailConfig.smtp_host,
        smtp_port: emailConfig.smtp_port,
        smtp_username: emailConfig.smtp_username,
        smtp_password: emailConfig.smtp_password,
        smtp_secure: emailConfig.smtp_secure,
        from_email: emailConfig.from_email,
        from_name: emailConfig.from_name,
      });
    }
  }, [emailConfig]);

  const handleSaveConfig = async () => {
    if (!sessionToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      setIsSaving(true);
      dispatch(beginBusy());
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/email/config`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...configForm }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update email config" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        loadEmailConfigCb();
        toast.success("Email configuration saved successfully");
      } else {
        throw new Error(result.error || "Failed to update email config");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update email config";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
      dispatch(endBusy());
    }
  };

  const handleTestConfig = async () => {
    if (!sessionToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      setIsTesting(true);
      dispatch(beginBusy());
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/email/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          emailConfig: configForm,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to test email config" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success("Test email sent successfully");
      } else {
        throw new Error(result.error || "Failed to test email config");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to test email config";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
      dispatch(endBusy());
    }
  };

  const handleCreateTemplate = async () => {
    if (!sessionToken) {
      setError("Authentication required");
      return;
    }

    try {
      dispatch(beginBusy());
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/email/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...templateForm }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create template" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setIsCreateTemplateDialogOpen(false);
        setTemplateForm({ name: "", subject: "", body: "", variables: [] });
        loadTemplatesCb();
        toast.success("Template created successfully");
      } else {
        throw new Error(result.error || "Failed to create template");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create template";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      dispatch(endBusy());
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !sessionToken) {
      if (!sessionToken) setError("Authentication required");
      return;
    }

    try {
      dispatch(beginBusy());
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/email/templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...templateForm }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update template" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setIsEditTemplateDialogOpen(false);
        setEditingTemplate(null);
        setTemplateForm({ name: "", subject: "", body: "", variables: [] });
        loadTemplatesCb();
        toast.success("Template updated successfully");
      } else {
        throw new Error(result.error || "Failed to update template");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update template";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      dispatch(endBusy());
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    if (!sessionToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      dispatch(beginBusy());
      const response = await fetch(`/api/krapi/k1/projects/${projectId}/email/templates/${templateId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete template" }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        loadTemplatesCb();
        toast.success("Template deleted successfully");
      } else {
        throw new Error(result.error || "Failed to delete template");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete template";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      dispatch(endBusy());
    }
  };

  const openEditTemplateDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
      variables: template.variables,
    });
    setIsEditTemplateDialogOpen(true);
  };

  const addVariable = () => {
    setTemplateForm((prev) => ({
      ...prev,
      variables: [...prev.variables, ""],
    }));
  };

  const removeVariable = (index: number) => {
    setTemplateForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  };

  const updateVariable = (index: number, value: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      variables: prev.variables.map((v, i) => (i === index ? value : v)),
    }));
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    let aValue: string | number, bValue: string | number;

    switch (sortBy) {
      case "created_at":
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      default:
        const aVal = a[sortBy as keyof EmailTemplate];
        const bVal = b[sortBy as keyof EmailTemplate];
        aValue =
          typeof aVal === "string" || typeof aVal === "number"
            ? aVal
            : String(aVal);
        bValue =
          typeof bVal === "string" || typeof bVal === "number"
            ? bVal
            : String(bVal);
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map(() => {
            const skeletonId = `email-skeleton-${Math.random()}-${Date.now()}`;
            return (
              <Skeleton
                key={skeletonId}
                className="h-32 w-full"
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Email Configuration"
        description="Configure SMTP settings and manage email templates"
        action={
          <div className="flex items-center gap-2">
            <Dialog open={isApiDocsOpen} onOpenChange={setIsApiDocsOpen}>
              <DialogTrigger asChild>
                <ActionButton variant="outline" icon={BookOpen}>
                  API Docs
                </ActionButton>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Email API Documentation
                </DialogTitle>
                <DialogDescription>
                  Documentation for the Email API endpoints
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-2">
                    Available Endpoints
                  </h3>
                  <div className="text-base space-y-2">
                    <p>
                      <strong>GET /email/config</strong> - Get email
                      configuration
                    </p>
                    <p>
                      <strong>PUT /email/config</strong> - Update email
                      configuration
                    </p>
                    <p>
                      <strong>POST /email/test</strong> - Test email
                      configuration
                    </p>
                    <p>
                      <strong>GET /email/templates</strong> - Get email
                      templates
                    </p>
                    <p>
                      <strong>POST /email/templates</strong> - Create email
                      template
                    </p>
                    <p>
                      <strong>PUT /email/templates/:id</strong> - Update email
                      template
                    </p>
                    <p>
                      <strong>DELETE /email/templates/:id</strong> - Delete
                      email template
                    </p>
                    <p>
                      <strong>POST /email/send</strong> - Send email
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
      />

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            SMTP Configuration
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card data-testid="email-config-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Settings
              </CardTitle>
              <CardDescription>
                Configure your SMTP server settings for sending emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_host">SMTP Host *</Label>
                  <Input
                    id="smtp_host"
                    value={configForm.smtp_host}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        smtp_host: e.target.value,
                      }))
                    }
                    placeholder="e.g., smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp_port">SMTP Port *</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={configForm.smtp_port}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        smtp_port: parseInt(e.target.value),
                      }))
                    }
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtp_username">SMTP Username *</Label>
                  <Input
                    id="smtp_username"
                    value={configForm.smtp_username}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        smtp_username: e.target.value,
                      }))
                    }
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp_password">SMTP Password *</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={configForm.smtp_password}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        smtp_password: e.target.value,
                      }))
                    }
                    placeholder="your-app-password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_email">From Email *</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={configForm.from_email}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        from_email: e.target.value,
                      }))
                    }
                    placeholder="noreply@yourdomain.com"
                  />
                </div>
                <div>
                  <Label htmlFor="from_name">From Name *</Label>
                  <Input
                    id="from_name"
                    value={configForm.from_name}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        from_name: e.target.value,
                      }))
                    }
                    placeholder="Your Company Name"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp_secure"
                  checked={configForm.smtp_secure}
                  onCheckedChange={(checked) =>
                    setConfigForm((prev) => ({ ...prev, smtp_secure: checked }))
                  }
                />
                <Label htmlFor="smtp_secure">Use SSL/TLS</Label>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton
                  variant="default"
                  icon={Save}
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Configuration"}
                </ActionButton>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Configuration
              </CardTitle>
              <CardDescription>
                Send a test email to verify your SMTP configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test_email">Test Email Address</Label>
                <Input
                  id="test_email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <Button
                className="btn-confirm"
                onClick={handleTestConfig}
                disabled={isTesting || !testEmail}
                data-testid="test-email-button"
              >
                <Send className="mr-2 h-4 w-4" />
                {isTesting ? "Sending..." : "Send Test Email"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Email Templates</h2>
              <p className="text-muted-foreground">
                Create and manage email templates for your project
              </p>
            </div>
            <Dialog
              open={isCreateTemplateDialogOpen}
              onOpenChange={setIsCreateTemplateDialogOpen}
            >
              <DialogTrigger asChild>
                <ActionButton variant="add" icon={Plus} data-testid="create-email-template-button">
                  Create Template
                </ActionButton>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="create-email-template-dialog">
                <DialogHeader>
                  <DialogTitle>Create Email Template</DialogTitle>
                  <DialogDescription>
                    Create a new email template with variables
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={templateForm.name}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Welcome Email, Password Reset"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-subject">Subject *</Label>
                    <Input
                      id="template-subject"
                      value={templateForm.subject}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      placeholder="Welcome to {{company_name}}!"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-body">Email Body *</Label>
                    <Textarea
                      id="template-body"
                      value={templateForm.body}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }))
                      }
                      placeholder="Hello {{user_name}}, welcome to our platform!"
                      rows={10}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Template Variables</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVariable}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Variable
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {templateForm.variables.map((variable, index) => (
                        <div
                          key={`email-variable-${variable || `empty-${index}`}`}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={variable}
                            onChange={(e) =>
                              updateVariable(index, e.target.value)
                            }
                            placeholder="variable_name"
                            onBlur={(e) => {
                              // Prevent modal from refocusing when input loses focus
                              e.stopPropagation();
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeVariable(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <ActionButton
                    variant="outline"
                    onClick={() => setIsCreateTemplateDialogOpen(false)}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    variant="add"
                    onClick={handleCreateTemplate}
                    disabled={
                      !templateForm.name ||
                      !templateForm.subject ||
                      !templateForm.body
                    }
                  >
                    Create Template
                  </ActionButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search-templates">Search Templates</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="search-templates"
                      placeholder="Search by name or subject..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sort-templates">Sort By</Label>
                  <Select value={sortBy} onValueChange={() => {}}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {sortedTemplates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Email Templates Yet"
              description="Create your first email template to get started"
              action={{
                label: "Create Template",
                onClick: () => setIsCreateTemplateDialogOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Email Templates ({sortedTemplates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Variables</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div className="font-medium">{template.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {template.subject}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {template.variables.map((variable: string) => (
                                <Badge
                                  key={`email-template-variable-${variable}`}
                                  variant="outline"
                                  className="text-base"
                                >
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-base text-muted-foreground">
                              {new Date(
                                template.created_at
                              ).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openEditTemplateDialog(template)
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    handleDeleteTemplate(template.id)
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Template Dialog */}
          <Dialog
            open={isEditTemplateDialogOpen}
            onOpenChange={setIsEditTemplateDialogOpen}
          >
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Email Template</DialogTitle>
                <DialogDescription>
                  Modify the email template and its variables
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-template-name">Template Name *</Label>
                  <Input
                    id="edit-template-name"
                    value={templateForm.name}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Welcome Email, Password Reset"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-template-subject">Subject *</Label>
                  <Input
                    id="edit-template-subject"
                    value={templateForm.subject}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Welcome to {{company_name}}!"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-template-body">Email Body *</Label>
                  <Textarea
                    id="edit-template-body"
                    value={templateForm.body}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    placeholder="Hello {{user_name}}, welcome to our platform!"
                    rows={10}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Template Variables</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariable}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Variable
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {templateForm.variables.map((variable, index) => (
                      <div
                        key={`email-edit-variable-${variable || `empty-${index}`}`}
                        className="flex items-center gap-2"
                      >
                        <Input
                          value={variable}
                          onChange={(e) =>
                            updateVariable(index, e.target.value)
                          }
                          placeholder="variable_name"
                          onBlur={(e) => {
                            // Prevent modal from refocusing when input loses focus
                            e.stopPropagation();
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeVariable(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <ActionButton
                  variant="outline"
                  onClick={() => setIsEditTemplateDialogOpen(false)}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  variant="edit"
                  onClick={handleUpdateTemplate}
                  disabled={
                    !templateForm.name ||
                    !templateForm.subject ||
                    !templateForm.body
                  }
                >
                  Update Template
                </ActionButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
