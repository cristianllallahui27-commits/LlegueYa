# Arranca Docker Desktop limpio cuando falla con:
#   "rename ...\*.sock ...\*.sock.stale: The file cannot be accessed by the system"
# En algunas versiones de Windows (Insider) los sockets que deja Docker al cerrarse mal quedan bloqueados
# y no se pueden borrar ni renombrar. Este script aparta las carpetas que los contienen (no borra nada:
# imágenes, contenedores y volúmenes quedan intactos) y vuelve a abrir Docker Desktop.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\reparar-docker.ps1

$ErrorActionPreference = 'Stop'
$abiertos = Get-Process -Name 'Docker Desktop', 'com.docker.backend' -ErrorAction SilentlyContinue
if ($abiertos) {
    Write-Host 'Docker Desktop sigue abierto. Ciérralo (Quit en el icono de la bandeja) y vuelve a ejecutar este script.'
    exit 1
}
$sello = Get-Date -Format 'yyyyMMddHHmmss'
$carpetas = @("$env:LOCALAPPDATA\Docker\run", "$env:LOCALAPPDATA\docker-secrets-engine")
foreach ($c in $carpetas) {
    if (Test-Path -LiteralPath $c) {
        Rename-Item -LiteralPath $c -NewName ((Split-Path $c -Leaf) + "-trabado-$sello")
        Write-Host "Apartada: $c"
    }
}
New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\Docker\run" | Out-Null
Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
Write-Host 'Docker Desktop se está abriendo. Espera 1 o 2 minutos y prueba:  docker info'
Write-Host 'Las carpetas *-trabado-* se pueden borrar después de reiniciar Windows.'
