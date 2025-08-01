"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FiMail } from "react-icons/fi";

export default function ProjectEmailPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Email Service</h1>
          <p className="text-text/60 mt-2">
            Send transactional emails from your project
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FiMail className="w-16 h-16 text-text/30 mb-4" />
            <h3 className="text-xl font-semibold text-text mb-2">
              Coming Soon
            </h3>
            <p className="text-text/60 text-center max-w-md">
              Email functionality will be available in a future update. 
              You'll be able to send transactional emails, manage templates, 
              and track email delivery.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}