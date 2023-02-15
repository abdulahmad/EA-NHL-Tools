# IFF-To-Wav v0.1
Exports NHL95 PC IFF audio files to WAV.

This isn't perfect, doesn't work with every file. But will work with some of them at least.

## Usage
1. Ensure you have `node` installed on your machine

2. In the `IFF-To-Wav` folder, run `node iffToWav <filename>`. This will convert the `.iff` file to a file called `output.wav`.

## More Info & Issues
To generate the base code I fed ChatGPT a 1985 whitepaper by an EA Employee on the .IFF format. And specifically the files in NHL95 PC seem to be in the 8SVX VHDR IFF Format. It seems like it was a format that may have been widely used in the past, especially on the Amiga, but I couldn't find any modern support or converters for it. The code generated had some issues-- the header definition seemed wrong. This was a real quick & dirty tool to get out so I didn't spend enough time to understand if the documentation wasn't read properly by ChatGPT or if EA had changed the header definition by the time NHL 95 came out. 

Calculating the size of the destination file also seems to be incorrect. It's something I need to spend more time looking into.

The input file is in 8-bit, but the .wav file is output in 16-bit. I have a feeling this is causing the audio to sound muffled, but I wasn't able to figure out how to save an 8-bit wav file properly, it would completely come out garbled when I tried. I put the values on an exponential curve because there wasn't enough dynamic range in the audio otherwise. I don't know if this is a problem by trying to convert 8-bit to 16-bit, but I feel I could stand to increase the dynamic range further.

Also, some files come out sounding really bad or don't work-- there seems to be some offset in the waveform value. I don't fully understand it right now

## Future TODO
This was something I did quick and dirty as I decided to spend a night looking into the .IFF format. Not sure if I will come back to it but if I do this is what I would look at
- Analyze header, identify volume bytes
- Figure out how to output an 8-bit wav properly
- Analyze waveform output from game vs waveform output via this script to see what the discrepency is.