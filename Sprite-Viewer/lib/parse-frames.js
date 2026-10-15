/**
 * Parse NHL92Genesis src/frames.asm into SPF ranges and SPA sequences.
 *
 * SPF symbols are 1-based frame numbers into Sprites.anim.
 * Each SPA entry is a directory of 8 facings plus a flags word, then
 * (frame, time) pairs. A negative time marks the last step; the hold
 * length is the absolute value, in vblanks. Flags bit 0 means the
 * animation loops (see updateanim in hockey.asm).
 *
 * The assembler is case-insensitive (SPFPen / SPFpen, SPFHold / SPFhold).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nhl92Frames = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // dirtab in logic.asm is clockwise from +Y. find3d negates world Y
  // before writing the sprite, so +Y is up the screen on a vertical rink.
  const DIRECTIONS = [
    { id: 0, name: 'North', short: 'N', arrow: '↑', axis: '+Y' },
    { id: 1, name: 'Northeast', short: 'NE', arrow: '↗', axis: '+X +Y' },
    { id: 2, name: 'East', short: 'E', arrow: '→', axis: '+X' },
    { id: 3, name: 'Southeast', short: 'SE', arrow: '↘', axis: '+X −Y' },
    { id: 4, name: 'South', short: 'S', arrow: '↓', axis: '−Y' },
    { id: 5, name: 'Southwest', short: 'SW', arrow: '↙', axis: '−X −Y' },
    { id: 6, name: 'West', short: 'W', arrow: '←', axis: '−X' },
    { id: 7, name: 'Northwest', short: 'NW', arrow: '↖', axis: '−X +Y' }
  ];

  const SPF_INFO = {
    SPFskatewp: { blurb: 'Skate with the puck, stick on the ice.', group: 'Players' },
    SPFskate: { blurb: 'Skate with the stick raised.', group: 'Players' },
    SPFturnl: { blurb: 'Turn left, one pose per facing.', group: 'Players' },
    SPFturnr: { blurb: 'Turn right, one pose per facing.', group: 'Players' },
    SPFswing: { blurb: 'Shot and pass swing.', group: 'Players' },
    SPFstop: { blurb: 'Scrape stop.', group: 'Players' },
    SPFskateb: { blurb: 'Skate backward.', group: 'Players' },
    SPFcelebrate: { blurb: 'Stick and arms raised.', group: 'Players' },
    SPFpump: { blurb: 'Arm pump after a goal.', group: 'Players' },
    SPFcup: { blurb: 'Skate with the Stanley Cup overhead.', group: 'Players' },
    SPFhipl: { blurb: 'Hip check to the left.', group: 'Players' },
    SPFhipr: { blurb: 'Hip check to the right.', group: 'Players' },
    SPFshoulderl: { blurb: 'Shoulder check to the left.', group: 'Players' },
    SPFshoulderr: { blurb: 'Shoulder check to the right.', group: 'Players' },
    SPFsweep: { blurb: 'Sweep (stick) check.', group: 'Players' },
    SPFfallback: { blurb: 'Fall backward.', group: 'Players' },
    SPFfallfwd: { blurb: 'Fall forward.', group: 'Players' },
    SPFduck: { blurb: 'Duck and get up.', group: 'Players' },
    SPFHold: { blurb: 'Hold an opponent.', group: 'Players' },
    SPFgloves: { blurb: 'Dropped gloves.', group: 'Players' },
    SPFfight: { blurb: 'Fight poses.', group: 'Players' },
    SPFPen: { blurb: 'Jump the boards into the penalty box.', group: 'Players' },
    SPFarrow: { blurb: 'Player-indicator arrows.', group: 'Ice' },
    SPFpad: { blurb: 'Star marker.', group: 'Ice' },
    SPFpuck: { blurb: 'Puck, including the tumbling frames.', group: 'Ice' },
    SPFgoal: { blurb: 'Goal nets, one for each end.', group: 'Ice' },
    SPFGoalie: { blurb: 'Goalie poses. Several animations share this run.', group: 'Goalies' },
    SPFLogos: { blurb: 'Team centre-ice logos.', group: 'Ice' },
    SPFSiren: { blurb: 'Goal light.', group: 'Ice' }
  };

  const SPA_GROUP = {
    SPAgready: 'Goalies', SPAgglover: 'Goalies', SPAgglovel: 'Goalies',
    SPAgstickr: 'Goalies', SPAgstickl: 'Goalies', SPAgstackr: 'Goalies',
    SPAgstackl: 'Goalies', SPAgswing: 'Goalies', SPAgskate: 'Goalies',
    SPApflip: 'Puck',
    SPAglide: 'Skating', SPAskatewp: 'Skating', SPAskate: 'Skating',
    SPAturnl: 'Skating', SPAturnr: 'Skating', SPAstop: 'Skating',
    SPAglideback: 'Skating', SPAskateback: 'Skating', SPAburst: 'Skating',
    SPAflail: 'Skating',
    SPApassf: 'Shooting', SPApassb: 'Shooting', SPAshotf: 'Shooting',
    SPAshotb: 'Shooting', SPAsweepchk: 'Shooting',
    SPAshoulderchkl: 'Checking', SPAshoulderchkr: 'Checking',
    SPAhipchkl: 'Checking', SPAhipchkr: 'Checking',
    SPAHold: 'Checking', SPAHold2: 'Checking',
    SPAfallfwd: 'Falls', SPAfallback: 'Falls',
    SPAcelebrate: 'Celebrate', SPApump: 'Celebrate', SPAstanley: 'Celebrate',
    SPAfight: 'Fight', SPAfgrab: 'Fight', SPAfheld: 'Fight',
    SPAfhigh: 'Fight', SPAflow: 'Fight', SPAfhith: 'Fight',
    SPAfhitl: 'Fight', SPAffall: 'Fight',
    SPAwallright: 'Special', SPAwallleft: 'Special',
    SPAfaceoff: 'Special', SPAfaceoffr: 'Special', SPAsiren: 'Special',
    SPAbenchcheckl: 'Falls', SPAbenchcheckr: 'Falls'
  };

  const SPA_BLURB = {
    SPAcelebrate: 'On-ice goal celebration (stick up). Not bench seating.',
    SPApump: 'Scorer arm pump after a goal.',
    SPAbenchcheckl: 'Checked into the boards near center ice (left). Not bench celebration — see NHL 95 PC for bench cheer.',
    SPAbenchcheckr: 'Checked into the boards near center ice (right). Not bench celebration.',
    SPAwallleft: 'Skate to the penalty-box door (left boards).',
    SPAwallright: 'Skate to the penalty-box door (right boards).'
  };

  function keyOf(name) {
    return String(name).toLowerCase();
  }

  const SPF_BY_KEY = new Map(Object.entries(SPF_INFO).map(([name, info]) => [name.toLowerCase(), info]));
  const SPA_BY_KEY = new Map(Object.entries(SPA_GROUP).map(([name, group]) => [name.toLowerCase(), group]));

  function spfInfo(name) {
    const known = SPF_BY_KEY.get(keyOf(name));
    if (known) return known;
    return { blurb: '', group: classifySpf(name) };
  }

  function spaGroup(name) {
    const known = SPA_BY_KEY.get(keyOf(name));
    if (known) return known;
    return classifySpa(name);
  }

  function classifySpa(name) {
    const n = keyOf(name);
    if (/gready|goalie|glove|gstick|gstack|gswing|gskate|gdive|gcatch|ghigh|gslam|gblock|gextra|ghold/.test(n)) return 'Goalies';
    if (/puck|pflip/.test(n)) return 'Puck';
    if (/skate|glide|turn|stop|burst|stumble|duck|flail/.test(n)) return 'Skating';
    if (/shot|pass|swing|hook|flip/.test(n)) return 'Shooting';
    if (/check|hip|shoulder|sweep|hold/.test(n)) return 'Checking';
    if (/fall/.test(n)) return 'Falls';
    if (/fight|grab|fhigh|flow|fhit|finjur/.test(n)) return 'Fight';
    if (/celeb|pump|cup|stanley/.test(n)) return 'Celebrate';
    if (/face|wall|siren|injur|glass|replay/.test(n)) return 'Special';
    return 'Other';
  }

  function classifySpf(name) {
    const n = keyOf(name);
    if (/gready|goalie|glove|gdive|gextra|ghigh|gslam|gblock|gcatch|ghold/.test(n)) return 'Goalies';
    if (/^spfgoal$/.test(n) || /arrow|pad|puck|logo|siren|replay|star|mouse|faceoff|net/.test(n)) return 'Ice';
    if (/later|font|crowd|zamboni/.test(n)) return 'Other';
    if (/^spfref|anthem|glass|cupaccept|cupskate|between/.test(n)) return 'Other';
    return 'Players';
  }

  function toInt16(n) {
    if (!Number.isInteger(n)) {
      throw new Error('expression did not resolve to an integer (' + n + ')');
    }
    return (n << 16) >> 16;
  }

  function tokenize(expr) {
    const s = expr.replace(/\s+/g, '');
    const tokens = [];
    let i = 0;
    const last = () => tokens[tokens.length - 1];
    const unary = () => tokens.length === 0 || last().type === 'op' || last().type === 'lp';
    while (i < s.length) {
      const c = s[i];
      if (c === '-' && unary()) {
        if (s[i + 1] === '$') {
          const m = /^\$[0-9A-Fa-f]+/.exec(s.slice(i + 1));
          if (!m) throw new Error('bad hex in ' + expr);
          tokens.push({ type: 'num', value: -parseInt(m[0].slice(1), 16) });
          i += 1 + m[0].length;
          continue;
        }
        if (/\d/.test(s[i + 1] || '')) {
          const m = /^\d+/.exec(s.slice(i + 1));
          tokens.push({ type: 'num', value: -parseInt(m[0], 10) });
          i += 1 + m[0].length;
          continue;
        }
        tokens.push({ type: 'op', value: 'u-' });
        i += 1;
        continue;
      }
      if (c === '$') {
        const m = /^\$[0-9A-Fa-f]+/.exec(s.slice(i));
        if (!m) throw new Error('bad hex in ' + expr);
        tokens.push({ type: 'num', value: parseInt(m[0].slice(1), 16) });
        i += m[0].length;
        continue;
      }
      if (/\d/.test(c)) {
        const m = /^\d+/.exec(s.slice(i));
        tokens.push({ type: 'num', value: parseInt(m[0], 10) });
        i += m[0].length;
        continue;
      }
      if (s.startsWith('<<', i) || s.startsWith('>>', i)) {
        tokens.push({ type: 'op', value: s.slice(i, i + 2) });
        i += 2;
        continue;
      }
      if ('+-*/'.includes(c)) {
        tokens.push({ type: 'op', value: c });
        i += 1;
        continue;
      }
      if (c === '(') { tokens.push({ type: 'lp', value: '(' }); i += 1; continue; }
      if (c === ')') { tokens.push({ type: 'rp', value: ')' }); i += 1; continue; }
      if (/[A-Za-z_.]/.test(c)) {
        const m = /^[A-Za-z_.][\w.]*/.exec(s.slice(i));
        tokens.push({ type: 'id', value: m[0] });
        i += m[0].length;
        continue;
      }
      throw new Error('unexpected "' + c + '" in ' + expr);
    }
    return tokens;
  }

  const PREC = { 'u-': 5, '*': 4, '/': 4, '+': 3, '-': 3, '<<': 2, '>>': 2 };
  const RIGHT = { 'u-': true };

  function evalExpr(expr, lookup) {
    const tokens = tokenize(expr);
    const output = [];
    const ops = [];
    function pushOp(op) {
      const p = PREC[op.value];
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type !== 'op') break;
        const pt = PREC[top.value];
        if (pt > p || (pt === p && !RIGHT[op.value])) output.push(ops.pop());
        else break;
      }
      ops.push(op);
    }
    for (const tok of tokens) {
      if (tok.type === 'num') output.push(tok);
      else if (tok.type === 'id') output.push(tok);
      else if (tok.type === 'op') pushOp(tok);
      else if (tok.type === 'lp') ops.push(tok);
      else if (tok.type === 'rp') {
        while (ops.length && ops[ops.length - 1].type !== 'lp') output.push(ops.pop());
        if (!ops.length) throw new Error('unbalanced ) in ' + expr);
        ops.pop();
      }
    }
    while (ops.length) {
      const op = ops.pop();
      if (op.type !== 'op') throw new Error('unbalanced ( in ' + expr);
      output.push(op);
    }
    const stack = [];
    for (const tok of output) {
      if (tok.type === 'num') { stack.push(tok.value); continue; }
      if (tok.type === 'id') {
        const v = lookup(tok.value);
        if (v == null) throw new Error('unknown symbol ' + tok.value + ' in ' + expr);
        stack.push(v);
        continue;
      }
      if (tok.value === 'u-') {
        stack.push(-stack.pop());
        continue;
      }
      const b = stack.pop();
      const a = stack.pop();
      switch (tok.value) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': stack.push((a / b) | 0); break;
        case '<<': stack.push(a << b); break;
        case '>>': stack.push(a >> b); break;
        default: throw new Error('bad op ' + tok.value);
      }
    }
    if (stack.length !== 1) throw new Error('bad expression ' + expr);
    return stack[0];
  }

  function splitCode(line) {
    const idx = line.indexOf(';');
    if (idx < 0) return { code: line.trim(), comment: '' };
    return { code: line.slice(0, idx).trim(), comment: line.slice(idx + 1).trim() };
  }

  function splitWords(list) {
    return list.split(',').map((s) => s.trim()).filter(Boolean);
  }

  function parseFrames(source) {
    const globals = new Map();
    const spfOrder = [];
    const anims = [];
    let pc = 0;
    let started = false;
    let anim = null;
    const lines = source.split(/\r?\n/);

    function lookupName(name, locals) {
      const k = keyOf(name);
      if (locals && locals.has(k)) return locals.get(k);
      if (globals.has(k)) return globals.get(k).value;
      return null;
    }

    function finishAnim(block) {
      const locals = new Map(block.labels);
      const lookup = (name) => lookupName(name, locals);
      const words = [];
      for (const event of block.events) {
        if (event.type === 'assign') {
          locals.set(keyOf(event.name), evalExpr(event.expr, lookup));
        } else if (event.type === 'words') {
          for (const expr of event.exprs) words.push(toInt16(evalExpr(expr, lookup)));
        }
      }
      const byteLength = words.length * 2;
      if (words.length < 9) {
        throw new Error(block.name + ' directory is shorter than 9 words');
      }
      const flags = words[8] & 0xffff;
      const directions = [];
      for (let d = 0; d < 8; d++) {
        const offset = words[d];
        if (offset < 0 || offset >= byteLength || (offset % 2) !== 0) {
          directions.push({
            id: d,
            offset,
            unused: true,
            steps: [],
            sharedWith: []
          });
          continue;
        }
        const steps = [];
        let i = offset / 2;
        while (i + 1 < words.length) {
          const frame = words[i];
          const rawTime = words[i + 1];
          steps.push({
            frame,
            rawTime,
            ticks: Math.abs(rawTime),
            last: rawTime < 0
          });
          i += 2;
          if (rawTime < 0) break;
        }
        directions.push({ id: d, offset, unused: steps.length === 0, steps, sharedWith: [] });
      }
      for (let d = 0; d < 8; d++) {
        if (directions[d].unused) continue;
        for (let e = 0; e < 8; e++) {
          if (e !== d && directions[e].offset === directions[d].offset) {
            directions[d].sharedWith.push(e);
          }
        }
      }
      const signature = (dir) => dir.unused ? 'unused' : JSON.stringify(dir.steps);
      const uniqueCount = new Set(directions.map(signature)).size;
      anims.push({
        name: block.name,
        comment: block.comment,
        blurb: SPA_BLURB[keyOf(block.name)] || block.comment || '',
        group: spaGroup(block.name),
        offset: block.offset,
        flags,
        loop: (flags & 1) !== 0,
        directions,
        uniqueDirections: uniqueCount
      });
    }

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const { code, comment } = splitCode(lines[lineNo]);
      if (!code) continue;
      const at = 'line ' + (lineNo + 1);

      try {
        if (/^SPAlist:?$/i.test(code)) {
          started = true;
          pc = 0;
          continue;
        }
        if (/^(incbin|include|align|cnop|even|end|section)\b/i.test(code)) continue;

        const assign = /^([A-Za-z_.][\w.]*)\s*=\s*(.+)$/.exec(code);
        if (assign) {
          const name = assign[1];
          const expr = assign[2].trim();
          if (/^\*\s*-\s*SPAlist$/i.test(expr)) {
            if (anim) finishAnim(anim);
            anim = {
              name,
              comment,
              offset: pc,
              events: [],
              labels: new Map()
            };
            continue;
          }
          if (!started) {
            const value = toInt16(evalExpr(expr, (n) => lookupName(n, null)));
            globals.set(keyOf(name), { name, value, comment });
            if (/^spf/i.test(name)) spfOrder.push(name);
            continue;
          }
          if (!anim) throw new Error('assignment outside an animation');
          anim.events.push({ type: 'assign', name, expr });
          continue;
        }

        const setM = /^([A-Za-z_.][\w.]*)\s+set\s+(.+)$/i.exec(code);
        if (setM) {
          if (!anim) throw new Error('set outside an animation');
          anim.events.push({ type: 'assign', name: setM[1], expr: setM[2].trim() });
          continue;
        }

        let label = null;
        let wordList = null;
        const labeled = /^([A-Za-z_.][\w.]*)(?::)?(?:\s+(dc\.w\s+.+))?$/i.exec(code);
        if (labeled && !/^dc\.w\b/i.test(code)) {
          label = labeled[1];
          if (labeled[2]) wordList = labeled[2].replace(/^dc\.w\s+/i, '');
        } else if (/^dc\.w\s+/i.test(code)) {
          wordList = code.replace(/^dc\.w\s+/i, '');
        } else {
          throw new Error('unrecognized statement: ' + code);
        }

        if (label) {
          if (!anim) {
            // SPAlist-adjacent global labels carry no data.
          } else {
            anim.labels.set(keyOf(label), pc);
          }
        }
        if (wordList != null) {
          const exprs = splitWords(wordList);
          if (!exprs.length) throw new Error('empty dc.w');
          if (anim) anim.events.push({ type: 'words', exprs });
          pc += exprs.length * 2;
        }
      } catch (err) {
        throw new Error(at + ': ' + err.message);
      }
    }
    if (anim) finishAnim(anim);

    // The next line is not always the next frame. NHL 94 lists SPFslambot
    // (712) and then SPFghighr (658), and closing on that source order runs
    // the slam-bot frames backward. A group ends at the frame before the
    // next higher base. SPFlimit is only that ceiling. The highest base
    // stays open, unless the following line is a lower number: then the
    // group is the contiguous run of frames the animations use.
    const spfs = spfOrder.map((name, index) => {
      const stored = globals.get(keyOf(name));
      const info = spfInfo(name);
      return {
        name,
        sourceIndex: index,
        start: stored.value,
        end: null,
        count: null,
        blurb: info.blurb || (stored && stored.comment) || '',
        group: info.group
      };
    });
    const limitAt = spfs.findIndex((spf) => keyOf(spf.name) === 'spflimit');
    const limit = limitAt >= 0 ? spfs[limitAt].start : null;
    if (limitAt >= 0) spfs.splice(limitAt, 1);
    const ceilings = spfs.map((spf) => spf.start);
    if (limit != null) ceilings.push(limit);
    ceilings.sort((a, b) => a - b);
    const usedFrames = new Set();
    for (const anim of anims) {
      for (const dir of anim.directions) {
        for (const step of dir.steps) usedFrames.add(step.frame);
      }
    }
    for (const spf of spfs) {
      const next = ceilings.find((value) => value > spf.start);
      if (next != null) {
        spf.end = next - 1;
      } else {
        const follower = spfOrder[spf.sourceIndex + 1];
        const followerStart = follower ? globals.get(keyOf(follower)).value : null;
        if (followerStart != null && followerStart < spf.start) {
          let end = spf.start;
          while (usedFrames.has(end + 1)) end += 1;
          spf.end = end;
        }
      }
      if (spf.end != null) spf.count = spf.end - spf.start + 1;
      delete spf.sourceIndex;
    }

    for (const spf of spfs) {
      if (spf.end == null) {
        spf.stride = null;
        spf.usedBy = [];
        continue;
      }
      const usedBy = [];
      let stride = null;
      if (spf.count % 8 === 0) {
        const candidate = spf.count / 8;
        const matched = anims.some((anim) => {
          const a = anim.directions[0];
          const b = anim.directions[1];
          if (!a || !b || a.unused || b.unused || !a.steps.length || !b.steps.length) return false;
          const f0 = a.steps[0].frame;
          const f1 = b.steps[0].frame;
          return f0 >= spf.start && f0 <= spf.end && f1 - f0 === candidate;
        });
        if (matched) stride = candidate;
      }
      for (const anim of anims) {
        const hits = anim.directions.some((dir) =>
          dir.steps.some((step) => step.frame >= spf.start && step.frame <= spf.end));
        if (hits) usedBy.push(anim.name);
      }
      spf.stride = stride;
      spf.usedBy = usedBy;
    }

    return { spfs, anims, directions: DIRECTIONS };
  }

  return { parseFrames, DIRECTIONS, SPF_INFO, SPA_GROUP };
});
