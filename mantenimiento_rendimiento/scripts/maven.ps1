[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Goals)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$jdkHome = Join-Path $projectRoot '.tools\jdk-21.0.13+9'
$maven = Join-Path $projectRoot '.tools\apache-maven-3.9.16\bin\mvn.cmd'
if (-not (Test-Path -LiteralPath $maven) -or -not (Test-Path -LiteralPath (Join-Path $jdkHome 'bin\java.exe'))) {
    throw 'Primero ejecuta .\scripts\bootstrap.ps1 para preparar Java 21 y Maven.'
}
$previousJavaHome = $env:JAVA_HOME
try {
    $env:JAVA_HOME = $jdkHome
    & $maven '-B' '-ntp' "-Dmaven.repo.local=$projectRoot\.m2\repository" '-f' (Join-Path $projectRoot 'pom.xml') @Goals
    if ($LASTEXITCODE -ne 0) { throw "Maven terminó con código $LASTEXITCODE." }
} finally { $env:JAVA_HOME = $previousJavaHome }
