# TIL-To-BMP 0.1 WIP

NOTE: This utility does not exist yet. Writing documentation for it ahead of time.

Extract & Import Centre Ice logos/Crests

# Importing
The Rink palette is 128 colours + 5 additional colors at the end. The 5 colors at the end seem to have an affect on the road team, thereby you can only reliably use 59 colours for the team palette.

1. Create your rink art using the rink.psd template. Only the areas that are not covered by the Tilemap overlay -> tilemap edit layer will be copied over into the team's tilemap

2. To maximize the colours you can use, you can use one of the extracted "<team>teampalMerged.act" which is generated from the binToAct tool in `PAL-To-Act`. You'll need to edit this file with a hex editor and add 4 bytes to the end of it and save it as a new .act file. The 2nd byte you add should be 128 (the first 128 rink palette colours) + the number of team palette colours in the file. So for example, if theres 145 colours you should add: `00 91 00 00`.

2. Then in Photoshop, make the Tilemap Overlay -> Transfer template visible (this should be above all the rest of the rink art)

3. CTRL+A to select all. Then CTRL+SHIFT+C to Copy Merged

4. Ctrl+N to create a new image, create with the default dimensions (which should be the dimensions of the rink you copied)

5. CTRL+V to paste rink wtih template overlay

6. Paste your crest into this new rink image with template overlay as well-- we need it to be part of the palette generation & import process. It should be 36x26 and sit in the top left corner of the image

7. Now its very careful you follow these instructions EXACTLY. There's lots of similar options here that could result in getting a sub-optimal output. Select Image -> Mode -> Indexed Colors

8. Select OK to flatten layers

9. Set Palette to Local (Adaptive) and then Set Forced -> Custom. This should bring up a palette menu where you can load the .ACT file you generated above. You should see a palette with not all of the colours filled out. If you created a file that has less than the team's actual jersey palette, your colours will not come out correctly in-game. Click OK On the Forced Colors Dialog box but do not close the indexed colours dialog yet (if you did you need to undo the indexed color step and redo it)

10. The number of available colours you can use is for your rink art & crest is 256 - 64 (away team palette) - 5 (can't use last 5 colours in team palette). So the total is 187. In the Colors field, change the number to 187. I would also recommend setting Dither to none. Now Click OK. You should now see your art with the correct palette.

11. Save rink as .bmp file

12. Run `node importCrestIce.js`

13. You should get a Crests.PPV, <team>.TIL, <team>.MAP

14. 

# .TIL/.MAP file format
.map:
- RAW Image, each byte greyscale value 0-255. 
- Palette matches palette extracted by `PAL-To-ACT` from `HOMEPALS.bin`.
- stored in 8x8 tiles

.til:  
Bytes 0-1: Height (in tiles)  

Bytes 2-3: Width (in tiles)  

Bytes 4-5: ???? - usually 10h  

Then you get a set of byte pairs which tells the order of which tiles to display from the top, left to right  

Centre Ice Layout is stored in the list in HOCKEY.exe at offset `0x10E4EC`. After every team abbreviation in this list there are 9 bytes. This controls the centre ice logo arrangement. So for example, LA shows the logo near the blue line and mirrored. If you want to change this to a more traditional layout you can by overwriting the 9 bytes after the 3 byte abbreviation with one from another team. Heres what the bytes mean:

Byte 1 - Seems to be always 0  

Byte 2-3 - X offset - think this is based on tiles so you will move the logo by 8 pixels as you change this value by 1  

Byte 4-5 - Y offset - think this is based on tiles so you will move the logo by 8 pixels as you change this value by 1  

Byte 6-9 - Not sure how this is broken down but controls how centre ice logo displays. LA has the logos mirrored, believe this controls that  

# HOW Team Palettes Work
Crests in Crests4.QFS seem to follow the sprite (non-game) palette.
Crests from Screen Thief follow the in-game palette
Crests from PPV follow the merged sprite palette

Jerseys in Homepals.bin have both the in-game palette & the in-game palette to colour zone mapping
Jerseys in Homepal3.QFS follow the sprite palette
Jerseys in Screen Thief follow the in-game palette
Sprites from PPV file seem to follow the sprite palette

Centre Ice Logos from screen Thief follow the in-game palette
Centre Ice Logos from .TIL follow

BYTES 180-1CF contain some sort of mapping for crests. I think Crests are supposed to use this area, and then this area gets mapped.

Question is-- what about rink palette after 128, how does it get mapped? does it just know?


so homepals Team Logo + Crest Area -> maps


# TODO
- Reverse to use original rinkpal
- Create tool which imports jersey palette back into game
- Create a tool which imports crest into game
- Create a tool which maps rink.bmp -> rink.til/rink.map
