$ErrorActionPreference = 'Stop'

$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('skill-hub-uninstall-test-' + [guid]::NewGuid().ToString('N'))
$installRoot = Join-Path $fixtureRoot 'install'
$libraryRoot = Join-Path $fixtureRoot 'SkillLibrary'
$homeRoot = Join-Path $fixtureRoot 'home'
$projectRoot = Join-Path $fixtureRoot 'project'
$skillRoot = Join-Path $libraryRoot 'skills\sample-skill'
$shortcutPath = Join-Path $fixtureRoot 'Skill Hub.lnk'

try {
  New-Item -ItemType Directory -Path $installRoot,$skillRoot,$projectRoot -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $skillRoot 'SKILL.md') -Value "---`nname: sample-skill`ndescription: test`n---" -Encoding utf8
  Set-Content -LiteralPath (Join-Path $libraryRoot 'registry.json') -Value '{"skills":{"sample-skill":{"tags":["test"]}}}' -Encoding utf8
  New-Item -ItemType Directory -Path (Join-Path $libraryRoot 'projects') -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $libraryRoot 'projects\project-manifest.json') -Value (@{
    projects = @{ Demo = @{ path = $projectRoot; skills = @('sample-skill') } }
  } | ConvertTo-Json -Depth 5) -Encoding utf8
  Set-Content -LiteralPath $shortcutPath -Value 'shortcut' -Encoding ascii
  Set-Content -LiteralPath (Join-Path $installRoot 'install-manifest.json') -Value (@{
    installRoot = $installRoot
    appRoot = (Join-Path $installRoot 'app')
    libraryRoot = $libraryRoot
    shortcutPath = $shortcutPath
    port = 3001
  } | ConvertTo-Json) -Encoding utf8

  $linkLocations = @(
    (Join-Path $homeRoot '.agents\skills\sample-skill'),
    (Join-Path $homeRoot '.codex\skills\sample-skill'),
    (Join-Path $homeRoot '.claude\skills\sample-skill'),
    (Join-Path $projectRoot '.claude\skills\sample-skill')
  )
  foreach ($linkPath in $linkLocations) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $linkPath) -Force | Out-Null
    New-Item -ItemType Junction -Path $linkPath -Target $skillRoot | Out-Null
  }

  & (Join-Path $PSScriptRoot '..\uninstall.ps1') -InstallRoot $installRoot -LibraryRoot $libraryRoot -HomeRoot $homeRoot -Force

  if (Test-Path -LiteralPath $installRoot) { throw 'InstallRoot was not removed.' }
  if (Test-Path -LiteralPath $shortcutPath) { throw 'Shortcut was not removed.' }
  foreach ($linkPath in $linkLocations) {
    if (Test-Path -LiteralPath $linkPath) { throw "Managed link was not removed: $linkPath" }
  }
  if (-not (Test-Path -LiteralPath (Join-Path $skillRoot 'SKILL.md'))) { throw 'Skill library was removed.' }
  if (-not (Test-Path -LiteralPath (Join-Path $libraryRoot 'registry.json'))) { throw 'Registry metadata was removed.' }

  Write-Host 'install-uninstall integration test passed'
} finally {
  if (Test-Path -LiteralPath $fixtureRoot) {
    Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
  }
}
