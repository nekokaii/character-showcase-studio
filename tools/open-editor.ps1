$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$editorUrl = 'http://127.0.0.1:19378/?workspace=edit'
function Test-Editor {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:19378/__editor/capabilities' -TimeoutSec 1
    return $response.StatusCode -eq 200
  } catch { return $false }
}
if (-not (Test-Editor)) {
  if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules/playwright-core/package.json'))) {
    throw 'Run setup-editor.cmd in the development folder first.'
  }
  $nodeExecutable = (Get-Command node -ErrorAction Stop).Source
  Start-Process -FilePath $nodeExecutable -ArgumentList @('tools/server.mjs', '19378') -WorkingDirectory $projectRoot -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if (Test-Editor) { break }
    Start-Sleep -Milliseconds 250
  }
}
if (-not (Test-Editor)) { throw 'The editor could not start on port 19378.' }
Start-Process $editorUrl
