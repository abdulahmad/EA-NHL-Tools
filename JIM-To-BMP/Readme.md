# JIM-To-BMP



## NHL92 .map.jim file details (Big Endian)
| Byte (All values in hexadecimal)              | Value         | Description |
| --------                                      | -------       | -------     |
| `0x00..0x03`                                  | `<uint32>`    | Palette Section Offset |
| `0x04..0x07`                                  | `<uint32>`    | Map Section Offset |
| `0x08..0x09`                                  | `<uint16>`    | Number of Tiles/Stamps |
| `0x0A..0x0A+numTiles*32`                      | `Tile Data`   | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| `0x(TileDataEnd+1)..0x(TileDataEnd+1)+80`     | `Palette Data`| 128 bytes of Palette Data. 4 palettes of 16 colors (9bpp Sega Genesis Format). |
| `0x(PaletteDataEnd+1)..(PaletteDataEnd+4)`  | `<uint16>`    | Map Width |
| `0x(PaletteDataEnd+5)..(PaletteDataEnd+8)`| `<uint16>`    | Map Height |
| `0x(PaletteDataEnd+8)..(PaletteDataEnd+8)+(mapWidth*mapHeight*2)`| `Map Data Section`    | Map Data |

## Map Data Section
| Byte (All values in hexadecimal)              | Value         | Description |
| --------                                      | -------       | -------     |
| `0x00..0x01`  | `<uint16>:Bits 0-10` | Tile Index |
| `0x00..0x01`  | `<uint16>:Bit 11`    | Horizontal flip |
| `0x00..0x01`  | `<uint16>:Bit 12`    | Vertical flip |
| `0x00..0x01`  | `<uint16>:Bit 13-14` | Palette Index (0–3, selects one of 4 CRAM palettes). |
| `0x00..0x01`  | `<uint16>:Bit 15` | Priority (0=low, 1=high) | 

