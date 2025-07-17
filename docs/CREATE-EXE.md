# 🔧 Creating an EXE for the Development Control Panel

If you want to create a standalone EXE file for the Krapi Development Control Panel, you can convert the `DevControl.bat` file to an executable.

## Method 1: Using Bat to Exe Converter (Recommended)

### Option A: Online Converter

1. Go to https://bat2exe.net/
2. Upload `DevControl.bat`
3. Click "Convert"
4. Download `DevControl.exe`

### Option B: Desktop Tool

1. Download **Bat To Exe Converter** from: https://www.f2ko.de/en/b2e.php
2. Install and run the program
3. Load `DevControl.bat`
4. Configure options:
   - **Icon**: You can add a custom icon if desired
   - **Version Info**: Add version details
   - **Invisible Application**: Keep unchecked (we want to see the console)
5. Click "Compile" to create `DevControl.exe`

## Method 2: Using IExpress (Built-in Windows Tool)

1. Press `Win + R`, type `iexpress` and press Enter
2. Select "Create new Self Extraction Directive file"
3. Select "Extract files and run an installation command"
4. Set Package title: "Krapi Development Control Panel"
5. No confirmation prompt needed
6. Don't display a license
7. Add files: Select `DevControl.bat`
8. Set install program: `DevControl.bat`
9. Choose display options (show window, finish message, etc.)
10. Set restart options (no restart)
11. Save SED file for future use
12. Create package: Choose location for `DevControl.exe`

## Method 3: PowerShell Script to EXE

Create a PowerShell version that can be converted to EXE:

```powershell
# Save as DevControl.ps1, then convert using ps2exe
# Install ps2exe: Install-Module ps2exe
# Convert: ps2exe .\DevControl.ps1 .\DevControl.exe

param()

Write-Host "🎮 Krapi Development Control Panel" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Change to script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check files exist
if (-not (Test-Path "dev-control\server.js")) {
    Write-Host "❌ Control panel files not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if already running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "⚠️ Control panel is already running!" -ForegroundColor Yellow
    Start-Process "http://localhost:4000"
    Read-Host "Press Enter to exit"
    exit
} catch {
    # Not running, continue
}

Write-Host "🚀 Starting control panel..." -ForegroundColor Green
Write-Host "📱 Will open: http://localhost:4000" -ForegroundColor Cyan

# Start control panel
node dev-control\server.js
```

To convert this PowerShell version to EXE:

```powershell
# Install ps2exe module
Install-Module ps2exe -Force

# Convert to EXE
ps2exe .\DevControl.ps1 .\DevControl.exe -iconFile icon.ico -title "Krapi Development Control Panel"
```

## Recommended Icon

You can use any ICO file as an icon. For a development tool, consider:

- Gear/cog icon
- Computer/monitor icon
- Dashboard icon
- Custom Krapi logo

## Final Result

After conversion, you'll have:

- `DevControl.exe` - Standalone executable
- Double-click to start the control panel
- No need to type commands or navigate folders
- Can be pinned to taskbar or desktop

## Distribution

The EXE file is self-contained but still requires:

- Node.js installed on target machine
- The Krapi project files in the same directory
- Internet connection for npm dependencies (first run)

For true standalone distribution, you'd need to bundle Node.js and dependencies, which requires more advanced packaging tools like pkg or nexe.
