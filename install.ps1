param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'SkillHub'),
  [int]$Port = 3001,
  [switch]$NoShortcut,
  [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
$repository = 'https://github.com/Lincode-hormony/skill-hub.git'
$appRoot = Join-Path $InstallRoot 'app'
$dataRoot = Join-Path $InstallRoot 'data'

function Assert-Command([string]$Name, [string]$InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $InstallHint"
  }
}

Assert-Command 'git' 'Install Git first: https://git-scm.com/download/win'
Assert-Command 'node' 'Install Node.js 18 or newer first: https://nodejs.org/'
Assert-Command 'npm' 'npm should be installed with Node.js.'

$currentNodeVersion = (& node --version).Trim()
$majorVersion = [int]($currentNodeVersion.TrimStart('v').Split('.')[0])
if ($majorVersion -lt 18) {
  throw "Node.js 18 or newer is required. Current version: $currentNodeVersion"
}

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null

if (Test-Path -LiteralPath (Join-Path $appRoot '.git')) {
  Write-Host 'Updating Skill Hub...' -ForegroundColor Cyan
  & git -C $appRoot pull --ff-only origin main
  if ($LASTEXITCODE -ne 0) { throw 'Update failed. Check local changes and the network connection.' }
} elseif (Test-Path -LiteralPath $appRoot) {
  throw "The install directory exists but is not a Git repository: $appRoot"
} else {
  Write-Host 'Downloading Skill Hub...' -ForegroundColor Cyan
  & git clone --depth 1 $repository $appRoot
  if ($LASTEXITCODE -ne 0) { throw 'Repository clone failed.' }
}

Write-Host 'Installing runtime dependencies...' -ForegroundColor Cyan
Push-Location $appRoot
try {
  npm ci --omit=dev
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
} finally {
  Pop-Location
}

if (-not $NoShortcut) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $shortcutPath = Join-Path $desktop 'Skill Hub.lnk'
  $launcherPath = Join-Path $appRoot 'scripts\start-skill-hub.ps1'
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = Join-Path $PSHOME 'powershell.exe'
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`" -AppRoot `"$appRoot`" -DataRoot `"$dataRoot`" -Port $Port"
  $shortcut.WorkingDirectory = $appRoot
  $shortcut.Description = 'Start Skill Hub'
  $shortcut.Save()
  Write-Host "Desktop shortcut created: $shortcutPath" -ForegroundColor Green
}

Write-Host "Installation completed: $appRoot" -ForegroundColor Green
Write-Host "Data directory: $dataRoot" -ForegroundColor Green

if (-not $NoStart) {
  & (Join-Path $appRoot 'scripts\start-skill-hub.ps1') -AppRoot $appRoot -DataRoot $dataRoot -Port $Port
}
