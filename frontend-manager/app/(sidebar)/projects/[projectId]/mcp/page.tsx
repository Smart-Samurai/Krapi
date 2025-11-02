"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectMcpPage() {
  const params = useParams();
  if (!params || !params.projectId) {
    throw new Error("Project ID is required");
  }
  const projectId = params.projectId as string;
  const [provider, setProvider] = useState("openai");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const resp = await fetch(`/krapi/k1/mcp/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          endpoint,
          apiKey,
          model,
          messages: next,
        }),
      });
      const json = await resp.json();
      if (json.success) {
        setMessages(json.messages);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project MCP</h1>
        <p className="text-muted-foreground">
          Chat with project-scoped tools to inspect and modify your database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Provider</Label>
            <Input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="openai | ollama"
            />
          </div>
          <div>
            <Label>Endpoint</Label>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1 or http://localhost:11434"
            />
          </div>
          <div>
            <Label>API Key (for OpenAI)</Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder="sk-..."
            />
          </div>
          <div>
            <Label>Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini or llama3.1:8b"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded p-3 h-80 overflow-auto bg-background">
            {messages.map((m) => (
              <div key={`project-mcp-message-${m.role}-${m.content?.substring(0, 30) || Date.now()}-${Math.random()}`} className="mb-2">
                <span className="font-semibold mr-2">{m.role}:</span>
                <span className="whitespace-pre-wrap break-words">
                  {m.content}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask to list collections, create documents, etc."
            />
            <Button onClick={send} disabled={loading || !endpoint || !model}>
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
