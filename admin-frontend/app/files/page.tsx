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
  FiFileText,
  FiImage,
  FiVideo,
  FiMusic,
  FiArchive,
  FiDownload,
  FiUpload,
  FiTrash2,
  FiEdit,
  FiEye,
  FiMoreVertical,
  FiSearch,
  FiFilter,
} from "react-icons/fi";

const fileSchema = z.object({
  name: z.string().min(1, "File name is required"),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type FileFormData = z.infer<typeof fileSchema>;

export default function FilesPage() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const files = [
    {
      id: "N/I",
      name: "Not Implemented",
      type: "N/I",
      size: "N/I",
      uploadedBy: "N/I",
      uploadedAt: "N/I",
      tags: ["N/I"],
    },
  ];

  const handleUploadFile = async (data: FileFormData) => {
    console.log("Upload file:", data);
    setIsUploadDialogOpen(false);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <FiImage className="h-5 w-5 text-blue-600" />;
      case "video":
        return <FiVideo className="h-5 w-5 text-purple-600" />;
      case "audio":
        return <FiMusic className="h-5 w-5 text-green-600" />;
      case "archive":
        return <FiArchive className="h-5 w-5 text-orange-600" />;
      default:
        return <FiFileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Files</h1>
          <p className="text-text/60 mt-1">
            Manage your KRAPI file storage and uploads
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <FiDownload className="mr-2 h-4 w-4" />
            Download All
          </Button>
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="default" size="lg">
                <FiPlus className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload New File</DialogTitle>
                <DialogDescription>
                  Upload a new file to your KRAPI storage
                </DialogDescription>
              </DialogHeader>
              <Form schema={fileSchema} onSubmit={handleUploadFile}>
                <div className="space-y-4">
                  <FormField
                    name="name"
                    label="File Name"
                    type="text"
                    placeholder="Enter file name"
                    required
                  />
                  <FormField
                    name="description"
                    label="Description"
                    type="textarea"
                    placeholder="Optional file description"
                  />
                  <FormField
                    name="tags"
                    label="Tags"
                    type="text"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsUploadDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default">
                    Upload File
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
              <p className="text-sm font-medium text-text/60">Total Files</p>
              <p className="text-2xl font-bold text-text mt-1">
                {files.length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiFileText className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Total Size</p>
              <p className="text-2xl font-bold text-text mt-1">178.1 MB</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiUpload className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Images</p>
              <p className="text-2xl font-bold text-text mt-1">
                {files.filter((f) => f.type === "image").length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiImage className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-background border border-secondary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text/60">Documents</p>
              <p className="text-2xl font-bold text-text mt-1">
                {files.filter((f) => f.type === "document").length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FiFileText className="h-6 w-6 text-purple-600" />
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
              placeholder="Search files..."
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

      {/* Files List */}
      <div className="bg-background border border-secondary rounded-lg">
        <div className="p-6 border-b border-secondary">
          <h2 className="text-xl font-semibold text-text">All Files</h2>
        </div>
        <div className="divide-y divide-secondary/50">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="p-6 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-secondary/20 rounded-lg">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-text">{file.name}</h3>
                      <span className="text-sm text-text/60">{file.size}</span>
                    </div>
                    <p className="text-sm text-text/60 mt-1">
                      Uploaded by {file.uploadedBy} on {file.uploadedAt}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      {file.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-secondary/20 text-text/80 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <IconButton
                    icon={FiEye}
                    variant="secondary"
                    size="sm"
                    title="View File"
                  />
                  <IconButton
                    icon={FiDownload}
                    variant="secondary"
                    size="sm"
                    title="Download File"
                  />
                  <IconButton
                    icon={FiEdit}
                    variant="secondary"
                    size="sm"
                    title="Edit File"
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
        title="File Management"
        variant="info"
        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      >
        <div className="text-sm space-y-2">
          <p>
            KRAPI provides secure file storage with automatic organization and
            easy access controls.
          </p>
          <p>
            <strong>Supported Formats:</strong> Images (JPG, PNG, GIF),
            Documents (PDF, DOC), Videos (MP4, AVI), Audio (MP3, WAV), Archives
            (ZIP, RAR)
          </p>
          <p>
            <strong>Storage Limits:</strong> Each project has its own isolated
            storage space with configurable limits.
          </p>
        </div>
      </InfoBlock>
    </div>
  );
}
