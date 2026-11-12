@echo off
title ADAPTA Omnichannel Message Engine
echo Starting ADAPTA FastAPI backend on port 8006...
uvicorn main:app --host 0.0.0.0 --port 8006 --reload
pause

