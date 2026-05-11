Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$logFile = Join-Path $ProjectRoot "logs/cloudflared.log"

if (-not (Test-Path $logFile)) {
    Write-Output "No tunnel log found yet at $logFile"
    exit 1
}

$latestUrl = Select-String -Path $logFile -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -AllMatches |
    ForEach-Object { $_.Matches } |
    ForEach-Object { $_.Value } |
    Select-Object -Last 1

if ($latestUrl) {
    Write-Output $latestUrl
    exit 0
}

Write-Output "No trycloudflare URL found yet. Tunnel may still be starting."
exit 1
