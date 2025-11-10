#!/bin/bash
# KRAPI SDK Version Publisher - Linux Shell Script

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to script directory
cd "$SCRIPT_DIR"

# Run the Node.js script
node publish-version.js

# Exit with the same code as the Node.js script
exit_code=$?
if [ $exit_code -ne 0 ]; then
    echo ""
    echo "Script exited with error code $exit_code"
    exit $exit_code
fi

