# bugX — Continuous College-Wide Runner (Runs indefinitely until you close it)
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Starting bugX Full Stack Services..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Try starting Docker containers if Docker Desktop is open
docker compose up -d 2>$null

Start-Sleep -Seconds 2

# 2. Determine target port (5174 if Docker is active, 5173 for local Vite)
$targetPort = 5174
$testConnection = Test-NetConnection -ComputerName "127.0.0.1" -Port 5174 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $testConnection) {
    Write-Host "Starting local frontend dev server..." -ForegroundColor Cyan
    $viteProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru
    Start-Sleep -Seconds 3
    $targetPort = 5173
}

Write-Host "Services are active on target port $targetPort." -ForegroundColor Green
Write-Host "Starting Continuous College-Wide Tunnel..." -ForegroundColor Yellow
Write-Host "This window will stay open and keep the server running continuously." -ForegroundColor Cyan
Write-Host "Press Ctrl+C in this window or run .\stop-share.ps1 to stop.`n" -ForegroundColor Yellow

$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

# Infinite keep-alive loop — automatically reconnects on network changes or router switches
while ($true) {
    if (Test-Path $cloudflaredPath) {
        & $cloudflaredPath tunnel --url "http://127.0.0.1:$targetPort"
    } else {
        ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=5 -R "80:localhost:$targetPort" nokey@localhost.run
    }
    Write-Host "`nNetwork changed or connection dropped. Auto-reconnecting in 3s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
