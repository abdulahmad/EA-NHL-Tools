# Documentation on how to expand NHL 95 PC to 32 teams

Note, this is an incomplete exploration of how to potentially add an additonal team to NHL 95PC. This would obviously lead to being able to add 32 teams.

## Databases

`TEAMS.DB` - You should be able to copy the Data from the start of the BOS abbreviation to the start of the BUF abbreviation, and paste it to the end of the file. And then Modify the Team abbreviation, Team Short name and Team Full name. -- Standings screens seem to use these names

`CARTEAM.DB` - Similar to previous, you should be able to copy data from the start of the BOS abberviation to the start of the BUF abbreviation and paste it to the end of the file and update the team names

`SCHEDULE.DB` - Would have to update the schedule to include the new team

`KEY/ATT.DB` - would have to add players to new team

## In-game graphics
`HOMEPALS/AWAYPALS.BIN` - `PAL-to-ACT` README.md discusses this format, but you would need to create an additional copy of a team palette to the end of this file

`<TEAM>.TIL/MAP` - would have to add these for the new team.

`CRESTS4.PPV` - need to update this to include a SPIT file for new team

`HOMEPAL3/AWAYPAL3.QFS` - Think this is unused, but if not may need to add palettes here

`CRESTS-CRESTS4.BIN` -- Think this is unused

`CRESTS4.QFS` - this is likely unused, similar to .ppv file

## Menu graphics
`CALLOGO.QFS` - Logo for Season mode, would need to add for new team

`CITY.QFS` - Would have to add new logo here for Game Summary

`CTLOGO.QFS` - likely need to add new team's SPIT file

`EMB<TEAM>.QFS` - add for stats screens backgrounds

`JER<TEAM>H/JER<TEAM>V` - add jersey for new team

`SRLOGO.QFS` - Game Summary logos, would need to add SPIT file for new team to this

`LELOGO.QFS` - League Team Select logos, would need to add SPIT file for new team to this. I believe the position where the logo displays on the League Select screen depends on the offset/position data in the SPIT header which is easily modifyable.

## Sound/Music
`<TEAM>1-3.KMS/CFG` - In-game arena music, may need to add these?

`XBRUCE.VIV` - Rink-announcer, need to add files for new team

`XRBARR.VIV` - Menu announcer, need to add files for new team

## HOCKEY.EXE
All of the files above are easily modifyable. The hardest thing would be modifying the hardcoded lists in the actual executable. The first task would be to figure out a reliable way to decompile & recompile the game. Then it would be to expand the team lists I've listed below, and ensure if there is any logic in the code which limits the number of teams it reads to only 26/28 (28 when its also including All-Star teams), that the upper bound on the team limit is expanded.

Following contains offsets where to find team lists, as well as known but not exhaustive uses for each list.

`0x107724` - List of team abbreviations, used to display abbreviation of team in List Menu for exhibition game

`0x107790` - List of team city names

`0x10794C` - List of team abbreviations, used for Exhibition pre-game logo display, season logo display

`0x10A724` - List of team abbreviations, used to display Jersey Graphics on Team Select Screen for exhibition game; ANA & FLA are in alphabetical order in this list. New teams should be added in alphabetical order to this list.

`0x116DEC` - List of team city names for PA division, used for Central Registry menu selection

`0x116EFC` - List of team city names for CE division, used for Central Registry menu selection

`0x117006` - List of team city names for NE division, used for Central Registry menu selection

`0x11713C` - List of team city names for SE division, used for Central Registry menu selection

`0x10E4EC` - List of team abbreviations, used for loading Centre Ice logos, CITY.QFS, (uses incorrect ANH & FLO instead of ANA and FLA). Also to note that after every team abbreviation there are 9 bytes. This controls the centre ice logo arrangement. So for example, LA shows the logo near the blue line and mirrored. If you want to change this to a more traditional layout you can by overwriting the 9 bytes after the 3 byte abbreviation with one from another team. Heres what the bytes mean:
Byte 1 - Seems to be always 0
Byte 2-3 - X offset - think this is based on tiles so you will move the logo by 8 pixels as you change this value by 1
Byte 4-5 - Y offset - think this is based on tiles so you will move the logo by 8 pixels as you change this value by 1
Byte 6-9 - Not sure how this is broken down but controls how centre ice logo displays. LA has the logos mirrored, believe this controls that

`0X10822F, 0x108B3C` - Hardcoding of "Mighty Ducks of Anaheim" in game

`0x118C44` - List of team specific kms/cfg (midi) files. Not sure if needed as not all teams have one

## Other Interesting Notes
`GAME.SET`

`0x000051` - Home team index.

`0x000055` - Away team index. 

Team indexes used in `GAME.SET`

0 BOS

1 BUF

2 CGY

3 CHI

4 DET

5 EDM

6 HFD

7 LA

8 DAL

9 MTL

10 NJ

11 NYI

12 NYR

13 OTT

14 PHI

15 PIT

16 QUE

17 STL

18 SJ

19 TB

20 TOR

21 VAN

22 WSH

23 WPG

24 ANA

25 FLA

26 ASW

27 ASE

Setting GAME.SET to Team 28 causes the game to crash when going to the exhibition select screen.