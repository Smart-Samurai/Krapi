# Ollama Setup Guide for KRAPI CMS

## Overview

KRAPI CMS integrates with Ollama to provide AI-powered features through the Model Context Protocol (MCP). This allows you to interact with your CMS data using natural language queries.

## Installation

### 1. Install Ollama

Visit [https://ollama.ai](https://ollama.ai) and download Ollama for your operating system:

- **macOS**: `brew install ollama` or download the installer
- **Linux**: `curl -fsSL https://ollama.ai/install.sh | sh`
- **Windows**: Download the installer from the website

### 2. Start Ollama Service

```bash
ollama serve
```

This starts the Ollama server on `http://localhost:11434`

### 3. Pull a Model

For KRAPI CMS, we recommend starting with a lightweight model:

```bash
ollama pull llama3.2:3b
```

Other recommended models:
- `mistral:7b` - Good balance of performance and capabilities
- `llama3.1:8b` - Better for complex queries but requires more resources
- `phi3:mini` - Very lightweight, good for basic queries

## Configuration

### Environment Variables

In your `.env` file for the API server:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2:3b
OLLAMA_TIMEOUT=30000

# Enable MCP
MCP_ENABLED=true
MCP_DEBUG=false
```

## Using AI Features in KRAPI CMS

1. Navigate to **Dashboard > AI Assistant**
2. Check that Ollama status shows "Healthy"
3. Start chatting! Examples:
   - "Show me all users and their roles"
   - "List content items created in the last week"
   - "What routes are available in the system?"
   - "Create a new user with editor role"

## Available MCP Tools

The AI assistant can use these tools to interact with your CMS:

- **Content Management**: Create, read, update content items
- **User Management**: List users, check permissions
- **Route Management**: View and analyze API routes
- **File Operations**: List and search files
- **Schema Operations**: View content schemas
- **System Status**: Check health and statistics

## Troubleshooting

### Ollama Not Running

If you see "Ollama Not Running" in the dashboard:

1. Check if Ollama is installed: `ollama --version`
2. Start the service: `ollama serve`
3. Verify it's running: `curl http://localhost:11434/api/tags`

### Model Not Found

If you get model-related errors:

1. List available models: `ollama list`
2. Pull the required model: `ollama pull llama3.2:3b`
3. Update `OLLAMA_DEFAULT_MODEL` in your `.env` file

### Connection Refused

If the API can't connect to Ollama:

1. Check if Ollama is running on the correct port
2. Verify firewall settings
3. Check the `OLLAMA_BASE_URL` in your configuration

## Performance Tips

1. **Model Selection**: Smaller models (3B-7B parameters) are faster but less capable
2. **Context Length**: Keep conversations focused for better performance
3. **Tool Usage**: The AI will automatically use MCP tools when needed
4. **Caching**: Ollama caches models in memory for faster responses

## Security Considerations

1. Ollama runs locally by default - no data is sent to external servers
2. The MCP integration respects your CMS permissions
3. AI responses are based on the authenticated user's access level
4. Consider running Ollama on a separate machine for production deployments