# Feature candidates: what 94 Genesis and 95 PC could take from the other 92-96 games

Which gameplay and mode features from the other EA NHL games of 1991-1995 (92 to 96) could be added to NHL '94 on the
Genesis (94G), and which to NHL Hockey '95 on DOS (95 PC). It builds on [Game Lineage](Game-Lineage.md), which has the
sources, and on the public disassembly and decompilation repos listed there. Written 2026-11-26.

How to read it:

- **Code** = a routine or file in one of the repos shows it. **Manual** / **Box** = the game's manual or box back.
  **Source** = an interview or documentary listed in Game Lineage. **Inference** = a conclusion no source states.
- Difficulty (Easy / Medium / Hard) is always an estimate (Inference); the reason says what it rests on.
- Names follow Game Lineage: 93G, 94G, 95G, 96G (Genesis); 94S, 95S (SNES); 94 PC, 95 PC, 96 PC (DOS).

## Constraints

- **94G cartridge size:** the shipped cartridge is 1 MB. A mod can grow to 2 MB with no mapper; past 2 MB the image
  overlaps save RAM and needs the Sega mapper (NHL94Genesis docs, cartridge expansion notes) (Code). That leaves about
  1 MB of headroom, shared by every mod that needs it: the season and MSU-MD branches already build at 2 MB, the
  team-block patch at about 1.5 MB, and combining branches is untested (NHL94Genesis `docs/BRANCHES.md`).
- **94G save RAM:** the season branch raises an assemble error if its save passes $8000 (NHL94Genesis `docs/BRANCHES.md`) (Code).
- **94G CPU:** the game already drops frames when a logic frame overruns a vblank (NHL94Genesis `docs/PERFORMANCE.md`)
  (Code). More AI per frame costs frame rate.
- **Lineage:** 95G and 96G are descendants of 94G's code (NHL95Genesis `docs/FILE_ORIGINS.md`), and 93G
  is its ancestor, so their 68000 routines are the closest donors (Code). 94 PC/95 PC/96 PC are x86 with their own code;
  96 PC is built on 95 PC, so it is 95 PC's closest donor (Code, Game Lineage). Console <-> DOS is design-only.

## A) 94 Genesis

Already in 94G (not candidates): shootout, manual goalie, 4 Way Play, one-timers, penalty shots, board/bench checks,
hot/cold streaks, line changes, battery-saved playoffs, reverse replay, crowd meter, per-team organ (Box, Code).

### Modes

1. **Season mode, with trades, create player, free agents, release, standings, awards** - donor 95G (`SeasonMain`
   season95.asm, `ExecuteTrade` trade95.asm, `CreatePlayer` create95.asm, `awards95.asm`) (Code). **Medium**: direct
   descendant code, and already in progress on NHL94Genesis `feature/season-mode` (2 MB build, needs 95G assets).
2. **Practice 2-on-2** - 95G (`PracticePlayersTbl`, `PullPracticePlayers` goal95.asm; `sflags9` bit 7) (Code).
   **Easy-Medium**: small, same lineage; explicitly out of scope of the season branch.
3. **Skill levels (Rookie/Pro/All-Star)** - 96G (`OptSkill`, `SetSkillLevel` options96.asm, `check4check`,
   `GetRoleAss`) (Code). **Medium**: same lineage, but touches gravity tables and AI checks; tuning needed.
4. **Timeouts** - 96G (`TimeoutMenu`, `PauseMenuNoTimeout`, engine/pause) (Code). **Easy-Medium**: pause-menu work.
5. **User records** - 95G (`UpdateUserRecord` records95.asm), 96G (`OptUserRec`) (Code). **Easy-Medium**: same
   lineage; competes for save RAM with season mode.
6. **On-ice Cup celebration** - 96G (`CupCelebration` title96.asm) (Code). **Medium**: needs 96G art.

### Gameplay

