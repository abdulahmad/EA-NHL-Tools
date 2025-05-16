# Sprite Investigation:

## NHL 92:
Sprites.anim: Frame 0-548
0-376: player sprites
377-382: arrows
383-385: star
386-396: puck
397-398: net
399-510: goalie sprites
511-534: team centre ice
535-548: goal light

## NHLPA 93:
0-369: identical player sprites as 92
370-375: new fight loss injury sprites
376-382: same as 92 370-376
383-388: arrows
389-391: star
392: new instant replay cross hair
393-403: puck
404-405: net
406-553: goalie sprites (518-553 new save/stick tap anims for 93)
554-567: goal light
568-643: new player animations for 93 (swat puck, hooking, wobble, flip, injury)
644-648: broken glass

## NHL 94 Genesis:
0-351: identical player sprites as 93
352-375: empty fighting sprites
376-382: identical player sprites as 93
383-388: arrows (identical to 93)
389-391: star (identical to 93)
392: instant replay cross hair (identical to 93)
393-403: puck (identical to 93)
404-405: net (identical to 93)
406-537: goalie sprites (identical to 93)
538-561: new goalie twitch animation (goalie animation from 93 in this spot may have been cut?)
562-575: goal light (identical to 93)
576-651: player sprites (swat puck, hooking, wobble, flip, injury) -- same as 568-643 for 93, but without blood on injury
652-656: broken glass (identical to 93)
657-712: new goalie animations (shoulder save, stick save, pokecheck)
713-836: new player animations (one-timer, check into boards)
837-844: player 3/4 arrows/star

## NHL 94 DOS:
Sprites 000-875
Crowd Sprites F000-F149
0-351: identical player sprites as 93/94
352-355: arrows
356: mouse control crosshair
357-358: player accepting stanley cup
359-368: faceoff sprites (new for PC)
369-371: national anthem sprites (new for PC)
372-379: goalie/player line change (are these new?)
380-381: national anthem sprites (new for PC)
382: player on bench/penalty box
383-388: arrows (identical to 93/94)
389-391: star (identical to 93/94)
392: instant replay cross hair (identical to 93/94)
393-403: puck (identical to 93/94)
405-406: net (identical to 93/94)
407-553: goalie sprites (identical to 93)
554-567: goal light (same index as 93 but sprites look modified)
568-643: player animations (swat puck, hooking, wobble, flip, injury) -- identical to 93
644-648: broken glass (same index as 93 but sprites look modified)
649-698: referee animations (new for PC)
699-702: between play at bench animations (new for PC)
703-871: referee animations, mouse control UI (new for PC)
872-875: stanley cup skating sprites (new for PC)

## NHL 95 DOS:
Sprites 000-875 are identical to 94 (not 100% verified)
876-886: player checked into bench (new for 95 PC)
887: player celebration
888-903: upright crosscheck (new for 95 PC)
904-973: checked into boards (new for 95 PC-- 94 Genesis has similar sprites but seems like these were created from scratch)
974-1071: goalie animations (new for 95 PC-- are these from SNES version?)
1072-1127: shot blocking (new for 95 PC)
1128-1133: referee animations (new for 95 PC)


# Routine investigation:
part of playeracc routine hex bytes are:

3400 3601 C5C2 C7C3 D782 -- first 16 bytes are exact