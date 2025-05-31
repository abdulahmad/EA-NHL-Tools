@echo off
rem NHL95 Frame Data Extractor Launcher
rem Usage: extract-frame.bat <rom_file> <frame_number>

if "%~1"=="" goto :usage
if "%~2"=="" goto :usage

node extractFrame.js "%~1" %~2
goto :end

:usage
echo Usage: extract-frame.bat ^<rom_file^> ^<frame_number^>
echo Example: extract-frame.bat "NHL 95 (UE) [!].bin" 42

:end
