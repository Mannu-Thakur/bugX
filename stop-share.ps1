# bugX — Stop Full Stack Containers & Tunnels
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "Stopping bugX Docker Containers..." -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Yellow
docker compose down

Write-Host "Stopping all background tunnels..." -ForegroundColor Red
Stop-Process -Name "cloudflared", "ssh" -ErrorAction SilentlyContinue

Write-Host "All bugX services stopped completely!" -ForegroundColor Green
