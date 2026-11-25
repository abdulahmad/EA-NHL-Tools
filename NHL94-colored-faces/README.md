# NHL94-colored-faces

Every player photo in NHL '94 (Sega Genesis) in colour, as 48 x 48 PNGs: the cartridge's own picture,
pixel for pixel, with colour added. 144 faces, one file each (`CardNNN_Name.png`, the card number is the
order of the pictures in the ROM).

- `faces.csv` lists each file's player, team and where its colour came from.
- `contact-sheet.png` shows them all at 2x.

## Where the colour came from

The cartridge keeps its shape and most of its light; the colour comes from another picture of the same
photo, lined up with the cartridge's.

| Source | Faces |
|---|---|
| The same photo in NHL 95 PC (`PORTRnnn.QFS`) | 87 |
| The same photo in NHL 94 PC (`PORTRAIT.NSH`) | 32 |
| The same photo in NHL 95 SNES | 8 |
| The 1993-94 EA Sports NHL '94 cards (the backs carry the cartridge's head shots) | 3 (Barrasso, Baker, Kudelski) |
| 1992-93 Bowman cards | 3 (Hatcher, Damphousse mirrored; Messier) |
| Region colours from the 95 PC photo (the cartridge's is stretched) | 1 (Fetisov) |
| Hand coloured where no colour photo exists: skin, hair, and the team's 1993-94 away colours | 10 |

The hand coloured faces are Hawerchuk, McSorley, Shaw, Lindros, Curtis Joseph, Janney, Shanahan,
Potvin, Lumme and Wilkinson. Janney and Hawerchuk follow outlines painted by hand.

NHL94Genesis-C-Port can show these in the game ("Colour player photos" on the Game page). It builds them
at run time from the player's own NHL 95 PC / NHL 94 PC files.
