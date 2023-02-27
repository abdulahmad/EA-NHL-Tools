# Roster Generator
Pulls Teams, Players & Stats from public NHL APIs & scrapes `nhlratings.net` for NHL23 ratings to create a base for a modern roster for NHL 94/95

## Usage
1. Ensure `node` is installed on your machine.
1. Run `node getNHLTeams.js` to get team data
2. Run `node getNHLPlayerData.js` to get player data from NHL APIs
3. Run `node getNHL23Ratings` to get ratings for players

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
Passing
Poise
Aggressiveness
Agility
Durability
Endurance
Speed
Deking
Hand-Eye
Puck Control
Defensive Awareness
Faceoffs
Shot Blocking
Stick Checking
Discipline
Offensive Awareness
Acceleration
Balance
Slap Shot Accuracy
Slap Shot Power
Wrist Shot Accuracy
Wrist Shot Power
Body Checking
Fighting Skill
Strength

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
Angles
Breakaway
Five Hole
Gloveside High
Gloveside Low
Stickside High
Stickside Low
Passing
Poise
Poke Check
Puck Playing Frequency
Rebound Control
Recover
Aggressiveness
Agility
Durability
Endurance
Speed
Vision


## Generate missing ratings

## NHL 23 Ratings mapping for forwards:
Passing - assists
Poise - plusMinus, faceOffPct, shortHandedTimeOnIcePerGame
Aggressiveness - goals, hits, pim
Agility - timeOnIcePerGame, shots
Durability - timeOnIcePerGame, games
Endurance - timeOnIcePerGame, games
Speed - goals, assists
Deking - goals, gameWinningGoals, overTimeGoals
Hand-Eye - powerPlayPoints, goals, assists
Puck Control - powerPlayPoints, goals, assists
Defensive Awareness - blocked, shortHandedTimeOnIcePerGame, plusMinus
Faceoffs - faceOffPct
Shot Blocking - blocked
Stick Checking - assists
Discipline - pim
Offensive Awareness - goals, assists, shots
Acceleration - goals, shortHandedTimeOnIcePerGame
Balance - hits
Slap Shot Accuracy - shotPct, goals, shots, powerPlayGoals
Slap Shot Power - shots
Wrist Shot Accuracy - shotPct, goals, shots
Wrist Shot Power - shots
Body Checking - hits
Fighting Skill - pim, hits
Strength - hits

## NHL 23 Ratings mapping for goalies:
Angles - savePercentage, powerPlaySavePercentage
Breakaway - savePercentage, wins/games
Five Hole - savePercentage
Gloveside High - savePercentage, wins/games, powerPlaySavePercentage + 5
Gloveside Low - savePercentage, wins/games + 5
Stickside High - savePercentage, wins/games, powerPlaySavePercentage - 5
Stickside Low - savePercentage, wins/games - 5
Passing - shotsAgainst
Poise - shutouts, powerPlaySavePercentage, shortHandedSavePercentage
Poke Check - savePercentage
Puck Playing Frequency - shotsAgainst
Rebound Control - savePercentage
Recover - savePercentage
Aggressiveness - powerPlaySavePercentage
Agility - games
Durability - games
Endurance - games
Speed - savePercentage
Vision - savePercentage

## How does each attribute contribute to 0-99 rating:
assists
blocked
faceOffPct
games
gameWinningGoals
goals
hits
ot
overTimeGoals
pim
plusMinus
powerPlayGoals
powerPlayPoints
powerPlaySavePercentage
savePercentage
shortHandedSavePercentage
shortHandedTimeOnIcePerGame
shotPct
shots
shotsAgainst
shutouts
timeOnIcePerGame
wins/games


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