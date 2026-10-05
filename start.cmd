@echo off
rem Doppelklick: startet den lokalen Server und öffnet den Tracker im Browser.
cd /d "%~dp0"
start "" http://localhost:8080
node server.js
