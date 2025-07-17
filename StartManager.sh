#!/bin/bash

echo "================================================"
echo "      KRAPI CMS - DEVELOPMENT MANAGER"
echo "================================================"
echo

# Navigate to the script directory
cd "$(dirname "$0")" || exit 1

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "ERROR: Python is not installed or not in PATH."
    echo "Please install Python from https://python.org/"
    echo
    exit 1
fi

# Determine Python command
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

# Check if virtual environment exists, create if not
if [ ! -d "manager-env" ]; then
    echo "Creating Python virtual environment..."
    if ! $PYTHON_CMD -m venv manager-env; then
        echo "ERROR: Failed to create virtual environment."
        echo "Please ensure python3-venv is installed."
        echo
        exit 1
    fi
fi

# Activate virtual environment
echo "Activating virtual environment..."
source manager-env/bin/activate

# Check if psutil is installed, install if not
if ! python -c "import psutil" &> /dev/null; then
    echo "Installing required Python dependencies..."
    if ! pip install -r requirements.txt; then
        echo "ERROR: Failed to install Python dependencies."
        echo
        exit 1
    fi
    echo
fi

echo "Starting Krapi CMS Development Manager..."
echo "Note: If GUI is not available, web interface will start automatically"
echo

# Run the Python manager (will auto-detect GUI availability)
python StartManager.py