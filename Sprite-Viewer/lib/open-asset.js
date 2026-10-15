/**
 * Classify dropped files and route to decoders (browser + Node).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NhlOpenAsset = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const EXT = {
    rom: /\.(bin|md|gen|sfc|smc)$/i,
    iso: /\.(iso|img)$/i,
    anim: /\.anim$/i,
    jim: /\.(jim|map\.jim)$/i,
    frames: /\.(bin)$/i,
    ppv: /\.ppv$/i,
    qfs: /\.qfs$/i,
    qpp: /\.qpp$/i,
    pal: /\.(pal|act|bin)$/i
  };

  function classify(name, bytes) {
    const base = String(name || '').split(/[/\\]/).pop();
    const lower = base.toLowerCase();
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (EXT.iso.test(lower)) {
      return { kind: 'iso', label: base, message: 'PC ISO: extract the install folder or drop loose PPV/QFS files (ISO mount planned).' };
    }
    if (typeof NhlRomDetect !== 'undefined') {
      const rom = NhlRomDetect.detect(base, u8);
      if (rom) return { kind: 'rom', gameId: rom.id, bytes: rom.bytes, revADate: rom.revADate, label: base };
    }
    if (EXT.ppv.test(lower) || EXT.qfs.test(lower) || EXT.qpp.test(lower)) {
      return { kind: 'pc', ext: lower.split('.').pop(), label: base, bytes: u8 };
    }
    if (EXT.anim.test(lower)) return { kind: 'anim', label: base, bytes: u8 };
    if (EXT.jim.test(lower) || (u8.length >= 8 && u8[0] === 0x4a && u8[1] === 0x49)) {
      return { kind: 'jim', label: base, bytes: u8 };
    }
    if (u8.length >= 16) {
      const tag = String.fromCharCode(u8[0], u8[1]);
      if (tag === 'SS' || (u8.length >= 12 && u8[4] === 0)) {
        return { kind: 'frames', label: base, bytes: u8 };
      }
    }
    if (u8.length > 0x80000 && u8.length <= 0x200000) {
      return { kind: 'rom-candidate', label: base, bytes: u8 };
    }
    return { kind: 'unknown', label: base, bytes: u8 };
  }

  function decodeLoose(classified, deps) {
    const { anim, sheet, jim, pc95 } = deps;
    if (classified.kind === 'anim' && anim) {
      return { mode: 'frame', bankId: classified.label, parsed: anim.parseAnim(classified.bytes) };
    }
    if (classified.kind === 'frames' && sheet && jim) {
      const missing = classified.bytes.length >= 4
        && new DataView(classified.bytes.buffer, classified.bytes.byteOffset, classified.bytes.byteLength).getUint32(0) === 0xffffffff;
      return {
        mode: 'frame',
        bankId: classified.label,
        parsed: sheet.openFrames(classified.bytes, jim, null),
        needsIcePalette: missing
      };
    }
    if (classified.kind === 'jim' && jim) {
      return { mode: 'image', imageId: classified.label, parsed: jim.decodeJim(classified.bytes, null) };
    }
    if (classified.kind === 'pc' && pc95) {
      const parsed = pc95.openSpriteBundle(classified.bytes);
      if (!parsed || !parsed.numFrames) return null;
      return { mode: 'frame', bankId: classified.label, parsed, gameId: 'nhl95pc' };
    }
    return null;
  }

  return { classify, decodeLoose, EXT };
});
