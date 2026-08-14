# Sobe backend + frontend. Ctrl+C encerra os dois.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pids = @()

function Stop-All {
  foreach ($procId in $pids) {
    if ($procId) {
      cmd /c "taskkill /PID $procId /T /F >nul 2>&1"
    }
  }
}

try {
  Write-Host ""
  Write-Host "  Site:   http://localhost:3000"
  Write-Host "  Admin:  http://localhost:3000/admin"
  Write-Host "  API:    http://127.0.0.1:8000"
  Write-Host ""
  Write-Host "  Ctrl+C para parar tudo"
  Write-Host ""

  $backend = Start-Process `
    -FilePath "$root\backend\.venv\Scripts\python.exe" `
    -ArgumentList @("manage.py", "runserver", "127.0.0.1:8000") `
    -WorkingDirectory "$root\backend" `
    -NoNewWindow -PassThru
  $pids += $backend.Id

  $frontend = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/c", "npm run dev") `
    -WorkingDirectory "$root\frontend" `
    -NoNewWindow -PassThru
  $pids += $frontend.Id

  Wait-Process -Id $frontend.Id
}
finally {
  Stop-All
}
