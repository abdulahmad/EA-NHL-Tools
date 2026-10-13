/**
 * Games this viewer can name and, when a ROM is present, draw.
 *
 * NHL 92 pictures are Alice .ANIM banks. They also sit at fixed offsets in
 * the retail ROM. NHLPA 93, NHL 94 and NHL 95 Genesis keep the SPF/SPA tables
 * but the player pictures are a sprite sheet in the ROM. The two SNES ports
 * use planar 4bpp tiles; their animation names come from the disassemblies.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl92Games = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const NHL92_IMAGES = [
    { id: 'Sprites.anim', label: 'Sprites', group: 'Sprites', kind: 'anim', file: true, start: 0x3D5EE, end: 0x7216C },
    { id: 'Puck.anim', label: 'Puck', group: 'Sprites', kind: 'anim', file: true, start: 0x2E9EC, end: 0x2F262 },
    { id: 'Crowd.anim', label: 'Crowd', group: 'Sprites', kind: 'anim', file: true, start: 0x7216C, end: 0x75790 },
    { id: 'FaceOff.anim', label: 'Faceoff', group: 'Sprites', kind: 'anim', start: 0x75790, end: 0x7716C },
    { id: 'Zam.anim', label: 'Zamboni', group: 'Sprites', kind: 'anim', file: true, start: 0x7716C, end: 0x778D2 },
    { id: 'GameSetUp.map.jim', label: 'Game setup', group: 'Screens', kind: 'jim', start: 0x24214, end: 0x25642 },
    { id: 'Title1.map.jim', label: 'Title', group: 'Screens', kind: 'jim', start: 0x25642, end: 0x2ADF0 },
    { id: 'Title2.map.jim', label: 'Title page 2', group: 'Screens', kind: 'jim', start: 0x2ADF0, end: 0x2C0FE },
    { id: 'NHLSpin.map.jim', label: 'NHL spin', group: 'Screens', kind: 'jim', start: 0x2C0FE, end: 0x2E9EC },
    { id: 'Scouting.map.jim', label: 'Scouting', group: 'Screens', kind: 'jim', start: 0x2F262, end: 0x33590 },
    { id: 'Framer.map.jim', label: 'Frame', group: 'Screens', kind: 'jim', start: 0x33590, end: 0x336B0 },
    { id: 'FaceOff.map.jim', label: 'Faceoff window', group: 'Screens', kind: 'jim', start: 0x336B0, end: 0x33AAE },
    { id: 'IceRink.map.jim', label: 'Ice rink', group: 'Ice', kind: 'jim', start: 0x33AAE, end: 0x3A3DC },
    { id: 'Refs.map.jim', label: 'Referees', group: 'Ice', kind: 'jim', start: 0x3A3DC, end: 0x3D5EE },
    { id: 'BigFont.map.jim', label: 'Big font', group: 'Fonts', kind: 'jim', start: 0x778D2, end: 0x78C20 },
    { id: 'SmallFont.map.jim', label: 'Small font', group: 'Fonts', kind: 'jim', start: 0x78C20, end: 0x79C2E },
    { id: 'TeamBlocks.map.jim', label: 'Team blocks', group: 'Screens', kind: 'jim', start: 0x79C2E, end: 0x7E79C },
    { id: 'Arrows.map.jim', label: 'Arrows', group: 'Screens', kind: 'jim', start: 0x7E79C, end: 0x7EB12 },
    { id: 'Stanley.map.jim', label: 'Stanley Cup', group: 'Screens', kind: 'jim', start: 0x7EB12, end: 0x7FC20 },
    { id: 'EASN.map.jim', label: 'EASN', group: 'Screens', kind: 'jim', start: 0x7FC20, end: 0x7FE8A }
  ];

  function snes93(frames, pieces, tiles, pieceSize, piecesAt) {
    return { frames, pieceCount: pieces, tiles, pieceSize, pieces: piecesAt };
  }

  const GAMES = [
    {
      id: 'nhl92',
      title: 'NHL 92',
      frames: 'frames.asm',
      source: 'NHL92Genesis',
      platform: 'genesis',
      kind: 'anim',
      paletteKind: 'genesis',
      banks: [
        { id: 'Sprites.anim', label: 'Sprites', file: true, start: 0x3D5EE, end: 0x7216C },
        { id: 'Puck.anim', label: 'Puck', file: true, start: 0x2E9EC, end: 0x2F262 },
        { id: 'Crowd.anim', label: 'Crowd', file: true, start: 0x7216C, end: 0x75790 },
        { id: 'Zam.anim', label: 'Zamboni', file: true, start: 0x7716C, end: 0x778D2 }
      ],
      images: NHL92_IMAGES,
      palettes: '92',
      romNames: ['nhl92.bin', 'nhl92.md', 'nhl92.gen'],
      romBytes: 0x80000
    },
    {
      id: 'nhlpa93',
      title: 'NHLPA 93',
      frames: 'frames93.asm',
      source: 'NHLPA93Genesis',
      platform: 'genesis',
      kind: 'sheet',
      paletteKind: 'genesis',
      banks: [{ id: 'sprites', label: 'Sprites' }],
      images: [],
      palettes: '94',
      romNames: ['nhlpa93.bin', 'nhlpa93.md', 'nhlpa93.gen'],
      romBytes: 0x80000,
      sheet: {
        record: '94',
        boundsAt: 2,
        sprites: 0x3A378,
        hotlist: 0x743CE,
        palette: 0x35E22
      }
    },
    {
      id: 'nhl94',
      title: 'NHL 94',
      frames: 'frames94.asm',
      source: 'NHL94Genesis',
      platform: 'genesis',
      kind: 'sheet',
      paletteKind: 'genesis',
      banks: [{ id: 'sprites', label: 'Sprites' }],
      images: [],
      palettes: '94',
      romNames: ['nhl94.bin', 'nhl94.md', 'nhl94.gen'],
      romBytes: 0x100000,
      sheet: {
        record: '94',
        boundsAt: 2,
        sprites: 0x5DE7A,
        hotlist: 0xA44C8,
        palette: 0x59924
      }
    },
    {
      id: 'nhl95',
      title: 'NHL 95',
      frames: 'frames95.asm',
      source: 'NHL95Genesis',
      platform: 'genesis',
      kind: 'sheet',
      paletteKind: 'genesis',
      banks: [{ id: 'sprites', label: 'Sprites' }],
      images: [],
      palettes: '95',
      romNames: ['nhl95.bin', 'nhl95.md', 'nhl95.gen'],
      romBytes: 0x200000,
      sheet: {
        record: '95',
        boundsAt: 0,
        sprites: 0xCA56A,
        hotlist: 0x137B66,
        palette: 0x14BEFA
      }
    },
    {
      id: 'nhlpa93snes',
      title: 'NHLPA 93 (SNES)',
      frames: 'frames93snes.asm',
      source: 'NHLPA93SNES',
      platform: 'snes',
      kind: 'snes93',
      paletteKind: 'snes',
      banks: [{ id: 'sprites', label: 'Sprites' }],
      palettes: 'snes',
      romNames: ['nhlpa93snes.sfc', 'nhlpa93snes.smc', 'nhlpa93snes.bin'],
      romBytes: 0x80000,
      snes: {
        format: '93',
        hotlist: 0x26F3C,
        hotBytes: 0x44A,
        hotSkip: 6,
        hotCut: 377,
        sets: [
          snes93(96, 445, 896, 4, 0x60526),
          snes93(48, 258, 512, 4, 0x790F1),
          snes93(40, 209, 512, 4, 0x3805C),
          snes93(40, 344, 640, 4, 0x70447),
          snes93(48, 334, 640, 4, 0x2806C),
          snes93(64, 533, 896, 4, 0x5847A),
          snes93(16, 110, 256, 4, 0x3D231),
          snes93(31, 191, 384, 4, 0x43CA0),
          snes93(22, 75, 128, 4, 0x40A47),
          snes93(56, 365, 640, 4, 0x2007C),
          snes93(56, 388, 768, 4, 0x688B8),
          snes93(14, 50, 128, 4, 0x48028),
          snes93(74, 504, 896, 4, 0x500A0),
          snes93(53, 345, 640, 4, 0x493F9),
          snes93(62, 742, 151, 6, 0x75A2F)
        ]
      },
      images: [
        { id: 'title', label: 'Title', group: 'Screens', kind: 'snes93-screen', start: 0x2D5C0, end: 0x2D5C0 + 9721, mapW: 32, mapH: 28, mapSize: 0x700, pal: 0x700, tiles: 0x800 },
        { id: 'setup', label: 'Game setup', group: 'Screens', kind: 'snes93-screen', start: 0x40000, end: 0x40000 + 559, mapW: 32, mapH: 32, mapSize: 0x800, pal: 0x800, tiles: 0x900 },
        { id: 'easn', label: 'EASN', group: 'Screens', kind: 'snes93-screen', start: 0x3C3A0, end: 0x3C3A0 + 788, mapW: 32, mapH: 16, mapSize: 0x400, tiles: 0x400, noPal: true },
        { id: 'ronbarr', label: 'Ron Barr', group: 'Screens', kind: 'snes93-screen', start: 0x6D38, end: 0x6D38 + 1590, mapW: 8, mapH: 9, mapSize: 0x90, pal: 0x90, tiles: 0x190 },
        { id: 'nhlpa', label: 'NHLPA logo', group: 'Screens', kind: 'snes93-screen', start: 0x60000, end: 0x60000 + 1114, mapW: 8, mapH: 10, mapSize: 0xA0, pal: 0xA0, tiles: 0x1A0 },
        { id: 'rink', label: 'Ice rink', group: 'Ice', kind: 'snes93-map', mapStart: 0x1CCCB, mapSize: 8160, mapW: 48, mapH: 85, tilesStart: 0x14DA0, tilesEnd: 0x14DA0 + 11164 },
        { id: 'bigfont', label: 'Big font', group: 'Fonts', kind: 'snes93-font', start: 0x6EEC8, end: 0x6EEC8 + 2496, columns: 16 },
        { id: 'smallfont', label: 'Small font', group: 'Fonts', kind: 'snes93-font', start: 0x1C6D8, end: 0x1C6D8 + 1332, columns: 16 }
      ]
    },
    {
      id: 'nhl94snes',
      title: 'NHL 94 (SNES)',
      frames: 'frames94snes.asm',
      source: 'NHL94SNES',
      platform: 'snes',
      kind: 'snes94',
      paletteKind: 'snes',
      jerseyRow: 4,
      banks: [{ id: 'sprites', label: 'Sprites' }],
      palettes: 'snes',
      romNames: ['nhl94snes.sfc', 'nhl94snes.smc', 'nhl94snes.bin'],
      romBytes: 0x100000,
      snes: {
        format: '94',
        base: 0x828000,
        rinkTiles: 0x818000,
        rinkMap: 0x92E053
      },
      images: [
        { id: 'rink', label: 'Ice rink', group: 'Ice', kind: 'snes94-rink' }
      ]
    }
  ];

  function gameById(id) {
    return GAMES.find((game) => game.id === id) || null;
  }

  return { GAMES, gameById };
});
