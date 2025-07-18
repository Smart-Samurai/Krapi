# Krapi CMS

A modern, TypeScript-based headless CMS with a React admin panel. This project provides a complete development environment with cross-platform management tools for easy setup and deployment.

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** (for the development manager)
- **Node.js 16+** and **npm** (for the CMS itself)
- **Git** (for version control)

### Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd krapi-cms
   ```

2. **Start the development manager:**

   **Windows:**

   ```cmd
   start-manager.bat
   ```

   **Linux/macOS:**

   ```bash
   ./start-manager.sh
   ```

   **Direct Python (any platform):**

   ```bash
   python3 start-manager.py
   ```

3. **Access the application:**
   - **API Server:** http://localhost:3469

- **Admin Frontend:** http://localhost:3470
  - **Manager Interface:** http://localhost:8080 (if GUI unavailable)

## 📁 Project Structure

```
krapi-cms/
├── api-server/          # Backend Express.js application
├── admin-frontend/      # Frontend Next.js application
├── development/         # Development tools and utilities
├── docs/               # Project documentation
├── logs/               # Application logs
├── start-manager.py    # Main development manager (Python)
├── start-manager.bat   # Windows launcher
├── start-manager.sh    # Unix launcher (Linux/macOS)
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## 🛠️ Development Manager Features

The Python-based development manager provides:

- **Cross-platform compatibility** (Windows, Linux, macOS)
- **Automatic dependency management**
- **Service monitoring and control**
- **Real-time logging and status updates**
- **Desktop GUI** (when available) or **web interface** fallback
- **One-click service management**

### Manager Interfaces

1. **Desktop GUI** (preferred - requires tkinter)

   - Full-featured interface with real-time updates
   - Service controls and monitoring
   - Integrated log viewer

2. **Web Interface** (fallback)
   - Accessible via browser at http://localhost:8080
   - Basic status monitoring and controls
   - Used automatically when GUI is unavailable

## 📊 Services

### API Server (Port 3469)

- **Technology:** Express.js + TypeScript
- **Database:** SQLite with better-sqlite3
- **Features:** RESTful APIs, JWT authentication, input validation

### Admin Frontend (Port 3470)

- **Technology:** Next.js + React + TypeScript
- **Styling:** Tailwind CSS
- **Features:** Responsive design, form validation, real-time updates

## 🔧 Development Workflow

### Starting Development

1. Run the appropriate launcher script for your platform
2. Wait for all services to start (green status indicators)
3. Open http://localhost:3470 to access the admin panel

### Stopping Services

- Use the "Stop All Services" button in the manager
- Or press Ctrl+C in the terminal
- Or close the manager window (will prompt to stop services)

### Viewing Logs

- **Desktop GUI:** Built-in log viewer with filtering
- **Web Interface:** Basic log display
- **File System:** Check the `logs/` directory

## 🐛 Troubleshooting

### Common Issues

1. **"Python not found"**

   - Install Python 3.8+ from https://python.org/
   - Ensure Python is added to your system PATH

2. **"npm not found"**

   - Install Node.js from https://nodejs.org/
   - Restart your terminal after installation

3. **Virtual environment creation fails**

   - Linux/Ubuntu: `sudo apt install python3-venv`
   - macOS: Virtual environments should be included with Python

4. **GUI not available**

   - The manager will automatically use the web interface
   - Linux/Ubuntu: Install tkinter with `sudo apt install python3-tk`

5. **Port already in use**
   - Check if services are already running
   - Use the manager to stop conflicting processes
   - Or manually kill processes using those ports

### Debug Mode

Run with additional debugging:

```bash
python3 start-manager.py --web  # Force web interface
python3 start-manager.py        # Try GUI first, fallback to web
```

## 📚 Documentation

Additional documentation is available in the `docs/` directory:

- **Architecture Guide:** System design and component overview
- **API Documentation:** Endpoint specifications and examples
- **Development Guide:** Detailed setup and contribution guidelines
- **Testing Guide:** How to run tests and quality checks
- **Troubleshooting:** Extended troubleshooting and FAQ

## 🔒 Security

- JWT-based authentication for API access
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Secure password handling with bcrypt

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding standards
4. Test your changes using the development manager
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs in the `logs/` directory
3. Consult the documentation in `docs/`
4. Open an issue on the project repository

---

**Note:** This project uses a unified Python-based development manager for cross-platform compatibility. All development operations should go through the manager rather than running services directly.
