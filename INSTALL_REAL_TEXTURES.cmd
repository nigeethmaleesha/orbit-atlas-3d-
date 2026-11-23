@echo off
cd /d "%~dp0"
echo Orbit Atlas: installing genuine planetary texture maps...
echo An internet connection is required for this optional upgrade.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-real-textures.ps1"
echo.
pause
