# Krapi CMS

A modern, TypeScript-based headless CMS with a React admin panel.

## Quick Start

Simply double-click the `UnifiedDev.bat` file in the project root directory to launch the development environment.

This will start all services in a unified environment:

- API Server (port 3001)
- Admin Frontend (port 3000)
- Development Control Panel (port 4000)

The web-based control panel will open automatically in your browser.

## Default Login Credentials

- **Username:** admin
- **Password:** admin123

## Features

### Admin Dashboard

- Content management
- User administration
- Database management
- API monitoring
- File uploads
- Email templates

### Database Management

- View table data
- Execute custom SQL queries
- Export database
- Reset database to initial state

### Development Control Panel

- Start/stop individual services
- View real-time logs
- Monitor service status
- Database reset functionality

## Troubleshooting

If you experience login issues:

1. Make sure the API server is running (check in the control panel)
2. Try restarting both services
3. If problems persist, use the "Reset Database" button to recreate the database with default data

## Project Structure

- `/api-server` - Backend API server
- `/admin-frontend` - Next.js admin interface
- `/development` - Development tools and control panel
- `/logs` - Log files for various services

## Technology Stack

- **Backend:** Express.js, TypeScript, SQLite
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Development Tools:** Node.js, WebSockets

## Development Workflow

1. Double-click `UnifiedDev.bat` to start everything
2. Access the admin dashboard at http://localhost:3000
3. Use the development control panel at http://localhost:4000 for service management
4. Check logs in the separate log viewer window or in the web control panel
