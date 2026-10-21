@echo off
cd /d "%~dp0"
if not exist node_modules\playwright-core\package.json (
  echo Run setup-editor.cmd first.
  pause
  exit /b 1
)
node tools/server.mjs 19378
pause
