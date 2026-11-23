# Optional one-click installer. Downloads original Solar System Scope 2K maps
# (CC BY 4.0), then embeds them into a local JS file so index.html still works
# when opened directly via file:// in Edge/Chrome.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$folder = Join-Path $root 'textures'
$site = 'https://www.solarsystemscope.com/textures/download'
$images = [ordered]@{
  'mercury'      = '2k_mercury.jpg'
  'venus'        = '2k_venus_atmosphere.jpg'
  'earth'        = '2k_earth_daymap.jpg'
  'earth-clouds' = '2k_earth_clouds.jpg'
  'mars'         = '2k_mars.jpg'
  'jupiter'      = '2k_jupiter.jpg'
  'saturn'       = '2k_saturn.jpg'
  'uranus'       = '2k_uranus.jpg'
  'neptune'      = '2k_neptune.jpg'
}
try {
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  foreach ($item in $images.GetEnumerator()) {
    $destination = Join-Path $folder ($item.Key + '.jpg')
    $temp = $destination + '.download'
    Write-Host "Downloading $($item.Key)..."
    Invoke-WebRequest -Uri "$site/$($item.Value)" -OutFile $temp -UseBasicParsing -TimeoutSec 50
    if ((Get-Item $temp).Length -lt 2000) { throw "Invalid download for $($item.Key)" }
    Move-Item -Path $temp -Destination $destination -Force
  }
  $embedded = [ordered]@{}
  foreach ($item in $images.GetEnumerator()) {
    $destination = Join-Path $folder ($item.Key + '.jpg')
    $embedded[$item.Key] = 'data:image/jpeg;base64,' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($destination))
  }
  $json = ConvertTo-Json -InputObject $embedded -Compress -Depth 4
  $js = 'window.ORBIT_TEXTURES = ' + $json + ';' + [Environment]::NewLine
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText((Join-Path $root 'textures-embedded.js'), $js, $utf8)
  Write-Host ''
  Write-Host 'SUCCESS! All 8 planets now use genuine Solar System Scope 2K textures.' -ForegroundColor Green
  Write-Host 'Open index.html or refresh the browser to see them.'
} catch {
  Write-Host ''
  Write-Host ('Download interrupted: ' + $_.Exception.Message) -ForegroundColor Yellow
  Write-Host 'Your currently embedded maps are unchanged and the viewer still works.'
  exit 1
}
