/**
 * How long one animation step stays on screen.
 *
 * updateanim in hockey.asm counts vblanks down from the absolute value
 * of the time word. The vblank that drives the counter negative still
 * draws the old picture, so a step of N is visible for N + 1 vblanks.
 * glitch is set to 4 on every real picture change and blocks the next
 * change until it expires, so nothing is shown for fewer than 4 vblanks.
 * A time of 1000 or more (the -$1000 holds) never advances.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl92Playback = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const VBLANK_MS = 1000 / 60;

  function holdVblanks(ticks, minGap) {
    if (ticks == null || ticks >= 1000) return null;
    const visible = Math.max(0, ticks) + 1;
    if (minGap) return Math.max(4, visible);
    return Math.max(1, visible);
  }

  return { VBLANK_MS, holdVblanks };
});
