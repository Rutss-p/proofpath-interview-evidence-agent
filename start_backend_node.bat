@echo off
echo Starting ProofPath Backend on Node.js (Port 8000)...
cd /d "%~dp0backend-node"
node src/server.js
pause
