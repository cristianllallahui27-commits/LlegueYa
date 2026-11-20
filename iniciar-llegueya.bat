@echo off
REM Ejecuta LlegueYa en este equipo: crea el entorno, instala dependencias y arranca el servidor.
cd /d "%~dp0"
title LlegueYa - servidor local
if not exist ".venv\Scripts\python.exe" python -m venv .venv
echo Instalando o verificando dependencias...
".venv\Scripts\python.exe" -m pip install -q -r requirements-dev.txt

REM Si quedo abierto un servidor anterior en el puerto 8000, se cierra para cargar la version nueva.
set PUERTO=8000
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /r /c:":8000 .*:0 "') do taskkill /PID %%p /T /F >nul 2>&1
timeout /t 2 /nobreak >nul
REM Si Windows no deja cerrarlo (por ejemplo, se abrio como administrador), usamos el puerto 8001.
netstat -ano -p tcp | findstr /r /c:":8000 .*:0 " >nul && set PUERTO=8001
set APP_ORIGIN=http://127.0.0.1:%PUERTO%

REM Solo en desarrollo local: las publicaciones salen sin esperar moderacion.
set COMUNIDAD_AUTOPUBLICAR=true
echo.
echo  LlegueYa esta funcionando en http://127.0.0.1:%PUERTO%
if "%PUERTO%"=="8001" echo  (El puerto 8000 esta ocupado por otro programa: reinicia la PC para liberarlo.)
echo  Para detenerlo, cierra esta ventana.
echo.
start "" http://127.0.0.1:%PUERTO%
".venv\Scripts\python.exe" -m uvicorn services.gateway.composicion:crear_app --factory --host 127.0.0.1 --port %PUERTO% --no-access-log --reload --reload-dir services
pause
