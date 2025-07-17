#!/bin/bash

# Krapi CMS Development Manager Launcher
# Cross-platform development environment manager

set -e  # Exit on any error

echo "================================================"
echo "      KRAPI CMS - DEVELOPMENT MANAGER"
echo "================================================"
echo "Cross-platform development environment manager"
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

# Function to find Python executable
find_python() {
    for cmd in python3 python python3.11 python3.10 python3.9; do
        if command -v "$cmd" >/dev/null 2>&1; then
            echo "$cmd"
            return 0
        fi
    done
    return 1
}

# Try to find Python
if PYTHON_CMD=$(find_python); then
    echo "Found Python: $PYTHON_CMD"
else
    echo "ERROR: Python is not installed or not in PATH."
    echo "Please install Python 3.8 or newer:"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS: brew install python3"
        echo "   or: Download from https://python.org/"
    else
        echo "Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
        echo "CentOS/RHEL: sudo yum install python3 python3-pip"
        echo "Arch: sudo pacman -S python python-pip"
    fi
    echo ""
    exit 1
fi

# Check Python version
echo "Python version:"
$PYTHON_CMD --version

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment."
        echo "Please install python3-venv:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "macOS: Virtual environment should be included with Python"
        else
            echo "Ubuntu/Debian: sudo apt install python3-venv"
            echo "CentOS/RHEL: sudo yum install python3-venv"
        fi
        echo ""
        exit 1
    fi
    echo "Virtual environment created successfully."
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Check if dependencies are installed, install if not
if ! python -c "import psutil" >/dev/null 2>&1; then
    echo "Installing required Python dependencies..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install Python dependencies."
        echo "Please check your internet connection and try again."
        echo ""
        exit 1
    fi
    echo "Dependencies installed successfully."
fi

echo ""
echo "Starting Krapi CMS Development Manager..."
echo "Note: If GUI is not available, web interface will start automatically"
echo "Platform: $(uname -s) $(uname -r)"
echo ""

# Run the Python manager (will auto-detect GUI availability)
python start-manager.py "$@"

# Check exit code
exit_code=$?
if [ $exit_code -ne 0 ]; then
    echo ""
    echo "Manager exited with error code: $exit_code"
fi

echo ""
echo "Manager has stopped."