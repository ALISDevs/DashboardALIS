[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot '.tools'
New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null

function Get-VerifiedArchive {
    param([string]$Url, [string]$Destination, [string]$ExpectedHash, [string]$Algorithm)
    if (-not (Test-Path -LiteralPath $Destination)) {
        Write-Host "Descargando $(Split-Path -Leaf $Destination)..."
        Invoke-WebRequest -Uri $Url -OutFile $Destination
    }
    $actual = (Get-FileHash -LiteralPath $Destination -Algorithm $Algorithm).Hash
    if ($actual -ne $ExpectedHash) { throw "La verificación $Algorithm falló: $Destination. Elimina ese archivo y vuelve a ejecutar." }
}

$jdkHome = Join-Path $toolsRoot 'jdk-21.0.13+9'
if (-not (Test-Path -LiteralPath (Join-Path $jdkHome 'bin\javac.exe'))) {
    $jdkZip = Join-Path $toolsRoot 'temurin-21.0.13.zip'
    Get-VerifiedArchive -Url 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jdk_x64_windows_hotspot_21.0.13_9.zip' -Destination $jdkZip -ExpectedHash 'a4dbaa05fca4bd89d84584e58c459bd732efebb1722af80ab13c6516832004f9' -Algorithm SHA256
    Expand-Archive -LiteralPath $jdkZip -DestinationPath $toolsRoot -Force
}
$mavenHome = Join-Path $toolsRoot 'apache-maven-3.9.16'
if (-not (Test-Path -LiteralPath (Join-Path $mavenHome 'bin\mvn.cmd'))) {
    $mavenUrl = 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/apache-maven-3.9.16-bin.zip'
    $mavenZip = Join-Path $toolsRoot 'apache-maven-3.9.16-bin.zip'
    $hashText = (Invoke-WebRequest -Uri "$mavenUrl.sha512").Content
    $expected = ([regex]::Match([string]$hashText, '[a-fA-F0-9]{128}')).Value
    if (-not $expected) { throw 'No se pudo leer la suma SHA512 oficial de Maven.' }
    Get-VerifiedArchive -Url $mavenUrl -Destination $mavenZip -ExpectedHash $expected -Algorithm SHA512
    Expand-Archive -LiteralPath $mavenZip -DestinationPath $toolsRoot -Force
}
Write-Host 'Java 21 y Maven están listos dentro de .tools. No se modificó la instalación global.'
