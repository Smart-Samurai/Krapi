"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Send,
  Mail,
  FileText,
  Settings,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: "html" | "text";
  project_id?: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface SentEmail {
  id: string;
  to: string;
  subject: string;
  status: "sent" | "delivered" | "failed" | "bounced";
  sent_at: string;
  delivered_at?: string;
  error_message?: string;
  template_id?: string;
}

interface EmailAnalytics {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_bounced: number;
  delivery_rate: number;
  bounce_rate: number;
  period: string;
}

export default function EmailPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);

  // Form states
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: "",
    type: "html" as const,
  });

  const [emailToSend, setEmailToSend] = useState({
    to: "",
    subject: "",
    content: "",
    type: "html" as const,
    template_id: "",
  });

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/krapi/k1/email/templates");
      if (!response.ok) throw new Error("Failed to fetch email templates");
      const data = await response.json();
      setTemplates(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchSentEmails = async () => {
    try {
      const response = await fetch("/api/krapi/k1/email/sent");
      if (!response.ok) throw new Error("Failed to fetch sent emails");
      const data = await response.json();
      setSentEmails(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/krapi/k1/email/analytics?period=7d");
      if (!response.ok) throw new Error("Failed to fetch email analytics");
      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createTemplate = async () => {
    try {
      const response = await fetch("/api/krapi/k1/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });
      if (!response.ok) throw new Error("Failed to create email template");
      await fetchTemplates();
      setShowCreateTemplate(false);
      setNewTemplate({ name: "", subject: "", content: "", type: "html" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const sendEmail = async () => {
    try {
      const response = await fetch("/api/krapi/k1/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailToSend),
      });
      if (!response.ok) throw new Error("Failed to send email");
      await fetchSentEmails();
      await fetchAnalytics();
      setShowSendEmail(false);
      setEmailToSend({
        to: "",
        subject: "",
        content: "",
        type: "html",
        template_id: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(
        `/api/krapi/k1/email/templates/${templateId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete template");
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    setEmailToSend({
      to: "",
      subject: template.subject,
      content: template.content,
      type: template.type,
      template_id: template.id,
    });
    setShowSendEmail(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "bounced":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "bounced":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTemplates(),
        fetchSentEmails(),
        fetchAnalytics(),
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmails = sentEmails.filter(
    (email) =>
      email.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading email data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-gray-600">
            Manage email templates, send emails, and view analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showSendEmail} onOpenChange={setShowSendEmail}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog
            open={showCreateTemplate}
            onOpenChange={setShowCreateTemplate}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates and emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="sent">Sent Emails</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <CardDescription>
                          Subject: {template.subject}
                          {` • Created: ${formatDate(template.created_at)}`}
                          {` • Used ${template.usage_count} times`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {template.type.toUpperCase()}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => useTemplate(template)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Use
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No email templates found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No templates match your search."
                  : "Create your first email template to get started."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateTemplate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredEmails.map((email) => (
              <Card key={email.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-green-500" />
                      <div>
                        <CardTitle className="text-lg">
                          {email.subject}
                        </CardTitle>
                        <CardDescription>
                          To: {email.to}
                          {` • Sent: ${formatDate(email.sent_at)}`}
                          {email.delivered_at &&
                            ` • Delivered: ${formatDate(email.delivered_at)}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(email.status)}>
                        {getStatusIcon(email.status)}
                        <span className="ml-1 capitalize">{email.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {email.error_message && (
                  <CardContent>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {email.error_message}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {filteredEmails.length === 0 && (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No sent emails found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No emails match your search."
                  : "Send your first email to get started."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowSendEmail(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Sent
                  </CardTitle>
                  <Send className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.total_sent}
                  </div>
                  <p className="text-xs text-gray-600">
                    Emails sent in {analytics.period}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Delivered
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.total_delivered}
                  </div>
                  <p className="text-xs text-gray-600">
                    {analytics.delivery_rate.toFixed(1)}% delivery rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.total_failed}
                  </div>
                  <p className="text-xs text-gray-600">Failed deliveries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bounced</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.total_bounced}
                  </div>
                  <p className="text-xs text-gray-600">
                    {analytics.bounce_rate.toFixed(1)}% bounce rate
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Create a reusable email template for sending emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label htmlFor="template-subject">Subject</Label>
              <Input
                id="template-subject"
                value={newTemplate.subject}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, subject: e.target.value })
                }
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <Label htmlFor="template-type">Type</Label>
              <Select
                value={newTemplate.type}
                onValueChange={(value: "html" | "text") =>
                  setNewTemplate({ ...newTemplate, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="text">Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template-content">Content</Label>
              <Textarea
                id="template-content"
                value={newTemplate.content}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, content: e.target.value })
                }
                placeholder="Enter email content"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateTemplate(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createTemplate}
              disabled={
                !newTemplate.name ||
                !newTemplate.subject ||
                !newTemplate.content
              }
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={showSendEmail} onOpenChange={setShowSendEmail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send an email directly or using a template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={emailToSend.to}
                onChange={(e) =>
                  setEmailToSend({ ...emailToSend, to: e.target.value })
                }
                placeholder="Enter recipient email"
              />
            </div>
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailToSend.subject}
                onChange={(e) =>
                  setEmailToSend({ ...emailToSend, subject: e.target.value })
                }
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <Label htmlFor="email-type">Type</Label>
              <Select
                value={emailToSend.type}
                onValueChange={(value: "html" | "text") =>
                  setEmailToSend({ ...emailToSend, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="text">Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email-content">Content</Label>
              <Textarea
                id="email-content"
                value={emailToSend.content}
                onChange={(e) =>
                  setEmailToSend({ ...emailToSend, content: e.target.value })
                }
                placeholder="Enter email content"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendEmail(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendEmail}
              disabled={
                !emailToSend.to || !emailToSend.subject || !emailToSend.content
              }
            >
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Details Dialog */}
      <Dialog
        open={!!selectedTemplate}
        onOpenChange={() => setSelectedTemplate(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Email Template Details</DialogTitle>
            <DialogDescription>
              View and edit email template details.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTemplate.name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    <Badge variant="outline">
                      {selectedTemplate.type.toUpperCase()}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(selectedTemplate.created_at)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Usage Count</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTemplate.usage_count}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTemplate.subject}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Content</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedTemplate.type === "html" ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedTemplate.content,
                      }}
                    />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap">
                      {selectedTemplate.content}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