1. **Fighting (on/off option)** - 93G (`checkfight` hockey93.asm, `assfight`/`fightinput` logic93.asm, `SPAfight`,
   `PenFighting`) and 96G (`EngageFight`, `SetFightingMajors` fight96.asm) (Code). **Medium**: 94G still has the hooks
   (`checkfight` and `assfight` are bare `rts`, `fightinput`, `PenFighting`, `AttribFighting` remain) (Code); needs
   the fight animations put back. THN and Noclip (~12:54-13:18): fighting was built and improved for 94, then removed in a last-minute deal with the NHL (Source).
2. **95G moves: fake shot, drop pass, shot block** - 95G (`SetShotMode`/`SPAfakeshotf/b`, `dopass` input95.asm,
   `CanBlock`/`chkblock` replay95.asm, `SPAblock`) (Code). **Medium**: same lineage, new animation frames; changes the
   94 feel, so best behind an option (Inference).
3. **Double minors / five-minute majors** - 96G (`DoubleMinorPenalties` logic96.asm) (Code). **Easy-Medium**: table and
   penalty logic; pairs with fighting.
4. **Spin-o-Rama** - 96G (`dospinorama` input96.asm, `SPAspinorama`, 6 frames) (Code). **Medium**: small input change
   plus one animation.
5. **Penalty-kill AI and covering D** - 96G (short-handed `asstab` $24-$2F in logic96.asm; `SetRoles` shot.asm) (Code).
   **Medium-Hard**: same lineage, but more AI work per frame on a CPU that already drops frames.
6. **96G goalie saves** - 96G (`goaliesave`: `SPAgblock`, `SPAgcatchlow`) (Code). **Medium**: art plus save logic.
7. **Goalie wall animations** - 94S, 94 PC (`SPAgwallright/left`, via `asseben`/`assbench`) (Code). **Medium**: tiny
   logic, but the art exists only in SNES/PC form and must be redrawn/converted (Inference).
8. **Rink announcer speech** - 94 PC (61 `Pa`/`Say` routines; speech programming credit in the manual) (Code, Manual). **Hard**: no
   console play-by-play code exists to start from; x86 design only; sample data eats the 1 MB headroom; Z80 driver work.
9. **Referee on the ice** - 94 PC (box "Refs on the ice"; `new_league.asm`) (Box, Code). **Hard**: Brook says refs were left off the
   consoles for frame rate (Noclip ~10:51) (Source); design only.

Not candidates: Sega CD video and Ron Barr voice need CD hardware (MSU-MD branch already covers CD music); 94S's
5-player is SNES multitap hardware; 94S/Sega CD play the same game otherwise (Code, Box).

**Top 3 for 94G:** (1) season mode - biggest gap, same-lineage 95G code, already half-built on a branch; (2) fighting
as an option - hooks still in 94G and the code exists in its ancestor 93G; (3) practice 2-on-2 - small, same lineage,
not covered by the season branch.

## B) 95 PC

Already in 95 PC (not candidates): season/league/playoffs, trades (human teams), create player, free agents, release,
10 awards, fake shot, fake one-timer, shot block, contextual drop pass, penalty shots, board/bench/cross-checks, goalie
poke check, announcer speech, referee, FMV, VESA hi-res (Code, Box).

The announcer's matchup introduction is also already there, so it is not a candidate (Code). 96 PC's manual (p.21)
mentions it, but 95 PC has it too, and so does 94 PC:

- 95 PC: `PreGameScreen` (src/front/pregame/PreGameScreen.c), the scouting report before a game, starts the
  SCOUTING song and calls `PaTonightIntro`, or `PaPlayoffTonight` in the playoffs. `SayTonightIntro`
  (src/front/announcer/SayTonightIntro.c) queues "Tonight ... EA Sports game between <away> and <home>" from the clips
  `tonight.bar`, `easports.bar`, `gamebtwn.bar`, `and.bar` and the team clips.
- 94 PC: the same pair, `PaTonightIntro` and `PaPlayoffTonight`, calling `SayTonightIntro` and `SayPlayoffTonight`
  (NHL94PC src/front/crowd.asm).
- 94 PC has 61 announcer routines and 95 PC has 49. Whether any 94 PC lines were dropped was not checked.

### Gameplay

