[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
$wixRoot = Join-Path $toolsRoot 'wix-3.14.1'
$archive = Join-Path $toolsRoot 'wix314-binaries.zip'
New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
if (-not (Test-Path -LiteralPath $archive)) {
    Invoke-WebRequest -Uri 'https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip' -OutFile $archive
}
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
if ($hash -ne '6AC824E1642D6F7277D0ED7EA09411A508F6116BA6FAE0AA5F2C7DAA2FF43D31') {
    throw 'WiX no coincide con la distribución verificada. Elimina el archivo ZIP y vuelve a descargarlo.'
}
if (-not (Test-Path -LiteralPath (Join-Path $wixRoot 'candle.exe'))) {
    Expand-Archive -LiteralPath $archive -DestinationPath $wixRoot -Force
}
Write-Host "WiX 3.14.1 está listo en $wixRoot. No se modificó el PATH global."
