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
Starting from line 140 -- mapping sprite colour zone to gameplay palette. gameplay palette indexed 0-255
line 180,190,1A0,1B0 bytes 00-04 - crest palette | bytes 05-0A logo palette
BIN (byte pair in BIN file) HEX -> Palette value
140-14F - 128-143 Skin Tones/Stick/etc
150-15F - 144-159 Arms
160-16F - 160-175 Jersey
170-17F - 176-191 Pants/Socks/Helmet
180-184 - 192-196 Crest1
190-194 - 208-212 Crest2
1A0-1A4 - 224-228 Crest3
1B0-1B4 - 240-244 Crest4
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

## Future TODO
- Add rinkpal to teampal -- needed for non dynamic colours/non player sprites
- Add 140h-14Fh to color mapping & adjust code to read from 140h onwards instead of 150h -- needed for non dynamic colours/non player sprites
- Adjust code to start mapping from 140h  -- needed for non dynamic colours/non player sprites
- Add rinkpal to sprite pal  -- needed for non dynamic colours/non player sprites