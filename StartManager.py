#!/usr/bin/env python3
"""
Krapi CMS Development Manager
A desktop application to manage the Krapi CMS development environment.
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
from pathlib import Path
import psutil
import shutil

# Try to import tkinter, fall back to web interface if not available
try:
    import tkinter as tk
    from tkinter import ttk, scrolledtext, messagebox, filedialog
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False
    import http.server
    import socketserver
    from urllib.parse import urlparse, parse_qs
    import html

class KrapiCMSManager:
    def __init__(self, use_web=False):
        self.use_web = use_web or not GUI_AVAILABLE
        
        # Process references
        self.api_process = None
        self.frontend_process = None
        self.processes = {}
        
        # Status variables
        self.api_status = "Stopped"
        self.frontend_status = "Stopped"
        self.dependencies_status = "Checking..."
        
        # Project paths
        self.project_root = Path(__file__).parent.absolute()
        self.api_path = self.project_root / "api-server"
        self.frontend_path = self.project_root / "admin-frontend"
        
        # Logs
        self.logs = {
            'combined': [],
            'api': [],
            'frontend': []
        }
        
        if self.use_web:
            self.setup_web_interface()
        else:
            self.setup_gui_interface()
            
    def setup_gui_interface(self):
        """Setup tkinter GUI interface"""
        self.root = tk.Tk()
        self.root.title("Krapi CMS Development Manager")
        self.root.geometry("1000x700")
        self.root.minsize(800, 600)
        
        # Configure style
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Create status variables for GUI
        self.api_status_var = tk.StringVar(value=self.api_status)
        self.frontend_status_var = tk.StringVar(value=self.frontend_status)
        self.dependencies_status_var = tk.StringVar(value=self.dependencies_status)
        
        self.create_widgets()
        self.check_dependencies()
        self.check_running_processes()
        
        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
    def setup_web_interface(self):
        """Setup web-based interface as fallback"""
        self.web_port = 8080
        print(f"GUI not available, starting web interface on port {self.web_port}")
        
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
        main_frame.rowconfigure(2, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="Krapi CMS Development Manager", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Status Panel
        self.create_status_panel(main_frame)
        
        # Control Panel
        self.create_control_panel(main_frame)
        
        # Log Panel
        self.create_log_panel(main_frame)
        
        # Dependencies Panel
        self.create_dependencies_panel(main_frame)
        
    def create_status_panel(self, parent):
        """Create status indicators panel"""
        status_frame = ttk.LabelFrame(parent, text="Service Status", padding="10")
        status_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        status_frame.columnconfigure(1, weight=1)
        
        # API Server Status
        ttk.Label(status_frame, text="API Server (Port 3001):").grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        api_status_label = ttk.Label(status_frame, textvariable=self.api_status_var, font=('Arial', 10, 'bold'))
        api_status_label.grid(row=0, column=1, sticky=tk.W)
        
        # Frontend Status
        ttk.Label(status_frame, text="Frontend (Port 3000):").grid(row=1, column=0, sticky=tk.W, padx=(0, 10))
        frontend_status_label = ttk.Label(status_frame, textvariable=self.frontend_status_var, font=('Arial', 10, 'bold'))
        frontend_status_label.grid(row=1, column=1, sticky=tk.W)
        
        # Dependencies Status
        ttk.Label(status_frame, text="Dependencies:").grid(row=2, column=0, sticky=tk.W, padx=(0, 10))
        deps_status_label = ttk.Label(status_frame, textvariable=self.dependencies_status_var, font=('Arial', 10, 'bold'))
        deps_status_label.grid(row=2, column=1, sticky=tk.W)
        
    def create_control_panel(self, parent):
        """Create control buttons panel"""
        control_frame = ttk.LabelFrame(parent, text="Controls", padding="10")
        control_frame.grid(row=1, column=3, sticky=(tk.W, tk.E, tk.N), padx=(10, 0), pady=(0, 10))
        
        # Start All button
        self.start_all_btn = ttk.Button(control_frame, text="Start All Services", 
                                       command=self.start_all_services, style='Accent.TButton')
        self.start_all_btn.pack(fill=tk.X, pady=(0, 5))
        
        # Stop All button
        self.stop_all_btn = ttk.Button(control_frame, text="Stop All Services", 
                                      command=self.stop_all_services)
        self.stop_all_btn.pack(fill=tk.X, pady=(0, 10))
        
        # Individual service controls
        ttk.Separator(control_frame, orient='horizontal').pack(fill=tk.X, pady=(0, 10))
        
        # API Server controls
        ttk.Label(control_frame, text="API Server:", font=('Arial', 9, 'bold')).pack(anchor=tk.W)
        api_frame = ttk.Frame(control_frame)
        api_frame.pack(fill=tk.X, pady=(0, 5))
        
        self.start_api_btn = ttk.Button(api_frame, text="Start", command=self.start_api_server)
        self.start_api_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        self.stop_api_btn = ttk.Button(api_frame, text="Stop", command=self.stop_api_server)
        self.stop_api_btn.pack(side=tk.LEFT)
        
        # Frontend controls
        ttk.Label(control_frame, text="Frontend:", font=('Arial', 9, 'bold')).pack(anchor=tk.W, pady=(10, 0))
        frontend_frame = ttk.Frame(control_frame)
        frontend_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.start_frontend_btn = ttk.Button(frontend_frame, text="Start", command=self.start_frontend)
        self.start_frontend_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        self.stop_frontend_btn = ttk.Button(frontend_frame, text="Stop", command=self.stop_frontend)
        self.stop_frontend_btn.pack(side=tk.LEFT)
        
        # Utility buttons
        ttk.Separator(control_frame, orient='horizontal').pack(fill=tk.X, pady=(10, 10))
        
        # Open buttons
        ttk.Button(control_frame, text="Open Frontend", 
                  command=lambda: webbrowser.open("http://localhost:3000")).pack(fill=tk.X, pady=(0, 5))
        
        ttk.Button(control_frame, text="Open API Docs", 
                  command=lambda: webbrowser.open("http://localhost:3001/api-docs")).pack(fill=tk.X, pady=(0, 5))
        
        # Install Dependencies button
        ttk.Button(control_frame, text="Install Dependencies", 
                  command=self.install_dependencies).pack(fill=tk.X, pady=(10, 5))
        
        # Clear Logs button
        ttk.Button(control_frame, text="Clear Logs", 
                  command=self.clear_logs).pack(fill=tk.X, pady=(0, 5))
        
    def create_log_panel(self, parent):
        """Create log output panel"""
        log_frame = ttk.LabelFrame(parent, text="Logs", padding="10")
        log_frame.grid(row=2, column=0, columnspan=4, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        # Create notebook for different log types
        self.log_notebook = ttk.Notebook(log_frame)
        self.log_notebook.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Combined logs
        self.combined_log = scrolledtext.ScrolledText(self.log_notebook, height=15, wrap=tk.WORD)
        self.log_notebook.add(self.combined_log, text="Combined")
        
        # API logs
        self.api_log = scrolledtext.ScrolledText(self.log_notebook, height=15, wrap=tk.WORD)
        self.log_notebook.add(self.api_log, text="API Server")
        
        # Frontend logs
        self.frontend_log = scrolledtext.ScrolledText(self.log_notebook, height=15, wrap=tk.WORD)
        self.log_notebook.add(self.frontend_log, text="Frontend")
        
    def create_dependencies_panel(self, parent):
        """Create dependencies status panel"""
        deps_frame = ttk.LabelFrame(parent, text="Dependencies Status", padding="10")
        deps_frame.grid(row=3, column=0, columnspan=4, sticky=(tk.W, tk.E), pady=(0, 10))
        deps_frame.columnconfigure(1, weight=1)
        
        self.deps_tree = ttk.Treeview(deps_frame, columns=('status', 'version'), show='tree headings', height=6)
        self.deps_tree.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E))
        
        # Configure columns
        self.deps_tree.heading('#0', text='Dependency')
        self.deps_tree.heading('status', text='Status')
        self.deps_tree.heading('version', text='Version')
        
        self.deps_tree.column('#0', width=200)
        self.deps_tree.column('status', width=100)
        self.deps_tree.column('version', width=100)
        
        # Scrollbar for dependencies tree
        deps_scrollbar = ttk.Scrollbar(deps_frame, orient=tk.VERTICAL, command=self.deps_tree.yview)
        deps_scrollbar.grid(row=0, column=2, sticky=(tk.N, tk.S))
        self.deps_tree.configure(yscrollcommand=deps_scrollbar.set)
        
    def log_message(self, message, log_type="combined"):
        """Add message to specified log"""
        timestamp = time.strftime("%H:%M:%S")
        formatted_message = f"[{timestamp}] {message}"
        
        # Store in logs
        self.logs['combined'].append(formatted_message)
        if log_type in self.logs:
            self.logs[log_type].append(formatted_message)
        
        # Print to console for web interface
        print(formatted_message)
        
        # Add to GUI if available
        if not self.use_web:
            formatted_with_newline = formatted_message + "\n"
            
            # Add to combined log
            self.combined_log.insert(tk.END, formatted_with_newline)
            self.combined_log.see(tk.END)
            
            # Add to specific log if requested
            if log_type == "api" and hasattr(self, 'api_log'):
                self.api_log.insert(tk.END, formatted_with_newline)
                self.api_log.see(tk.END)
            elif log_type == "frontend" and hasattr(self, 'frontend_log'):
                self.frontend_log.insert(tk.END, formatted_with_newline)
                self.frontend_log.see(tk.END)
            
    def clear_logs(self):
        """Clear all log windows"""
        self.logs = {'combined': [], 'api': [], 'frontend': []}
        
        if not self.use_web:
            self.combined_log.delete(1.0, tk.END)
            self.api_log.delete(1.0, tk.END)
            self.frontend_log.delete(1.0, tk.END)
            
        self.log_message("Logs cleared")
        
    def update_status(self, service, status):
        """Update service status"""
        if service == "api":
            self.api_status = status
            if not self.use_web:
                self.api_status_var.set(status)
        elif service == "frontend":
            self.frontend_status = status
            if not self.use_web:
                self.frontend_status_var.set(status)
        elif service == "dependencies":
            self.dependencies_status = status
            if not self.use_web:
                self.dependencies_status_var.set(status)
        
    def check_dependencies(self):
        """Check if all required dependencies are installed"""
        def check_deps():
            self.log_message("Checking dependencies...")
            
            if not self.use_web:
                # Clear existing items
                for item in self.deps_tree.get_children():
                    self.deps_tree.delete(item)
            
            # Check Node.js
            node_version = self.check_command_version("node --version")
            node_status = "✓" if node_version else "✗"
            if not self.use_web:
                self.deps_tree.insert('', 'end', text='Node.js', values=(node_status, node_version or "Not found"))
            
            # Check pnpm
            pnpm_version = self.check_command_version("pnpm --version")
            pnpm_status = "✓" if pnpm_version else "✗"
            if not self.use_web:
                self.deps_tree.insert('', 'end', text='pnpm', values=(pnpm_status, pnpm_version or "Not found"))
            
            # Check Python
            python_version = self.check_command_version("python --version")
            if not python_version:
                python_version = self.check_command_version("python3 --version")
            python_status = "✓" if python_version else "✗"
            if not self.use_web:
                self.deps_tree.insert('', 'end', text='Python', values=(python_status, python_version or "Not found"))
            
            # Check project dependencies
            api_deps = self.check_project_dependencies(self.api_path)
            frontend_deps = self.check_project_dependencies(self.frontend_path)
            
            api_status = "✓" if api_deps else "✗"
            frontend_status = "✓" if frontend_deps else "✗"
            
            if not self.use_web:
                self.deps_tree.insert('', 'end', text='API Dependencies', values=(api_status, "Installed" if api_deps else "Missing"))
                self.deps_tree.insert('', 'end', text='Frontend Dependencies', values=(frontend_status, "Installed" if frontend_deps else "Missing"))
            
            # Update overall status
            all_good = all([node_version, pnpm_version, api_deps, frontend_deps])
            self.update_status("dependencies", "✓ Ready" if all_good else "✗ Issues found")
            
        threading.Thread(target=check_deps, daemon=True).start()
        
    def check_command_version(self, command):
        """Check if a command exists and return its version"""
        try:
            result = subprocess.run(command.split(), capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return result.stdout.strip()
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
            pass
        return None
        
    def check_project_dependencies(self, project_path):
        """Check if project dependencies are installed"""
        node_modules = project_path / "node_modules"
        package_json = project_path / "package.json"
        
        return node_modules.exists() and package_json.exists()
        
    def install_dependencies(self):
        """Install dependencies for both projects"""
        def install():
            self.log_message("Installing dependencies...")
            
            # Install API dependencies
            self.log_message("Installing API server dependencies...", "api")
            if self.run_command_in_path("pnpm install", self.api_path):
                self.log_message("✓ API dependencies installed successfully", "api")
            else:
                self.log_message("✗ Failed to install API dependencies", "api")
            
            # Install Frontend dependencies
            self.log_message("Installing frontend dependencies...", "frontend")
            if self.run_command_in_path("pnpm install", self.frontend_path):
                self.log_message("✓ Frontend dependencies installed successfully", "frontend")
            else:
                self.log_message("✗ Failed to install frontend dependencies", "frontend")
            
            # Refresh dependency status
            self.check_dependencies()
            
        threading.Thread(target=install, daemon=True).start()
        
    def run_command_in_path(self, command, path):
        """Run a command in a specific directory"""
        try:
            result = subprocess.run(
                command.split(),
                cwd=path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            if result.stdout:
                self.log_message(result.stdout)
            if result.stderr:
                self.log_message(f"Error: {result.stderr}")
                
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            self.log_message(f"Command timed out: {command}")
            return False
        except Exception as e:
            self.log_message(f"Error running command: {e}")
            return False
            
    def check_running_processes(self):
        """Check if services are already running"""
        def check():
            # Check port 3001 (API)
            if self.is_port_in_use(3001):
                self.update_status("api", "Running")
            else:
                self.update_status("api", "Stopped")
                
            # Check port 3000 (Frontend)
            if self.is_port_in_use(3000):
                self.update_status("frontend", "Running")
            else:
                self.update_status("frontend", "Stopped")
                
        threading.Thread(target=check, daemon=True).start()
        
    def is_port_in_use(self, port):
        """Check if a port is in use"""
        try:
            for conn in psutil.net_connections():
                if conn.laddr.port == port and conn.status == psutil.CONN_LISTEN:
                    return True
        except (psutil.AccessDenied, AttributeError):
            pass
        return False
        
    def kill_port(self, port):
        """Kill processes using a specific port"""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'connections']):
                try:
                    for conn in proc.info['connections'] or []:
                        if conn.laddr.port == port:
                            proc.kill()
                            self.log_message(f"Killed process {proc.info['pid']} using port {port}")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            self.log_message(f"Error killing port {port}: {e}")
            
    def start_api_server(self):
        """Start the API server"""
        if self.api_process and self.api_process.poll() is None:
            self.log_message("API server is already running", "api")
            return
            
        def start():
            try:
                self.log_message("Starting API server...", "api")
                self.update_status("api", "Starting...")
                
                # Kill any existing process on port 3001
                self.kill_port(3001)
                time.sleep(2)
                
                # Start the process
                self.api_process = subprocess.Popen(
                    ["pnpm", "dev"],
                    cwd=self.api_path,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
                
                self.processes['api'] = self.api_process
                
                # Monitor output
                for line in iter(self.api_process.stdout.readline, ''):
                    if line:
                        self.log_message(line.strip(), "api")
                        if "Server running on port 3001" in line or "listening on port 3001" in line:
                            self.update_status("api", "Running")
                            
                self.api_process.stdout.close()
                return_code = self.api_process.wait()
                
                if return_code != 0:
                    self.log_message(f"API server exited with code {return_code}", "api")
                    
                self.update_status("api", "Stopped")
                
            except Exception as e:
                self.log_message(f"Error starting API server: {e}", "api")
                self.update_status("api", "Error")
                
        threading.Thread(target=start, daemon=True).start()
        
    def stop_api_server(self):
        """Stop the API server"""
        if self.api_process:
            try:
                self.log_message("Stopping API server...", "api")
                self.api_process.terminate()
                self.api_process.wait(timeout=10)
                self.api_process = None
                self.update_status("api", "Stopped")
                self.log_message("API server stopped", "api")
            except subprocess.TimeoutExpired:
                self.api_process.kill()
                self.api_process = None
                self.update_status("api", "Stopped")
                self.log_message("API server force killed", "api")
            except Exception as e:
                self.log_message(f"Error stopping API server: {e}", "api")
        else:
            # Try to kill by port
            self.kill_port(3001)
            self.update_status("api", "Stopped")
            
    def start_frontend(self):
        """Start the frontend development server"""
        if self.frontend_process and self.frontend_process.poll() is None:
            self.log_message("Frontend is already running", "frontend")
            return
            
        def start():
            try:
                self.log_message("Starting frontend...", "frontend")
                self.update_status("frontend", "Starting...")
                
                # Kill any existing process on port 3000
                self.kill_port(3000)
                time.sleep(2)
                
                # Start the process
                self.frontend_process = subprocess.Popen(
                    ["pnpm", "dev"],
                    cwd=self.frontend_path,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
                
                self.processes['frontend'] = self.frontend_process
                
                # Monitor output
                for line in iter(self.frontend_process.stdout.readline, ''):
                    if line:
                        self.log_message(line.strip(), "frontend")
                        if "Local:" in line or "localhost:3000" in line or "ready" in line.lower():
                            self.update_status("frontend", "Running")
                            
                self.frontend_process.stdout.close()
                return_code = self.frontend_process.wait()
                
                if return_code != 0:
                    self.log_message(f"Frontend exited with code {return_code}", "frontend")
                    
                self.update_status("frontend", "Stopped")
                
            except Exception as e:
                self.log_message(f"Error starting frontend: {e}", "frontend")
                self.update_status("frontend", "Error")
                
        threading.Thread(target=start, daemon=True).start()
        
    def stop_frontend(self):
        """Stop the frontend development server"""
        if self.frontend_process:
            try:
                self.log_message("Stopping frontend...", "frontend")
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=10)
                self.frontend_process = None
                self.update_status("frontend", "Stopped")
                self.log_message("Frontend stopped", "frontend")
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
                self.frontend_process = None
                self.update_status("frontend", "Stopped")
                self.log_message("Frontend force killed", "frontend")
            except Exception as e:
                self.log_message(f"Error stopping frontend: {e}", "frontend")
        else:
            # Try to kill by port
            self.kill_port(3000)
            self.update_status("frontend", "Stopped")
            
    def start_all_services(self):
        """Start all services"""
        self.log_message("Starting all services...")
        self.start_api_server()
        time.sleep(2)  # Small delay between starts
        self.start_frontend()
        
    def stop_all_services(self):
        """Stop all services"""
        self.log_message("Stopping all services...")
        self.stop_api_server()
        self.stop_frontend()
        
    def on_closing(self):
        """Handle application closing"""
        if not self.use_web:
            if messagebox.askokcancel("Quit", "Stop all services and quit?"):
                self.stop_all_services()
                time.sleep(1)  # Give processes time to stop
                self.root.destroy()
        else:
            self.stop_all_services()
            
    def run_web_interface(self):
        """Run the web-based interface"""
        class ManagerHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, manager, *args, **kwargs):
                self.manager = manager
                super().__init__(*args, **kwargs)
                
            def do_GET(self):
                if self.path == '/':
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html')
                    self.end_headers()
                    self.wfile.write(self.get_main_page().encode())
                elif self.path == '/api/status':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    status = {
                        'api': self.manager.api_status,
                        'frontend': self.manager.frontend_status,
                        'dependencies': self.manager.dependencies_status
                    }
                    self.wfile.write(json.dumps(status).encode())
                elif self.path == '/api/logs':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(self.manager.logs).encode())
                else:
                    self.send_error(404)
                    
            def do_POST(self):
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length).decode()
                parsed = parse_qs(post_data)
                
                action = parsed.get('action', [''])[0]
                
                if action == 'start_all':
                    self.manager.start_all_services()
                elif action == 'stop_all':
                    self.manager.stop_all_services()
                elif action == 'start_api':
                    self.manager.start_api_server()
                elif action == 'stop_api':
                    self.manager.stop_api_server()
                elif action == 'start_frontend':
                    self.manager.start_frontend()
                elif action == 'stop_frontend':
                    self.manager.stop_frontend()
                elif action == 'install_deps':
                    self.manager.install_dependencies()
                elif action == 'clear_logs':
                    self.manager.clear_logs()
                    
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'OK')
                
            def get_main_page(self):
                return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Krapi CMS Development Manager</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; text-align: center; }}
        .status-panel {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0; }}
        .status-item {{ padding: 15px; background: #f8f9fa; border-radius: 6px; text-align: center; }}
        .controls {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }}
        button {{ padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }}
        .btn-primary {{ background: #007bff; color: white; }}
        .btn-danger {{ background: #dc3545; color: white; }}
        .btn-success {{ background: #28a745; color: white; }}
        .btn-secondary {{ background: #6c757d; color: white; }}
        .logs {{ margin: 20px 0; }}
        .log-tabs {{ display: flex; margin-bottom: 10px; }}
        .log-tab {{ padding: 10px 20px; background: #e9ecef; border: 1px solid #dee2e6; cursor: pointer; }}
        .log-tab.active {{ background: #007bff; color: white; }}
        .log-content {{ background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Krapi CMS Development Manager</h1>
        
        <div class="status-panel">
            <div class="status-item">
                <h3>API Server</h3>
                <p>Port 3001</p>
                <p id="api-status">Checking...</p>
            </div>
            <div class="status-item">
                <h3>Frontend</h3>
                <p>Port 3000</p>
                <p id="frontend-status">Checking...</p>
            </div>
            <div class="status-item">
                <h3>Dependencies</h3>
                <p id="deps-status">Checking...</p>
            </div>
        </div>
        
        <div class="controls">
            <button class="btn-primary" onclick="action('start_all')">Start All Services</button>
            <button class="btn-danger" onclick="action('stop_all')">Stop All Services</button>
            <button class="btn-success" onclick="action('start_api')">Start API Server</button>
            <button class="btn-secondary" onclick="action('stop_api')">Stop API Server</button>
            <button class="btn-success" onclick="action('start_frontend')">Start Frontend</button>
            <button class="btn-secondary" onclick="action('stop_frontend')">Stop Frontend</button>
            <button class="btn-primary" onclick="action('install_deps')">Install Dependencies</button>
            <button class="btn-secondary" onclick="action('clear_logs')">Clear Logs</button>
            <button class="btn-primary" onclick="window.open('http://localhost:3000')">Open Frontend</button>
            <button class="btn-primary" onclick="window.open('http://localhost:3001/api-docs')">Open API Docs</button>
        </div>
        
        <div class="logs">
            <div class="log-tabs">
                <div class="log-tab active" onclick="showLogs('combined')">Combined</div>
                <div class="log-tab" onclick="showLogs('api')">API Server</div>
                <div class="log-tab" onclick="showLogs('frontend')">Frontend</div>
            </div>
            <div class="log-content" id="log-display"></div>
        </div>
    </div>
    
    <script>
        let currentLogType = 'combined';
        
        function action(actionType) {{
            fetch('/', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/x-www-form-urlencoded'}},
                body: 'action=' + actionType
            }});
        }}
        
        function showLogs(logType) {{
            currentLogType = logType;
            document.querySelectorAll('.log-tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            updateLogs();
        }}
        
        function updateStatus() {{
            fetch('/api/status')
                .then(response => response.json())
                .then(data => {{
                    document.getElementById('api-status').textContent = data.api;
                    document.getElementById('frontend-status').textContent = data.frontend;
                    document.getElementById('deps-status').textContent = data.dependencies;
                }});
        }}
        
        function updateLogs() {{
            fetch('/api/logs')
                .then(response => response.json())
                .then(data => {{
                    const logDisplay = document.getElementById('log-display');
                    const logs = data[currentLogType] || [];
                    logDisplay.innerHTML = logs.join('\\n');
                    logDisplay.scrollTop = logDisplay.scrollHeight;
                }});
        }}
        
        // Update every 2 seconds
        setInterval(() => {{
            updateStatus();
            updateLogs();
        }}, 2000);
        
        // Initial update
        updateStatus();
        updateLogs();
    </script>
</body>
</html>
                """
        
        # Create handler class with manager reference
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
            
    def run(self):
        """Start the application"""
        self.log_message("Krapi CMS Development Manager started")
        self.log_message(f"Project root: {self.project_root}")
        
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
            
        app = KrapiCMSManager(use_web=use_web)
        app.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()