# PAL-To-ACT v0.1

## BIN-To-ACT
Converts NHL95 PC `<HOME/AWAY>PALS.BIN` files to `.ACT` (jersey palettes).

### Usage
1. Ensure you have `node` installed on your machine

2. In the `BIN-To-ACT` folder, run `node binToAct`. This will convert the `.bin` files to .act files in the folder `Unpack`

### More Info & Issues

Sprite Data Palette Mapping (sprite data in .PPV files)
Equpiment (Black) - 0
Shadow Bug - 1
Blade Side - 8
Blade Tip - 28
Shadow - 88
Eyes - 140
Skin Tones - 133-134,135
Stick - 135
Arms - 144-160
Jersey - 161-176
Pants - 177-180
Socks - 181-189
Helmet - 190-191
Crest1 - 192-196
Crest2 - 208-212
Crest3 - 224-228
Crest4 - 240-244

Game Palette Data Mapping:
Equpiment (Black) - 0
Shadow Bug - 1
Blade Tip - 28
Blade Side - 16
Shadow - 99
Eyes - 74
SKIN Tones - 72-74
Stick - 73

BIN (hex) -> Sprite (dec) Palette Mapping
Arms - 150h-160h -> 144-160
Jersey - 161h-170h -> 161-176
Pants - 171h-174h -> 177-180
Socks - 175h-17Dh -> 181-189
Helmet - 17Eh-17Fh -> 190-191
Crest1 - 180h-184h -> 192-196
Crest2 - 190h-194h -> 208-212
Crest3 - 1A0h-1A4h -> 224-228
Crest4 - 1B0h-1B4h -> 240-244

### <HOME/AWAY>PALS.BIN format
000-0BF - First 64*3 bytes = 192 bytes - colour palette
0C0-13F - values 0-127 - maybe a reference to rink/game palette?
140-14F - different values - potentially mapping static colours like skin tone?

Gameplay Colour Zone Mapping
Starting from line 150 -- mapping sprite colour zone to gameplay palette. gameplay palette indexed 0-255
line 180,190,1A0,1B0 bytes 00-04 - crest palette | bytes 05-0A logo palette
BIN (byte pair in BIN file) HEX -> Palette value
150-15F - 144-159
160-16F - 160-175
170-17F - 176-191
180-184 - 192-196
190-194 - 208-212
1A0-1A4 - 224-228
1B0-1B4 - 240-244
185-18F - UNKNOWN
195-19F - UNKNOWN
1A5-1AF - UNKNOWN
1B5-1BF - UNKNOWN

BIN Colour Zones Mapping (Byte Pairs)
Arms - 150h-160h
Jersey - 161h-170h
Pants - 171h-174h
Socks - 175h-17Dh
Helmet - 17Eh-17Fh
Crest1 - 180h-184h
Crest2 - 190h-194h
Crest3 - 1A0h-1A4h
Crest4 - 1B0h-1B4h

## PAL-To-ACT
Extracts and converts the NHL95 Rink Palette to .ACT format

### Usage
1. Ensure you have `node` installed on your machine

2. In the `PAL-Tools` folder, run `node rinkpalToAct`. This will run the QFS-Unpack tool, which will extract the Palette file. Then it will run qfspalToAct which will convert the extracted palette file to .ACT format

## Merge Rink palette & team palette


----

I have some NHL95 BIN Palette files containing palette data for NHL 95 sprites, and I want to convert palette data for each team to an .ACT file

Here are the specs for the NHL95 BIN Palette files:
There are n number of teams in the file. The data for team 0 comes first, then team 1, up to team n.

For each team here is the data layout:
bytes 000h-0BFh: Colour palette data, which is in RGB form (first byte pair is R value, second byte pair is G value, third byte pair is B value), but the data from the file has to be multiplied by 4 to get the correct value. This palette of 64 colours gets mapped to a team palette with the first colour from the file starting at index 144 and going up to index 207
bytes 150h-1B4h: These map the NHL 95 sprite palette to the team palette. If byte 150h has the value of 145 for example, it means use the colour at index 145 of the team palette for the sprite palette

Please create a node script to create a sprite palette in the .ACT file format for every team in the input file. The naming scheme should be 00.ACT for the first team, 01.ACT for the second team, etc



Palette:
0: Red
1: Blue


Game Palette {
    128: Red,
    129: Blue
    ...
    244:
}

Colour Zone Mapping:
Arm1: Palette index 128 = Red
Arm2: Palette index 129 = Blue