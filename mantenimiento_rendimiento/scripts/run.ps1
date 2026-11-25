[CmdletBinding()]
param([string]$DataDirectory, [switch]$SmokeTest)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'maven.ps1') package
$java = Join-Path $projectRoot '.tools\jdk-21.0.13+9\bin\java.exe'
$launchArgs = @()
if ($DataDirectory) { $launchArgs += "-Dmr.dataDir=$([System.IO.Path]::GetFullPath($DataDirectory))" }
$launchArgs += @('-cp', "$projectRoot\target\mantenimiento-rendimiento.jar;$projectRoot\target\lib\*", 'mx.mantenimientorendimiento.Launcher')
if ($SmokeTest) { $launchArgs += '--smoke-test' }
& $java @launchArgs
if ($LASTEXITCODE -ne 0) { throw "La aplicación terminó con código $LASTEXITCODE." }
