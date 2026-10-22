@echo off
echo Starting ProofPath Backend on PostgreSQL (Port 8000)...
cd /d "%~dp0backend"
python -m uvicorn app.main:app --reload --port 8000
pause
