# Krapi CMS Development Manager

A modern desktop application for managing the Krapi CMS development environment. This replaces the old web-based control panel and batch file launcher with a comprehensive GUI application.

## Features

- **Modern Desktop GUI**: Native desktop application with a clean, intuitive interface
- **Real-time Service Monitoring**: Live status updates for all services
- **Automatic Dependency Management**: Checks and installs Node.js, pnpm, and project dependencies
- **Individual Service Controls**: Start/stop API server and frontend independently
- **Comprehensive Logging**: Separate log tabs for different services with timestamps
- **Port Management**: Automatically handles port conflicts and cleanup
- **Quick Access**: Direct links to open frontend and API documentation

## Requirements

- **Python 3.6+**: The manager is built with Python
- **psutil**: Python library for system and process utilities (auto-installed)
- **tkinter** (optional): For GUI interface - if not available, web interface is used automatically

## Getting Started

### Windows
```bash
# Simply run the batch file
StartManager.bat
```

### Linux/Mac
```bash
# Make executable (first time only)
chmod +x StartManager.sh

# Run the manager
./StartManager.sh
```

### Direct Python Execution
```bash
# Install dependencies
pip install -r requirements.txt

# Run the manager
python StartManager.py
```

## Interface Overview

### Service Status Panel
- **API Server (Port 3001)**: Shows current status of the backend server
- **Frontend (Port 3000)**: Shows current status of the React frontend
- **Dependencies**: Overall status of required dependencies

### Control Panel
- **Start All Services**: Launches both API server and frontend
- **Stop All Services**: Stops all running services
- **Individual Controls**: Start/stop services independently
- **Open Frontend**: Opens http://localhost:3000 in your browser
- **Open API Docs**: Opens API documentation (when available)
- **Install Dependencies**: Automatically installs Node.js dependencies for both projects
- **Clear Logs**: Clears all log windows

### Log Panel
Three separate tabs for monitoring:
- **Combined**: All logs from both services
- **API Server**: Backend-specific logs
- **Frontend**: Frontend-specific logs

### Dependencies Status
A detailed view showing:
- Node.js installation and version
- pnpm installation and version
- Python installation and version
- API project dependencies status
- Frontend project dependencies status

## What It Does

1. **Dependency Checking**: Automatically verifies that Node.js, pnpm, and project dependencies are installed
2. **Port Management**: Checks for and resolves port conflicts on 3000 and 3001
3. **Process Management**: Starts and monitors the development servers
4. **Real-time Monitoring**: Provides live status updates and log streaming
5. **Graceful Shutdown**: Properly stops all services when the application is closed

## Advantages Over the Old System

- **No Web Interface**: Direct desktop application instead of managing a web app at port 4000
- **Better Process Management**: More reliable process spawning and cleanup
- **Real-time Feedback**: Live status updates and log streaming
- **Dependency Management**: Automatic checking and installation of dependencies
- **Individual Control**: Start/stop services independently as needed
- **Better Error Handling**: Clear error messages and recovery options

## Troubleshooting

### Python Not Found
- Install Python from [python.org](https://python.org)
- Ensure Python is added to your system PATH

### Permission Errors
- On Linux/Mac, ensure the script is executable: `chmod +x StartManager.sh`
- Run with appropriate permissions if needed

### Port Conflicts
- The manager automatically detects and resolves port conflicts
- If issues persist, manually stop other applications using ports 3000 or 3001

### Dependencies Issues
- Use the "Install Dependencies" button to automatically install project dependencies
- Ensure you have internet connectivity for downloading packages

## Migration from Old System

The old `UnifiedDev.bat` and web control panel have been deprecated. This new manager provides all the same functionality and more:

- **Old**: `UnifiedDev.bat` → **New**: `StartManager.bat`
- **Old**: Web control panel at port 4000 → **New**: Desktop application
- **Old**: Manual dependency management → **New**: Automatic dependency checking and installation

## Technical Details

- **Built with**: Python 3 + tkinter (cross-platform GUI)
- **Process Management**: Uses subprocess and psutil for reliable process handling
- **Thread-safe**: All UI updates are properly threaded to prevent blocking
- **Cross-platform**: Works on Windows, Linux, and macOS

---

**Note**: The old `UnifiedDev.bat` file has been updated to automatically redirect to this new manager, ensuring a smooth transition for existing users.