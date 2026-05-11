Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Resolve-NodeExe {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        return $nodeCmd.Source
    }

    $fallbackNode = "C:\\Program Files\\nodejs\\node.exe"
    if (Test-Path $fallbackNode) {
        return $fallbackNode
    }

    throw "Node.js was not found. Install Node.js and ensure node is available in PATH."
}

$nodeExe = Resolve-NodeExe
$nextCli = Join-Path $ProjectRoot "node_modules/next/dist/bin/next"

if (-not (Test-Path $nextCli)) {
    throw "Next.js CLI not found at $nextCli. Run npm install in the project first."
}

$buildId = Join-Path $ProjectRoot ".next/BUILD_ID"
if (-not (Test-Path $buildId)) {
    & $nodeExe $nextCli "build"
}

$env:NODE_ENV = "production"
& $nodeExe $nextCli "start" "-p" "3000"
