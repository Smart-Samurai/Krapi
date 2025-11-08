@echo off
REM Simple wrapper that always runs in cmd.exe
REM This ensures the script works even if Git Bash is the default handler

cmd.exe /c "%~dp0krapi-manager.bat" %*

