# -----------------------------------------------------------------------------
# bugX — LAN Startup Script (College Wi-Fi)
# Usage:  .\start-lan.ps1
# Stops:  .\stop-share.ps1   (or Ctrl-C then docker compose down)
# -----------------------------------------------------------------------------

param(
    [string]$LanIp = ""   # Optionally pass -LanIp 192.168.x.x to skip auto-detection
)

Write-Host ""
Write-Host "+------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "¦        bugX — College LAN Deployment Startup         ¦" -ForegroundColor Cyan
Write-Host "+------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

# -- Step 1: Detect LAN IP -----------------------------------------------------
if (-not $LanIp) {
    Write-Host "Detecting Wi-Fi LAN IP..." -ForegroundColor Yellow

    $candidates = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.InterfaceAlias -notlike "*Loopback*" -and
            $_.InterfaceAlias -notlike "*WSL*" -and
            $_.InterfaceAlias -notlike "*vEthernet*" -and
            $_.InterfaceAlias -notlike "*Bluetooth*" -and
            $_.InterfaceAlias -notlike "*VMware*" -and
            $_.InterfaceAlias -notlike "*VirtualBox*"
        } | Sort-Object {
            if ($_.InterfaceAlias -match "Wi-?Fi|WLAN|Wireless") { 0 } else { 1 }
        }

    if ($candidates.Count -eq 0) {
        Write-Host "ERROR: Could not auto-detect a LAN IP." -ForegroundColor Red
        Write-Host "Please run:  .\start-lan.ps1 -LanIp 192.168.x.x" -ForegroundColor Yellow
        exit 1
    }

    $LanIp = ($candidates | Select-Object -First 1).IPAddress
}

Write-Host "LAN IP: $LanIp" -ForegroundColor Green
Write-Host ""

# -- Step 2: Export LAN_HOST for Docker Compose --------------------------------
$env:LAN_HOST = $LanIp
Write-Host "LAN_HOST=$LanIp injected into Docker environment." -ForegroundColor Cyan

# -- Step 3: Start Docker containers -------------------------------------------
Write-Host ""
Write-Host "Starting bugX containers (docker compose up --build -d)..." -ForegroundColor Yellow
Write-Host "This may take a few minutes on first run." -ForegroundColor Gray
Write-Host ""

Push-Location $PSScriptRoot
docker compose up --build -d
$composeResult = $LASTEXITCODE
Pop-Location

if ($composeResult -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Docker Compose failed (exit code $composeResult)." -ForegroundColor Red
    Write-Host "Check that Docker Desktop is running and try again." -ForegroundColor Yellow
    exit $composeResult
}

# -- Step 4: Wait for services to be healthy -----------------------------------
Write-Host ""
Write-Host "Waiting for backend to become healthy..." -ForegroundColor Yellow
$maxWait = 120
$elapsed = 0
$ready   = $false

while ($elapsed -lt $maxWait) {
    Start-Sleep -Seconds 5
    $elapsed += 5

    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # Not ready yet
    }

    Write-Host "  Still starting... ($elapsed/$maxWait s)" -ForegroundColor Gray
}

if (-not $ready) {
    Write-Host ""
    Write-Host "WARNING: Services did not become healthy within $maxWait seconds." -ForegroundColor Yellow
    Write-Host "Check logs with: docker compose logs -f" -ForegroundColor Gray
} else {
    Write-Host "Backend is healthy!" -ForegroundColor Green
}

# -- Step 5: Print sharing info ------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  bugX IS RUNNING — LAN MODE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Your machine (localhost):" -ForegroundColor White
Write-Host "    Frontend  ->  http://localhost:5174" -ForegroundColor White
Write-Host "    Backend   ->  http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "  Other devices on college Wi-Fi — share this URL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  >>> http://$($LanIp):5174 <<<" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Default admin login:" -ForegroundColor White
Write-Host "    Email:    admin@bugx.local" -ForegroundColor White
Write-Host "    Password: Admin12345" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tips:" -ForegroundColor Cyan
Write-Host "  * Run .\setup-firewall.ps1 once (as Admin) to open firewall ports." -ForegroundColor Gray
Write-Host "  * Run 'docker compose logs -f' to watch live logs." -ForegroundColor Gray
Write-Host "  * Run .\stop-share.ps1 to stop everything." -ForegroundColor Gray
Write-Host "  * LAN IP may change after Wi-Fi reconnect — just re-run this script." -ForegroundColor Gray
Write-Host ""

# -- Step 6: Open browser on host machine --------------------------------------
try {
    Start-Process "http://localhost:5174"
} catch { }
