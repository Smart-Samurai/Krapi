#!/usr/bin/env python3
"""
Simple test script for Krapi CMS Start Manager
"""

import sys
import os
from pathlib import Path

# Add the current directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

# Import the manager class directly
exec(open('start-manager.py').read())

def main():
    print("Starting Krapi CMS Development Manager in test mode...")
    
    # Create manager instance in web mode
    manager = KrapiCMSManager(use_web=True)
    
    # Check dependencies
    if not manager.check_dependencies():
        print("❌ Dependencies check failed")
        return 1
    
    # Check running processes
    manager.check_running_processes()
    
    # Start all services
    print("\nStarting all services...")
    manager.start_all_services()
    
    # Wait a bit to see if services start
    import time
    time.sleep(15)
    
    # Check status
    print(f"\nAPI Status: {manager.api_status}")
    print(f"Frontend Status: {manager.frontend_status}")
    
    print("\nTest completed!")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 