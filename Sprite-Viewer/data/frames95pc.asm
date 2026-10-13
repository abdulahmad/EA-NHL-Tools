; NHL 95 DOS sprite ranges from Docs/Sprites/Readme.md.
; Frame numbers here are 1-based, so docs index 0 is frame 1.
; SPFlimit is only the end of the last range. There is no SPA table:
; those scripts live in HOCKEY.EXE, not in the PPV files.

SPFskaters	=	1	; 000-351 player sprites, same pictures as NHL 94 DOS
SPFdosarrow	=	353	; 352-355 arrows
SPFmouse	=	357	; 356 mouse crosshair
SPFcupaccept	=	358	; 357-358 accepting the Stanley Cup
SPFfaceoff	=	360	; 359-368 faceoff
SPFanthem	=	370	; 369-371 national anthem
SPFlinechange	=	373	; 372-379 goalie and player line change
SPFanthem2	=	381	; 380-381 national anthem
SPFbench	=	383	; 382 player on the bench
SPFarrow	=	384	; 383-388 arrows, same as 93/94
SPFpad	=	390	; 389-391 star
SPFreplay	=	393	; 392 instant replay crosshair
SPFpuck	=	394	; 393-403 puck, plus the unused index before the net
SPFnet	=	406	; 405-406 nets
SPFgoalie	=	408	; 407-553 goalie, same as 93
SPFsiren	=	555	; 554-567 goal light
SPFextra	=	569	; 568-643 swat, hook, wobble, flip, injury
SPFglass	=	645	; 644-648 broken glass
SPFref	=	650	; 649-698 referee
SPFbetween	=	700	; 699-702 between plays at the bench
SPFrefui	=	704	; 703-871 referee and mouse UI
SPFcupskate	=	873	; 872-875 skating with the Stanley Cup
SPFbenchcheck	=	877	; 876-886 checked into the bench
SPFcheer	=	888	; 887 celebration
SPFcrosscheck	=	889	; 888-903 upright crosscheck
SPFboards	=	905	; 904-973 checked into the boards
SPFgoalie95	=	975	; 974-1071 goalie animations added in 95
SPFshotblock	=	1073	; 1072-1127 shot blocking
SPFref95	=	1129	; 1128-1133 referee animations added in 95
SPFlimit	=	1135

SPAlist
	dc.w	0
