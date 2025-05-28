# NHL94 Instrument Explorer (PowerShell)
# This script generates MIDI files with different instrument combinations
# to help find the best sounds for your NHL94 music.

param (
    [Parameter(Mandatory=$true, Position=0)]
    [string]$RomFile
)

$OutputDir = "instrument_tests"
$MidiScript = "mid94-to-midi.js"

Write-Host "NHL94 Instrument Explorer" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will generate MIDI files with different instrument combinations"
Write-Host "to help you find the best sounds for your NHL94 music."
Write-Host ""
Write-Host "ROM file: $RomFile"
Write-Host "Output directory: $OutputDir"
Write-Host ""

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Created output directory: $OutputDir"
}

# Generate baseline file with default instruments
Write-Host "Generating baseline file with default instruments..." -ForegroundColor Yellow
node $MidiScript $RomFile "$OutputDir\baseline.mid" | Out-Null
Write-Host "Done." -ForegroundColor Green
Write-Host ""

# List of instruments to test (add more as discovered)
$Instruments = @(
    "0x00", "0x01", "0x02", "0x03", "0x04", "0x05", "0x06", "0x07", 
    "0x08", "0x09", "0x0A", "0x0B", "0x0C", "0x0D", "0x0E", "0x0F",
    "0x10", "0x11", "0x12", "0x13", "0x14", "0x15", "0x16", "0x17", 
    "0x18", "0x19", "0x1A", "0x1B", "0x1C", "0x1D", "0x1E", "0x1F"
)

Write-Host "Exploring instruments for each channel..." -ForegroundColor Yellow
Write-Host "This will take some time..."
Write-Host ""

# Test each instrument on each channel
foreach ($Channel in @(0, 1, 2, 3, 6, 7)) {
    Write-Host "Channel $Channel:" -ForegroundColor Cyan
    $Progress = 0
    $Total = $Instruments.Count
    
    foreach ($Instrument in $Instruments) {
        $Progress++
        $OutputFile = "$OutputDir\channel${Channel}_instrument$Instrument.mid"
        Write-Progress -Activity "Testing instruments for Channel $Channel" -Status "$Instrument" -PercentComplete (($Progress / $Total) * 100)
        
        try {
            node $MidiScript -i "${Channel}:$Instrument" $RomFile $OutputFile | Out-Null
        } catch {
            Write-Host "  Error testing instrument $Instrument on channel $Channel" -ForegroundColor Red
        }
    }
    
    Write-Progress -Activity "Testing instruments for Channel $Channel" -Completed
    Write-Host "  Done." -ForegroundColor Green
}

Write-Host ""
Write-Host "All instrument combinations generated!" -ForegroundColor Green
Write-Host ""
Write-Host "The files are in the $OutputDir directory."
Write-Host "Listen to them to find the best instrument for each channel."
Write-Host ""
Write-Host "Recommended combinations:" -ForegroundColor Yellow
Write-Host "- channel0_instrument0x0B.mid  (Music Box / Chorus Synth)"
Write-Host "- channel1_instrument0x08.mid  (Clavinet / Brassy Sound)"
Write-Host "- channel2_instrument0x04.mid  (Honky-tonk Piano)"
Write-Host ""
Write-Host "To use a custom combination, run:"
Write-Host "  node $MidiScript -i 0:0x0B -i 1:0x08 -i 2:0x04 $RomFile custom.mid" -ForegroundColor Cyan
