# JIM-To-BMP



## NHL92 .map.jim file details (Big Endian)
| Byte (All values in hexadecimal)              | Value         | Description |
| --------                                      | -------       | -------     |
| `0x00..0x03`                                  | `<uint32>`    | Palette Section Offset |
| `0x04..0x07`                                  | `<uint32>`    | Map Section Offset |
| `0x08..0x09`                                  | `<uint16>`    | Number of Tiles/Stamps |
| `0x0A..0x0A+numTiles*32`                      | `Tile Data`   | Raw 8x8 tile data, 4 bits per pixel, 32 bytes per tile. |
| `0xPaletteSectionOffset..0xPaletteSectionOffset+80`| `Palette Data`| 128 bytes of Palette Data. 4 palettes of 16 colors. Each color is 2 bytes in Genesis format (0000BBB0GGG0RRR0, where BBB=Blue bits, GGG=Green bits, RRR=Red bits). |
| `0xMapSectionOffset..0xMapSectionOffset+1`  | `<uint16>`    | Map Width |
| `0xMapSectionOffset+2..0xMapSectionOffset+3`| `<uint16>`    | Map Height |
| `0xMapSectionOffset+4..0x(MapSectionOffset+4)+(mapWidth*mapHeight*2)`| `Map Data Section`    | Map Data |

## Map Data Section
| Byte (All values in hexadecimal)              | Value         | Description |
| --------                                      | -------       | -------     |
| `0x00..0x01`  | `<uint16>:Bits 0-10` | Tile Index |
| `0x00..0x01`  | `<uint16>:Bit 11`    | Horizontal flip |
| `0x00..0x01`  | `<uint16>:Bit 12`    | Vertical flip |
| `0x00..0x01`  | `<uint16>:Bit 13-14` | Palette Index (0–3, selects one of 4 CRAM palettes). |
| `0x00..0x01`  | `<uint16>:Bit 15` | Priority (0=low, 1=high) | 

