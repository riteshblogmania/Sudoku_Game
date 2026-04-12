@echo off
setlocal
set "NODE_ROOT=C:\Users\DELL\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.14.1-win-x64"
set "PATH=%NODE_ROOT%;%PATH%"
set "HOME=C:\Users\DELL\Documents\Project\sudoku-mobile\.expo-home"
set "USERPROFILE=C:\Users\DELL\Documents\Project\sudoku-mobile\.expo-home"
set "EXPO_NO_TELEMETRY=1"
cd /d C:\Users\DELL\Documents\Project\sudoku-mobile
call "%NODE_ROOT%\npx.cmd" expo start
