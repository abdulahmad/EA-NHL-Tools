@echo off
REM NHL94 Instrument Explorer
REM This script generates MIDI files with different instrument combinations
REM to help find the best sounds for your NHL94 music.

setlocal enabledelayedexpansion

if "%~1"=="" (
  echo Usage: explore-instruments.bat [romFile]
  echo Example: explore-instruments.bat nhl94.bin
  exit /b 1
)

set ROM_FILE=%~1
set OUTPUT_DIR=instrument_tests
set MIDI_SCRIPT=mid94-to-midi.js

echo NHL94 Instrument Explorer
echo ========================
echo.
echo This script will generate MIDI files with different instrument combinations
echo to help you find the best sounds for your NHL94 music.
echo.
echo ROM file: %ROM_FILE%
echo Output directory: %OUTPUT_DIR%
echo.

REM Create output directory if it doesn't exist
if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%

REM Generate baseline file with default instruments
echo Generating baseline file with default instruments...
node %MIDI_SCRIPT% %ROM_FILE% %OUTPUT_DIR%\baseline.mid
echo Done.
echo.

REM List of instruments to test (add more as discovered)
set INSTRUMENTS=0x00 0x01 0x02 0x03 0x04 0x05 0x06 0x07 0x08 0x09 0x0A 0x0B 0x0C 0x0D 0x0E 0x0F 0x10 0x11 0x12 0x13 0x14 0x15 0x16 0x17 0x18 0x19 0x1A 0x1B 0x1C 0x1D 0x1E 0x1F

echo Exploring instruments for each channel...
echo This will take some time...
echo.

REM Test each instrument on each channel
for %%c in (0 1 2 3 6 7) do (
  echo Channel %%c:
  for %%i in (%INSTRUMENTS%) do (
    set OUTPUT_FILE=%OUTPUT_DIR%\channel%%c_instrument%%i.mid
    echo   Testing instrument %%i...
    node %MIDI_SCRIPT% -i %%c:%%i %ROM_FILE% !OUTPUT_FILE! >nul 2>&1
  )
  echo   Done.
)

echo.
echo All instrument combinations generated!
echo.
echo The files are in the %OUTPUT_DIR% directory.
echo Listen to them to find the best instrument for each channel.
echo.
echo Recommended combinations:
echo - channel0_instrument0x0B.mid  (Music Box / Chorus Synth)
echo - channel1_instrument0x08.mid  (Clavinet / Brassy Sound)
echo - channel2_instrument0x04.mid  (Honky-tonk Piano)
echo.
echo To use a custom combination, run:
echo   node %MIDI_SCRIPT% -i 0:0x0B -i 1:0x08 -i 2:0x04 %ROM_FILE% custom.mid
