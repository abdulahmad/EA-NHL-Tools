# QFS-To-BMP v0.1
Converts NHL95 PC QFS files to `.raw` and `.bmp` as well as stores additional meta data in `.json` files, and tries to convert all images with the correct palette

### Usage
1. Ensure you have `node` installed on your machine

2. Create a folder inside of the `QFS-To-BMP` folder called `NHL95QFS`. 

3. Copy `.QFS` files from the NHL95 CD to the `NHL95QFS` folder. Note that the CD will have a more complete set of QFS files than the installed folder, and will be required for the sprites to be extracted correctly as there may be dependencies on palettes that only exist on the CD.

4. In the `QFS-To-BMP` folder, run `node qfsToSpit`. This will leverage `gfxpak` to unpack the SPIT data from the QFS files

5. In the `QFS-To-BMP` folder, run `node batchUnpackedSpitToBMP`. This will use `SPIT-To-BMP` to convert the SPIT files to BMP and use a defined palette mapping to give the correct palette to all images.

### More Info & Issues

One thing you may ask is how is this different than just using `gfxpak` to extract all images to BMP?

1. `gfxpak` tries to take the palette that exists within the current `.QFS` file. But there are cases where the correct palette actually exists in a different palette file.

2. Using `gfxpak` to export the raw data actually forced me to improve the `SPIT-To-BMP` tool as the images are stored in an uncompressed format in `.QFS` files whereas they are in a RLE style compression scheme in `.PPV` files. I don't know if I'll ever get around to attempting it, but maybe one day I'll even try to create a custom implementation of unpacking data from `.QFS`/`.VIV`/`.PPV`/`.QPP` files as well. I think the more open source tools, the better. The fact that all of these tools are open source means that its easy for others to come along and improve on them.