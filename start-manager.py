#!/usr/bin/env python3
"""
Krapi CMS Development Manager
A cross-platform desktop application to manage the Krapi CMS development environment.
Falls back to web interface if GUI is not available.
"""

import subprocess
import threading
import os
import sys
import json
import time
import signal
import webbrowser
import platform
from pathlib import Path
import shutil

# Try to import tkinter, fall back to web interface if not available
try:
    import tkinter as tk
    from tkinter import ttk, scrolledtext, messagebox, filedialog
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False

# Always import web interface modules (might be needed even with GUI)
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs
import html

# Try to import psutil, provide helpful error if missing
try:
    import psutil
except ImportError:
    print("Error: psutil is not installed.")
    print("Please install it with: pip install psutil")
    print("Or run this script with the launcher that handles dependencies.")
    sys.exit(1)

class CrossPlatformUtils:
    """Utilities for cross-platform compatibility"""
    
    @staticmethod
    def get_python_cmd():
        """Get the correct Python command for this system"""
        for cmd in ['python3', 'python']:
            try:
                result = subprocess.run([cmd, '--version'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    return cmd
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
        return None
    
    @staticmethod
    def get_npm_cmd():
        """Get the correct npm command for this system"""
        cmd = 'npm.cmd' if platform.system() == 'Windows' else 'npm'
        try:
            result = subprocess.run([cmd, '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return cmd
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        return None
    
    @staticmethod
    def get_platform_info():
        """Get platform information for display"""
        return {
            'system': platform.system(),
            'version': platform.version(),
            'machine': platform.machine(),
            'python_version': platform.python_version()
        }

class KrapiCMSManager:
    def __init__(self, use_web=False):
        self.use_web = use_web or not GUI_AVAILABLE
        
        # Process references
        self.api_process = None
        self.frontend_process = None
        self.websocket_process = None
        self.processes = {}
        
        # Status variables
        self.api_status = "Stopped"
        self.frontend_status = "Stopped"
        self.websocket_status = "Stopped"
        self.dependencies_status = "Checking..."
        
        # Project paths
        self.project_root = Path(__file__).parent.absolute()
        self.api_path = self.project_root / "api-server"
        self.frontend_path = self.project_root / "admin-frontend"
        self.logs_path = self.project_root / "logs"
        
        # Platform info
        self.platform_info = CrossPlatformUtils.get_platform_info()
        self.python_cmd = CrossPlatformUtils.get_python_cmd()
        self.npm_cmd = CrossPlatformUtils.get_npm_cmd()
        
        # Logs
        self.logs = {
            'combined': [],
            'api': [],
            'frontend': [],
            'websocket': []
        }
        
        # Ensure logs directory exists
        self.logs_path.mkdir(exist_ok=True)
        
        if self.use_web:
            self.setup_web_interface()
        else:
            self.setup_gui_interface()
            
    def log_message(self, message, log_type='combined'):
        """Add a message to the logs"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        
        self.logs[log_type].append(log_entry)
        if log_type != 'combined':
            self.logs['combined'].append(log_entry)
        
        # Keep only last 1000 entries
        if len(self.logs[log_type]) > 1000:
            self.logs[log_type] = self.logs[log_type][-1000:]
        
        print(log_entry)
        
        # Update GUI if available
        if not self.use_web and hasattr(self, 'log_text'):
            self.log_text.configure(state='normal')
            self.log_text.insert(tk.END, log_entry + '\n')
            self.log_text.configure(state='disabled')
            self.log_text.see(tk.END)
    
    def check_dependencies(self):
        """Check if all required dependencies are installed"""
        self.log_message("Checking dependencies...")
        
        dependencies = {
            'Python': self.python_cmd is not None,
            'npm': self.npm_cmd is not None,
            'Node.js API': (self.api_path / "package.json").exists(),
            'React Frontend': (self.frontend_path / "package.json").exists()
        }
        
        all_good = True
        for dep, status in dependencies.items():
            status_text = "✓" if status else "✗"
            self.log_message(f"  {status_text} {dep}")
            if not status:
                all_good = False
        
        if all_good:
            self.dependencies_status = "All dependencies available"
            self.log_message("✓ All dependencies are available")
        else:
            self.dependencies_status = "Some dependencies missing"
            self.log_message("⚠ Some dependencies are missing")
            
        if not self.use_web:
            self.dependencies_status_var.set(self.dependencies_status)
        
        return all_good
    
    def check_running_processes(self):
        """Check if services are already running"""
        self.log_message("Checking for running services...")
        
        # Check for API server (port 3470)
        api_running = self.is_port_in_use(3470)
        if api_running:
            self.api_status = "Running (External)"
            self.log_message("API Server is already running on port 3470")
        
        # WebSocket is integrated into API server on port 3470/ws
        # No separate WebSocket port needed
        
        # Check for frontend (port 3469, or fallback ports)
        frontend_running = False
        frontend_port = None
        for port in [3469, 3000, 3001, 3002, 3003]:
            if self.is_port_in_use(port):
                frontend_running = True
                frontend_port = port
                break
        
        if frontend_running:
            self.frontend_status = f"Running (External - Port {frontend_port})"
            self.log_message(f"Frontend is already running on port {frontend_port}")
        
        if not self.use_web:
            self.api_status_var.set(self.api_status)
            self.websocket_status_var.set(self.websocket_status)
            self.frontend_status_var.set(self.frontend_status)
    
    def is_port_in_use(self, port):
        """Check if a port is currently in use"""
        try:
            for conn in psutil.net_connections():
                if conn.laddr.port == port:
                    return True
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            pass
        return False
    
    def setup_gui_interface(self):
        """Setup tkinter GUI interface"""
        self.root = tk.Tk()
        self.root.title("Krapi CMS Development Manager")
        self.root.geometry("1200x800")
        self.root.minsize(800, 600)
        
        # Configure style
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Create status variables for GUI
        self.api_status_var = tk.StringVar(value=self.api_status)
        self.frontend_status_var = tk.StringVar(value=self.frontend_status)
        self.websocket_status_var = tk.StringVar(value=self.websocket_status)
        self.dependencies_status_var = tk.StringVar(value=self.dependencies_status)
        
        self.create_widgets()
        self.check_dependencies()
        self.check_running_processes()
        
        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
    def create_widgets(self):
        """Create and layout all GUI widgets"""
        if self.use_web:
            return
            
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(3, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="Krapi CMS Development Manager", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Platform info
        platform_text = f"Platform: {self.platform_info['system']} | Python: {self.platform_info['python_version']}"
        platform_label = ttk.Label(main_frame, text=platform_text, font=('Arial', 9))
        platform_label.grid(row=1, column=0, columnspan=3, pady=(0, 10))
        
        # Status Panel
        self.create_status_panel(main_frame)
        
        # Control Panel
        self.create_control_panel(main_frame)
        
        # Log Panel
        self.create_log_panel(main_frame)
        
    def create_status_panel(self, parent):
        """Create status indicators panel"""
        status_frame = ttk.LabelFrame(parent, text="Service Status", padding="10")
        status_frame.grid(row=2, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        status_frame.columnconfigure(1, weight=1)
        
        # API Server Status
        ttk.Label(status_frame, text="API Server (Port 3470):").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        api_status_label = ttk.Label(status_frame, textvariable=self.api_status_var, font=('Arial', 10, 'bold'))
        api_status_label.grid(row=0, column=1, sticky=tk.W)
        
        # WebSocket Server Status
        ttk.Label(status_frame, text="WebSocket (Integrated):").grid(row=1, column=0, sticky=tk.W, padx=(0, 10))
        websocket_status_label = ttk.Label(status_frame, textvariable=self.websocket_status_var, font=('Arial', 10, 'bold'))
        websocket_status_label.grid(row=1, column=1, sticky=tk.W)
        
        # Frontend Status
        ttk.Label(status_frame, text="Frontend (Port 3469):").grid(row=2, column=0, sticky=tk.W, padx=(0, 10))
        frontend_status_label = ttk.Label(status_frame, textvariable=self.frontend_status_var, font=('Arial', 10, 'bold'))
        frontend_status_label.grid(row=2, column=1, sticky=tk.W)
        
        # Dependencies Status
        ttk.Label(status_frame, text="Dependencies:").grid(row=3, column=0, sticky=tk.W, padx=(0, 10))
        deps_status_label = ttk.Label(status_frame, textvariable=self.dependencies_status_var, font=('Arial', 10, 'bold'))
        deps_status_label.grid(row=3, column=1, sticky=tk.W)
        
    def create_control_panel(self, parent):
        """Create control buttons panel"""
        control_frame = ttk.LabelFrame(parent, text="Controls", padding="10")
        control_frame.grid(row=2, column=3, sticky=(tk.W, tk.E, tk.N), padx=(10, 0), pady=(0, 10))
        
        # Start All button
        self.start_all_btn = ttk.Button(control_frame, text="Start All Services", 
                                       command=self.start_all_services)
        self.start_all_btn.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 5))
        
        # Stop All button
        self.stop_all_btn = ttk.Button(control_frame, text="Stop All Services", 
                                      command=self.stop_all_services)
        self.stop_all_btn.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Individual service controls
        ttk.Label(control_frame, text="Individual Services:").grid(row=2, column=0, columnspan=2, pady=(10, 5))
        
        # API controls
        self.start_api_btn = ttk.Button(control_frame, text="Start API", 
                                       command=self.start_api_server)
        self.start_api_btn.grid(row=3, column=0, sticky=(tk.W, tk.E), padx=(0, 2))
        
        self.stop_api_btn = ttk.Button(control_frame, text="Stop API", 
                                      command=self.stop_api_server)
        self.stop_api_btn.grid(row=3, column=1, sticky=(tk.W, tk.E), padx=(2, 0))
        
        # WebSocket controls
        self.start_websocket_btn = ttk.Button(control_frame, text="Start WebSocket", 
                                            command=self.start_websocket_server)
        self.start_websocket_btn.grid(row=4, column=0, sticky=(tk.W, tk.E), padx=(0, 2), pady=(5, 0))
        
        self.stop_websocket_btn = ttk.Button(control_frame, text="Stop WebSocket", 
                                           command=self.stop_websocket_server)
        self.stop_websocket_btn.grid(row=4, column=1, sticky=(tk.W, tk.E), padx=(2, 0), pady=(5, 0))
        
        # Frontend controls
        self.start_frontend_btn = ttk.Button(control_frame, text="Start Frontend", 
                                           command=self.start_frontend_server)
        self.start_frontend_btn.grid(row=5, column=0, sticky=(tk.W, tk.E), padx=(0, 2), pady=(5, 0))
        
        self.stop_frontend_btn = ttk.Button(control_frame, text="Stop Frontend", 
                                          command=self.stop_frontend_server)
        self.stop_frontend_btn.grid(row=5, column=1, sticky=(tk.W, tk.E), padx=(2, 0), pady=(5, 0))
        
        # Quick access buttons
        ttk.Label(control_frame, text="Quick Access:").grid(row=6, column=0, columnspan=2, pady=(15, 5))
        
        ttk.Button(control_frame, text="Open Frontend (3469)",
                  command=lambda: webbrowser.open("http://localhost:3469")).grid(row=7, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 2))
        
        ttk.Button(control_frame, text="Open API (3470)",
                  command=lambda: webbrowser.open("http://localhost:3470")).grid(row=8, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 2))
        
        ttk.Button(control_frame, text="Open Logs Folder", 
                  command=self.open_logs_folder).grid(row=9, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 2))
        
        # Configure column weights
        control_frame.columnconfigure(0, weight=1)
        control_frame.columnconfigure(1, weight=1)
        
    def create_log_panel(self, parent):
        """Create log display panel"""
        log_frame = ttk.LabelFrame(parent, text="Application Logs", padding="10")
        log_frame.grid(row=3, column=0, columnspan=4, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(1, weight=1)
        
        # Log type selector
        log_type_frame = ttk.Frame(log_frame)
        log_type_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), pady=(0, 5))
        
        ttk.Label(log_type_frame, text="Log Type:").grid(row=0, column=0, padx=(0, 10))
        
        self.log_type_var = tk.StringVar(value="combined")
        log_type_combo = ttk.Combobox(log_type_frame, textvariable=self.log_type_var, 
                                     values=["combined", "api", "frontend", "websocket"], state="readonly")
        log_type_combo.grid(row=0, column=1, padx=(0, 10))
        log_type_combo.bind('<<ComboboxSelected>>', self.on_log_type_changed)
        
        # Clear button
        ttk.Button(log_type_frame, text="Clear Logs", 
                  command=self.clear_logs).grid(row=0, column=2, padx=(10, 0))
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, width=100)
        self.log_text.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        self.log_text.configure(state='disabled')
    
    def on_log_type_changed(self, event=None):
        """Handle log type selection change"""
        log_type = self.log_type_var.get()
        self.log_text.configure(state='normal')
        self.log_text.delete(1.0, tk.END)
        
        for entry in self.logs[log_type]:
            self.log_text.insert(tk.END, entry + '\n')
        
        self.log_text.configure(state='disabled')
        self.log_text.see(tk.END)
    
    def clear_logs(self):
        """Clear the current log display"""
        log_type = self.log_type_var.get()
        self.logs[log_type].clear()
        self.log_text.configure(state='normal')
        self.log_text.delete(1.0, tk.END)
        self.log_text.configure(state='disabled')
    
    def open_logs_folder(self):
        """Open the logs folder in file explorer"""
        try:
            if platform.system() == "Windows":
                os.startfile(self.logs_path)
            elif platform.system() == "Darwin":  # macOS
                subprocess.run(["open", self.logs_path])
            else:  # Linux
                subprocess.run(["xdg-open", self.logs_path])
        except Exception as e:
            self.log_message(f"Error opening logs folder: {e}")
    
    def start_all_services(self):
        """Start all services"""
        self.log_message("Starting all services...")
        self.start_api_server()
        time.sleep(2)  # Give API time to start
        self.start_websocket_server()
        time.sleep(1)  # Give WebSocket time to start
        self.start_frontend_server()
    
    def stop_all_services(self):
        """Stop all services"""
        self.log_message("Stopping all services...")
        self.stop_api_server()
        self.stop_websocket_server()
        self.stop_frontend_server()
    
    def start_api_server(self):
        """Start the API server"""
        if self.api_process and self.api_process.poll() is None:
            self.log_message("API server is already running")
            return
        
        if not self.npm_cmd:
            self.log_message("Error: npm not found. Please install Node.js")
            return
        
        if not (self.api_path / "package.json").exists():
            self.log_message("Error: API server package.json not found")
            return
        
        self.log_message("Starting API server...")
        try:
            # Check if node_modules exists, run npm install if not
            if not (self.api_path / "node_modules").exists():
                self.log_message("Installing API dependencies...")
                install_process = subprocess.run([self.npm_cmd, "install"], 
                                               cwd=self.api_path, capture_output=True, text=True)
                if install_process.returncode != 0:
                    self.log_message(f"Error installing API dependencies: {install_process.stderr}")
                    return
            
            # Set environment variables for the API
            env = os.environ.copy()
            env['PORT'] = '3470'
            env['NODE_ENV'] = 'development'
            
            # Start the API server in development mode
            self.api_process = subprocess.Popen([self.npm_cmd, "run", "dev"], 
                                              cwd=self.api_path, 
                                              stdout=subprocess.PIPE, 
                                              stderr=subprocess.STDOUT, 
                                              text=True, bufsize=1, 
                                              universal_newlines=True,
                                              env=env)
            
            # Start logging thread
            threading.Thread(target=self.log_api_output, daemon=True).start()
            
            self.api_status = "Starting..."
            if not self.use_web:
                self.api_status_var.set(self.api_status)
            
            # Check if it started successfully after a delay
            threading.Thread(target=self.check_api_startup, daemon=True).start()
            
        except Exception as e:
            self.log_message(f"Error starting API server: {e}")
    
    def start_frontend_server(self):
        """Start the frontend server"""
        if self.frontend_process and self.frontend_process.poll() is None:
            self.log_message("Frontend server is already running")
            return
        
        if not self.npm_cmd:
            self.log_message("Error: npm not found. Please install Node.js")
            return
        
        if not (self.frontend_path / "package.json").exists():
            self.log_message("Error: Frontend package.json not found")
            return
        
        self.log_message("Starting frontend server...")
        try:
            # Check if node_modules exists, run npm install if not
            if not (self.frontend_path / "node_modules").exists():
                self.log_message("Installing frontend dependencies...")
                install_process = subprocess.run([self.npm_cmd, "install"], 
                                               cwd=self.frontend_path, capture_output=True, text=True)
                if install_process.returncode != 0:
                    self.log_message(f"Error installing frontend dependencies: {install_process.stderr}")
                    return
            
            # Set environment variables for the frontend
            env = os.environ.copy()
            env['PORT'] = '3469'
            env['NEXT_PUBLIC_API_URL'] = 'http://localhost:3470/api'
            env['NEXT_PUBLIC_WS_URL'] = 'ws://localhost:3470/ws'
            
            # Start the frontend server with custom port
            self.frontend_process = subprocess.Popen([self.npm_cmd, "run", "dev"], 
                                                   cwd=self.frontend_path, 
                                                   stdout=subprocess.PIPE, 
                                                   stderr=subprocess.STDOUT, 
                                                   text=True, bufsize=1, 
                                                   universal_newlines=True,
                                                   env=env)
            
            # Start logging thread
            threading.Thread(target=self.log_frontend_output, daemon=True).start()
            
            self.frontend_status = "Starting..."
            if not self.use_web:
                self.frontend_status_var.set(self.frontend_status)
            
            # Check if it started successfully after a delay
            threading.Thread(target=self.check_frontend_startup, daemon=True).start()
            
        except Exception as e:
            self.log_message(f"Error starting frontend server: {e}")
    
    def start_websocket_server(self):
        """WebSocket server is integrated with API server"""
        self.log_message("WebSocket server is integrated with API server on port 3470/ws")
        self.websocket_status = "Integrated with API"
        if not self.use_web:
            self.websocket_status_var.set(self.websocket_status)
    
    def stop_api_server(self):
        """Stop the API server"""
        if self.api_process:
            self.log_message("Stopping API server...")
            try:
                self.api_process.terminate()
                self.api_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.api_process.kill()
            self.api_process = None
            self.api_status = "Stopped"
            if not self.use_web:
                self.api_status_var.set(self.api_status)
            self.log_message("API server stopped")
    
    def stop_frontend_server(self):
        """Stop the frontend server"""
        if self.frontend_process:
            self.log_message("Stopping frontend server...")
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
            self.frontend_process = None
            self.frontend_status = "Stopped"
            if not self.use_web:
                self.frontend_status_var.set(self.frontend_status)
            self.log_message("Frontend server stopped")
    
    def stop_websocket_server(self):
        """Stop the WebSocket server"""
        if self.websocket_process:
            self.log_message("Stopping WebSocket server...")
            try:
                self.websocket_process.terminate()
                self.websocket_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.websocket_process.kill()
            self.websocket_process = None
            self.websocket_status = "Stopped"
            if not self.use_web:
                self.websocket_status_var.set(self.websocket_status)
            self.log_message("WebSocket server stopped")
    
    def log_api_output(self):
        """Log API server output"""
        if not self.api_process:
            return
        
        try:
            for line in iter(self.api_process.stdout.readline, ''):
                if line:
                    # Handle encoding issues by using utf-8 with error handling
                    try:
                        # Try to decode as utf-8 first
                        if isinstance(line, bytes):
                            decoded_line = line.decode('utf-8', errors='replace')
                        else:
                            decoded_line = line
                        self.log_message(f"[API] {decoded_line.strip()}", 'api')
                    except (UnicodeError, UnicodeDecodeError):
                        # Fallback to ascii with replacement
                        try:
                            if isinstance(line, bytes):
                                safe_line = line.decode('ascii', errors='replace')
                            else:
                                safe_line = line.encode('ascii', errors='replace').decode('ascii')
                            self.log_message(f"[API] {safe_line.strip()}", 'api')
                        except Exception:
                            # Last resort - just log the error
                            self.log_message(f"[API] [Encoding error in output]", 'api')
                if self.api_process.poll() is not None:
                    break
        except Exception as e:
            self.log_message(f"Error reading API output: {e}")
    
    def log_frontend_output(self):
        """Log frontend server output"""
        if not self.frontend_process:
            return
        
        try:
            for line in iter(self.frontend_process.stdout.readline, ''):
                if line:
                    # Handle encoding issues by using utf-8 with error handling
                    try:
                        # Try to decode as utf-8 first
                        if isinstance(line, bytes):
                            decoded_line = line.decode('utf-8', errors='replace')
                        else:
                            decoded_line = line
                        self.log_message(f"[Frontend] {decoded_line.strip()}", 'frontend')
                    except (UnicodeError, UnicodeDecodeError):
                        # Fallback to ascii with replacement
                        try:
                            if isinstance(line, bytes):
                                safe_line = line.decode('ascii', errors='replace')
                            else:
                                safe_line = line.encode('ascii', errors='replace').decode('ascii')
                            self.log_message(f"[Frontend] {safe_line.strip()}", 'frontend')
                        except Exception:
                            # Last resort - just log the error
                            self.log_message(f"[Frontend] [Encoding error in output]", 'frontend')
                if self.frontend_process.poll() is not None:
                    break
        except Exception as e:
            self.log_message(f"Error reading frontend output: {e}")
    
    def log_websocket_output(self):
        """Log WebSocket server output"""
        if not self.websocket_process:
            return
        
        try:
            for line in iter(self.websocket_process.stdout.readline, ''):
                if line:
                    # Handle encoding issues by using utf-8 with error handling
                    try:
                        # Try to decode as utf-8 first
                        if isinstance(line, bytes):
                            decoded_line = line.decode('utf-8', errors='replace')
                        else:
                            decoded_line = line
                        self.log_message(f"[WebSocket] {decoded_line.strip()}", 'websocket')
                    except (UnicodeError, UnicodeDecodeError):
                        # Fallback to ascii with replacement
                        try:
                            if isinstance(line, bytes):
                                safe_line = line.decode('ascii', errors='replace')
                            else:
                                safe_line = line.encode('ascii', errors='replace').decode('ascii')
                            self.log_message(f"[WebSocket] {safe_line.strip()}", 'websocket')
                        except Exception:
                            # Last resort - just log the error
                            self.log_message(f"[WebSocket] [Encoding error in output]", 'websocket')
                if self.websocket_process.poll() is not None:
                    break
        except Exception as e:
            self.log_message(f"Error reading WebSocket output: {e}")
    
    def check_api_startup(self):
        """Check if API server started successfully"""
        time.sleep(5)
        if self.is_port_in_use(3470):
            self.api_status = "Running"
            self.log_message("✓ API server started successfully on port 3470")
        else:
            self.api_status = "Failed to start"
            self.log_message("✗ API server failed to start")
        
        if not self.use_web:
            self.api_status_var.set(self.api_status)
    
    def check_frontend_startup(self):
        """Check if frontend server started successfully"""
        time.sleep(10)  # Frontend takes longer to start
        if self.is_port_in_use(3469):
            self.frontend_status = "Running"
            self.log_message("✓ Frontend server started successfully on port 3469")
        else:
            # Check if it's running on a different port (Next.js fallback)
            for port in [3000, 3001, 3002, 3003]:
                if self.is_port_in_use(port):
                    self.frontend_status = f"Running (Port {port})"
                    self.log_message(f"⚠ Frontend server started on port {port} instead of 3469")
                    break
            else:
                self.frontend_status = "Failed to start"
                self.log_message("✗ Frontend server failed to start")
        
        if not self.use_web:
            self.frontend_status_var.set(self.frontend_status)
    
    def check_websocket_startup(self):
        """WebSocket is integrated into API server"""
        # WebSocket is integrated into the API server, no separate check needed
        self.websocket_status = "Integrated with API"
        self.log_message("✓ WebSocket server integrated into API server on port 3470/ws")
        
        if not self.use_web:
            self.websocket_status_var.set(self.websocket_status)
    
    def on_closing(self):
        """Handle application closing"""
        if messagebox.askokcancel("Quit", "Do you want to stop all services and quit?"):
            self.stop_all_services()
            self.root.destroy()
    
    def setup_web_interface(self):
        """Setup web-based interface as fallback"""
        self.web_port = 8080
        print(f"GUI not available, starting web interface on port {self.web_port}")
        print(f"Platform: {self.platform_info['system']} {self.platform_info['version']}")
        print(f"Python: {self.platform_info['python_version']}")
    
    def run_web_interface(self):
        """Run the web interface"""
        class ManagerHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, manager, *args, **kwargs):
                self.manager = manager
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                if self.path == '/' or self.path == '/index.html':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    
                    html_content = self.manager.get_web_interface_html()
                    self.wfile.write(html_content.encode('utf-8'))
                else:
                    super().do_GET()
        
        def create_handler(*args, **kwargs):
            return ManagerHandler(self, *args, **kwargs)
        
        try:
            with socketserver.TCPServer(("", self.web_port), create_handler) as httpd:
                print(f"Web interface available at: http://localhost:{self.web_port}")
                print("Press Ctrl+C to stop")
                webbrowser.open(f"http://localhost:{self.web_port}")
                httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")
    
    def get_web_interface_html(self):
        """Generate HTML for web interface"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Krapi CMS Development Manager</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 20px; }}
        .status-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }}
        .status-card {{ background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }}
        .status-running {{ border-left-color: #28a745; }}
        .status-stopped {{ border-left-color: #dc3545; }}
        .buttons {{ display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }}
        .btn {{ padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; text-align: center; }}
        .btn-primary {{ background: #007bff; color: white; }}
        .btn-success {{ background: #28a745; color: white; }}
        .btn-danger {{ background: #dc3545; color: white; }}
        .platform-info {{ background: #e9ecef; padding: 10px; border-radius: 4px; margin: 10px 0; font-family: monospace; }}
        .logs {{ background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }}
        .logs pre {{ max-height: 300px; overflow-y: auto; background: #212529; color: #fff; padding: 15px; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Krapi CMS Development Manager</h1>
            <p>Cross-platform development environment manager</p>
        </div>
        
        <div class="platform-info">
            <strong>Platform Info:</strong><br>
            System: {self.platform_info['system']} {self.platform_info['version']}<br>
            Machine: {self.platform_info['machine']}<br>
            Python: {self.platform_info['python_version']}<br>
            GUI Available: {'Yes' if GUI_AVAILABLE else 'No (using web interface)'}
        </div>
        
        <div class="status-grid">
            <div class="status-card status-{'running' if self.api_status == 'Running' else 'stopped'}">
                <h3>🔧 API Server</h3>
                <p><strong>Status:</strong> {self.api_status}</p>
                <p><strong>Port:</strong> 3469</p>
                <p><strong>Path:</strong> {self.api_path}</p>
            </div>
            
            <div class="status-card status-{'running' if self.frontend_status == 'Running' else 'stopped'}">
                <h3>🎨 Frontend Server</h3>
                <p><strong>Status:</strong> {self.frontend_status}</p>
                <p><strong>Port:</strong> 3470</p>
                <p><strong>Path:</strong> {self.frontend_path}</p>
            </div>
            
            <div class="status-card">
                <h3>📦 Dependencies</h3>
                <p><strong>Status:</strong> {self.dependencies_status}</p>
                <p><strong>Python:</strong> {'✓' if self.python_cmd else '✗'} {self.python_cmd or 'Not found'}</p>
                <p><strong>npm:</strong> {'✓' if self.npm_cmd else '✗'} {self.npm_cmd or 'Not found'}</p>
            </div>
        </div>
        
        <div class="buttons">
            <button class="btn btn-success" onclick="startAll()">🚀 Start All Services</button>
            <button class="btn btn-danger" onclick="stopAll()">🛑 Stop All Services</button>
                                    <a href="http://localhost:3469" target="_blank" class="btn btn-primary">🎨 Open Frontend (3469)</a>
        <a href="http://localhost:3470" target="_blank" class="btn btn-primary">🔧 Open API (3470)</a>
            <button class="btn btn-primary" onclick="refreshStatus()">🔄 Refresh Status</button>
        </div>
        
        <div class="logs">
            <h3>📋 Recent Logs</h3>
            <pre id="logs">Web interface active. Use the desktop app for full functionality.</pre>
        </div>
    </div>
    
    <script>
        function startAll() {{
            alert('This feature requires the desktop application. Use the launcher scripts to start services.');
        }}
        
        function stopAll() {{
            alert('This feature requires the desktop application.');
        }}
        
        function refreshStatus() {{
            location.reload();
        }}
        
        // Auto-refresh every 30 seconds
        setInterval(refreshStatus, 30000);
    </script>
</body>
</html>
        """
    
    def run(self):
        """Start the application"""
        self.log_message("Krapi CMS Development Manager started")
        self.log_message(f"Project root: {self.project_root}")
        self.log_message(f"Platform: {self.platform_info['system']} {self.platform_info['version']}")
        self.log_message(f"Python: {self.platform_info['python_version']}")
        
        if self.use_web:
            self.check_dependencies()
            self.check_running_processes()
            self.run_web_interface()
        else:
            self.root.mainloop()

def main():
    """Main entry point"""
    try:
        # Check if we should force web interface
        use_web = "--web" in sys.argv or not GUI_AVAILABLE
        
        if not GUI_AVAILABLE:
            print("Note: tkinter not available, using web interface")
            print("Install tkinter for the desktop GUI: sudo apt install python3-tk")
        
        app = KrapiCMSManager(use_web=use_web)
        app.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()