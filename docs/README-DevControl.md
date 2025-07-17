# 🎮 Krapi Development Control Panel

A unified web-based control panel for managing your Krapi CMS development environment. This tool provides a centralized dashboard to start/stop services, reset the database, view logs, and more.

## 🚀 Quick Start

### Option 1: Using PowerShell (Recommended for Windows)

```powershell
# Start the control panel
.\dev-control.ps1 -Start

# Stop the control panel
.\dev-control.ps1 -Stop

# Install dependencies
.\dev-control.ps1 -Install

# Show help
.\dev-control.ps1 -Help
```

### Option 2: Using Batch File

```batch
# Double-click dev-control.bat or run:
dev-control.bat
```

### Option 3: Using Node.js directly

```bash
# Install dependencies (first time only)
npm install

# Start the control panel
npm run dev-control
# or
node dev-control/server.js
```

## 🌐 Access the Control Panel

Once started, open your browser and navigate to:
**http://localhost:4000**

## ✨ Features

### 🖥️ Service Management

- **Start/Stop API Server** (Port 3001)
- **Start/Stop Frontend** (Port 3000)
- **Restart Services** individually or all at once
- **Real-time Status Monitoring** with visual indicators

### 🗃️ Database Management

- **Reset Database** - Completely wipe and recreate the database
- **Live Database Reset** - No need to manually restart services

### 📝 Live Logging

- **Real-time Logs** from all services via WebSocket
- **Color-coded Log Levels** (Info, Success, Warning, Error)
- **Auto-scroll** with toggle option
- **Service-specific Logs** (API, Frontend, Control)
- **Clear Logs** functionality

### 📦 Development Tools

- **Install Dependencies** for both API and Frontend
- **Quick Access Links** to running services
- **Service Health Monitoring**

## 🎯 Use Cases

### During Development

- **Quick Environment Setup**: Start all services with one click
- **Database Testing**: Reset database between tests
- **Log Monitoring**: Watch real-time logs from all services
- **Service Debugging**: Restart individual services when needed

### Common Workflows

1. **Fresh Start**:

   - Open control panel
   - Click "Reset Database"
   - Click "Start All"
   - Development environment is ready

2. **Quick Restart**:

   - Click "Restart All" when you need to refresh everything
   - Or restart individual services as needed

3. **Dependency Updates**:
   - Click "Install Dependencies" when package.json changes
   - Restart services to pick up new dependencies

## 🔧 Technical Details

### Ports Used

- **Control Panel**: http://localhost:4000
- **WebSocket Logs**: ws://localhost:4001
- **API Server**: http://localhost:3001
- **Frontend**: http://localhost:3000

### File Structure

```
├── dev-control/
│   ├── server.js          # Main control server
│   └── public/
│       └── index.html     # Web UI
├── dev-control.ps1        # PowerShell launcher
├── dev-control.bat        # Batch launcher
├── package.json           # Control panel dependencies
└── README-DevControl.md   # This file
```

### Environment Variables

The control panel automatically sets appropriate environment variables:

- `NODE_ENV=development`
- `JWT_SECRET=dev-secret-key`
- `DB_PATH=./data/app.db`
- `DEFAULT_ADMIN_USERNAME=admin`
- `DEFAULT_ADMIN_PASSWORD=admin123`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`

## 🚨 Console Output

The control panel is designed to be console-friendly and provides rich console output:

- All operations are logged to console with timestamps
- Service outputs are piped through the control panel
- Real-time status updates and error reporting
- Color-coded messages for easy reading

## 🛑 Stopping the Control Panel

### From Web UI

- The control panel automatically handles service cleanup

### From Console

- Press `Ctrl+C` to gracefully shutdown
- All managed services will be stopped automatically

### From PowerShell

```powershell
.\dev-control.ps1 -Stop
```

## 🔍 Troubleshooting

### Port Conflicts

If ports 4000 or 4001 are in use:

1. Stop the control panel: `.\dev-control.ps1 -Stop`
2. Check for other processes using these ports
3. Restart the control panel

### Service Won't Start

1. Check the live logs in the web UI
2. Ensure dependencies are installed
3. Check if ports 3000/3001 are available
4. Try restarting individual services

### Database Issues

1. Use "Reset Database" to start fresh
2. Ensure the `api-server/data/` directory exists
3. Check API server logs for SQLite errors

## 🎨 UI Features

The web interface provides:

- **Responsive Design** - Works on desktop and mobile
- **Real-time Updates** - Status and logs update automatically
- **Visual Indicators** - Green/Red status dots
- **Quick Actions** - One-click operations
- **Live Log Stream** - WebSocket-powered real-time logs
- **Modern UI** - Clean, professional interface

## 💡 Tips

1. **Keep the control panel running** during development for the best experience
2. **Use "Reset Database"** when you need clean test data
3. **Monitor the logs** to catch issues early
4. **Use Quick Actions** for common operations like "Start All"
5. **Bookmark** http://localhost:4000 for quick access

---

**Happy Development! 🚀**
