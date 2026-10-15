/** NHLPA 93 Rev A ROM offset bump (1992.OCT header). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NhlRevA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function adjustGameStatus(status, date) {
    if (!status || status.id !== 'nhlpa93' || date !== '1992.OCT') return status;
    const delta = 0x2e;
    const floor = 0x16e53;
    const bump = (value) => (typeof value === 'number' && value >= floor ? value + delta : value);
    const images = (status.images || []).map((image) => {
      const next = Object.assign({}, image, {
        start: bump(image.start),
        end: bump(image.end)
      });
      if (image.paletteAt != null) next.paletteAt = bump(image.paletteAt);
      return next;
    });
    const sheet = status.sheet
      ? Object.assign({}, status.sheet, {
        sprites: bump(status.sheet.sprites),
        hotlist: bump(status.sheet.hotlist),
        palette: bump(status.sheet.palette)
      })
      : null;
    const banks = (status.banks || []).map((bank) => {
      if (bank.start == null) return bank;
      return Object.assign({}, bank, { start: bump(bank.start), end: bump(bank.end) });
    });
    return Object.assign({}, status, { images, sheet, banks });
  }

  return { adjustGameStatus };
});
