#!/usr/bin/env python3
"""
Krapi CMS Development Manager
A simple, reliable development environment manager
"""

import os
import sys
import time
import signal
import subprocess
import threading
import platform
import atexit
from pathlib import Path
from datetime import datetime

# Try to import GUI components
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False

class SimpleManager:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.api_path = self.project_root / "api-server"
        self.frontend_path = self.project_root / "admin-frontend"
        
        # Process tracking
        self.api_process = None
        self.frontend_process = None
        self.child_processes = []
        
        # Status
        self.api_status = "Stopped"
        self.frontend_status = "Stopped"
        
        # Package manager detection
        self.npm_cmd = self._get_npm_cmd()
        
        # Setup cleanup
        atexit.register(self.cleanup_on_exit)
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        # Logging
        self.log_file = self.project_root / "logs" / f"manager-{datetime.now().strftime('%Y%m%d-%H%M%S')}.log"
        self.log_file.parent.mkdir(exist_ok=True)
        
    def _get_npm_cmd(self):
        """Get the appropriate package manager command"""
        if platform.system() == "Windows":
            # Try pnpm first, then npm
            if subprocess.run(["pnpm", "--version"], capture_output=True).returncode == 0:
                return "pnpm"
            elif subprocess.run(["npm", "--version"], capture_output=True).returncode == 0:
                return "npm"
        else:
            # Unix-like systems
            if subprocess.run(["pnpm", "--version"], capture_output=True).returncode == 0:
                return "pnpm"
            elif subprocess.run(["npm", "--version"], capture_output=True).returncode == 0:
                return "npm"
        return None
    
    def log_message(self, message):
        """Log a message to file and console"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(log_entry + '\n')
        except Exception as e:
            print(f"Failed to write to log file: {e}")
    
    def cleanup_on_exit(self):
        """Cleanup function called on exit"""
        self.log_message("Cleaning up processes...")
        self.stop_all_services()
        self.force_kill_all_processes()
    
    def signal_handler(self, signum, frame):
        """Handle system signals"""
        self.log_message(f"Received signal {signum}, cleaning up...")
        self.cleanup_on_exit()
        sys.exit(0)
    
    def force_kill_all_processes(self):
        """Force kill all child processes"""
        for process in self.child_processes:
            try:
                if process and process.poll() is None:
                    process.terminate()
                    time.sleep(1)
                    if process.poll() is None:
                        process.kill()
            except Exception as e:
                self.log_message(f"Error killing process: {e}")
        
        # Also kill any processes using our ports
        self.force_kill_port_processes()
    
    def force_kill_port_processes(self):
        """Kill processes using our ports"""
        ports = [3469, 3470]
        for port in ports:
            try:
                if platform.system() == "Windows":
                    # Find process using port
                    result = subprocess.run(
                        ["netstat", "-ano"], 
                        capture_output=True, 
                        text=True
                    )
                    for line in result.stdout.split('\n'):
                        if f":{port}" in line and "LISTENING" in line:
                            parts = line.split()
                            if len(parts) >= 5:
                                pid = parts[-1]
                                try:
                                    subprocess.run(["taskkill", "/PID", pid, "/F"], check=True)
                                    self.log_message(f"Killed process {pid} on port {port}")
                                except subprocess.CalledProcessError:
                                    pass
                else:
                    # Unix-like systems
                    subprocess.run(["fuser", "-k", str(port)], check=True)
                    self.log_message(f"Killed processes on port {port}")
            except Exception as e:
                self.log_message(f"Error killing processes on port {port}: {e}")
    
    def start_api_server(self):
        """Start the API server"""
        if self.api_process and self.api_process.poll() is None:
            self.log_message("API server is already running")
            return
        
        if not self.npm_cmd:
            self.log_message("Error: No package manager found")
            return
        
        if not (self.api_path / "package.json").exists():
            self.log_message("Error: API package.json not found")
            return
        
        self.log_message("Starting API server...")
        
        try:
            # Install dependencies if needed
            self.log_message("Installing API dependencies...")
            subprocess.run([self.npm_cmd, "install"], cwd=self.api_path, check=True, timeout=120)
            self.log_message("API dependencies installed")
            
            # Start the API server
            env = os.environ.copy()
            env["PORT"] = "3470"
            env["NODE_ENV"] = "development"
            
            self.api_process = subprocess.Popen(
                [self.npm_cmd, "run", "dev"],
                cwd=self.api_path,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            self.child_processes.append(self.api_process)
            self.api_status = "Starting"
            
            # Start logging thread
            threading.Thread(target=self._log_api_output, daemon=True).start()
            
            self.log_message("API server started")
            
        except Exception as e:
            self.log_message(f"Error starting API server: {e}")
            self.api_status = "Failed"
    
    def start_frontend_server(self):
        """Start the frontend server"""
        if self.frontend_process and self.frontend_process.poll() is None:
            self.log_message("Frontend server is already running")
            return
        
        if not self.npm_cmd:
            self.log_message("Error: No package manager found")
            return
        
        if not (self.frontend_path / "package.json").exists():
            self.log_message("Error: Frontend package.json not found")
            return
        
        self.log_message("Starting frontend server...")
        
        try:
            # Install dependencies if needed
            self.log_message("Installing frontend dependencies...")
            subprocess.run([self.npm_cmd, "install"], cwd=self.frontend_path, check=True, timeout=120)
            self.log_message("Frontend dependencies installed")
            
            # Start the frontend server
            env = os.environ.copy()
            env["PORT"] = "3469"
            env["NEXT_PUBLIC_API_URL"] = "http://localhost:3470/api"
            env["NEXT_PUBLIC_WS_URL"] = "ws://localhost:3470/ws"
            
            self.frontend_process = subprocess.Popen(
                [self.npm_cmd, "run", "dev"],
                cwd=self.frontend_path,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            self.child_processes.append(self.frontend_process)
            self.frontend_status = "Starting"
            
            # Start logging thread
            threading.Thread(target=self._log_frontend_output, daemon=True).start()
            
            self.log_message("Frontend server started")
            
        except Exception as e:
            self.log_message(f"Error starting frontend server: {e}")
            self.frontend_status = "Failed"
    
    def _log_api_output(self):
        """Log API server output"""
        if not self.api_process:
            return
        
        try:
            for line in iter(self.api_process.stdout.readline, ''):
                if line:
                    self.log_message(f"[API] {line.strip()}")
                    # Check for startup message
                    if "Server running on port 3470" in line:
                        self.api_status = "Running"
                if self.api_process.poll() is not None:
                    break
        except Exception as e:
            self.log_message(f"Error reading API output: {e}")
    
    def _log_frontend_output(self):
        """Log frontend server output"""
        if not self.frontend_process:
            return
        
        try:
            for line in iter(self.frontend_process.stdout.readline, ''):
                if line:
                    self.log_message(f"[Frontend] {line.strip()}")
                    # Check for startup message
                    if "Ready in" in line or "Local:" in line:
                        self.frontend_status = "Running"
                if self.frontend_process.poll() is not None:
                    break
        except Exception as e:
            self.log_message(f"Error reading frontend output: {e}")
    
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
            self.log_message("Frontend server stopped")
    
    def stop_all_services(self):
        """Stop all services"""
        self.log_message("Stopping all services...")
        self.stop_api_server()
        self.stop_frontend_server()
    
    def start_all_services(self):
        """Start all services"""
        self.log_message("Starting all services...")
        self.start_api_server()
        self.start_frontend_server()
    
    def run_gui(self):
        """Run the GUI interface"""
        if not GUI_AVAILABLE:
            self.log_message("GUI not available, running in console mode")
            self.run_console()
            return
        
        self.root = tk.Tk()
        self.root.title("Krapi CMS Development Manager")
        self.root.geometry("800x600")
        
        # Create main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(2, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="Krapi CMS Development Manager", font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        # Status frame
        status_frame = ttk.LabelFrame(main_frame, text="Service Status", padding="10")
        status_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # API Status
        ttk.Label(status_frame, text="API Server:").grid(row=0, column=0, sticky=tk.W)
        self.api_status_var = tk.StringVar(value=self.api_status)
        ttk.Label(status_frame, textvariable=self.api_status_var).grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        # Frontend Status
        ttk.Label(status_frame, text="Frontend Server:").grid(row=1, column=0, sticky=tk.W)
        self.frontend_status_var = tk.StringVar(value=self.frontend_status)
        ttk.Label(status_frame, textvariable=self.frontend_status_var).grid(row=1, column=1, sticky=tk.W, padx=(10, 0))
        
        # Control buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=2, column=0, columnspan=2, pady=(0, 10))
        
        ttk.Button(button_frame, text="Start All Services", command=self.start_all_services).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(button_frame, text="Stop All Services", command=self.stop_all_services).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(button_frame, text="Start API Only", command=self.start_api_server).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(button_frame, text="Start Frontend Only", command=self.start_frontend_server).pack(side=tk.LEFT, padx=(0, 10))
        
        # Log display
        log_frame = ttk.LabelFrame(main_frame, text="Log Output", padding="10")
        log_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=20, width=80)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Override log_message to also update GUI
        original_log_message = self.log_message
        def gui_log_message(message):
            original_log_message(message)
            if hasattr(self, 'log_text'):
                self.log_text.insert(tk.END, message + '\n')
                self.log_text.see(tk.END)
                self.root.update_idletasks()
        
        self.log_message = gui_log_message
        
        # Handle window closing
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # Start status update thread
        threading.Thread(target=self._update_status, daemon=True).start()
        
        self.log_message("Krapi CMS Development Manager started")
        self.log_message(f"Project root: {self.project_root}")
        self.log_message(f"Package manager: {self.npm_cmd}")
        
        self.root.mainloop()
    
    def _update_status(self):
        """Update status in GUI"""
        while True:
            try:
                if hasattr(self, 'api_status_var'):
                    self.api_status_var.set(self.api_status)
                if hasattr(self, 'frontend_status_var'):
                    self.frontend_status_var.set(self.frontend_status)
                time.sleep(1)
            except Exception:
                break
    
    def on_closing(self):
        """Handle window closing"""
        if messagebox.askokcancel("Quit", "Do you want to stop all services and quit?"):
            self.stop_all_services()
            self.root.destroy()
    
    def run_console(self):
        """Run in console mode"""
        self.log_message("Krapi CMS Development Manager (Console Mode)")
        self.log_message(f"Project root: {self.project_root}")
        self.log_message(f"Package manager: {self.npm_cmd}")
        
        try:
            while True:
                print("\nCommands:")
                print("1. Start all services")
                print("2. Stop all services")
                print("3. Start API only")
                print("4. Start frontend only")
                print("5. Show status")
                print("6. Quit")
                
                choice = input("\nEnter choice (1-6): ").strip()
                
                if choice == "1":
                    self.start_all_services()
                elif choice == "2":
                    self.stop_all_services()
                elif choice == "3":
                    self.start_api_server()
                elif choice == "4":
                    self.start_frontend_server()
                elif choice == "5":
                    print(f"API Server: {self.api_status}")
                    print(f"Frontend Server: {self.frontend_status}")
                elif choice == "6":
                    break
                else:
                    print("Invalid choice")
                
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down...")
        finally:
            self.stop_all_services()

def main():
    """Main entry point"""
    manager = SimpleManager()
    
    if GUI_AVAILABLE:
        manager.run_gui()
    else:
        manager.run_console()

if __name__ == "__main__":
    main()