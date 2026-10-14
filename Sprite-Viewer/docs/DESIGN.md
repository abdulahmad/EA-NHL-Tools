# NHL Studio – Design (working name)

The Sprite Viewer is to grow into an all-purpose editor for the EA NHL games: 92, 93, 94, 95 and 96 on Genesis, 93 and 94 on SNES, and 94 and 95 on PC.

Name options:

- NHL Studio (preferred)
- Rink Rat
- EA Hockey Workshop

## 1. Project & ROM handling

- Open a disassembly repo or a ROM, and detect which game and version it is.
- Load the extracted assets.
- Save edits back as extracted assets, so the source builds them. Option to patch a ROM directly.
- Build and run through the repo's own build, which sizes the ROM and fixes the checksum. Then launch an emulator, or DOSBox for the PC games.

## 2. Graphics

- Sprite frames, SPA animations with their timing, hotspots and origins, and palettes.
- Logos, banners, team blocks and ice logos, edited as one image per team and repacked into the shared images.
- Jerseys and uniforms: colour zones, home and away palettes, and a preview on the player sprites.
- Screens, tiles, tilemaps and fonts.
- PNG import and export, with colour reduction to each platform's limits.

## 3. Audio

- Sample browser: play samples, show waveforms, and import and export WAV (Genesis PCM, SNES BRR, PC digital audio).
- Sound effects, with their triggers and IDs.
- Music:
  - FM patch editor and player (YM2612 on Genesis, OPL for AdLib).
  - SNES SPC.
  - PC MIDI playback through AdLib, Gravis Ultrasound and MT-32 (through an emulator such as Munt).
  - A tracker-style song view, and MIDI export.

## 4. Teams & data

- Add, remove and reorder teams, driven by `NumTeams` and the mod-safe build.
- Team editor: names, abbreviations, city, ratings, colours, songs and arena.
- Roster editor: players, numbers, positions, attributes, lines, cards and photos.
- Schedules, divisions, conferences, playoff seeding, and season mode settings such as injuries.
- On-screen strings, menus and credits, with translation support.

## 5. Checking & sharing

- Validation pass: every per-team table complete, ROM size and SRAM limits, colour and tile budgets.
- Diffs against stock, and a check that an untouched project still matches stock byte for byte.
- Export a mod as an IPS or BPS patch or as a source diff.
- Shareable league and roster packs.

## 6. Platforms

- One editor, with a game profile for each game and platform.
- Adding a game means adding a profile file, not new code.

## 7. Suggested phases

1. Turn the Sprite Viewer into a multi-game shell.
2. Team and roster editor.
3. Logos and jerseys.
4. Audio playback.
5. Audio editing and PC MIDI.
6. Schedules and seasons.
