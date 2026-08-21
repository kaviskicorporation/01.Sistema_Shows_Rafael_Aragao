# Sobe backend + frontend. Ctrl+C encerra os dois.
# Na primeira vez, cria venv, instala deps, migra e faz seed.
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

function Ensure-Backend {
  $backend = Join-Path $root "backend"
  $venvPy = Join-Path $backend ".venv\Scripts\python.exe"
  $req = Join-Path $backend "requirements.txt"

  if (-not (Test-Path $venvPy)) {
    Write-Host "  [setup] Criando venv do backend..."
    Push-Location $backend
    try {
      py -m venv .venv
    } finally {
      Pop-Location
    }
    if (-not (Test-Path $venvPy)) {
      throw "Falha ao criar backend\.venv. Instale Python (py) e tente de novo."
    }
  }

  & $venvPy -c "import django" 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  [setup] Instalando dependencias do backend..."
    & $venvPy -m pip install --upgrade pip | Out-Null
    # Tenta requirements completo; se psycopg-binary falhar (ex.: Python 32-bit),
    # instala o restante sem o extra binary (SQLite local nao precisa).
    & $venvPy -m pip install -r $req
    if ($LASTEXITCODE -ne 0) {
      Write-Host "  [setup] Fallback: instalando sem psycopg[binary]..."
      & $venvPy -m pip install `
        "Django==5.1.4" `
        "djangorestframework==3.15.2" `
        "djangorestframework-simplejwt==5.3.1" `
        "django-cors-headers==4.6.0" `
        "django-filter==24.3" `
        "Pillow==11.0.0" `
        "reportlab==4.2.5" `
        "python-dateutil==2.9.0.post0" `
        "gunicorn==23.0.0" `
        "python-dotenv==1.0.1"
      if ($LASTEXITCODE -ne 0) {
        throw "Falha ao instalar dependencias do backend."
      }
      & $venvPy -m pip install "psycopg==3.2.6" 2>$null | Out-Null
    }
  }

  Write-Host "  [setup] Migrando banco..."
  & $venvPy (Join-Path $backend "manage.py") migrate --noinput
  if ($LASTEXITCODE -ne 0) { throw "migrate falhou." }

  & $venvPy (Join-Path $backend "manage.py") seed
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  [aviso] seed falhou (pode ja ter dados). Seguindo..."
  }
}

function Ensure-Frontend {
  $frontend = Join-Path $root "frontend"
  $modules = Join-Path $frontend "node_modules"
  if (-not (Test-Path $modules)) {
    Write-Host "  [setup] npm install no frontend..."
    Push-Location $frontend
    try {
      npm install
      if ($LASTEXITCODE -ne 0) { throw "npm install falhou." }
    } finally {
      Pop-Location
    }
  }
}

try {
  Write-Host ""
  Write-Host "  Preparando ambiente..."
  Ensure-Backend
  Ensure-Frontend

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

  $imap = Start-Process `
    -FilePath "$root\backend\.venv\Scripts\python.exe" `
    -ArgumentList @("manage.py", "listen_imap") `
    -WorkingDirectory "$root\backend" `
    -NoNewWindow -PassThru
  $pids += $imap.Id

  Start-Sleep -Seconds 2

  $frontend = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/c", "npm run dev -- --hostname 127.0.0.1 --port 3000") `
    -WorkingDirectory "$root\frontend" `
    -NoNewWindow -PassThru
  $pids += $frontend.Id

  Wait-Process -Id $frontend.Id
}
finally {
  Stop-All
}