1. **Manual goalie control** - 94G/95G/96G; nearest donor 96 PC (`changeplayer` with `gameopts` byte 1 bit 80h,
   `AutoSwitchPlayer`) (Code). **Easy**: 96 PC is built on 95 PC; 95 PC's `changeplayer` only skips position 0.
2. **Penalty-kill AI and covering a pinching D** - 96 PC (`assextra3`, `SwapDefWithFwd`, `asscoverdefo/d` assign.asm,
   logic.asm) (Code). **Medium**: same lineage, but 96 PC's rink spots are rescaled (blue line 4Eh -> 74h), so spot
   values need converting back.
3. **Skill levels** - 96 PC (`optflags` bits 7-8; read in `playeracc`, `doshot`, `checkcheck`, `goaliesave` ...) (Code).
   **Medium**: same lineage but many call sites; 96 PC's goalie depth table depends on it.
4. **Fighting** - 96 PC (`checkfight`, `assfight`, `assfwatch` collide.asm/assign; fight = penalty 20h in `penmintab`)
   (Code). **Medium-Hard**: same-lineage code, but 95 PC has no fight animations to drive it.
5. **94G gameplay feel** - 94G/93G values (NHL94PC `docs/CONSOLE_LINEAGE.md` physics table) (Code). **Medium** (Inference):
   95 PC retuned the 94 PC engine faster (skating, stops, goalies, fatigue); 94 PC's engine already uses 93G
   formulas. But 95 PC steps 24 times per game second while the consoles scale by frame, and the 95 PC rink is a different
   shape, so values need converting and play-testing.
6. **96 PC goalie positioning** - 96 PC (`goalieposition`, `goaliehome`, `GoalieDepthTab` faceoff.asm) (Code).
   **Hard**: needs new goalie animations (`SPAgshuffle*`, `SPAgsavetoe`, `SPAgsavekick`).
7. **Double minors** - 96G (`DoubleMinorPenalties`) (Code). **Easy-Medium**: design only; 95 PC already adds penalty
   types (`penmintab`); 96 PC: not confirmed.
8. **Spin-o-Rama** - 96G only (not on 96 PC) (Code). **Hard**: design only, plus new 95 PC animation art.

### Modes

1. **Shootout mode** - 94G (`shootout94.asm`), 95G (`shootout95.asm`), 96G (`ShootoutInit`) (Code). **Medium**: 95 PC
   already has the penalty-shot skate path (`StartShootoutPath`, named from 94G); needs the mode, rounds and scoring.
2. **Up to 4 players** - 96 PC (`SlotTable`, `HandleSlotButtons`, Gravis GrIP `GripScanSlots`) (Code); 94G/95G 4 Way
   Play. **Medium-Hard**: same lineage, but 95 PC's input record holds two pads; DOS controller limits.
3. **95G-style trades** (up to 3 a side, roster checks, GM evaluation, CPU teams) - 95G (`CheckTrade`,
   `EvaluateTrade` trade95.asm), 96G (`TradeValue`) (Code). **Medium**: design only; 95 PC trades are one-for-one between
   human teams.
4. **Practice 2-on-2** - 95G/95S (`PullPracticePlayers`) (Code). **Medium**: design only.
5. **User records** - 96 PC (`CreateUserRecord`, `UpdateUserRecords` src/pc/users) (Code). **Easy-Medium**: same lineage.
6. **Stanley Cup on the ice** - 96 PC (`asscupfollow/take/leave` assign.asm) (Code). **Medium**: same lineage; cup
   animations already exist in 95 PC (`SPAgetcup`, `SPAbrcup`).
7. **Timeouts** - 96G (`TimeoutMenu`) (Code). **Easy-Medium**: design only.
8. **Modem play** - 96 PC (src/pc/modem_game, src/pc/link) (Code). **Hard**: a whole subsystem plus lock-step sync.

**Top 3 for 95 PC:** (1) manual goalie - smallest change, 96 PC shows exactly where; (2) shootout mode - the 94G-named
penalty-shot path is already in 95 PC; (3) 96 PC penalty-kill/covering-D AI - same lineage, makes the CPU smarter
without new art. Worth a research spike: 94G feel tuning (gameplay item 5).
