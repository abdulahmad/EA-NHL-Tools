# VIV-To-WAV v0.1
Exports Rink announcer audio stored .VIV files for NHL95 PC.

This tool leverages `gfxpak` to export the audio data from the VIV file. Assuming gfxpak can add data files back into VIV files correctly, these scripts could probably be modified to import new sounds into the game, but for now my focus is on exporting spounds from the game.

# Usage
1. In `VIV-To-WAV` folder, create a folder called `NHL95VIV` and copy the VIV files from NHL95 that you want to export into that folder.

2. Ensure you have `node` installed on your machine

3. In the `VIV-To-WAV` folder, run `node vivToIff`. This will run `gfxpak` on all of the VIV files in `NHL95VIV`. Now you will have the audio data files for the menu announcer and rink announcer, ready to be converted.

4. Run `node batchUnpackedIffToWav`. It will run the script `iffToWav` on all of the audio data files extracted from the VIV files that are in IFF Format. You will now have `.wav` files in the `Unpack` subfolders.

# Future TODO
- There is another unknown 8-bit unsigned mono PCM file format for audio in the VIV files. This seems to be for the menu announcer. The data seems to be in 8-bit unsigned mono, but there's some other data or compression going on which is causing the audio to sound distorted. Haven't written a tool to extract these to WAV yet.