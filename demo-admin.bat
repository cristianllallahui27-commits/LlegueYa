@echo off
REM Servidor de DEMOSTRACION (cuenta de prueba, datos temporales). No toca tus cuentas ni tu base de datos.
REM Entra con "Continuar con Google": la primera vez es la administradora de prueba.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (echo Primero ejecuta iniciar-llegueya.bat para crear el entorno. & pause & exit /b 1)
set APP_ORIGIN=http://127.0.0.1:8010
set CATALOGO_FOTOS_DIR=%~dp0tmp\fotos-demo
".venv\Scripts\python.exe" -m uvicorn tests.servidor_e2e:app --port 8010
pause
