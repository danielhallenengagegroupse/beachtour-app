Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$tasks = @("BeachTour-Site", "BeachTour-Tunnel")

foreach ($task in $tasks) {
    $existing = Get-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $task -Confirm:$false
        Write-Output "Removed task: $task"
    } else {
        Write-Output "Task not found: $task"
    }
}
