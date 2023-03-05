# Palette Tools 0.2

AA Notes:
- Create 01-compressPalette.js
    - Take colours 144-254
    - round to nearest multiple of 4
    - max value = 63 * 4
    - make unique -- remove dupes of 0-143 & dupes of itself
    - sort in order of R,G,B
    - output rinkpal 0-143 + team pal 144-216 (leaving 39 colours for crest + rink)
    -- why 39? 0-143 is rink pal + skin tones. 144-191 = team pal, of last 64 colours (192-255), 5 for rink pal, 20 for 5x4 jersey crest = 64 - 5 - 20 = 39.
    - team pal (144-191) should actually be blacked out so that crest & rink graphics don't refer to these colours directly

- Create 02-compileExtendedPal.js
    - combines <TEAM><H/V>.pal & <TEAM><H/V>-02-compressed.pal to create -03-crestrink.pal
    -- last 39 colours get organized into open slots next to 5x4 jersey crest palette
    - if too many unique colours, spit out error, instruct user to recreate compressed pal with less colours (tell how many)
- Create 03-compileTeamGfx.js
    - combine 01pal and 03pal to put new colours in correct places & remove dupe colours
    - script to create .map/.til
    - script to create crest.ppv
    - script to create .bin segment

## Act-To-BIN
Converts PAL file to a .bin segment. All the colours from 144 to 255 should be taken as unique colours and stored from 144 onwards. 

Colours should be sorted by R, then G, then B.

If unique colours > 59, error out.

Colours 192-255 get mapped, this is the space to use for Crests + Ice logo (these use 0-255 as well)

When Importing Crest & Ice in photoshop, need to use special palette which blanks out 128-191

### Usage
This is a multi-step process. First you must create your jersey palette. Then you'll have to generate the extended team palette for the crests

1. Create `PACK\<TEAM><H/V>.pal` for all teams.

2. Ensure you have `node` installed on your machine.

3. In the `PAL-TO-ACT` folder, run `01-compressPalette.js <team>` You will be left with `PACK\<TEAM><H>-02-compressed.pal` and `PACK\<TEAM><V>-02-compressed.pal`

4. Use rink.psd to place your Crest & rink graphics. Make sure you are using the blacked out overlay. Copy merged and paste into new file.

5. Go to Image -> Mode -> Indexed Color, Click OK to flatten layers if asked. In the Indexed Color pop up, Select Palette -> Local (Perceptual). Set colors to 256. Set Forced colors to Custom -> Load -> `<TEAM><H/V>-02-compressed.pal`. Click OK and OK again. This should generate the additonal palette colors that can be used for the Crest & Rink graphics. 

6. Go to Image -> Mode -> Color Table, Save file as `PACK\<TEAM><H/V>-03-crestrink.pal`

7. In the `PAL-TO-ACT` folder, run `02-compileExtendedPal.js <team>`. You will be left with `PACK\<TEAM><H>-04-extendedPal.act` and `PACK\<TEAM><H>-04-extendedPal.act`.

8. Now you need to convert the rink/crest graphics used in step 5 to use `PACK\<TEAM><H>-extendedPal.act` by going into Image -> Mode -> Color Table and loading `PACK\<TEAM><H>-04-extendedPal.act` (you must use the Home version of this palette!) and save it into `PACK\<team>.bmp`. Now you're ready to compile the final graphics for the game.

9. Run `node 03-compileTeamGfx.js`


## PAL-To-ACT
Extracts and converts the NHL95 PC QFS Palette format to .ACT format

### Usage
1. Ensure you have `node` installed on your machine.

2. In the `PAL-To-ACT` folder, run `node palToAct <fileName>`. This will convert the NHL95 PC palette to .ACT by removing the 16 byte header and multiplying all of the colour values by 4.

## BIN-To-ACT
Converts NHL95 PC `<HOME/AWAY>PALS.BIN` files to `.ACT` (jersey palettes).

### Usage
1. Ensure you have `node` installed on your machine

2. In the `BIN-To-ACT` folder, run `node binToAct <fileName>`. This will convert the `.bin` files (HOMEPALS/AWAYPALS) to .ACT files in the folder `Unpack`. The final file should be named `<teamIndex>Merged.ACT`.

### More Info & Issues

### Sprite Data Palette Mapping (sprite data in .PPV files)
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


### Game Palette Data Mapping:
Equpiment (Black) - 0

Shadow Bug - 1

Blade Tip - 28

Blade Side - 16

Shadow - 99

Eyes - 74

SKIN Tones - 72-74

Stick - 73

### BIN (hex) -> Sprite (dec) Palette Mapping
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

### Gameplay Colour Zone Mapping
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


### BIN Colour Zones Mapping (Byte Pairs)
Arms - 150h-160h

Jersey - 161h-170h

Pants - 171h-174h

Socks - 175h-17Dh

Helmet - 17Eh-17Fh

Crest1 - 180h-184h

Crest2 - 190h-194h

Crest3 - 1A0h-1A4h

Crest4 - 1B0h-1B4h

## Merge Rink Palette Tool
Merges the rink palette with other palettes, which needs to be done twice as part of the palette mapping process to map palettes from `HOMEPALS/AWAYPALS.BIN` to extracted sprites.

The original rink palette is rinkpal.act, but I had to create a special version called rinkpalShadowfixed.act because the shadow palette was not mapped correctly (whereas everything else including both dynamic & non-dynamic colours were mapped correctly). I'm not sure if this will cause palette issues with certain sprites in the game or not.

### Usage
1. Ensure you have `node` installed on your machine.

2. In the `PAL-To-ACT` folder, run `node mergeRinkpal <fileName>`. This will overwrite the first 128 colours and last 5 colours of the input palette with the Rink Palette (which is essentially the basis for the gameplay palette minus the team colours for jerseys/logos).


## Future TODO
- Handle HOMEPALS/AWAYPALS.BIN automatically, output home and away version
- Use team abbreviations instead of team indexes
- Ensure non-player sprites aren't affecting by Shadow palette issue