# -----------------------------------------------------------------------------
# bugX — Windows Firewall Setup (Run Once as Administrator)
# Opens ONLY the ports needed for college LAN access.
# Does NOT disable the firewall.
# -----------------------------------------------------------------------------

# Must run as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  bugX — Windows Firewall Configuration" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# -- Port 5174 — Frontend (Vite dev server, Docker host port) ------------------
$ruleName1 = "bugX-Frontend-5174"
if (Get-NetFirewallRule -DisplayName $ruleName1 -ErrorAction SilentlyContinue) {
    Write-Host "  Firewall rule '$ruleName1' already exists. Updating..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $ruleName1 -ErrorAction SilentlyContinue
}
New-NetFirewallRule `
    -DisplayName $ruleName1 `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 5174 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "bugX Frontend (Vite dev server) — college LAN access" `
    | Out-Null
Write-Host "  [OK] Port 5174 (Frontend) opened for LAN access." -ForegroundColor Green

# -- Port 8000 — Backend API (FastAPI / WebSockets) ----------------------------
$ruleName2 = "bugX-Backend-8000"
if (Get-NetFirewallRule -DisplayName $ruleName2 -ErrorAction SilentlyContinue) {
    Write-Host "  Firewall rule '$ruleName2' already exists. Updating..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $ruleName2 -ErrorAction SilentlyContinue
}
New-NetFirewallRule `
    -DisplayName $ruleName2 `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8000 `
    -Action Allow `
    -Profile Private,Domain `
    -Description "bugX Backend API + WebSockets — college LAN access" `
    | Out-Null
Write-Host "  [OK] Port 8000 (Backend API + WebSockets) opened for LAN access." -ForegroundColor Green

# -- Confirm — NOT opening internal ports -------------------------------------
Write-Host ""
Write-Host "  [SECURE] Port 5432 (PostgreSQL) — NOT opened (internal Docker only)." -ForegroundColor Gray
Write-Host "  [SECURE] Port 6379 (Redis)       — NOT opened (internal Docker only)." -ForegroundColor Gray
Write-Host "  [SECURE] Port 2358 (Judge0)       — NOT opened (internal Docker only)." -ForegroundColor Gray
Write-Host ""

# -- Verify rules were created -------------------------------------------------
$rule1 = Get-NetFirewallRule -DisplayName $ruleName1 -ErrorAction SilentlyContinue
$rule2 = Get-NetFirewallRule -DisplayName $ruleName2 -ErrorAction SilentlyContinue

if ($rule1 -and $rule2) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  Firewall configured successfully!" -ForegroundColor Green
    Write-Host "  Ports 5174 and 8000 are now accessible from college LAN." -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not verify firewall rules. Check Windows Defender Firewall manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To remove these rules later, run:" -ForegroundColor Gray
Write-Host "  Remove-NetFirewallRule -DisplayName '$ruleName1'" -ForegroundColor Gray
Write-Host "  Remove-NetFirewallRule -DisplayName '$ruleName2'" -ForegroundColor Gray
Write-Host ""
