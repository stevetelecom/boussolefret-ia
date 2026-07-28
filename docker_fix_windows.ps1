# Docker diagnostic and fix script for Windows (run as Administrator)
# Usage: Open PowerShell as Admin in project root and run:
#   powershell -ExecutionPolicy Bypass -File .\docker_fix_windows.ps1

$logDir = Join-Path -Path (Get-Location) -ChildPath "docker-diagnostics"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

function Log-Output($path, $content) {
    $content | Out-File -FilePath $path -Encoding UTF8 -Force
}

# Ensure running as Administrator
$cur = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($cur)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script must be run as Administrator. Please re-open PowerShell as Admin and run the script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting Docker diagnostics..." -ForegroundColor Cyan

# Basic Docker and system info
Write-Host "Collecting Docker and WSL info..."
try {
    docker version | Tee-Object -FilePath (Join-Path $logDir 'docker-version.txt')
} catch {
    "docker version failed: $_" | Out-File (Join-Path $logDir 'docker-version.txt') -Encoding UTF8
}

try {
    docker info | Tee-Object -FilePath (Join-Path $logDir 'docker-info.txt')
} catch {
    "docker info failed: $_" | Out-File (Join-Path $logDir 'docker-info.txt') -Encoding UTF8
}

try {
    docker compose version | Tee-Object -FilePath (Join-Path $logDir 'docker-compose-version.txt')
} catch {
    "docker compose version failed: $_" | Out-File (Join-Path $logDir 'docker-compose-version.txt') -Encoding UTF8
}

try { docker context ls | Tee-Object -FilePath (Join-Path $logDir 'docker-contexts.txt') } catch {}
try { wsl -l -v | Tee-Object -FilePath (Join-Path $logDir 'wsl-list.txt') } catch {}

# Check service status
try { Get-Service *docker* | Format-Table -AutoSize | Out-String | Tee-Object (Join-Path $logDir 'docker-services.txt') } catch {}

# Attempt to pull the problematic image
Write-Host "Attempting to pull redis:7-alpine..."
try {
    docker pull redis:7-alpine 2>&1 | Tee-Object -FilePath (Join-Path $logDir 'pull-redis.txt')
} catch {
    "docker pull redis failed: $_" | Out-File (Join-Path $logDir 'pull-redis.txt') -Encoding UTF8
}

# If pull failed, try restarting Docker Desktop service
$pullLog = Get-Content (Join-Path $logDir 'pull-redis.txt') -ErrorAction SilentlyContinue -Raw
if ($pullLog -match '500 Internal Server Error' -or $pullLog -match 'API error' -or $pullLog -match 'not found' -or $pullLog -match 'failed') {
    Write-Host "Detected pull failure. Attempting to restart Docker Desktop service..." -ForegroundColor Yellow
    try {
        if (Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue) {
            Restart-Service -Name 'com.docker.service' -Force -ErrorAction Stop
            Start-Sleep -Seconds 8
        } else {
            # Fallback: try to restart process
            Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            $dd = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
            if (Test-Path $dd) { Start-Process -FilePath $dd }
            Start-Sleep -Seconds 8
        }
        "Docker restart attempted at $(Get-Date)" | Out-File (Join-Path $logDir 'docker-restart.txt') -Encoding UTF8
    } catch {
        "Failed to restart Docker Desktop: $_" | Out-File (Join-Path $logDir 'docker-restart.txt') -Encoding UTF8
    }

    Write-Host "Retrying docker pull redis:7-alpine..."
    try { docker pull redis:7-alpine 2>&1 | Tee-Object -FilePath (Join-Path $logDir 'pull-redis-after-restart.txt') } catch { $_ | Out-File (Join-Path $logDir 'pull-redis-after-restart.txt') }
}

# Pre-pull core images to reduce errors
$images = @('postgres:latest','minio/minio:latest','nats:2-alpine')
foreach ($img in $images) {
    Write-Host "Pulling $img"
    try { docker pull $img 2>&1 | Tee-Object -FilePath (Join-Path $logDir ("pull-" + ($img -replace '/','-') + '.txt')) } catch { $_ | Out-File (Join-Path $logDir ("pull-" + ($img -replace '/','-') + '.txt')) }
}

# Attempt compose pull and up
Write-Host "Running docker compose pull..."
try { docker compose pull 2>&1 | Tee-Object -FilePath (Join-Path $logDir 'compose-pull.txt') } catch { $_ | Out-File (Join-Path $logDir 'compose-pull.txt') }

Write-Host "Bringing up the stack... (docker compose up --build -d)"
try { docker compose up --build -d 2>&1 | Tee-Object -FilePath (Join-Path $logDir 'compose-up.txt') } catch { $_ | Out-File (Join-Path $logDir 'compose-up.txt') }

# Collect compose status and logs
try { docker compose ps --all | Tee-Object -FilePath (Join-Path $logDir 'compose-ps.txt') } catch {}
try { docker compose logs --tail 200 | Tee-Object -FilePath (Join-Path $logDir 'compose-logs.txt') } catch {}
try { docker system info | Tee-Object -FilePath (Join-Path $logDir 'docker-system-info.txt') } catch {}

Write-Host "Diagnostics complete. Logs saved to: $logDir" -ForegroundColor Green
Write-Host "Please attach the files in $logDir if issues persist, or paste their contents here." -ForegroundColor Cyan
