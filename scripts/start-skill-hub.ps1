param(
  [string]$AppRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$DataRoot = (Join-Path $HOME 'SkillLibrary'),
  [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'SkillHub'),
  [int]$Port = 3001,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$url = "http://localhost:$Port"

function Test-SkillHub {
  try {
    $response = Invoke-WebRequest -Uri "$url/api/skills" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js was not found. Install Node.js 18 or newer first.'
}

if (-not (Test-Path -LiteralPath (Join-Path $AppRoot 'node_modules'))) {
  Push-Location $AppRoot
  try {
    npm ci --omit=dev
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
  } finally {
    Pop-Location
  }
}

New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null
New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null
$runtimeFile = Join-Path $StateRoot 'runtime.json'

if (-not (Test-SkillHub)) {
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $nodePath
  $startInfo.Arguments = 'server.js'
  $startInfo.WorkingDirectory = $AppRoot
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.EnvironmentVariables['PORT'] = [string]$Port
  $startInfo.EnvironmentVariables['HUB_ROOT'] = $DataRoot
  $startInfo.EnvironmentVariables['SKILL_HUB_STATE_ROOT'] = $StateRoot

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  [void]$process.Start()

  @{
    pid = $process.Id
    port = $Port
    appRoot = $AppRoot
    dataRoot = $DataRoot
    startedAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json | Set-Content -LiteralPath $runtimeFile -Encoding utf8

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 300
    if (Test-SkillHub) {
      $ready = $true
      break
    }
  }
  if (-not $ready) {
    throw "Skill Hub could not start on port $Port."
  }
}

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host "Skill Hub is running: $url" -ForegroundColor Green
Write-Host "Skill library: $DataRoot" -ForegroundColor DarkGray
