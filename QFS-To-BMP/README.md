# QFS-To-BMP v0.1

## BIN-To-ACT
Converts NHL95 PC `<HOME/AWAY>PALS.BIN` files to `.ACT` (jersey palettes).

### Usage
1. Ensure you have `node` installed on your machine

2. In the `BIN-To-ACT` folder, run `node binToAct`. This will convert the `.bin` files to .act files in the folder `Unpack`

### More Info & Issues

### <HOME/AWAY>PALS.BIN format
000-0BF - First 64*3 bytes = 192 bytes - colour palette
0C0-13F - values 0-127 - maybe a reference to rink/game palette?
140-14F - different values - potentially mapping static colours like skin tone?

Colour Zone Mapping
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

## UnpackQPP

Extracts NHL94 QPP SPIT files with selected palette.

### Usage
1. Ensure you have `node` installed on your machine

2. Copy `.QPP` files from NHL94 to a folder called `NHL94QPP` within the PAL-Tools folder

3. In the `PAL-Tools` folder, run `node unPackQPP`. This will run the QPP-Unpack tool, which will extract all of the raw data image files from the files in `NHL94QPP` into the `Unpack\NHL94QPP` folder

### NHL94 SPIT Header details:
entry header - size unknown
4-5 bytes (uint16) - X axis offset
6-7 bytes (uint16) - Y axis offset
8-9 bytes (uint16) - X axis position
10-11 bytes (uint16) - Y axis position


## UnpackQFS

Extracts NHL95 QFS SPIT files with selected palette.

### Usage
1. Ensure you have `node` installed on your machine

2. Copy `.QPP` files from NHL94 to a folder called `NHL94QPP` within the PAL-Tools folder

3. In the `PAL-Tools` folder, run `node unPackQPP`. This will run the QPP-Unpack tool, which will extract all of the raw data image files from the files in `NHL94QPP` into the `Unpack\NHL94QPP` folder


## RINKPAL-To-ACT
Extracts and converts the NHL95 Rink Palette to .ACT format

### Usage
1. Ensure you have `node` installed on your machine

2. In the `PAL-Tools` folder, run `node rinkpalToAct`. This will run the QFS-Unpack tool, which will extract the Palette file. Then it will run qfspalToAct which will convert the extracted palette file to .ACT format

## Merge Rink palette & team palette