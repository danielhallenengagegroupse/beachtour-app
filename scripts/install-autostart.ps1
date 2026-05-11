Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$siteScript = Join-Path $PSScriptRoot "start-site.ps1"
$tunnelScript = Join-Path $PSScriptRoot "start-tunnel.ps1"

if (-not (Test-Path $siteScript)) {
    throw "Missing $siteScript"
}
if (-not (Test-Path $tunnelScript)) {
    throw "Missing $tunnelScript"
}

$taskPrefix = "BeachTour"
$siteTaskName = "$taskPrefix-Site"
$tunnelTaskName = "$taskPrefix-Tunnel"

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)

$siteAction = New-ScheduledTaskAction -Execute "powershell.exe" -WorkingDirectory $ProjectRoot -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$siteScript`""
$tunnelAction = New-ScheduledTaskAction -Execute "powershell.exe" -WorkingDirectory $ProjectRoot -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tunnelScript`""

try {
    $startupTrigger = New-ScheduledTaskTrigger -AtStartup
    $systemPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    Register-ScheduledTask -TaskName $siteTaskName -Action $siteAction -Trigger $startupTrigger -Settings $settings -Principal $systemPrincipal -Force | Out-Null
    Register-ScheduledTask -TaskName $tunnelTaskName -Action $tunnelAction -Trigger $startupTrigger -Settings $settings -Principal $systemPrincipal -Force | Out-Null

    $mode = "startup (SYSTEM)"
} catch {
    Write-Warning "Could not create SYSTEM startup tasks. Falling back to current-user logon tasks."

    $currentUser = "$env:USERDOMAIN\$env:USERNAME"
    $logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
    $userPrincipal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

    Register-ScheduledTask -TaskName $siteTaskName -Action $siteAction -Trigger $logonTrigger -Settings $settings -Principal $userPrincipal -Force | Out-Null
    Register-ScheduledTask -TaskName $tunnelTaskName -Action $tunnelAction -Trigger $logonTrigger -Settings $settings -Principal $userPrincipal -Force | Out-Null

    $mode = "logon ($currentUser)"
}

Start-ScheduledTask -TaskName $siteTaskName
Start-ScheduledTask -TaskName $tunnelTaskName

Write-Output "Installed tasks: $siteTaskName, $tunnelTaskName"
Write-Output "Auto-start mode: $mode"
Write-Output "Both tasks restart automatically if they crash."
