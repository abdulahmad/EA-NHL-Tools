#!/usr/bin/env node
// node test <NHL 94 PC game folder>: decodes every .PPV and checks that each
// plane, each shape and the bank size field line up exactly.
const fs = require('fs');
const path = require('path');
const Ppv94 = require('./ppv94');

const dir = process.argv[2];
if (!dir) { console.log('usage: node test <game folder>'); process.exit(1); }
let bad = 0, files = 0, shapes = 0;
for (const f of fs.readdirSync(dir).filter((n) => /\.ppv$/i.test(n)).sort()) {
  const buf = fs.readFileSync(path.join(dir, f));
  try {
    const bank = Ppv94.parseBank(buf);
    const es = bank.entries;
    es.forEach((e, i) => {
      const end = e.kind === 'palette' ? e.offset + 16 + 768 : e.packedEnd;
      const next = i + 1 < es.length ? es[i + 1].offset : null;
      if (next != null && end !== next) throw new Error(`${e.name} ends at 0x${end.toString(16)}, next entry at 0x${next.toString(16)}`);
      if (next == null && (buf.length - end >= 16 || buf.length % 16)) throw new Error(`file is ${buf.length} bytes, last entry ends at ${end}`);
      if (e.kind === 'shape') shapes++;
    });
    if (bank.expandedSize !== bank.unpackedSize) throw new Error(`size field ${bank.unpackedSize}, decoded ${bank.expandedSize}`);
    files++;
  } catch (e) { bad++; console.error(`FAIL ${f}: ${e.message}`); }
}
console.log(`${files} banks, ${shapes} shapes OK${bad ? `, ${bad} failed` : ''}`);
process.exit(bad ? 1 : 0);
