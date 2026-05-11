Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$logsDir = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
$tunnelLog = Join-Path $logsDir "cloudflared.log"

function Resolve-CloudflaredExe {
    $cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cloudflaredCmd) {
        return $cloudflaredCmd.Source
    }

    $wingetPath = Join-Path $env:LOCALAPPDATA "Microsoft/WinGet/Packages/Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe/cloudflared.exe"
    if (Test-Path $wingetPath) {
        return $wingetPath
    }

    $programFilesPath = "C:\\Program Files\\cloudflared\\cloudflared.exe"
    if (Test-Path $programFilesPath) {
        return $programFilesPath
    }

    throw "cloudflared.exe was not found. Install cloudflared or add it to PATH."
}

$cloudflaredExe = Resolve-CloudflaredExe
$configPath = Join-Path $ProjectRoot "cloudflared/config.yml"

$previousErrorPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"

try {
    if (Test-Path $configPath) {
        Write-Output "Starting named tunnel from cloudflared/config.yml"
        & $cloudflaredExe "tunnel" "--config" $configPath "run" 2>&1 | Tee-Object -FilePath $tunnelLog -Append
    } else {
        Write-Output "No named tunnel config found. Starting Quick Tunnel for http://localhost:3000"
        Write-Output "Quick Tunnel URL is temporary and changes when tunnel restarts."
        & $cloudflaredExe "tunnel" "--url" "http://localhost:3000" "--no-autoupdate" 2>&1 | Tee-Object -FilePath $tunnelLog -Append
    }

    if ($LASTEXITCODE -ne 0) {
        throw "cloudflared exited with code $LASTEXITCODE"
    }
} finally {
    $ErrorActionPreference = $previousErrorPreference
}
