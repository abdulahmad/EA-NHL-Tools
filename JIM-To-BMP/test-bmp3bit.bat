@echo off
REM Test batch file for BMP 3-bit Color Converter
REM Usage: test-bmp3bit.bat path\to\your\image.bmp

if "%1"=="" (
  echo Please provide a path to a BMP file
  echo Usage: test-bmp3bit.bat path\to\your\image.bmp
  exit /b 1
)

node bmp3bitConverter.js %1
if %ERRORLEVEL% NEQ 0 (
  echo Error running the conversion script
  exit /b 1
)

echo.
echo Conversion complete! Check the 3bit-converted folder for output.
echo.
