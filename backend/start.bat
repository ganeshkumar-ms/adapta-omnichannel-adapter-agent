@echo off
title ADAPTA Omnichannel Message Engine
cd /d "%~dp0"
echo Starting ADAPTA FastAPI backend on port 8006...
..\..\taxora-taxonomy-agent\backend\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8006 --reload
pause

