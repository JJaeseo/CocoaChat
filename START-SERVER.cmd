@echo off
cd /d "%~dp0"
node scripts/compile.mjs
if errorlevel 1 goto failure
node server.mjs
:failure
pause
