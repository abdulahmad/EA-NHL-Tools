# Lineage of features and gameplay across the EA NHL games (1991-1995)

This page follows each EA NHL game from NHL Hockey (92) to NHL 96 on the Genesis, SNES and DOS. For each game it lists
what was new, what it took over and from which game, and the cross-platform links.

How to read it:

- **Box** = the back of the North American box. **Manual** = the game's manual. Page numbers are PDF pages of the scan
  listed under [Sources](#sources).
- **Code** = a routine or file in one of the public disassembly repos (linked below). Code shows that a feature is
  there. It does not always show where the feature came from.
- **Inference** marks a conclusion drawn from the sources that no source states outright.
- Names: 92G, 93G, 94G, 95G, 96G (Genesis); 93S, 94S, 95S, 96S (SNES); 94 Sega CD; 94 PC, 95 PC, 96 PC (DOS). "The
  DOS games" means 94 PC, 95 PC and 96 PC together.

Repos: [NHL92Genesis](https://github.com/abdulahmad/NHL92Genesis),
[NHLPA93Genesis](https://github.com/abdulahmad/NHLPA93Genesis), [NHLPA93SNES](https://github.com/abdulahmad/NHLPA93SNES),
[NHL94Genesis](https://github.com/abdulahmad/NHL94Genesis) (with the Sega CD notes), [NHL94SNES](https://github.com/abdulahmad/NHL94SNES),
[NHL94PC](https://github.com/abdulahmad/NHL94PC), [NHL95Genesis](https://github.com/abdulahmad/NHL95Genesis),
[NHL95SNES](https://github.com/abdulahmad/NHL95SNES), [NHL95PC](https://github.com/abdulahmad/NHL95PC),
[NHL96Genesis](https://github.com/abdulahmad/NHL96Genesis), [NHL96PC](https://github.com/abdulahmad/NHL96PC) and the
[nhl-disasm-report](https://github.com/abdulahmad/nhl-disasm-report). There is no 96S repo, so every 96S statement
here comes from its box and manual only.

## The development model

This is Abdul's reading of how the games were made. The sections below test it against the boxes, the manuals, the code
and two published interviews.

1. **The Genesis game led.** Each year's Genesis game was built on the one before it.
   - 92G and 93G: Jim Simmons (manual credits).
   - 94G, 95G and 96G: Mark Lesser (manual credits). He "rewrote and extended Simmons's code"
     (NHL95Genesis `docs/WHY_95_MOVED.md`).
2. **The SNES game spun off the Genesis game.**
   - 93S was programmed at Park Place Productions by William Robinson, with Jim Simmons as technical designer (93S
     manual credits).
   - 94S was ported by EA Canada (94S manual credits: Amory Wong, Robert White, Rod Reddekopp). Wong: "I was
     responsible for porting the Genesis code onto the SNES" (Classic Gaming Quarterly, 2016).
3. **The DOS game spun off the SNES game.**
   - Wong, asked about the DOS releases: "He used the SNES code instead of the Genesis code, since I was around to answer
     questions" (Classic Gaming Quarterly, 2016). "He" is Robert White, whom Wong names as lead programmer of the DOS game.
   - The code agrees: 94 PC's one-timers, goalie wall animations and organ tunes are the 94S versions (see
     [1993-94](#nhl-94-1993-94)).
4. **Each year had a feature mandate across platforms.** The 94G, 94S and 94 Sega CD boxes share the same headline and
   feature list ("The siren is going to wail tonight", one-timers, penalty shots and shootout, goalie control). The 95
   boxes all lead with "This is not your ordinary cup" and a full 84-game season. The 96 boxes all lead with "the puck
   stops here" or "get ready for this" and a "New in '96" list with five-minute majors. The 96G and 96S lists also
   have an on-ice Stanley Cup ceremony.
   Each platform built most of these features with its own code (see the per-year sections).

**The magazine interview.** Abdul recalls a magazine interview in which a developer of the DOS game said the Genesis developer was
away, so the port team could only talk to the SNES developer. That interview **was not found**. The closest published
source is the Amory Wong interview (Classic Gaming Quarterly, 2016, online). Wong is the SNES programmer, not a DOS
developer, and he says the DOS team used his SNES code because he was around to answer questions. He does not say the
Genesis developer was away. Until the magazine is found, that detail is Abdul's recollection.

## Diagram (Abdul's interpretation)

This is Abdul's lineage diagram, redrawn. Solid arrows: a game built on another. Dotted arrows with a label: one
feature carried across platforms.

```mermaid
flowchart LR
  subgraph Y92["NHL 92"]
    G92["NHL92 Genesis"]
  end
  subgraph Y93["NHLPA 93"]
    G93["NHLPA93 Genesis"]
    S93["NHLPA93 SNES"]
  end
  subgraph Y94["NHL 94"]
    G94["NHL94 Genesis"]
    CD94["NHL94 Sega CD"]
    S94["NHL94 SNES"]
    P94["NHL94 PC"]
  end
  subgraph Y95["NHL 95"]
    G95["NHL95 Genesis"]
    S95["NHL95 SNES"]
    P95["NHL95 PC"]
  end
  subgraph Y96["NHL 96"]
    G96["NHL96 Genesis"]
    S96["NHL96 SNES"]
    P96["NHL96 PC"]
  end
  G92 --> G93
  G92 --> S93
  G93 --> S93
  G93 --> G94
  S93 --> S94
  S93 --> P94
  G94 --> CD94
  G94 --> S94
  G94 --> P94
  G94 --> G95
  S94 --> P94
  S94 --> S95
  P94 --> P95
  P94 -. "Season mode" .-> G95
  P94 -. "Season mode" .-> S95
  G95 --> S95
  G95 --> P95
  G95 --> G96
  S95 --> P95
  S95 --> S96
  P95 --> P96
  P95 -. "Matchup & Rink Announcer Speech" .-> S96
  G96 --> S96
  G96 --> P96
  S96 --> P96
```

## NHL Hockey (92), 1991

### 92G: NHL Hockey (Genesis)

- **Credits (manual):** developed by the Park Place Production Team; programmer Jim Simmons; producer Michael Brook.
- **Box:**
  - "all 22 NHL teams and 2 All-Star teams", each skater "modeled on 14 different attributes"
  - body checks, penalties ("if the ref sees you!")
  - instant replay, scouting reports, crowd reactions
  - 1 or 2 players, cooperative or competitive
- **Manual:**
  - playoffs, continued with a password (p.8, p.35)
  - fighting as a 5-minute penalty, with a "Fights Won" stat (p.19 and the stats pages)
- **Code:** the root of every later Genesis repo. 93G, 94G and 95G names trace back to 92G (NHLPA93Genesis
  `docs/conventions.md`, "Naming lineage"). The pregame scouting report is `ScoutingReport` in hockey.asm (NHL94PC
  `docs/CONSOLE_LINEAGE.md`).

## NHLPA Hockey 93, 1992

### 93G: NHLPA Hockey 93 (Genesis)

- **Credits (manual):** programmer, and music and sound, Jim Simmons.
- **New, from the manual's list "added to NHL Hockey to create NHLPA Hockey '93" (p.4-5):**
  - NHLPA rosters from the 1992 season, with Ottawa and Tampa Bay
  - goalies that dive and lunge
  - saved player stats in 8 categories
  - hooks and checks from behind
  - "flipping body check and blood on the ice"
  - saved team lines
  - player injuries
  - Pro Set stars of the game
  - organ music that reacts to the game
  - home-ice advantage tied to the crowd
  - EASN pregame scouting report, and coverage hosted by Ron Barr
  - scoring and penalty summaries
  - a new fatigue and line-change system
  - no password for the playoffs
  - EASN crowd meter
  - a slap shot that can shatter the glass
  - instant replay that follows any player
  - "new strategic fighting system"
  - hat-trick announcements
- **Box:** "Over 20 new features in '93", led by "Battery Back Up ... no passwords!", "Edit lines feature ... save them
  to battery", goalie saves and injuries.
- **Inherited:** from 92G, the engine and the design. 92G is the naming root for 93G.
- **Lost:** the NHL licence. Teams are city names only (NHLPA93Genesis `docs/conventions.md`).

### 93S: NHLPA Hockey 93 (SNES)

- **Credits (manual):** programmer William Robinson (Park Place Productions); technical design Jim Simmons.
- **Box:** the same headline and goalie-save panel as 93G, with "Hot hockey action" in place of "Over 20 new features".
  The box does not list battery back-up or saved lines.
- **Manual:** playoffs continue by password, not battery (p.21, "Saving the playoff tree").
- **Code:** the port "began as a port of NHL92 Genesis (likely while NHLPA93 Genesis was in development), then added
  what NHLPA93 needed". Some screens, such as the scoreboard layout, follow 92G rather than 93G (NHLPA93SNES `README.md`,
  `docs/history/discovery93snes.md`).

**Same or different, 93S vs 93G:**

| Item | 93S vs 93G | Source |
|---|---|---|
| Rosters, rating count | Same | Box |
| Goalie dives, injuries | Same | Box |
| Playoff save | Different (password) | Manual |
| Saved lines on battery | Different (not listed) | Box |
| Scoreboard layout | Different (92G style) | Code |

These rows support both arrows into 93S (from 92G and from 93G).

## NHL 94, 1993-94

### 94G: NHL '94 (Genesis)

- **Credits (manual):** programmer Mark Lesser.
- **New, from the manual's list "added to NHLPA Hockey '93 to create NHL Hockey '94" (p.5):**
  - goalie control; shootout game; penalty shots
  - bench and board checks
  - 3 or 4 players with the adapter
  - 1992-93 NHL rosters
  - hot and cold streaks
  - saved player records, standings and records
  - one-timers, flip passes, reverse-angle replay
  - clearing the zone on the penalty kill
  - automatic line changes
  - tougher defence and goalies, and computer shooter scoring moves
  - player and team cards, with 144 player pictures
  - local organ music (72 pieces), team logos at centre ice, new crowd animations
  - **"No fighting or blood"**
  - period stats and more game stats
  - Anaheim and Florida
- **Box:** "Over 25 new features in Hockey '94", led by 4 Way Play, goalie control, penalty shots and shootout,
  one-timers and battery back-up ("records for you and 6 friends").
- **Code:** the manual-to-code map is NHL94Genesis `docs/MANUAL_FEATURES.md`. For example:
  - one-timers: `OneTimerPass` / `OneTimerTarget`
  - shootout: `ShootoutShooters`
  - penalty shots: `PenShotChk`
  - 4 Way Play: `Detect4WayPlay`
  - per-team organ songs: `TeamSongs`
  - fighting: `checkfight` is left as a bare `rts`.
- **Inherited:** the 93G engine, via the 94 -> 93 -> 92 naming lineage.
- **Gained:** the full NHL licence (team names and logos) on top of the NHLPA licence.

### 94 Sega CD: NHL '94 (Sega CD)

- **Credits (manual):** "By EA Canada and High Score Productions"; programmer Mark Lesser; Sega CD programming by Paul
  Halmshaw, Pete Veys and Jim Sproul.
- **Box:** "Same great NHL '94 Genesis features": 4 Way Play, goalie control, penalty shots and shootout, one-timers,
  Ducks and Panthers. New on the disc:
  - over 100 video clips
  - digitized speech by Ron Barr
  - CD sound effects
  - "real organ music" (the San Jose Sharks organ)
- **Code:** "the Sega CD plays the same game". Three small code changes touch play, and the rosters drop 31 players
  (NHL94Genesis `docs/segacd_differences.md`).
- **Inherited:** all of it from 94G (code). The arrow 94G -> 94 Sega CD is confirmed.

### 94S: NHL '94 (SNES)

- **Credits (manual):** programming by Amory Wong, Robert White and Rod Reddekopp; organ music by Dieter Ruehle; music
  by Michael J. Sokyrka.
- **Box:** "Over 25 new features in Hockey '94", the same list as 94G except:
  - "5-Player support" (Hudson Soft's Super Multitap) in place of 4 Way Play
  - "new player art and animations"
  - "harder hitting defenders" (cross checks and board checks)
  - no battery line
- **Manual:**
  - Shootout and "New Playoffs" (p.5)
  - goalie control on X (p.3)
  - one-timers (p.3)
  - playoffs continued by password (p.5)
- **Code:** the 94S repo found two kinds of inheritance (nhl-disasm-report `docs/ALIGNMENT.md`, appendix A1):
  - **Code lineage: 93S.** Game logic was matched instruction by instruction to 93S routines. 808 names come from
    93S and 306 from 94G.
  - **Design lineage: 94G.** "Shootout, player cards, line editor, crowd meter, three stars, matchups, scouting
    rewrite."
  - So the arrows 93S -> 94S (code) and 94G -> 94S (features) are both supported.

**Open question.** Wong says the opposite about the starting code. "We started with the '93 code and Michael [Brook]
gave us the '94 feature requirements", and Brook did not like how 93S played, "so we worked off the '93 Genesis code"
(Classic Gaming Quarterly). The instruction-level match with 93S suggests 93S code was reused. Both may be partly true:
93S is itself a translation of the Genesis code.

### 94 PC: NHL Hockey (DOS, 1993)

- **Release:** shipped as "NHL Hockey", not "NHL '94" (NHL94PC `docs/CONSOLE_LINEAGE.md`, "Music and packaging").
- **Credits:** the German manual (the only scan found) gives:
  - original game idea: Jim Simmons, Scott Orr, Richard Hilleman
  - project lead: Robert Penner
  - programming: Robert Penner, Victoria Wong, Eric Pauker
  - organ: Dieter Ruehle and Michael J. Sokyrka
  - special thanks: Robert White, Ron Barr and Bruce Jamieson
- **Box:**
  - "real NHL teams and logos"
  - "simulate the actual 1993 NHL season or create a league of your own with up to 24 human participants"
  - "digitized speech and over 70 pieces of digitized organ music"
  - "end-of-season awards including the Hart, Norris and Ross trophies"
  - instant replay that saves highlights to a personal reel
  - "refs on the ice"
  - one-timers
  - one or two players
- **Manual (German):** league play for up to 24 participants, a league manager, and saved playoff and league
  highlights.
- **Code:** NHL94PC `docs/CONSOLE_LINEAGE.md` sums it up as "a 93-generation engine carrying 94 content and the headline
  94 gameplay changes".

**Same or different, 94 PC vs the consoles:**

| Item | 94 PC vs consoles | Code says |
|---|---|---|
| Skating, shooting | Same as 93G | 93G formulas |
| One-timers | Same as 94S | 94S design |
| Goalie wall animations | Same as 94S | Not in 94G |
| Organ tunes | Same as 94S | 50 of 53 exact |
| Fighting | Same as 94 (none) | Removed |
| Penalty shots, shootout | Different (none) | Not found |
| 3+ players, manual goalie | Different (none) | Not found |
| League, awards, referee | 94 PC only | `new_league.asm` |

- **Why this supports Abdul's arrows** (code):
  - 93S -> 94 PC: the 93-generation engine.
  - 94S -> 94 PC: one-timers, wall animations and organ tunes match 94S.
  - 94G -> 94 PC: the 94 feature set and content.
- **Credit puzzle.** Wong names Robert White as the DOS lead. The German manual names Robert Penner as project lead and
  lists White only under special thanks. White is in the 94S programming credits. An English 94 PC manual would
  settle it.

## NHL 95, 1994

### 95G: NHL 95 (Genesis)

- **Credits (manual):** programmer Mark Lesser.
- **New, from the manual's list "new in NHL '95" (p.2):**
  - 1993-94 rosters
  - season play, with erasable seasons
  - practice mode
  - player creation and player trades
  - league leaders
  - drop passes, fake shots, block shots
- **Box ("All new in '95"):**
  - a full 84-game season mode, with the Hart, Ross and Vezina trophies
  - trade players ("run a trade through the G.M.") or create them
  - "fake shots, drop passes, defenders 'laying down on D'"
  - faster gameplay
  - new player animations
  - a 2-on-2 "Jam" play mode
- **Code:** the manual-to-code map is NHL95Genesis `docs/MANUAL_FEATURES.md` (`SeasonMain`, `CreatePlayer`,
  `ExecuteTrade`, `dopass`, `CanBlock`). NHL95Genesis `docs/FILE_ORIGINS.md` traces every 95 file to its 94G source.
  The season, trade, create, awards and schedule files are new in 95. Lesser re-filed the 94 code into subsystem files
  (NHL95Genesis `docs/WHY_95_MOVED.md`).
- **Inherited:** 94G's engine (code), so 94G -> 95G is confirmed.
- **The "Season mode" arrow from 94 PC:** 94 PC had a full season with the 10-award list a year before any console
  (code: `AwardNamePtrs`, NHL94PC). The 95G and 95S boxes call season mode and its awards "all new in '95".
  - 95G's season and awards code is new in 95 and not shared with the DOS code.
  - So the arrow is a design (mandate) arrow, not a code arrow (inference).

### 95S: NHL 95 (SNES)

- **Credits (manual):** design by Kevin Hogan and Michael Brook; programmers Jason Andersen and Jonah Stich. The art
  team is shared with 95G (NHL95Genesis `docs/WHY_95_MOVED.md`).
- **New, from the manual's list "new in NHL '95" (p.2):**
  - 1993-94 rosters
  - season play, practice mode
  - player creation, league leaders, player trades
  - accumulated team and player stats
  - battery backup (94S used passwords)
- **Box:** "All new in '95": a full 84-game season with awards, trades and created players, faster gameplay, new
  animations. Unlike 95G, the box has **no** fake shots, drop passes, laying down on D or 2-on-2 mode.
- **Code:**
  - The 95S repo calls it "a separate code base, related to NHL95Genesis ... and NHL94SNES" (NHL95SNES `README.md`).
  - 95S keeps 94S's whole multitap code, switched off by two changed values, so it ships 1-2 players (NHL95PC
    `docs/CONSOLE_LINEAGE.md`, "95S multitap").
  - That 94S code still inside 95S supports the arrow 94S -> 95S.

**Same or different, 95S vs 95G:**

| Item | 95S vs 95G | Source |
|---|---|---|
| Season, trades, create | Same | Manual, box |
| Practice mode | Same | Manual, code |
| Fake shot | Different (none) | Manual, code |
| Drop pass | Different (none) | Code |
| 3+ players | Different (off) | Code |
| Shootout | Same (in code) | Code |

The shootout row is unsettled. NHL95SNES `docs/MANUAL_FEATURES.md` finds shootout code (`ShootoutWonBy`) that the manual
does not mention. NHL95Genesis `docs/WHY_95_MOVED.md` says 95S has "no shootout". The two repo docs should be
reconciled.

### 95 PC: NHL Hockey '95 (DOS CD-ROM)

- **Credits** (credit pages in the code, NHL95PC `src/data/front/scoreboard_data.asm`):
  - lead programmer Lance Wall
  - programmers Victoria Wong, Robert Penner, Kurt Kennett
  - producer and design Ken Sayler
  - a SportsDesk announcer (Michael Donovan) and a rink announcer (Bruce Jamieson)
- **Box:**
  - "New player moves include fake shots, drop passes, and players laying down on 'D'"
  - "New in '95": penalty shots
  - new checking and goalie animations
  - "New G.M. mode lets you trade and create players"
  - unlimited trades, signing rookies, starting line-ups, the 84-game season
  - updated rosters with the Mighty Ducks and Panthers
  - high-resolution screens and "digital quality sound effects and music"
- **Manual:** no public scan found.
- **Code:** "95 PC is built on the 94 PC engine, not ported from 95 Genesis" (NHL95PC `docs/CONSOLE_LINEAGE.md`, "What
  this means").
  - From the 94 consoles: board, bench and cross-checks, penalty shots, and a goalie poke check like 94S's.
  - From 95G: the 1993-94 season data, and 95G-style fake shots, shot blocks and roster tools, each in 95 PC's own code.
  - Its own: a contextual drop pass (no button), a fake one-timer, four shot-block animations, a goalie knee hold,
    more penalties, CD video, high resolution and digitized music.
  - Not taken: shootout, manual goalie, more than two players, practice mode.
- **Arrows:**
  - 94 PC -> 95 PC: confirmed by the code.
  - 95G -> 95 PC: features and data, not code.
  - 95S -> 95 PC: no direct evidence found. The goalie poke check is like 94S and 95S, but that is inferred from the
    animation's purpose.

## NHL 96, 1995

### 96G: NHL 96 (Genesis)

- **Credits (manual):** programming Mark Lesser.
- **New, from the manual's list "New Features for 96" (p.4):**
  - skill levels Rookie, Pro and All-Star
  - a fighting option
  - one-timer pass, give-and-go, Spin-o-Rama
  - new graphics and animations
  - advanced goalie and defence AI
  - multiple injuries
- **Box ("New in '96"):**
  - smarter skaters (break to the slot, cover for a defenceman out of position)
  - tougher goalies
  - five-minute majors (with four-minute double minors)
  - new moves
  - new sound and music ("Get Ready for This")
  - an on-ice Stanley Cup ceremony
- **Code** (NHL96Genesis `docs/MANUAL_FEATURES.md`):
  - fighting: `EngageFight`, `SetFightingMajors`
  - Spin-o-Rama: `dospinorama`
  - short-handed role routines
  - role reassignment every second: `SetRoles`
  - new goalie saves: `goaliesave`
- **Inherited:** 95G's engine (95G -> 96G). The drop pass is still 95G's button move (NHL96PC
  `docs/CONSOLE_LINEAGE.md`, "Drop pass").

### 96S: NHL 96 (SNES)

- **Credits (manual):** made by Tiburon Entertainment, "founded by veteran Super NES programmers who have been
  responsible for ... NHL Hockey '95"; "NHL 96 was programmed by Jason Andersen". Andersen is also a credited
  95S programmer, which supports the arrow 95S -> 96S (credits; inference for the code).
- **New, from the manual's list "New Features for 96" (p.4):**
  - skill levels Novice, Intermediate and Expert
  - a fighting option
  - drop passes, fake shots, Spin-o-Rama, quick stop
  - lying down on D to block shots
  - crowd chants and organ tunes, and **vocal referees**
  - advanced goalie and defence AI
  - multiple injuries
  - practice mode is kept (p.5)
- **Box ("New in '96"):**
  - give and go, drop passes, quick stops, fake shots, Spin-o-Rama
  - smarter defences, tougher goalies
  - "chanting crowds, **public address announcers** and the rocking anthem 'Get Ready for This'"
  - five-minute majors
  - an on-ice Stanley Cup ceremony
  - 1-2 players
- **Code:** none public.

**Same or different, 96S vs 96G** (box and manual only):

| Item | 96S vs 96G | Source |
|---|---|---|
| Fighting option | Same | Manual |
| Spin-o-Rama | Same | Manual, box |
| Skill level names | Different | Manual |
| Fake shot, drop pass | Same (both list) | Manual, box |
| Practice mode | Different (96S only) | Manual |
| Referee and PA voices | Different (96S only) | Manual, box |
| Players | Different (1-2 vs 1-4) | Box |

- **The "Matchup & Rink Announcer Speech" arrow from 95 PC:**
  - Sourced: of the 96 console games, only 96S lists referee voices and public address announcers (manual, box). The
    96G manual's sound line has crowd chants and organ tunes only.
  - Sourced: on the DOS side, 95 PC credits a rink announcer, Bruce Jamieson (code credits). 94 PC already has
    announcer code (61 `Pa` / `Say` routines, against 49 in 95 PC) and thanks Bruce Jamieson and Ron Barr in its
    German manual.
  - So the speech may start at 94 PC rather than 95 PC.
  - That 96S took it from the DOS games is not confirmed: there is no 96S code to check.

### 96 PC: NHL 96 (DOS CD-ROM)

- **Credits:** the manual credits name Pioneer Productions and EA Canada, with Victoria Wong, Lance Wall and Kurt
  Kennett among the programmers, "the core of the 95 PC team" (NHL96PC `README.md`, citing manual p.37). No public scan
  of the 96 PC manual was found.
- **Box ("New in '96"):**
  - power-play offence, penalty-killing defence
  - goalie control
  - five-minute majors (with four-minute double minors)
  - CD-quality sound and music with "authentic organ music" and "Get Ready for This"
  - player portraits and video profiles
  - "eleven freewheeling camera angles"
  - Gravis GrIP 4-player adaptor support
- **Code** (NHL96PC `docs/CONSOLE_LINEAGE.md`): built on 95 PC (`README.md`, "Lineage"). It takes the 96 mandate with
  its own code:
  - three skill levels
  - manual goalie control
  - four control slots
  - fighting, whose routines "follow the NHLPA 93 Genesis ones"
  - penalty-kill and covering-D AI
  - a new goalie positioning layer
  - players skating the Stanley Cup on the ice
  - modem play, which is 96 PC only
- **Missing on 96 PC** (code): Spin-o-Rama, shootout mode, timeouts and trade rejection, which 96G has. Kept from
  95 PC: the contextual drop pass, the fake shot and fake one-timer, and four shot-block animations.
- **Arrows:**
  - 95 PC -> 96 PC: confirmed by the code.
  - 96G -> 96 PC: features, built with different code.
  - 96S -> 96 PC: not checked, because there is no 96S code.

## Feature table

Each table gives the first game with a feature and where it appears later. "Box", "Manual" and "Code" are the evidence
for the first game. "Not on" lists games where the code or the manual shows the feature is missing. A game left out was
not checked.

**Modes and saving:**

| Feature | First | Later | Not on |
|---|---|---|---|
| Playoff password | 92G | 93S, 94S | 93G (battery) |
| Battery save | 93G (box) | 94G, 95G, 95S | 93S, 94S |
| Shootout mode | 94G, 94S | Sega CD, 95G, 96G | DOS games, 96S |
| League season, awards | 94 PC (box) | 95 PC, 95G, 95S, 96 | 94 consoles |
| Trades | 94 PC (code) | 95G, 95S, 95 PC, 96 | 94 consoles |
| Create player | 95G, 95S | 95 PC, 96G, 96S | 94 PC |
| Practice 2-on-2 | 95G, 95S | 96S (manual) | 95 PC |
| Skill levels | 96G, 96S | 96 PC | 95 PC |
| Modem play | 96 PC | none | consoles |

**Players and control:**

| Feature | First | Later | Not on |
|---|---|---|---|
| 3-4 players | 94G (box) | Sega CD, 95G, 96G, 96 PC | 94 PC, 95 PC |
| 5 players | 94S (box) | none (95S off) | 95S |
| Manual goalie | 94G, 94S | Sega CD, 95G, 95S, 96 | 94 PC, 95 PC |
| One-timers | 94G (box) | all later games | 93 games |
| Spin-o-Rama | 96G, 96S | none | 96 PC |

**Moves, rules and AI:**

| Feature | First | Later | Not on |
|---|---|---|---|
| Fighting | 92G, 93G | 93S; back in 96 | 94, 95 games |
| Board, bench checks | 94G, 94S | 95G, 95S, 95 PC | 94 PC |
| Penalty shots | 94G, 94S | Sega CD, 95 games, 96 | 94 PC |
| Hot, cold streaks | 94G, 94S | Sega CD | 94 PC |
| Fake shot | 95G | 95 PC, 96 | 95S |
| Drop pass | 95G (button) | 95 PC (own), 96 | 95S |
| Shot block, lay down | 95G, 95 PC | 96G, 96S, 96 PC | 94 PC |
| Five-minute majors | 96 (all 3 boxes) | none | none |
| PK, covering-D AI | 96G, 96 PC | 96S (box) | 95 PC |

**Presentation:**

| Feature | First | Later | Not on |
|---|---|---|---|
| Ron Barr coverage | 93G (manual) | 93S, Sega CD, 94 PC | none |
| Per-team organ music | 94G (72 tunes) | 94S (53), 94 PC | 93 games |
| Referee on the ice | 94 PC (code, box) | 95 PC | consoles |
| Video clips | Sega CD (box) | 95 PC, 96 PC | consoles |
| Announcer speech | Sega CD, 94 PC | 95 PC, 96S (box) | none found |
| On-ice Cup ceremony | 96G, 96S (box) | 96 PC (code) | none |

Notes on the tables:

- "96" alone means all three 96 games; "95 games" means 95G, 95S and 95 PC.
- 96S's play modes are exhibition, season and practice (manual p.5), so the shootout mode is listed as missing there.
- The 94 PC Stanley Cup animations (`SPAgetcup`) are older than the 96 ceremony. The 96 PC version adds players
  skating the Cup on the ice (code).
- The Sega CD's Ron Barr is a voiced scouting report (NHL94Genesis `docs/segacd_differences.md`). The 94 PC box lists
  "digitized speech", and the code has 61 announcer routines.

## What the evidence says about Abdul's diagram

- **Genesis-led, confirmed.** Every Genesis game builds on the one before it (code), and the Genesis manuals list each
  year's new features against the previous Genesis game.
- **SNES from Genesis, confirmed with a twist.** 93S started from 92G code, then took 93G's features (code). 94S took
  its features from 94G but much of its 65816 code from 93S (code). 95S is a separate code base by another team that
  still carries 94S code. 96S was made by Tiburon, whose founders made 95S (manual).
- **DOS from SNES, confirmed for 94 PC.** Wong's interview and the code agree: one-timers, goalie wall animations and
  organ tunes come from 94S. 95 PC and 96 PC then build on the DOS engine, not on a console port, and add each year's
  console features in their own code.
- **Yearly mandate, confirmed.** The boxes in each year share most feature lines and, apart from 94 PC ("The
  ultimate hat trick", with the same "Any Goalie, NHL" quote as the other 94 boxes), their headline. Each
  platform implemented the features separately: drop pass, fake shot, penalty shots, skill levels, fighting and PK AI each
  differ in code between platforms.
- **Cross-platform arrows.** "Season mode" (94 PC to the 95 consoles) fits the sources, but as a design idea, not
  shared code. "Matchup & rink announcer speech" (95 PC to 96S) fits the 96S box and manual, which are the only 96
  console sources to mention voices. It cannot be checked in code, and the DOS speech goes back to 94 PC.

## Sources

**Interviews:**

- Classic Gaming Quarterly, "Amory Wong: The Classic Gaming Quarterly Interview", Chris Alaimo, February 2, 2016:
  http://www.cgquarterly.com/2016/02/02/amory-wong-the-classic-gaming-quarterly-interview/
- The Hockey News, "The Making of NHL '94: An Oral History", Sal Barry, October 7, 2018:
  https://thehockeynews.com/news/all-access/the-making-of-nhl-94-an-oral-history
- The DOS-developer magazine interview Abdul recalls: not found.

**Box backs** (North American boxes; [GDB] = gamesdatabase.org, [LB] = LaunchBox Games Database):

| Game | Box back |
|---|---|
| 92G | [LB](https://images.launchbox-app.com/6ea9b15c-8f23-4f25-920a-3c3487be412d.jpg) |
| 93G | [GDB](https://www.gamesdatabase.org/Media/SYSTEM/Sega_Genesis/BoxBack/big/Nhlpa_Hockey_93_-_1992_-_Electronic_Arts.jpg) |
| 93S | [GDB](https://www.gamesdatabase.org/Media/SYSTEM/Nintendo_SNES/BoxBack/big/Nhlpa_Hockey_93_-_1992_-_Electronic_Arts.jpg) |
| 94G | [LB](https://images.launchbox-app.com/fcc00a99-bf30-48ed-950a-87212142ed11.jpg) |
| 94 Sega CD | [LB](https://images.launchbox-app.com/c23350df-8cca-415e-bdf8-0db9531fd7fc.jpg) |
| 94S | [LB](https://images.launchbox-app.com/227c9bfb-7beb-4085-b116-70f07e210569.jpg) |
| 94 PC | [LB](https://images.launchbox-app.com/cafd40fb-4e5f-4c26-9ad2-a5795a2bf216.jpg) |
| 95G | [GDB](https://www.gamesdatabase.org/Media/SYSTEM/Sega_Genesis/BoxBack/big/Nhl_95_-_1994_-_Electronic_Arts.jpg) |
| 95S | [GDB](https://www.gamesdatabase.org/Media/SYSTEM/Nintendo_SNES/BoxBack/big/Nhl_95_-_1994_-_Electronic_Arts.jpg) |
| 95 PC | [LB](https://images.launchbox-app.com/708f73ba-79f4-4194-bbf3-e27a7faa4536.jpg) |
| 96G | [GDB](https://www.gamesdatabase.org/Media/SYSTEM/Sega_Genesis/BoxBack/big/Nhl_96_-_Electronic_Arts.jpg) |
| 96S | [GDB](https://www.gamesdatabase.org/Media/SYSTEM/Nintendo_SNES/BoxBack/big/Nhl_96_-_1995_-_EA_SPORTS.jpg) |
| 96 PC | [GDB](https://www.gamesdatabase.org/Media/SYSTEM/Microsoft_DOS/BoxBack/big/NHL_96_-_1995_-_EA_SPORTS.jpg) |

**Manuals.** [Gen] is the Internet Archive collection
[SEGAGenesisMegaDriveManuals](https://archive.org/details/SEGAGenesisMegaDriveManuals) and [SNES] is
[SNESManuals](https://archive.org/details/SNESManuals):

| Game | Manual |
|---|---|
| 92G | [Gen: NHL Hockey (USA)](https://archive.org/download/SEGAGenesisMegaDriveManuals/NHL%20Hockey%20%28USA%29.pdf) |
| 93G | [nhl94.com scan](https://nhl94.com/multimedia/manuals/NHLPA93_GEN.pdf) |
| 93S | [SNES: NHLPA Hockey '93](https://archive.org/download/SNESManuals/NHLPA%20Hockey%20%2793%20%28USA%29.pdf) |
| 94G | [Gen: NHL '94](https://archive.org/download/SEGAGenesisMegaDriveManuals/NHL%20%2794%20%28USA%2C%20Europe%29.pdf) |
| 94 Sega CD | [SEGA CD Manuals: NHL '94](https://archive.org/details/SEGACDManuals) |
| 94S | [SNES: NHL '94](https://archive.org/download/SNESManuals/NHL%20%2794%20%28USA%29.pdf) |
| 94 PC | German only: [Handbuch](https://archive.org/details/nhl-hockey-handbuch), [Referenzkarte](https://archive.org/details/nhl-hockey-referenzkarte) |
| 95G | [Gen: NHL 95](https://archive.org/download/SEGAGenesisMegaDriveManuals/NHL%2095%20%28USA%2C%20Europe%29.pdf) |
| 95S | [SNES: NHL '95](https://archive.org/download/SNESManuals/NHL%20%2795%20%28USA%29.pdf) |
| 95 PC | Not found |
| 96G | [Gen: NHL 96](https://archive.org/download/SEGAGenesisMegaDriveManuals/NHL%2096%20%28USA%2C%20Europe%29.pdf) |
| 96S | [SNES: NHL '96](https://archive.org/download/SNESManuals/NHL%20%2796%20%28USA%29.pdf) |
| 96 PC | Not found; NHL96PC docs cite pages |

The 95 PC and 96 PC manuals and an English 94 PC manual would close the remaining gaps.
