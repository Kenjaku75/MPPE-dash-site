@echo off
REM Lance le site en mode démo sur votre ordinateur (nécessite Python) puis ouvre le navigateur.
REM Fermez cette fenêtre pour arrêter le site.
cd /d "%~dp0"
echo Site de demonstration : http://localhost:8080/index.html
echo Dashboard            : http://localhost:8080/admin/connexion.html
start "" http://localhost:8080/index.html
py -3 tools\serve.py 8080
