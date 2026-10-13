/**
 * Unpack the two SNES graphics compressors used by the EA NHL ports.
 *
 * NHLPA 93 streams are the control-byte format of DecompressGraphics ($86FA3E).
 * NHL 94 streams start with a format word and an unpacked size, and Decompress
 * ($80C373) picks LZ, Huffman, RLE or byte-pair codes. Both ports follow the
 * Python unpackers in those disassemblies.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl92SnesPak = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function lorom(addr) {
    return ((addr >> 16) & 0x7f) * 0x8000 + (addr & 0x7fff);
  }

  function unpack93(data, start) {
    const src = data instanceof Uint8Array ? data : new Uint8Array(data);
    let p = start || 0;
    const out = [];
    function nx() {
      if (p >= src.length) throw new Error('packed stream ended early');
      return src[p++];
    }
    for (;;) {
      const c = nx();
      if ((c & 0xe0) === 0x00) {
        const n = (c & 0x1f) + 1;
        for (let i = 0; i < n; i++) out.push(nx());
        continue;
      }
      if ((c & 0xf0) === 0x20) {
        const n = (c & 0x0f) + 1;
        for (let i = 0; i < n; i++) out.push(0);
        continue;
      }
      if ((c & 0xf0) === 0x30) {
        const v = nx();
        const n = (c & 0x0f) + 3;
        for (let i = 0; i < n; i++) out.push(v);
        continue;
      }
      let dist;
      let n;
      let up;
      if ((c & 0xc0) === 0x40) {
        dist = ((c >> 3) & 7) + 1;
        n = (c & 7) + 2;
        up = true;
      } else if ((c & 0xf0) === 0x80) {
        n = (c & 0x0f) + 3;
        dist = nx();
        up = true;
      } else if ((c & 0xf0) === 0x90) {
        const x = nx();
        dist = (x & 0x7f) + 1;
        n = (((c << 1) | (x >> 7)) & 0x1f) + 3;
        up = true;
      } else if ((c & 0xf0) === 0xa0) {
        const x = nx();
        dist = (x & 0x3f) + 1;
        n = (((c << 2) | (x >> 6)) & 0x3f) + 3;
        up = true;
      } else if ((c & 0xf0) === 0xb0) {
        const x = nx();
        dist = (x & 0x1f) + 1;
        n = (((c << 3) | (x >> 5)) & 0x7f) + 3;
        up = true;
      } else if ((c & 0xe0) === 0xc0) {
        dist = ((c >> 2) & 7) + 1;
        n = (c & 3) + 2;
        up = false;
      } else if ((c & 0xf0) === 0xe0) {
        n = (c & 0x0f) + 3;
        dist = nx();
        up = false;
        if (dist === 0) return new Uint8Array(out);
      } else {
        const x = nx();
        dist = (x & 0x7f) + 1;
        n = (((c << 1) | (x >> 7)) & 0x1f) + 3;
        up = false;
      }
      let srcAt = out.length - dist;
      for (let i = 0; i < n; i++) {
        if (srcAt < 0 || srcAt >= out.length) throw new Error('packed back-reference is out of range');
        out.push(out[srcAt]);
        srcAt += up ? 1 : -1;
      }
    }
  }

  const FORMATS = { 0xfb10: 'lz', 0xfb46: 'pairs', 0xfb30: 'huffman', 0xfb7a: 'rle' };

  function header94(src, p) {
    return {
      format: src[p] | (src[p + 1] << 8),
      size: (src[p + 2] << 16) | (src[p + 3] << 8) | src[p + 4]
    };
  }

  function unpackLz(src, p, size) {
    let i = p + 5;
    const out = [];
    while (out.length <= size) {
      const b0 = src[i];
      let n;
      let ln;
      let off;
      if (b0 < 0x80) {
        const b1 = src[i + 1];
        i += 2;
        n = b0 & 3;
        for (let k = 0; k < n; k++) out.push(src[i++]);
        ln = ((b0 & 0x1c) >> 2) + 3;
        off = ((b0 & 0x60) << 3) + b1 + 1;
      } else if (b0 < 0xc0) {
        const b1 = src[i + 1];
        const b2 = src[i + 2];
        i += 3;
        n = b1 >> 6;
        for (let k = 0; k < n; k++) out.push(src[i++]);
        ln = (b0 & 0x3f) + 4;
        off = ((b1 & 0x3f) << 8) + b2 + 1;
      } else if (b0 < 0xe0) {
        const b1 = src[i + 1];
        const b2 = src[i + 2];
        const b3 = src[i + 3];
        i += 4;
        n = b0 & 3;
        for (let k = 0; k < n; k++) out.push(src[i++]);
        ln = ((b0 & 0x0c) << 6) + b3 + 5;
        off = ((b0 & 0x10) << 12) + (b1 << 8) + b2 + 1;
      } else if (b0 < 0xfc) {
        n = ((b0 & 0x1f) + 1) * 4;
        i += 1;
        for (let k = 0; k < n; k++) out.push(src[i++]);
        continue;
      } else {
        n = b0 & 3;
        i += 1;
        for (let k = 0; k < n; k++) out.push(src[i++]);
        return new Uint8Array(out);
      }
      if (off > out.length || out.length + ln > size) throw new Error('not LZ data');
      for (let k = 0; k < ln; k++) out.push(out[out.length - off]);
    }
    throw new Error('not LZ data');
  }

  function unpackPairs(src, p, size) {
    const esc = src[p + 5];
    const npairs = src[p + 6];
    const kind = new Int16Array(256);
    const first = new Uint8Array(256);
    const second = new Uint8Array(256);
    kind[esc] = 1;
    let i = p + 7;
    for (let n = 0; n < npairs; n++) {
      const c = src[i];
      first[c] = src[i + 1];
      second[c] = src[i + 2];
      kind[c] -= 1;
      i += 3;
    }
    const out = [];
    function expand(c, depth) {
      if (depth > 256 || out.length > size) throw new Error('pair codes loop');
      for (const x of [first[c], second[c]]) {
        if (kind[x]) expand(x, depth + 1);
        else out.push(x);
      }
    }
    while (out.length <= size) {
      const c = src[i++];
      if (kind[c] === 0) out.push(c);
      else if (kind[c] > 0) {
        const lit = src[i++];
        if (lit === 0) return new Uint8Array(out);
        out.push(lit);
      } else expand(c, 0);
    }
    throw new Error('not pair data');
  }

  function unpackRle(src, p, size) {
    const unit = src[p + 5] === 1 && src[p + 6] === 1 ? 1 : 2;
    let i = p + 7;
    const out = [];
    while (out.length <= size) {
      const c = src[i++];
      if (c === 0) return new Uint8Array(out);
      if (c & 0x80) {
        const n = (c ^ 0xff) + 1;
        for (let k = 0; k < n * unit; k++) out.push(src[i++]);
      } else {
        const item = src.subarray(i, i + unit);
        i += unit;
        for (let r = 0; r < c + 1; r++) for (let k = 0; k < unit; k++) out.push(item[k]);
      }
    }
    throw new Error('not RLE data');
  }

  function Bits(src, i) {
    this.src = src;
    this.i = i;
    this.acc = 0;
    this.n = 0;
  }
  Bits.prototype.peek = function (k) {
    while (this.n < k) {
      if (this.i >= this.src.length) throw new Error('Huffman data runs past the end');
      this.acc = (this.acc << 8) | this.src[this.i];
      this.i += 1;
      this.n += 8;
    }
    return (this.acc >>> (this.n - k)) & ((1 << k) - 1);
  };
  Bits.prototype.get = function (k) {
    const v = this.peek(k);
    this.n -= k;
    this.acc &= (1 << this.n) - 1;
    return v;
  };
  Bits.prototype.num = function () {
    let z = 0;
    if (!this.get(1)) {
      z = 1;
      while (!this.get(1)) {
        z += 1;
        if (z > 16) throw new Error('not Huffman data');
      }
    }
    return this.get(z + 2) + (1 << (z + 2)) - 4;
  };

  function unpackHuffman(src, p, size) {
    const clue = src[p + 5];
    const bits = new Bits(src, p + 6);
    const counts = [];
    let code = 0;
    let total = 0;
    for (;;) {
      code <<= 1;
      const c = bits.num();
      counts.push(c);
      total += c;
      code += c;
      if ((c && (code << (16 - counts.length)) >= 0x10000) || counts.length > 16) break;
    }
    const used = new Array(256).fill(false);
    const symbols = [];
    let x = -1;
    for (let n = 0; n < total; n++) {
      let k = (bits.num() + 1) & 0xff;
      if (k === 0) k = 256;
      while (k) {
        x = (x + 1) & 0xff;
        if (!used[x]) k -= 1;
      }
      used[x] = true;
      symbols.push(x);
    }
    const table = new Map();
    code = 0;
    let s = 0;
    for (let ln = 1; ln <= counts.length; ln++) {
      for (let n = 0; n < counts[ln - 1]; n++) {
        table.set(ln + ':' + code, symbols[s]);
        code += 1;
        s += 1;
      }
      code <<= 1;
    }
    const out = [];
    let last = 0;
    while (out.length <= size) {
      let ln = 0;
      let v = 0;
      while (!table.has(ln + ':' + v)) {
        v = (v << 1) | bits.get(1);
        ln += 1;
        if (ln > counts.length) throw new Error('Huffman code not in the table');
      }
      const sym = table.get(ln + ':' + v);
      if (sym !== clue) {
        out.push(sym);
        last = sym;
        continue;
      }
      const n = bits.num();
      if (n) {
        for (let k = 0; k < n; k++) out.push(last);
      } else if (bits.get(1)) {
        return new Uint8Array(out);
      } else {
        last = bits.get(8);
        out.push(last);
      }
    }
    throw new Error('Huffman output runs past the size');
  }

  const UNPACK94 = {
    0xfb10: unpackLz,
    0xfb46: unpackPairs,
    0xfb30: unpackHuffman,
    0xfb7a: unpackRle
  };

  function unpack94(data, start) {
    const src = data instanceof Uint8Array ? data : new Uint8Array(data);
    const p = start || 0;
    const head = header94(src, p);
    const fn = UNPACK94[head.format];
    if (!fn) throw new Error('unknown packed format $' + head.format.toString(16));
    const out = fn(src, p, head.size);
    if (out.length !== head.size) {
      throw new Error(FORMATS[head.format] + ' unpacked ' + out.length + ' bytes, header says ' + head.size);
    }
    return out;
  }

  return { lorom, unpack93, unpack94 };
});
