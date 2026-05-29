@echo off
REM ============================================================
REM  NareApp - Conecta el emulador de Android con el backend
REM  que corre dentro de WSL.
REM  EJECUTAR COMO ADMINISTRADOR:
REM    clic derecho sobre el archivo -> "Ejecutar como administrador"
REM ============================================================

for /f "tokens=1" %%i in ('wsl hostname -I') do set WSLIP=%%i

if "%WSLIP%"=="" (
  echo No se pudo obtener la IP de WSL. Esta WSL corriendo?
  pause
  exit /b 1
)

netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=%WSLIP%

echo.
echo  Listo: localhost:3000 de Windows -^> %WSLIP%:3000 (WSL)
echo  En el emulador, NareApp ya puede usar http://10.0.2.2:3000
echo.
pause
