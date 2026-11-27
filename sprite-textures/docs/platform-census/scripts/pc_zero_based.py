"""Relabel the 95 PC frame numbers in the census outputs to the game's own 0-based numbering.

The pickles and build.py / report.py / intra.py work with PC frames 1-based (PC id = stored SPAtab value + 1), so
Genesis and PC numbers looked alike. Abdul's numbering is Genesis (and every console set) from 1 and PC from 0,
which is how the game and NHL9X Studio count. Run this once after build.py, report.py and intra.py; it rewrites:
  frames_matrix.csv / .json   PC rows' frame (and the "PC:n" json keys) and every PC_best / PC.best
  roadmap_*.csv               the PC columns
  intra.json                  dups / unused / spa_groups for PC
It refuses to run twice (frames_matrix.json already has a "PC:0" key).
With this numbering, 94G frame N is usually the same pose as PC frame N-1.
"""
import csv, io, json, sys

PC = lambda n: n - 1


def dec(v):
    """'193' -> '192'; '' / None stay."""
    if v in ('', None):
        return v
    return str(PC(int(v)))


mj = json.load(open('frames_matrix.json'))
if 'PC:0' in mj:
    sys.exit('already 0-based (frames_matrix.json has PC:0)')
out = {}
for k, r in mj.items():
    if r.get('PC') and r['PC'].get('best') is not None:
        r['PC']['best'] = PC(r['PC']['best'])
    if r['set'] == 'PC':
        r['frame'] = PC(r['frame'])
        k = 'PC:%d' % r['frame']
    out[k] = r
open('frames_matrix.json', 'w').write(json.dumps(out, separators=(',', ':'), default=str))


def rewrite_csv(path, fix):
    text = open(path, newline='').read()
    rows = list(csv.reader(io.StringIO(text)))
    head = rows[0]
    for r in rows[1:]:
        fix(head, r)
    buf = io.StringIO()
    csv.writer(buf, lineterminator='\r\n' if '\r\n' in text else '\n').writerows(rows)
    open(path, 'w', newline='').write(buf.getvalue())


def fix_matrix(h, r):
    if r[h.index('set')] == 'PC':
        r[h.index('frame')] = dec(r[h.index('frame')])
    i = h.index('PC_best')
    r[i] = dec(r[i])


def fix_missing(h, r):
    if r[h.index('closest_set')] == 'PC':
        r[h.index('closest_frame')] = dec(r[h.index('closest_frame')])
    i = h.index('all_copies')
    parts = r[i].split()
    r[i] = ' '.join(dec(p) if j % 2 and parts[j - 1] == 'PC' else p for j, p in enumerate(parts))


def fix_snes(h, r):
    i = h.index('closest PC')
    r[i] = dec(r[i])


def fix_9293(h, r):
    i = h.index('PC')
    if r[i] != 'self':
        b, rest = r[i].split(':', 1)
        r[i] = dec(b) + ':' + rest


rewrite_csv('frames_matrix.csv', fix_matrix)
rewrite_csv('roadmap_missing_from_pc.csv', fix_missing)
rewrite_csv('roadmap_snes_only.csv', fix_snes)
rewrite_csv('roadmap_92_93_exclusive.csv', fix_9293)

intra = json.load(open('intra.json'))
if 'PC' in intra.get('dups', {}):
    intra['dups']['PC'] = [[PC(a), PC(b), s] for a, b, s in intra['dups']['PC']]
if 'PC' in intra.get('unused', {}):
    intra['unused']['PC'] = [PC(n) for n in intra['unused']['PC']]
if 'PC' in intra.get('spa_groups', {}):
    sys.exit('intra.json spa_groups has PC entries; extend this script before running')
intra['pc_frame_base'] = 0
open('intra.json', 'w').write(json.dumps(intra, indent=1))
print('PC frame numbers are now 0-based')
