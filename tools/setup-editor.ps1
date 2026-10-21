$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath 'tools/ffmpeg/bin/ffmpeg.exe')) {
  New-Item -ItemType Directory -Force 'work/ffmpeg-download' | Out-Null
  $archivePath = Join-Path $projectRoot 'work/ffmpeg-download/ffmpeg.zip'
  $checksumText = (Invoke-WebRequest -UseBasicParsing 'https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip.sha256').Content
  Invoke-WebRequest -UseBasicParsing 'https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-essentials_build.zip' -OutFile $archivePath
  $expectedHash = ([regex]::Match([string]$checksumText, '[a-fA-F0-9]{64}')).Value
  if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $expectedHash) { throw 'FFmpeg download checksum mismatch' }
  Expand-Archive -LiteralPath $archivePath -DestinationPath 'work/ffmpeg-download/expanded' -Force
  New-Item -ItemType Directory -Force 'tools/ffmpeg/bin' | Out-Null
  $expandedRoot = Get-ChildItem 'work/ffmpeg-download/expanded' -Directory | Select-Object -First 1
  Copy-Item -LiteralPath (Join-Path $expandedRoot.FullName 'bin/ffmpeg.exe') -Destination 'tools/ffmpeg/bin/'
  Copy-Item -LiteralPath (Join-Path $expandedRoot.FullName 'bin/ffprobe.exe') -Destination 'tools/ffmpeg/bin/'
  Copy-Item -LiteralPath (Join-Path $expandedRoot.FullName 'LICENSE') -Destination 'tools/ffmpeg/'
}
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
Write-Host 'Video engine ready. Run start-editor.cmd.'
