param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'SkillHub'),
  [string]$LibraryRoot = (Join-Path $HOME 'SkillLibrary'),
  [string]$HomeRoot = $HOME,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $InstallRoot 'install-manifest.json'
$runtimePath = Join-Path $InstallRoot 'runtime.json'

if (Test-Path -LiteralPath $manifestPath) {
  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
  if ($manifest.installRoot) { $InstallRoot = $manifest.installRoot }
  if ($manifest.libraryRoot) { $LibraryRoot = $manifest.libraryRoot }
  $shortcutPath = $manifest.shortcutPath
} else {
  $shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Skill Hub.lnk'
}

$installFull = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
$libraryFull = [IO.Path]::GetFullPath($LibraryRoot).TrimEnd('\')
if ($libraryFull.StartsWith($installFull + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'The Skill library is inside InstallRoot. Move it outside before uninstalling.'
}

if (-not $Force) {
  Add-Type -AssemblyName System.Windows.Forms
  $message = "This will remove Skill Hub, its process, shortcuts, and all Hub-created links.`n`nThe organized Skill library will remain at:`n$LibraryRoot`n`nContinue?"
  $choice = [System.Windows.Forms.MessageBox]::Show(
    $message,
    'Uninstall Skill Hub',
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  )
  if ($choice -ne [System.Windows.Forms.DialogResult]::Yes) { exit 0 }
}

if (Test-Path -LiteralPath $runtimePath) {
  try {
    $runtime = Get-Content -LiteralPath $runtimePath -Raw -Encoding utf8 | ConvertFrom-Json
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($runtime.pid)" -ErrorAction SilentlyContinue
    if ($processInfo -and $processInfo.Name -eq 'node.exe' -and $processInfo.CommandLine -match 'server\.js') {
      Stop-Process -Id $runtime.pid -Force -ErrorAction Stop
    }
  } catch {
    Write-Warning "Could not stop the recorded Skill Hub process: $($_.Exception.Message)"
  }
}

function Test-IsInside([string]$Candidate, [string]$Parent) {
  if (-not $Candidate) { return $false }
  $candidateFull = [IO.Path]::GetFullPath($Candidate).TrimEnd('\')
  $parentFull = [IO.Path]::GetFullPath($Parent).TrimEnd('\')
  return $candidateFull.Equals($parentFull, [StringComparison]::OrdinalIgnoreCase) -or
    $candidateFull.StartsWith($parentFull + '\', [StringComparison]::OrdinalIgnoreCase)
}

$skillRoot = Join-Path $LibraryRoot 'skills'
$locations = @(
  (Join-Path $HomeRoot '.agents\skills'),
  (Join-Path $HomeRoot '.codex\skills'),
  (Join-Path $HomeRoot '.claude\skills')
)

$projectManifest = Join-Path $LibraryRoot 'projects\project-manifest.json'
if (Test-Path -LiteralPath $projectManifest) {
  try {
    $projects = Get-Content -LiteralPath $projectManifest -Raw -Encoding utf8 | ConvertFrom-Json
    foreach ($property in $projects.projects.PSObject.Properties) {
      if ($property.Value.path) {
        $locations += Join-Path $property.Value.path '.claude\skills'
      }
    }
  } catch {
    Write-Warning "Could not read project links: $($_.Exception.Message)"
  }
}

$removedLinks = 0
foreach ($location in ($locations | Select-Object -Unique)) {
  if (-not (Test-Path -LiteralPath $location)) { continue }
  foreach ($item in (Get-ChildItem -LiteralPath $location -Directory -Force -ErrorAction SilentlyContinue)) {
    if ($item.LinkType -ne 'Junction' -and $item.LinkType -ne 'SymbolicLink') { continue }
    $target = $item.Target -join ','
    if (Test-IsInside $target $skillRoot) {
      [IO.Directory]::Delete($item.FullName)
      $removedLinks++
    }
  }
}

if ($shortcutPath -and (Test-Path -LiteralPath $shortcutPath)) {
  Remove-Item -LiteralPath $shortcutPath -Force
}

Set-Location $env:TEMP
if (Test-Path -LiteralPath $InstallRoot) {
  Remove-Item -LiteralPath $InstallRoot -Recurse -Force
}

Write-Host 'Skill Hub was removed cleanly.' -ForegroundColor Green
Write-Host "Removed links: $removedLinks" -ForegroundColor Green
Write-Host "Skill library preserved: $LibraryRoot" -ForegroundColor Green
