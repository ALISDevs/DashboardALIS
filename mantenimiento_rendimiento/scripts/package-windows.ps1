[CmdletBinding()]
param([ValidateSet('app-image','exe','msi')][string]$Type = 'app-image', [string]$Destination)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appName = 'Indicadores y Registros'
& (Join-Path $PSScriptRoot 'maven.ps1') verify
$jdkHome = Join-Path $projectRoot '.tools\jdk-21.0.13+9'
if (-not $Destination) { $Destination = Join-Path $projectRoot "dist\windows\$Type" }
$Destination = [System.IO.Path]::GetFullPath($Destination)
if ($Type -eq 'app-image' -and (Test-Path -LiteralPath (Join-Path $Destination $appName))) {
    throw 'Ya existe una imagen en ese destino. Usa -Destination con una carpeta nueva para conservar la anterior.'
}
$wixRoot = Join-Path $projectRoot '.tools\wix-3.14.1'
if ($Type -ne 'app-image' -and -not (Test-Path -LiteralPath (Join-Path $wixRoot 'candle.exe')) -and -not (Get-Command candle.exe -ErrorAction SilentlyContinue)) {
    throw 'Para crear EXE/MSI ejecuta .\scripts\bootstrap-installer.ps1. app-image no requiere WiX.'
}
$staging = Join-Path $projectRoot ("target\package-input-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'target\mantenimiento-rendimiento.jar') -Destination $staging
Copy-Item -LiteralPath (Join-Path $projectRoot 'target\lib') -Destination $staging -Recurse
$appVersion = ([xml](Get-Content -LiteralPath (Join-Path $projectRoot 'pom.xml') -Raw)).project.version
$arguments = @('--type', $Type, '--name', $appName, '--app-version', $appVersion,
    '--icon', (Join-Path $projectRoot 'src\main\resources\branding\best-trailers.ico'),
    '--vendor', 'Indicadores y Registros', '--description', 'Control de combustible y mantenimiento de flota',
    '--input', $staging, '--dest', $Destination, '--main-jar', 'mantenimiento-rendimiento.jar',
    '--main-class', 'mx.mantenimientorendimiento.Launcher', '--add-modules', 'java.se,jdk.unsupported,jdk.crypto.ec',
    '--java-options', '-Dfile.encoding=UTF-8')
if ($Type -ne 'app-image') { $arguments += @('--win-per-user-install', '--win-menu', '--win-shortcut', '--win-dir-chooser', '--win-upgrade-uuid', '82c3d9d8-740b-44cc-8daa-eedcc4cf5801') }
$previousPath = $env:PATH
try {
    if (Test-Path -LiteralPath $wixRoot) { $env:PATH = "$wixRoot;$previousPath" }
    & (Join-Path $jdkHome 'bin\jpackage.exe') @arguments
    if ($LASTEXITCODE -ne 0) { throw "jpackage terminó con código $LASTEXITCODE." }
} finally { $env:PATH = $previousPath }
Write-Host "Paquete generado en: $Destination"
