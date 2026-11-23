@echo off
title BIZWORK Server Launcher
cd /d "C:\Users\TDC\Desktop\BIZWORK_SYSTEM\backend"
echo ====================================================
echo     KHOI DONG HE THONG BIZWORK CHO MINI PC / WINDOWS
echo ====================================================
echo.
"C:\Users\TDC\.gemini\antigravity\scratch\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
