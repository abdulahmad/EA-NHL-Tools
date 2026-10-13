/**
 * Jersey names for the palette menu. The file stem is the nickname or the
 * three-letter city code, with a trailing h or v for home and away.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl92Labels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CITIES = {
    allstar: 'All-Star',
    ana: 'Anaheim',
    anaheim: 'Anaheim',
    ase: 'All-Star East',
    asw: 'All-Star West',
    blackhawks: 'Chicago',
    blues: 'St. Louis',
    bos: 'Boston',
    bruins: 'Boston',
    buf: 'Buffalo',
    campbell: 'Campbell',
    canadiens: 'Montreal',
    canucks: 'Vancouver',
    capitals: 'Washington',
    cgy: 'Calgary',
    chi: 'Chicago',
    det: 'Detroit',
    devils: 'New Jersey',
    edm: 'Edmonton',
    flames: 'Calgary',
    fla: 'Florida',
    flyers: 'Philadelphia',
    hfd: 'Hartford',
    islanders: 'Long Island',
    jets: 'Winnipeg',
    kings: 'Los Angeles',
    la: 'Los Angeles',
    li: 'Long Island',
    mapleleafs: 'Toronto',
    min: 'Minnesota',
    mtl: 'Montreal',
    nj: 'New Jersey',
    nordiques: 'Quebec',
    northstars: 'Minnesota',
    ny: 'New York',
    nyi: 'Long Island',
    nyr: 'New York',
    oilers: 'Edmonton',
    ott: 'Ottawa',
    otw: 'Ottawa',
    penguins: 'Pittsburgh',
    phi: 'Philadelphia',
    pit: 'Pittsburgh',
    que: 'Quebec',
    rangers: 'New York',
    redwings: 'Detroit',
    sabres: 'Buffalo',
    sharks: 'San Jose',
    sj: 'San Jose',
    stl: 'St. Louis',
    tb: 'Tampa Bay',
    tby: 'Tampa Bay',
    tor: 'Toronto',
    van: 'Vancouver',
    wales: 'Wales',
    whalers: 'Hartford',
    wpg: 'Winnipeg',
    wsh: 'Washington'
  };

  function paletteParts(file) {
    if (!file) return { city: '', side: '', label: '' };
    const stem = String(file).replace(/\.(pal|snespal)$/i, '');
    const side = /h$/i.test(stem) ? 'home' : /v$/i.test(stem) ? 'away' : '';
    const teamKey = stem.replace(/[hv]$/i, '').toLowerCase();
    const city = CITIES[teamKey] || teamKey;
    const label = side ? city + ' · ' + side : city;
    return { city, side, label };
  }

  function paletteLabel(file) {
    return paletteParts(file).label;
  }

  function defaultPaletteFile(files) {
    return (files || []).find((file) => paletteParts(file).label === 'Buffalo · home') || '';
  }

  function matchPaletteFile(files, previous) {
    const want = paletteLabel(previous);
    if (!want) return defaultPaletteFile(files);
    const found = (files || []).find((file) => paletteLabel(file) === want);
    return found || defaultPaletteFile(files);
  }

  return { CITIES, paletteParts, paletteLabel, defaultPaletteFile, matchPaletteFile };
});
