#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { buildManifest } = require('../lib/manifest');

const out = path.join(__dirname, '..', 'public', 'games.json');
fs.writeFileSync(out, JSON.stringify(buildManifest(), null, 2) + '\n');
console.log('Wrote', out, '(' + buildManifest().length + ' games)');
