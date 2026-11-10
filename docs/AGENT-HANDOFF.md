# NHL9X Studio — agent handoff (EA-NHL-Tools)

**Last updated:** 2026-10-15  
**Canonical app path:** `Sprite-Viewer/` (product name **NHL9X Studio**)  
**Design / roadmap:** `Sprite-Viewer/docs/DESIGN.md`  
**Open PR with latest graphics work:** [#16](https://github.com/abdulahmad/EA-NHL-Tools/pull/16) (`cursor/nhl95-frame-banks-f507`)

---

## Where to work

| Location | Role |
|----------|------|
| **This repo (`EA-NHL-Tools`)** | Primary target for cloud agents. Push branches, open PRs to `main`. |
| **`Sprite-Viewer/`** | NHL9X Studio app (Node server + static `public/`, `lib/`, GitHub Pages workflow). |
| **[NHL9XStudio](https://github.com/abdulahmad/NHL9XStudio)** | Intended standalone host repo + Pages. **Cloud agent could not push (403).** A full tree was prepared locally under `/workspace/NHL9XStudio` but is **not** in git on EA-NHL-Tools. Human push or grant Cursor write access, then sync from `Sprite-Viewer/` after merges. See `NHL9XStudio/docs/MIGRATION.md` in that local tree only. |

Do **not** commit `Sprite-Viewer/pc95` symlink or retail ROMs. `roms/*.bin` are optional local symlinks for tests.

---

## Implementation priority (graphics)

**92G → 93G → 94G → 95G → 93S → 94S → 95PC → 94PC**

Audio is a separate track (`AUD-*` in DESIGN.md). **MID94-Tools** is unfinished; do not depend on it.

---

## Done (on `main` or in PR #16)

### Merged to `main` (via PR #15, NHL9X Studio / hosting)

- Rebrand to **NHL9X Studio**; expanded `DESIGN.md`.
- Genesis **auxiliary frame banks** for **92G** (incl. FaceOff), **93G**, **94G** (Crowd, FaceOff, Zam, Stanley, PlayoffSprite) via `sheetGameBanks()` in `lib/games.js`.
- SPA blurbs for celebrate vs bench-check (`lib/parse-frames.js`).
- **HOST:** drag-and-drop, `lib/open-asset.js`, `rom-detect.js`, `manifest.js`, `public/games.json`, static boot without `/api`, `.github/workflows/pages.yml`.
- PC95 folder catalog in client (`lib/pc95.js`).

### In PR #16 (95G frame banks + decoder)

- **95G** Frame tab banks: **Crowd** (`0x18B628`–`0x18DAA8`), **FaceOff** (`0x14A490`–`0x14C148`) from `NHL95Genesis/tools/extractAssets95.js`.
- **Not** at `segmap95` labels `0xA4B54` etc. — on the 2 MB ROM those addresses are inside player-card data, not crowd.
- **No Genesis Zamboni** in NHL 95 (`display95.asm`: no `showzam`).
- `openFrames(..., { record: '95' })` for NHL 95 sprite records; higher per-frame sprite cap for dense crowd frames.
- Viewer passes `record: '95'` when `game.sheet.record === '95'`.
- Tests + regenerated `public/games.json`.

---

## Not done (backlog)

| ID | Scope | Notes |
|----|--------|------|
| **GAP-2** | 93G | Audit `lib/genesis-images.js` vs `Asset-Extractor/extractAssets93.js`; Rev A tests; any missing JIMs. |
| **GAP-3** | 94G | Largely done on main; optional SPA search aliases / doc polish. |
| **GAP-4** | 95G | Crowd/FaceOff in PR #16; arena gfx / full `genesis-images` audit vs extract still open. |
| **GAP-5–6** | 93S / 94S | SNES picture catalog, refs/crowd/faceoff when disasm offsets pinned. |
| **GAP-7–8** | 95PC / 94PC | 95PC polish; **94PC** new profile (bench crowd on DOS, not Genesis). |
| **HOST-3** | OPFS persistence | Not implemented. |
| **HOST-5** | 95 ISO mount | Stub / message only. |
| **AUD-*** | Genesis audio | New `lib/audio/genesis.js`; per-title after graphics queue. |
| **NHL9XStudio** | Remote repo | Push mirror; enable Pages on that repo if split is desired. |

---

## Key files

| Path | Purpose |
|------|---------|
| `Sprite-Viewer/lib/games.js` | Game profiles, `sheetGameBanks`, portraits/logos stamping |
| `Sprite-Viewer/lib/genesis-images.js` | Genesis ROM image slices (retail offsets) |
| `Sprite-Viewer/lib/sheet.js` | Player sheet + `openFrames` (94 vs 95 sprite layout) |
| `Sprite-Viewer/public/viewer.js` | UI, drop-open, bank/image loading |
| `Sprite-Viewer/test.js` | Regression tests; optional ROM paths under `/tmp/disasm/...` |
| `Sprite-Viewer/tools/build-manifest.js` | Regenerate `public/games.json` after catalog changes |

### ROMs for local / CI tests (optional)

```
/tmp/disasm/NHL95Genesis/lst/nhl95.bin
/tmp/disasm/NHL94Genesis/lst/nhl94.bin
Sprite-Viewer/roms/nhl95.bin  → often symlink to above
```

### Commands

```bash
cd Sprite-Viewer
node test.js
node tools/build-manifest.js   # after changing games.js / genesis-images.js
node server.js                 # http://localhost:8732
```

**Branch naming for cloud agents:** `cursor/<descriptive-name>-f507`

---

## Genesis 94 vs 95 — bench celebration

- **Genesis 94/95:** on-ice celebrate via **SPA** (`SPAcelebrate`, `SPApump`). No bench-sit celebration like **95 PC** (`SPFbench`).
- **Crowd** is `Crowd.anim` / `CrowdFrameList`, not player SPF.

---

## PRs (context)

| PR | Status | Topic |
|----|--------|--------|
| [#15](https://github.com/abdulahmad/EA-NHL-Tools/pull/15) | Merged | NHL9X Studio, hosting, 92–94G banks |
| [#16](https://github.com/abdulahmad/EA-NHL-Tools/pull/16) | Draft | 95G crowd/faceoff banks + `openFrames` 95 |

---

## Prompt for the next agent

Copy everything below into a new Cloud Agent on **EA-NHL-Tools** (base branch `main`; merge or continue from PR #16 as needed).

```
You are continuing NHL9X Studio in EA-NHL-Tools/Sprite-Viewer/.

Read first:
- docs/AGENT-HANDOFF.md (this handoff)
- Sprite-Viewer/docs/DESIGN.md (priority table and GAP/HOST sections)

Repo: https://github.com/abdulahmad/EA-NHL-Tools
Work only in EA-NHL-Tools (push branches, PRs to main). Do not rely on pushing to NHL9XStudio unless write access was fixed.

Graphics priority: 92G → 93G → 94G → 95G → 93S → 94S → 95PC → 94PC.

Immediate tasks:
1. Review/merge PR #16 if still open (95G Crowd + FaceOff frame banks; openFrames record '95').
2. GAP-2 (93G): audit genesis-images vs Asset-Extractor/extractAssets93.js; extend test.js when nhlpa93.bin present.
3. Then GAP-5/6 (SNES) per DESIGN.md.

Conventions:
- Branch names: cursor/<name>-f507
- After catalog changes: node Sprite-Viewer/test.js && node Sprite-Viewer/tools/build-manifest.js
- Minimal diffs; match existing code style in lib/ and public/viewer.js
- Do not commit pc95 symlink, ROMs, or user game files

Optional: sync a copy to NHL9XStudio only if the user has granted push access; otherwise document in PR only.
```

---

## Human actions (if desired)

1. **Merge PR #16** when satisfied with 95G crowd/faceoff in the Frame tab.
2. **NHL9XStudio:** grant GitHub write to Cursor cloud agents, or `git push` the prepared `main` from a machine with access.
3. **GitHub Pages:** enable for EA-NHL-Tools or NHL9XStudio per `DESIGN.md` §5 after HOST client paths are acceptable without Node.
