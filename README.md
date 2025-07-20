# Krapi CMS

A modern, TypeScript-based headless CMS with React admin panel and Express.js backend.

## Quick Start

### Install All Dependencies

```bash
npm run install:all
```

### Development Mode (Both Frontend & Backend)

```bash
npm run dev
```

This starts both servers simultaneously:

- **Frontend**: http://localhost:3469
- **Backend API**: http://localhost:3470

### Individual Server Commands

#### Frontend Only

```bash
npm run dev:frontend
```

#### Backend Only

```bash
npm run dev:api
```

### Production Build

```bash
npm run build
```

### Production Start

```bash
npm start
```

### Testing

```bash
npm test
```

## Project Structure

```
Krapi/
├── admin-frontend/     # Next.js React frontend
├── api-server/         # Express.js TypeScript backend
├── development/        # Development tools
├── docs/              # Documentation
└── logs/              # Application logs
```

## Port Configuration

- **Frontend**: Port 3469
- **API Server**: Port 3470
- **WebSocket**: Port 3471 (built into API)

## Authentication

Default credentials:

- **Username**: `admin`
- **Password**: `admin123`

## Features

- 🔐 JWT Authentication
- 🤖 AI Integration with Ollama
- 📝 Content Management
- 👥 User Management
- 🔌 MCP (Model Context Protocol) Tools
- 🌙 Dark/Light Theme
- 📱 Responsive Design
- 🔄 Real-time WebSocket Updates

## Development

### Prerequisites

- Node.js 18+
- npm 8+
- Ollama (for AI features)

### Environment Setup

1. Install dependencies: `npm run install:all`
2. Start development servers: `npm run dev`
3. Open http://localhost:3469
4. Login with admin credentials

### AI Features Setup

1. Install Ollama from https://ollama.ai
2. Start Ollama: `ollama serve`
3. Pull a model: `ollama pull llama3.2:3b`
4. AI features will be available in the dashboard

## Available Scripts

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start both frontend and backend in development mode |
| `npm run dev:frontend` | Start frontend only                                 |
| `npm run dev:api`      | Start backend only                                  |
| `npm run build`        | Build both frontend and backend for production      |
| `npm run start`        | Start both servers in production mode               |
| `npm run test`         | Run tests for both frontend and backend             |
| `npm run install:all`  | Install dependencies for all packages               |

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the ports
netstat -ano | findstr :3469
netstat -ano | findstr :3470

# Kill processes if needed
taskkill /PID <process_id> /F
```

### Hydration Issues

If the frontend shows blank on first load:

1. Ensure both servers are running
2. Check browser console for errors
3. Try refreshing the page

### AI Features Not Working

1. Verify Ollama is installed and running
2. Check if models are available: `ollama list`
3. Ensure the API can connect to Ollama

## License

MIT License
