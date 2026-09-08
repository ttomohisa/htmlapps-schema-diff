@echo off
setlocal
set "ROOT=%~dp0"
set "APP=%ROOT%dist\index.html"

if not exist "%APP%" (
  echo dist\index.html was not found. Building first...
  call "%ROOT%build-standalone.bat"
  if errorlevel 1 exit /b %errorlevel%
)

start "" "%APP%"
