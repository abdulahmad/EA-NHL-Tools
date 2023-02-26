# Usage
1. Run getNHLTeams.js to get team data
2. Run getNHLPlayerData to get player data from NHL APIs
3. Run getNHL23Ratings to get ratings for players

Note: Many players are missing from the NHL 23 ratings, including Crosby, Malkin, etc plus all rookies. I believe the API I'm scraping from only is from the launch of the game, and even then is missing some important players

## stats for players
timeOnIce
assists
goals
pim
shots
games
hits
powerPlayGoals
powerPlayPoints
powerPlayTimeOnIce
evenTimeOnIce
penaltyMinutes
faceOffPct
shotPct
gameWinningGoals
overTimeGoals
shortHandedGoals
shortHandedPoints
shortHandedTimeOnIce
blocked
plusMinus
points
shifts
timeOnIcePerGame
evenTimeOnIcePerGame
shortHandedTimeOnIcePerGame
powerPlayTimeOnIcePerGame

## NHL 23 Ratings for forwards:
Passing - assists
Poise - plus/minus / faceoffPct / shortHandedTimeOnIce
Aggressiveness - goals / hits / pim
Agility - TOI / shots
Durability - TOI / games
Endurance - TOI / games
Speed - goals / assists
Deking - goals / game winning goals / ot goals
Hand-Eye - pp points / goals / assists
Puck Control - pp points / goals / assists
Defensive Awareness = blocked / shorthanded time on ice / plusMinus
Faceoffs - faceOffPct
Shot Blocking - blocked
Stick Checking - assists
Discipline - pim
Offensive Awareness - goals/assists/shots
Acceleration - goals / shorthandedtime on ice
Balance - hits
Slap Shot Accuracy - shot pct / goals / shots / pp goals
Slap Shot Power - shots
Wrist Shot Accuracy - shot pct / goals / shots
Wrist Shot Power - shots
Body Checking - hits
Fighting Skill - pim / hits
Strength - hits

## Stats for goalies
games
ot
shutouts
ties
wins
losses
saves
powerPlaySaves
shortHandedSaves
evenSaves
shortHandedShots
evenShots
powerPlayShots
savePercentage
goalAgainstAverage
gamesStarted
shotsAgainst
goalsAgainst
powerPlaySavePercentage
shortHandedSavePercentage
evenStrengthSavePercentage

## NHL 23 Ratings for goalies:
Angles - Save%/PPSV%
Breakaway - Save% / Win%
Five Hole - Save%
Gloveside High - Save% / Win% / Handedness (strong side adv) / PPSV%
Gloveside Low - Save% / Win% / Handedness (strong side adv) / PPSV%
Stickside High - Save% / Win% / Handedness (strong side adv)
Stickside Low - Save% / Win% / Handedness (strong side adv)
Passing - shotsagainst
Poise - shutouts/ot wins/ pp/sh  save%
Poke Check - save%
Puck Playing Frequency
Rebound Control - save%
Recover - save%
Aggressiveness
Agility - games
Durability - games
Endurance - games
Speed - save%
Vision - save%


## Generate missing ratings

## NHL 23 Ratings mapping for forwards:
Passing - assists
Poise - plus/minus / faceoffPct / shortHandedTimeOnIce
Aggressiveness - goals / hits / pim
Agility - TOI / shots
Durability - TOI / games
Endurance - TOI / games
Speed - goals / assists
Deking - goals / game winning goals / ot goals
Hand-Eye - pp points / goals / assists
Puck Control - pp points / goals / assists
Defensive Awareness = blocked / shorthanded time on ice / plusMinus
Faceoffs - faceOffPct
Shot Blocking - blocked
Stick Checking - assists
Discipline - pim
Offensive Awareness - goals/assists/shots
Acceleration - goals / shorthandedtime on ice
Balance - hits
Slap Shot Accuracy - shot pct / goals / shots / pp goals
Slap Shot Power - shots
Wrist Shot Accuracy - shot pct / goals / shots
Wrist Shot Power - shots
Body Checking - hits
Fighting Skill - pim / hits
Strength - hits

## NHL 23 Ratings mapping for goalies:
Angles - Save%/PPSV%
Breakaway - Save% / Win%
Five Hole - Save%
Gloveside High - Save% / Win% / Handedness (strong side adv) / PPSV%
Gloveside Low - Save% / Win% / Handedness (strong side adv) / PPSV%
Stickside High - Save% / Win% / Handedness (strong side adv)
Stickside Low - Save% / Win% / Handedness (strong side adv)
Passing - shotsagainst
Poise - shutouts/ot wins/ pp/sh  save%
Poke Check - save%
Puck Playing Frequency
Rebound Control - save%
Recover - save%
Aggressiveness
Agility - games
Durability - games
Endurance - games
Speed - save%
Vision - save%

## Ratings Translation between NHL94 SG and 95 PC

Normal Mapping
SG - PC - Actual
0 - 25
1 - 40
2 - 50
3 - 65
4 - 75
5 - 90
6 - 100

Weight
0 – 20? - 140
1 – 25? - 148
2 – 30? - 156
3 – 35 - 164
4 - 40 – 172
5 – 45 - 180
6 – 50, 50 - 188
7 - 55,55, 55 – 196
8 – 55,55 - 204
9 – 65, 65, 65, 60 - 212
A - 65, 65,70 – 220
B – 75 - 228
C – 75, 80? - 236
D – 85? - 244
E – 80, 90? - 252
F – 95? - 260

Roughness
0 - 25
1 - 40
2 - 50
3 - 65
4 - 75
5 - 90
6 - 100

Ratings equivalents
SG - PC - Actual - Normal
WGt - WGT - Weight
Agl - AGI - Agility
Spd - SPD - Speed
OfA - OFF - Offensive Awareness
DfA - DEF - Defensive Awareness
ShP - POW - Shot Power
Chk - CHK - Checking
H/F - ??? - Handedness/Fighting??
StH - STH - Stick Handling
ShA - ACC - Shot Accuracy
End - END - Endurance
Rgh - BIA - Roughness / Shoot/Pass Bias
Pas - PASS - Passing
Agr - AGG - Aggressiveness
??? - FAC - Faceoffs

## Map 23 ratings to NHL 94/95

Classic rating - 23 rating source

Weight - from player data
Agility - 23 Agility
Speed - 23 Agility
Offensive Awareness - 23 Off Aware
Defensive Awareness - 23 Def aware
Shot Power - Slap/Wrist Power
Checking - Checking
Handedness/Fighting?? - Fighting
Stick Handling - Stick Handling
Shot Accuracy - Slap/Wrist Acc
Endurance - Endurance
Roughness / Shoot/Pass Bias - ??? Goals vs Assists?
Passing - Passing
Aggressiveness - Aggressiveness
Faceoffs - Faceoffs