# DIG-To-Wav v0.1
Exports NHL95 PC PCFF001.DIG to separate wave files

## Usage
1. Ensure you have `node` installed on your machine.

2. Copy `PCFF001.DIG` from NHL95 PC to your `DIG-To-Wav` folder.

3. In the `DIG-To-Wav` folder, run `node digToWav`. This will output a series of `.wav` files.

## Future TODO
- This is not perfect, need to fix the delimiter logic, not all files get separated out properly and empty waveforms come out as files as well
- Ensure sample rate is correct