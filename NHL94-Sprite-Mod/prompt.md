Here is the mapping for the palettes for NHL95 PC:

Colors 0-127: Rink Palette (aka Game Palette)
- Static rink/ice colors from rinkpal.act

Colors 128-143: Skin Tones (16 colors)
- Dedicated flesh/skin tone colors

Colors 144-191: Jersey Components (48 colors)
- Mapped as follows:
144-146: forearm (dark, medium, light)
147-149: armStripe3 (light, medium, dark)
150-152: armStripe2 (dark, medium, light)
153-155: armStripe1 (light, medium, dark)
156-158: armUpper (light, medium, dark)
159-163: yolk components (yolkCorner, shoulderPatch, yolk3, yolk1, yolk2)
164-166: jersey (goalieMask, light, medium, dark)
167-169: waist1 (odd, even, hidden)
170-172: waist2 (light, medium, dark)
173-175: waist3 (light, medium, dark)
176-179: pants (dark, pantsStripe2, pantsStripe1, medium)
180-182: socks (light, medium, dark)
183-185: socksStripe1 (light, medium, dark)
186-188: socksStripe2 (light, medium, dark)
189-191: helmet (medium, dark, unused)

Colors 192-255: Crest and Logo Data (64 colors)
- Organized in 4 rows of 16 colors each:

Each 16-color row contains:
5 colors: Crest row pixels (5×4 crest grid)
6 colors: Ice logo colors
5 colors: Unused/padding

Row breakdown:
192-207: Crest row 1 + ice logo + padding
208-223: Crest row 2 + ice logo + padding
224-239: Crest row 3 + ice logo + padding
240-255: Crest row 4 + ice logo + padding

This file (jerseyDef.js) has the definition of a jersey for Chicago Blackhawks in a data format I created. It maps to the NHL 95 jersey definition. For v1 the colors will be flat, so light/medium/dark will all be the same shade. The way the jersey definition works is it mentions a color, and the color is either in the local palette for the jersey (object "0"), or in the global palette (global.palette).

Can you write a script which takes the palette defined in jerseyDef, and applies it to NHL95universaltemplate.act, and saves it as a new act file?