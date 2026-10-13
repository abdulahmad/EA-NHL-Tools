/**
 * Genesis games this viewer can name and, when a ROM is present, draw.
 *
 * NHL 92 pictures are the Alice .ANIM banks next to ANIM-To-BMP.
 * NHLPA 93, NHL 94 and NHL 95 keep the same SPF/SPA tables (frames.asm
 * in each disassembly) but the pictures live in the ROM: a header at
 * `sprites`, tiles at +0x0A, the frame-offset table at the long stored
 * at +4, and a signed hot-spot byte pair per frame.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl92Games = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const GAMES = [
    {
      id: 'nhl92',
      title: 'NHL 92',
      frames: 'frames.asm',
      source: 'NHL92Genesis',
      kind: 'anim',
      banks: [
        { id: 'Sprites.anim', label: 'Sprites' },
        { id: 'Puck.anim', label: 'Puck' },
        { id: 'Crowd.anim', label: 'Crowd' },
        { id: 'Zam.anim', label: 'Zamboni' }
      ],
      palettes: '92',
      romNames: [],
      romBytes: 0
    },
    {
      id: 'nhlpa93',
      title: 'NHLPA 93',
      frames: 'frames93.asm',
      source: 'NHLPA93Genesis',
      kind: 'sheet',
      banks: [{ id: 'sprites', label: 'Sprites' }],
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
      kind: 'sheet',
      banks: [{ id: 'sprites', label: 'Sprites' }],
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
      kind: 'sheet',
      banks: [{ id: 'sprites', label: 'Sprites' }],
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
    }
  ];

  function gameById(id) {
    return GAMES.find((game) => game.id === id) || null;
  }

  return { GAMES, gameById };
});
