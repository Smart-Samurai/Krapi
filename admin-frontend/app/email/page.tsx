"use client";

import React, { useState } from "react";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  IconButton,
  InfoBlock,
} from "@/components/styled";
import { Form, FormField } from "@/components/forms";
import {
  FiPlus,
  FiMail,
  FiSend,
  FiInbox,
  FiArchive,
  FiTrash2,
  FiEdit,
  FiEye,
  FiMoreVertical,
  FiSearch,
  FiFilter,
  FiSettings,
} from "react-icons/fi";

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  recipient: z.string().email("Please enter a valid email address"),
  content: z.string().min(1, "Content is required"),
  template: z.string().optional(),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function EmailPage() {
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const emails = [
    {
      id: "1",
      subject: "Welcome to KRAPI Platform",
      recipient: "user@example.com",
      status: "sent",
      sentAt: "2024-01-15 10:30",
      template: "welcome",
    },
    {
      id: "2",
      subject: "Password Reset Request",
      recipient: "admin@company.com",
      status: "sent",
      sentAt: "2024-01-14 15:45",
      template: "password-reset",
    },
    {
      id: "3",
      subject: "Project Update Notification",
      recipient: "team@project.com",
      status: "draft",
      sentAt: "2024-01-13 09:15",
      template: "project-update",
    },
    {
      id: "4",
      subject: "System Maintenance Alert",
      recipient: "all@krapi.com",
      status: "sent",
      sentAt: "2024-01-12 14:20",
      template: "maintenance",
    },
  ];

  const handleSendEmail = async (data: EmailFormData) => {
    console.log("Send email:", data);
    setIsComposeDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Email</h1>
          <p className="text-text/60 mt-1">
            Manage email templates and send notifications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <FiSettings className="mr-2 h-4 w-4" />
            Email Settings
          </Button>
          <Dialog
            open={isComposeDialogOpen}
            onOpenChange={setIsComposeDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="default" size="lg">
                <FiPlus className="mr-2 h-4 w-4" />
                Compose Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Email</DialogTitle>
                <DialogDescription>
                  Send a new email using templates or custom content
                </DialogDescription>
              </DialogHeader>
              <Form schema={emailSchema} onSubmit={handleSendEmail}>
                <div className="space-y-4">
                  <FormField
                    name="recipient"
                    label="Recipient"
                    type="email"
                    placeholder="Enter recipient email address"
                    required
                  />
                  <FormField
                    name="subject"
                    label="Subject"
                    type="text"
                    placeholder="Enter email subject"
                    required
                  />
                  <FormField
                    name="template"
                    label="Template"
                    type="select"
                    options={[
                      { value: "welcome", label: "Welcome Email" },
                      { value: "password-reset", label: "Password Reset" },
                      { value: "project-update", label: "Project Update" },
                      { value: "maintenance", label: "Maintenance Alert" },
                      { value: "custom", label: "Custom Template" },
                    ]}
                  />
                  <FormField
                    name="content"
                    label="Content"
                    type="textarea"
                    placeholder="Enter email content or use template"
                    required
                  />
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsComposeDialogOpen(false)}
                  >
                    Save Draft
                  </Button>
                  <Button type="submit" variant="default">
                    <FiSend className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                </DialogFooter>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Sent</p>
              <p className="text-2xl font-bold text-text mt-1">
                {emails.filter((e) => e.status === "sent").length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiSend className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Drafts</p>
              <p className="text-2xl font-bold text-text mt-1">
                {emails.filter((e) => e.status === "draft").length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <FiInbox className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Templates</p>
              <p className="text-2xl font-bold text-text mt-1">8</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiMail className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Failed</p>
              <p className="text-2xl font-bold text-text mt-1">0</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <FiTrash2 className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-background border border-secondary rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text/40 h-4 w-4" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary rounded-lg bg-background text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="secondary">
            <FiFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Emails List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">Email History</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiMail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{email.subject}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          email.status
                        )}`}
                      >
                        {email.status}
                      </span>
                    </div>
                    <p className="text-sm text-text/60 mt-1">
                      To: {email.recipient}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-text/60">
                      <span>Sent: {email.sentAt}</span>
                      <span>Template: {email.template}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <IconButton
                    icon={FiEye}
                    variant="secondary"
                    size="sm"
                    title="View Email"
                  />
                  <IconButton
                    icon={FiEdit}
                    variant="secondary"
                    size="sm"
                    title="Edit Email"
                  />
                  <IconButton
                    icon={FiArchive}
                    variant="secondary"
                    size="sm"
                    title="Archive Email"
                  />
                  <IconButton
                    icon={FiMoreVertical}
                    variant="secondary"
                    size="sm"
                    title="More Options"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Block */}
      <InfoBlock
        title="Email Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            KRAPI provides a comprehensive email system with templates,
            tracking, and delivery management.
          </p>
          <p>
            <strong>Templates:</strong> Pre-built email templates for common
            scenarios like welcome emails, password resets, and notifications.
          </p>
          <p>
            <strong>Delivery Tracking:</strong> Monitor email delivery status
            and handle failed deliveries automatically.
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
