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
import { useKrapi } from "@/lib/hooks/useKrapi";
import type { EmailConfig, EmailTemplate } from "@/lib/krapi";
import {
  fetchEmailConfig,
  updateEmailConfig,
  testEmailConfig,
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "@/store/emailSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { beginBusy, endBusy } from "@/store/uiSlice";

export default function EmailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const krapi = useKrapi();
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

  const loadEmailConfigCb = useCallback(() => {
    dispatch(fetchEmailConfig({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

  const loadTemplatesCb = useCallback(() => {
    dispatch(fetchEmailTemplates({ projectId, krapi }));
  }, [dispatch, projectId, krapi]);

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
    try {
      setIsSaving(true);
      dispatch(beginBusy());
      const action = await dispatch(
        updateEmailConfig({
          projectId,
          config: { ...configForm } as EmailConfig,
          krapi,
        })
      );
      if (!updateEmailConfig.fulfilled.match(action)) {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to update email config";
        setError(String(msg));
      }
    } catch {
      setError("Failed to update email config");
    } finally {
      setIsSaving(false);
      dispatch(endBusy());
    }
  };

  const handleTestConfig = async () => {
    try {
      setIsTesting(true);
      dispatch(beginBusy());
      const action = await dispatch(
        testEmailConfig({ projectId, email: testEmail, krapi })
      );
      if (!testEmailConfig.fulfilled.match(action)) {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to test email config";
        setError(String(msg));
      }
    } catch {
      setError("Failed to test email config");
    } finally {
      setIsTesting(false);
      dispatch(endBusy());
    }
  };

  const handleCreateTemplate = async () => {
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        createEmailTemplate({ projectId, data: { ...templateForm }, krapi })
      );
      if (createEmailTemplate.fulfilled.match(action)) {
        setIsCreateTemplateDialogOpen(false);
        setTemplateForm({ name: "", subject: "", body: "", variables: [] });
        loadTemplatesCb();
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to create template";
        setError(String(msg));
      }
    } catch {
      setError("Failed to create template");
    } finally {
      dispatch(endBusy());
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        updateEmailTemplate({
          projectId,
          templateId: editingTemplate.id,
          updates: { ...templateForm },
          krapi,
        })
      );
      if (updateEmailTemplate.fulfilled.match(action)) {
        setIsEditTemplateDialogOpen(false);
        setEditingTemplate(null);
        setTemplateForm({ name: "", subject: "", body: "", variables: [] });
        loadTemplatesCb();
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to update template";
        setError(String(msg));
      }
    } catch {
      setError("Failed to update template");
    } finally {
      dispatch(endBusy());
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      dispatch(beginBusy());
      const action = await dispatch(
        deleteEmailTemplate({ projectId, templateId, krapi })
      );
      if (deleteEmailTemplate.fulfilled.match(action)) {
        loadTemplatesCb();
      } else {
        const msg =
          (action as { payload?: string }).payload ||
          "Failed to delete template";
        setError(String(msg));
      }
    } catch {
      setError("Failed to delete template");
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
          {[...Array(3)].map((_, i) => (
            <Skeleton
              key={`email-skeleton-item-${i}`}
              className="h-32 w-full"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Configuration</h1>
          <p className="text-muted-foreground">
            Configure SMTP settings and manage email templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isApiDocsOpen} onOpenChange={setIsApiDocsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                API Docs
              </Button>
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
                  <h3 className="text-lg font-semibold mb-2">
                    Available Endpoints
                  </h3>
                  <div className="text-sm space-y-2">
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
      </div>

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
          <Card>
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
                <Button onClick={handleSaveConfig} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
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
                onClick={handleTestConfig}
                disabled={isTesting || !testEmail}
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
              <h2 className="text-2xl font-bold">Email Templates</h2>
              <p className="text-muted-foreground">
                Create and manage email templates for your project
              </p>
            </div>
            <Dialog
              open={isCreateTemplateDialogOpen}
              onOpenChange={setIsCreateTemplateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                          key={`email-variable-${variable}-${index}`}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={variable}
                            onChange={(e) =>
                              updateVariable(index, e.target.value)
                            }
                            placeholder="variable_name"
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
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateTemplateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={
                      !templateForm.name ||
                      !templateForm.subject ||
                      !templateForm.body
                    }
                  >
                    Create Template
                  </Button>
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
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Email Templates Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create your first email template to get started
                </p>
                <Button onClick={() => setIsCreateTemplateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
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
                              {template.variables.map((variable, index) => (
                                <Badge
                                  key={`email-template-variable-${variable}-${index}`}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
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
                        key={`email-edit-variable-${variable}-${index}`}
                        className="flex items-center gap-2"
                      >
                        <Input
                          value={variable}
                          onChange={(e) =>
                            updateVariable(index, e.target.value)
                          }
                          placeholder="variable_name"
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
                <Button
                  variant="outline"
                  onClick={() => setIsEditTemplateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateTemplate}
                  disabled={
                    !templateForm.name ||
                    !templateForm.subject ||
                    !templateForm.body
                  }
                >
                  Update Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
