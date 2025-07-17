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

# Check if psutil is installed, install if not
if ! $PYTHON_CMD -c "import psutil" &> /dev/null; then
    echo "Installing required Python dependencies..."
    if ! $PYTHON_CMD -m pip install -r requirements.txt; then
        echo "ERROR: Failed to install Python dependencies."
        echo "Please run: $PYTHON_CMD -m pip install psutil"
        echo
        exit 1
    fi
    echo
fi

echo "Starting Krapi CMS Development Manager..."
echo "Note: If GUI is not available, web interface will start automatically"
echo

# Run the Python manager (will auto-detect GUI availability)
$PYTHON_CMD StartManager.py