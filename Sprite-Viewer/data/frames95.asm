;	Sprite animation tables. For every animation there is a table that gives the frames to show
;	in each direction and how long to show each one, and most player animations have a second
;	table for the puck carrier. The table for reverse angle replays comes last.

; Sprite Frame (SPF) base indices, in frame sheet order, with the and value where 95 has the group. 95 moves the plain
; skating frames first and gives the skating groups 8 frames per direction (94: 5); a "New in 95" group is new frames.
; Names for the new groups follow the tables that use them, or the PC animation names (SPFblock). Sets the
; arrow, star, replay cursor, net and puck frames, which no table uses. SPFglovel2 is inferred from 94 (the 4 frames
; after gdive). Frames 670-673, 886-889 and 970-999 are not used by a 95 table or the code.
SPFskate	=	1	; 1 (94: 41)
SPFglide	=	SPFskate+64	; 65 glide, and the first frame of the falls
SPFstop	=	SPFglide+8	; 73 (94: 145)
SPFturnr	=	SPFstop+16	; 89 (94: 89, after turnl)
SPFturnl	=	SPFturnr+8	; 97 (94: 81)
SPFarrow	=	SPFturnl+8	; 105 not used by a 95 table (94: 384)
SPFpad	=	SPFarrow+6	; 111 not used by a 95 table (94: 390): joypad 1 and 2 stars, puck star
SPFreplay	=	SPFpad+3	; 114 not used by a 95 table (94: 393)
SPFarrow34	=	SPFreplay+1	; 115 not used by a 95 table: joypad 3 and 4 arrows (pad 4 is +3)
SPFpad34	=	SPFreplay+7	; 121 not used by a 95 table: joypad 3 and 4 stars
SPFshoulderl	=	SPFpad34+2	; 123 (94: 241)
SPFshoulderr	=	SPFshoulderl+8	; 131 (94: 249)
SPFhook	=	SPFshoulderr+8	; 139 (94: 593)
SPFhold	=	SPFhook+16	; 155 (94: 345)
SPFsweep	=	SPFhold+8	; 163 (94: 257)
SPFfallfwd	=	SPFsweep+16	; 179 (94: 305)
SPFfallback	=	SPFfallfwd+48	; 227 (94: 273)

SPFburst	=	SPFfallback+40	; 267 burst, skate, skateturn
SPFskatewp	=	SPFburst+64	; 331 (94: 1)
SPFglidewp	=	SPFskatewp+64	; 395
SPFstopwp	=	SPFglidewp+8	; 403
SPFturnrwp	=	SPFstopwp+16	; 419
SPFturnlwp	=	SPFturnrwp+8	; 427
SPFpuck	=	SPFturnlwp+8	; 435 (94: 394)
SPFgoal	=	SPFpuck+11	; 446 not used by a 95 table (94: 405)
SPFswing	=	SPFgoal+2	; 448 (94: 97)
SPFskateb	=	SPFswing+48	; 496 (94: 161)
SPFstumble	=	SPFskateb+48	; 544 (94: 609)
SPFswingb	=	SPFstumble+32	; 576 The backhand pass and shot (94 passb and shotb use SPFswing)
SPFflip	=	SPFswingb+24	; 600 (94: 633)

SPFGoalie	=	SPFflip+6	; 606 (94: 407): gready, gglovel, gglover, gstickl, gstickr
SPFgdive	=	SPFGoalie+40	; 646 (94: 519)
SPFglovel2	=	SPFgdive+24	; 670 not used by a 95 table (94: 535), inferred; 95 has no gglovel2
SPFblock	=	SPFglovel2+4	; 674 The shot block
SPFSiren	=	SPFblock+24	; 698 (94: 563)
SPFgstack	=	SPFSiren+14	; 712(94 gstackr, gstackl, gswing use SPFGoalie)
SPFboard	=	SPFgstack+40	; 752 boardtop, boardright, boardbot, boardleft
SPFboardchk	=	SPFboard+56	; 808
SPFcatch	=	SPFboardchk+8	; 816 (94: 577)
SPFshoulder2	=	SPFcatch+16	; 832 shoulderchkl2, shoulderchkr2
SPFcelebrate	=	SPFshoulder2+4	; 836 (94: 185)
SPFgskate	=	SPFcelebrate+16	; 852(94 gskate uses SPFGoalie)
SPFgextra2	=	SPFgskate+24	; 876
SPFgstackalt	=	SPFgextra2+4	; 880 gstackalt1, gstackalt2
SPFinjury1	=	SPFgstackalt+10	; 890 (94: 641)
SPFgslamtop	=	SPFinjury1+8	; 898(94 gslamtop uses SPFGoalie)
SPFgready	=	SPFgslamtop+6	; 904 (94: 539)
SPFpump	=	SPFgready+18	; 922 (94: 201)
SPFcup	=	SPFpump+16	; 938 (94: 217)
SPFpump2	=	SPFcup+16	; 954
SPFbglass	=	SPFpump2+46	; 1000 (94: 653)
SPFPen	=	SPFbglass+5	; 1005 (94: 377)
SPFboardmid	=	SPFPen+7	; 1012 boardmidl, boardmidr
SPFgextra1	=	SPFboardmid+28	; 1040
SPFgslambot	=	SPFgextra1+4	; 1044
SPFfaceoff	=	SPFgslambot+6	; 1050 The last frame a 95 table uses is 1055

SPAlist	;Movea.l #SPAlist (#$5A34) in the replay and input code
	dc.w	0

SPAskate	=	*-SPAlist	; noturn0 move.w #2,d1. Table 0 in 95 (94 put gready here)
SPAskate_table:	;Frames 1-330
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	$1003

.0	dc.w	SPFskate,8,SPFskate+1,8,SPFskate+2,8,SPFskate+3,8,SPFskate+4,8,SPFskate+5,8,SPFskate+6,8,SPFskate+7,8
	dc.w	SPFskate,7,SPFskate+1,7,SPFskate+2,7,SPFskate+3,7,SPFskate+4,7,SPFskate+5,7,SPFskate+6,7,SPFskate+7,7
	dc.w	SPFburst,6,SPFburst+1,6,SPFburst+2,6,SPFburst+3,6,SPFburst+4,6,SPFburst+5,6,SPFburst+6,6,SPFburst+7,-6
.1	dc.w	SPFskate+8,8,SPFskate+9,8,SPFskate+10,8,SPFskate+11,8,SPFskate+12,8,SPFskate+13,8,SPFskate+14,8,SPFskate+15,8
	dc.w	SPFskate+8,7,SPFskate+9,7,SPFskate+10,7,SPFskate+11,7,SPFskate+12,7,SPFskate+13,7,SPFskate+14,7,SPFskate+15,7
	dc.w	SPFburst+8,6,SPFburst+9,6,SPFburst+10,6,SPFburst+11,6,SPFburst+12,6,SPFburst+13,6,SPFburst+14,6,SPFburst+15,-6
.2	dc.w	SPFskate+16,8,SPFskate+17,8,SPFskate+18,8,SPFskate+19,8,SPFskate+20,8,SPFskate+21,8,SPFskate+22,8,SPFskate+23,8
	dc.w	SPFskate+16,7,SPFskate+17,7,SPFskate+18,7,SPFskate+19,7,SPFskate+20,7,SPFskate+21,7,SPFskate+22,7,SPFskate+23,7
	dc.w	SPFburst+16,6,SPFburst+17,6,SPFburst+18,6,SPFburst+19,6,SPFburst+20,6,SPFburst+21,6,SPFburst+22,6,SPFburst+23,-6
.3	dc.w	SPFskate+24,8,SPFskate+25,8,SPFskate+26,8,SPFskate+27,8,SPFskate+28,8,SPFskate+29,8,SPFskate+30,8,SPFskate+31,8
	dc.w	SPFskate+24,7,SPFskate+25,7,SPFskate+26,7,SPFskate+27,7,SPFskate+28,7,SPFskate+29,7,SPFskate+30,7,SPFskate+31,7
	dc.w	SPFburst+24,6,SPFburst+25,6,SPFburst+26,6,SPFburst+27,6,SPFburst+28,6,SPFburst+29,6,SPFburst+30,6,SPFburst+31,-6
.4	dc.w	SPFskate+32,8,SPFskate+33,8,SPFskate+34,8,SPFskate+35,8,SPFskate+36,8,SPFskate+37,8,SPFskate+38,8,SPFskate+39,8
	dc.w	SPFskate+32,7,SPFskate+33,7,SPFskate+34,7,SPFskate+35,7,SPFskate+36,7,SPFskate+37,7,SPFskate+38,7,SPFskate+39,7
	dc.w	SPFburst+32,6,SPFburst+33,6,SPFburst+34,6,SPFburst+35,6,SPFburst+36,6,SPFburst+37,6,SPFburst+38,6,SPFburst+39,-6
.5	dc.w	SPFskate+40,4,SPFskate+41,4,SPFskate+42,4,SPFskate+43,4,SPFskate+44,4,SPFskate+45,4,SPFskate+46,4,SPFskate+47,4
	dc.w	SPFskate+40,7,SPFskate+41,7,SPFskate+42,7,SPFskate+43,7,SPFskate+44,7,SPFskate+45,7,SPFskate+46,7,SPFskate+47,7
	dc.w	SPFburst+40,6,SPFburst+41,6,SPFburst+42,6,SPFburst+43,6,SPFburst+44,6,SPFburst+45,6,SPFburst+46,6,SPFburst+47,-6
.6	dc.w	SPFskate+48,4,SPFskate+49,4,SPFskate+50,4,SPFskate+51,4,SPFskate+52,4,SPFskate+53,4,SPFskate+54,4,SPFskate+55,4
	dc.w	SPFskate+48,7,SPFskate+49,7,SPFskate+50,7,SPFskate+51,7,SPFskate+52,7,SPFskate+53,7,SPFskate+54,7,SPFskate+55,7
	dc.w	SPFburst+48,6,SPFburst+49,6,SPFburst+50,6,SPFburst+51,6,SPFburst+52,6,SPFburst+53,6,SPFburst+54,6,SPFburst+55,-6
.7	dc.w	SPFskate+56,4,SPFskate+57,4,SPFskate+58,4,SPFskate+59,4,SPFskate+60,4,SPFskate+61,4,SPFskate+62,4,SPFskate+63,4
	dc.w	SPFskate+56,7,SPFskate+57,7,SPFskate+58,7,SPFskate+59,7,SPFskate+60,7,SPFskate+61,7,SPFskate+62,7,SPFskate+63,7
	dc.w	SPFburst+56,6,SPFburst+57,6,SPFburst+58,6,SPFburst+59,6,SPFburst+60,6,SPFburst+61,6,SPFburst+62,6,SPFburst+63,-6

SPAskateturn	=	*-SPAlist	; noturn0.8 sets it in place of the skate tables when the current SPA is a turn
SPAskateturn_table:	;Frames 267-330
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFburst,6,SPFburst+1,6,SPFburst+2,6,SPFburst+3,6,SPFburst+4,6,SPFburst+5,6,SPFburst+6,6,SPFburst+7,-6
.1	dc.w	SPFburst+8,6,SPFburst+9,6,SPFburst+10,6,SPFburst+11,6,SPFburst+12,6,SPFburst+13,6,SPFburst+14,6,SPFburst+15,-6
.2	dc.w	SPFburst+16,6,SPFburst+17,6,SPFburst+18,6,SPFburst+19,6,SPFburst+20,6,SPFburst+21,6,SPFburst+22,6,SPFburst+23,-6
.3	dc.w	SPFburst+24,6,SPFburst+25,6,SPFburst+26,6,SPFburst+27,6,SPFburst+28,6,SPFburst+29,6,SPFburst+30,6,SPFburst+31,-6
.4	dc.w	SPFburst+32,6,SPFburst+33,6,SPFburst+34,6,SPFburst+35,6,SPFburst+36,6,SPFburst+37,6,SPFburst+38,6,SPFburst+39,-6
.5	dc.w	SPFburst+40,6,SPFburst+41,6,SPFburst+42,6,SPFburst+43,6,SPFburst+44,6,SPFburst+45,6,SPFburst+46,6,SPFburst+47,-6
.6	dc.w	SPFburst+48,6,SPFburst+49,6,SPFburst+50,6,SPFburst+51,6,SPFburst+52,6,SPFburst+53,6,SPFburst+54,6,SPFburst+55,-6
.7	dc.w	SPFburst+56,6,SPFburst+57,6,SPFburst+58,6,SPFburst+59,6,SPFburst+60,6,SPFburst+61,6,SPFburst+62,6,SPFburst+63,-6

SPAskate2	=	*-SPAlist	; noturn0 uses it in place of SPAskate when sflags bit 7 is set
SPAskate2_table:	;Frames 1-64
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskate,8,SPFskate+1,8,SPFskate+2,8,SPFskate+3,8,SPFskate+4,8,SPFskate+5,8,SPFskate+6,8,SPFskate+7,8
	dc.w	SPFskate,7,SPFskate+1,7,SPFskate+2,7,SPFskate+3,7,SPFskate+4,7,SPFskate+5,7,SPFskate+6,7,SPFskate+7,7
	dc.w	SPFskate,6,SPFskate+1,6,SPFskate+2,6,SPFskate+3,6,SPFskate+4,6,SPFskate+5,6,SPFskate+6,6,SPFskate+7,-6
.1	dc.w	SPFskate+8,8,SPFskate+9,8,SPFskate+10,8,SPFskate+11,8,SPFskate+12,8,SPFskate+13,8,SPFskate+14,8,SPFskate+15,8
	dc.w	SPFskate+8,7,SPFskate+9,7,SPFskate+10,7,SPFskate+11,7,SPFskate+12,7,SPFskate+13,7,SPFskate+14,7,SPFskate+15,7
	dc.w	SPFskate+8,6,SPFskate+9,6,SPFskate+10,6,SPFskate+11,6,SPFskate+12,6,SPFskate+13,6,SPFskate+14,6,SPFskate+15,-6
.2	dc.w	SPFskate+16,8,SPFskate+17,8,SPFskate+18,8,SPFskate+19,8,SPFskate+20,8,SPFskate+21,8,SPFskate+22,8,SPFskate+23,8
	dc.w	SPFskate+16,7,SPFskate+17,7,SPFskate+18,7,SPFskate+19,7,SPFskate+20,7,SPFskate+21,7,SPFskate+22,7,SPFskate+23,7
	dc.w	SPFskate+16,6,SPFskate+17,6,SPFskate+18,6,SPFskate+19,6,SPFskate+20,6,SPFskate+21,6,SPFskate+22,6,SPFskate+23,-6
.3	dc.w	SPFskate+24,8,SPFskate+25,8,SPFskate+26,8,SPFskate+27,8,SPFskate+28,8,SPFskate+29,8,SPFskate+30,8,SPFskate+31,8
	dc.w	SPFskate+24,7,SPFskate+25,7,SPFskate+26,7,SPFskate+27,7,SPFskate+28,7,SPFskate+29,7,SPFskate+30,7,SPFskate+31,7
	dc.w	SPFskate+24,6,SPFskate+25,6,SPFskate+26,6,SPFskate+27,6,SPFskate+28,6,SPFskate+29,6,SPFskate+30,6,SPFskate+31,-6
.4	dc.w	SPFskate+32,8,SPFskate+33,8,SPFskate+34,8,SPFskate+35,8,SPFskate+36,8,SPFskate+37,8,SPFskate+38,8,SPFskate+39,8
	dc.w	SPFskate+32,7,SPFskate+33,7,SPFskate+34,7,SPFskate+35,7,SPFskate+36,7,SPFskate+37,7,SPFskate+38,7,SPFskate+39,7
	dc.w	SPFskate+32,6,SPFskate+33,6,SPFskate+34,6,SPFskate+35,6,SPFskate+36,6,SPFskate+37,6,SPFskate+38,6,SPFskate+39,-6
.5	dc.w	SPFskate+40,8,SPFskate+41,8,SPFskate+42,8,SPFskate+43,8,SPFskate+44,8,SPFskate+45,8,SPFskate+46,8,SPFskate+47,8
	dc.w	SPFskate+40,7,SPFskate+41,7,SPFskate+42,7,SPFskate+43,7,SPFskate+44,7,SPFskate+45,7,SPFskate+46,7,SPFskate+47,7
	dc.w	SPFskate+40,6,SPFskate+41,6,SPFskate+42,6,SPFskate+43,6,SPFskate+44,6,SPFskate+45,6,SPFskate+46,6,SPFskate+47,-6
.6	dc.w	SPFskate+48,8,SPFskate+49,8,SPFskate+50,8,SPFskate+51,8,SPFskate+52,8,SPFskate+53,8,SPFskate+54,8,SPFskate+55,8
	dc.w	SPFskate+48,7,SPFskate+49,7,SPFskate+50,7,SPFskate+51,7,SPFskate+52,7,SPFskate+53,7,SPFskate+54,7,SPFskate+55,7
	dc.w	SPFskate+48,6,SPFskate+49,6,SPFskate+50,6,SPFskate+51,6,SPFskate+52,6,SPFskate+53,6,SPFskate+54,6,SPFskate+55,-6
.7	dc.w	SPFskate+56,8,SPFskate+57,8,SPFskate+58,8,SPFskate+59,8,SPFskate+60,8,SPFskate+61,8,SPFskate+62,8,SPFskate+63,8
	dc.w	SPFskate+56,7,SPFskate+57,7,SPFskate+58,7,SPFskate+59,7,SPFskate+60,7,SPFskate+61,7,SPFskate+62,7,SPFskate+63,7
	dc.w	SPFskate+56,6,SPFskate+57,6,SPFskate+58,6,SPFskate+59,6,SPFskate+60,6,SPFskate+61,6,SPFskate+62,6,SPFskate+63,-6

SPAskatewp	=	*-SPAlist	; noturn0 for the puck carrier. input burst.anim compares it
SPAskatewp_table:	;Frames 331-394
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	$1003

.0	dc.w	SPFskatewp,8,SPFskatewp+1,8,SPFskatewp+2,8,SPFskatewp+3,8,SPFskatewp+4,8,SPFskatewp+5,8,SPFskatewp+6,8,SPFskatewp+7,8
	dc.w	SPFskatewp,7,SPFskatewp+1,7,SPFskatewp+2,7,SPFskatewp+3,7,SPFskatewp+4,7,SPFskatewp+5,7,SPFskatewp+6,7,SPFskatewp+7,7
	dc.w	SPFskatewp,6,SPFskatewp+1,6,SPFskatewp+2,6,SPFskatewp+3,6,SPFskatewp+4,6,SPFskatewp+5,6,SPFskatewp+6,6,SPFskatewp+7,-6
.1	dc.w	SPFskatewp+8,8,SPFskatewp+9,8,SPFskatewp+10,8,SPFskatewp+11,8,SPFskatewp+12,8,SPFskatewp+13,8,SPFskatewp+14,8,SPFskatewp+15,8
	dc.w	SPFskatewp+8,7,SPFskatewp+9,7,SPFskatewp+10,7,SPFskatewp+11,7,SPFskatewp+12,7,SPFskatewp+13,7,SPFskatewp+14,7,SPFskatewp+15,7
	dc.w	SPFskatewp+8,6,SPFskatewp+9,6,SPFskatewp+10,6,SPFskatewp+11,6,SPFskatewp+12,6,SPFskatewp+13,6,SPFskatewp+14,6,SPFskatewp+15,-6
.2	dc.w	SPFskatewp+16,8,SPFskatewp+17,8,SPFskatewp+18,8,SPFskatewp+19,8,SPFskatewp+20,8,SPFskatewp+21,8,SPFskatewp+22,8,SPFskatewp+23,8
	dc.w	SPFskatewp+16,7,SPFskatewp+17,7,SPFskatewp+18,7,SPFskatewp+19,7,SPFskatewp+20,7,SPFskatewp+21,7,SPFskatewp+22,7,SPFskatewp+23,7
	dc.w	SPFskatewp+16,6,SPFskatewp+17,6,SPFskatewp+18,6,SPFskatewp+19,6,SPFskatewp+20,6,SPFskatewp+21,6,SPFskatewp+22,6,SPFskatewp+23,-6
.3	dc.w	SPFskatewp+24,8,SPFskatewp+25,8,SPFskatewp+26,8,SPFskatewp+27,8,SPFskatewp+28,8,SPFskatewp+29,8,SPFskatewp+30,8,SPFskatewp+31,8
	dc.w	SPFskatewp+24,7,SPFskatewp+25,7,SPFskatewp+26,7,SPFskatewp+27,7,SPFskatewp+28,7,SPFskatewp+29,7,SPFskatewp+30,7,SPFskatewp+31,7
	dc.w	SPFskatewp+24,6,SPFskatewp+25,6,SPFskatewp+26,6,SPFskatewp+27,6,SPFskatewp+28,6,SPFskatewp+29,6,SPFskatewp+30,6,SPFskatewp+31,-6
.4	dc.w	SPFskatewp+32,8,SPFskatewp+33,8,SPFskatewp+34,8,SPFskatewp+35,8,SPFskatewp+36,8,SPFskatewp+37,8,SPFskatewp+38,8,SPFskatewp+39,8
	dc.w	SPFskatewp+32,7,SPFskatewp+33,7,SPFskatewp+34,7,SPFskatewp+35,7,SPFskatewp+36,7,SPFskatewp+37,7,SPFskatewp+38,7,SPFskatewp+39,7
	dc.w	SPFskatewp+32,6,SPFskatewp+33,6,SPFskatewp+34,6,SPFskatewp+35,6,SPFskatewp+36,6,SPFskatewp+37,6,SPFskatewp+38,6,SPFskatewp+39,-6
.5	dc.w	SPFskatewp+40,8,SPFskatewp+41,8,SPFskatewp+42,8,SPFskatewp+43,8,SPFskatewp+44,8,SPFskatewp+45,8,SPFskatewp+46,8,SPFskatewp+47,8
	dc.w	SPFskatewp+40,7,SPFskatewp+41,7,SPFskatewp+42,7,SPFskatewp+43,7,SPFskatewp+44,7,SPFskatewp+45,7,SPFskatewp+46,7,SPFskatewp+47,7
	dc.w	SPFskatewp+40,6,SPFskatewp+41,6,SPFskatewp+42,6,SPFskatewp+43,6,SPFskatewp+44,6,SPFskatewp+45,6,SPFskatewp+46,6,SPFskatewp+47,-6
.6	dc.w	SPFskatewp+48,8,SPFskatewp+49,8,SPFskatewp+50,8,SPFskatewp+51,8,SPFskatewp+52,8,SPFskatewp+53,8,SPFskatewp+54,8,SPFskatewp+55,8
	dc.w	SPFskatewp+48,7,SPFskatewp+49,7,SPFskatewp+50,7,SPFskatewp+51,7,SPFskatewp+52,7,SPFskatewp+53,7,SPFskatewp+54,7,SPFskatewp+55,7
	dc.w	SPFskatewp+48,6,SPFskatewp+49,6,SPFskatewp+50,6,SPFskatewp+51,6,SPFskatewp+52,6,SPFskatewp+53,6,SPFskatewp+54,6,SPFskatewp+55,-6
.7	dc.w	SPFskatewp+56,8,SPFskatewp+57,8,SPFskatewp+58,8,SPFskatewp+59,8,SPFskatewp+60,8,SPFskatewp+61,8,SPFskatewp+62,8,SPFskatewp+63,8
	dc.w	SPFskatewp+56,7,SPFskatewp+57,7,SPFskatewp+58,7,SPFskatewp+59,7,SPFskatewp+60,7,SPFskatewp+61,7,SPFskatewp+62,7,SPFskatewp+63,7
	dc.w	SPFskatewp+56,6,SPFskatewp+57,6,SPFskatewp+58,6,SPFskatewp+59,6,SPFskatewp+60,6,SPFskatewp+61,6,SPFskatewp+62,6,SPFskatewp+63,-6

SPAskatewp2	=	*-SPAlist	; No reference found; frames 331-394 as SPAskatewp (the with puck partner of SPAskate2)
SPAskatewp2_table:	;Frames 331-394
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskatewp,6,SPFskatewp+1,6,SPFskatewp+2,6,SPFskatewp+3,6,SPFskatewp+4,6,SPFskatewp+5,6,SPFskatewp+6,6,SPFskatewp+7,-6
.1	dc.w	SPFskatewp+8,6,SPFskatewp+9,6,SPFskatewp+10,6,SPFskatewp+11,6,SPFskatewp+12,6,SPFskatewp+13,6,SPFskatewp+14,6,SPFskatewp+15,-6
.2	dc.w	SPFskatewp+16,6,SPFskatewp+17,6,SPFskatewp+18,6,SPFskatewp+19,6,SPFskatewp+20,6,SPFskatewp+21,6,SPFskatewp+22,6,SPFskatewp+23,-6
.3	dc.w	SPFskatewp+24,6,SPFskatewp+25,6,SPFskatewp+26,6,SPFskatewp+27,6,SPFskatewp+28,6,SPFskatewp+29,6,SPFskatewp+30,6,SPFskatewp+31,-6
.4	dc.w	SPFskatewp+32,6,SPFskatewp+33,6,SPFskatewp+34,6,SPFskatewp+35,6,SPFskatewp+36,6,SPFskatewp+37,6,SPFskatewp+38,6,SPFskatewp+39,-6
.5	dc.w	SPFskatewp+40,6,SPFskatewp+41,6,SPFskatewp+42,6,SPFskatewp+43,6,SPFskatewp+44,6,SPFskatewp+45,6,SPFskatewp+46,6,SPFskatewp+47,-6
.6	dc.w	SPFskatewp+48,6,SPFskatewp+49,6,SPFskatewp+50,6,SPFskatewp+51,6,SPFskatewp+52,6,SPFskatewp+53,6,SPFskatewp+54,6,SPFskatewp+55,-6
.7	dc.w	SPFskatewp+56,6,SPFskatewp+57,6,SPFskatewp+58,6,SPFskatewp+59,6,SPFskatewp+60,6,SPFskatewp+61,6,SPFskatewp+62,6,SPFskatewp+63,-6

SPAglide	=	*-SPAlist	; doplayeracc, dostop
SPAglide_table:	;Frames 65-72
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFglide,-8
.1	dc.w	SPFglide+1,-8
.2	dc.w	SPFglide+2,-8
.3	dc.w	SPFglide+3,-8
.4	dc.w	SPFglide+4,-8
.5	dc.w	SPFglide+5,-8
.6	dc.w	SPFglide+6,-8
.7	dc.w	SPFglide+7,-8

SPAglidewp	=	*-SPAlist	; SPAglide for the puck carrier (SCnum = puckc): doplayeracc, dostop, doshot
SPAglidewp_table:	;Frames 395-402
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFglidewp,-8
.1	dc.w	SPFglidewp+1,-8
.2	dc.w	SPFglidewp+2,-8
.3	dc.w	SPFglidewp+3,-8
.4	dc.w	SPFglidewp+4,-8
.5	dc.w	SPFglidewp+5,-8
.6	dc.w	SPFglidewp+6,-8
.7	dc.w	SPFglidewp+7,-8

SPAturnl	=	*-SPAlist	; doplayeracc SPAturnr eori -$52
SPAturnl_table:	;Frames 97-104
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFturnl,4,SPFturnl,-4
.1	dc.w	SPFturnl+1,4,SPFturnl+1,-4
.2	dc.w	SPFturnl+2,4,SPFturnl+2,-4
.3	dc.w	SPFturnl+3,4,SPFturnl+3,-4
.4	dc.w	SPFturnl+4,4,SPFturnl+4,-4
.5	dc.w	SPFturnl+5,4,SPFturnl+5,-4
.6	dc.w	SPFturnl+6,4,SPFturnl+6,-4
.7	dc.w	SPFturnl+7,4,SPFturnl+7,-4

SPAturnr	=	*-SPAlist	; doplayeracc addi.w #SPAturnr
SPAturnr_table:	;Frames 89-96
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFturnr,4,SPFturnr,-4
.1	dc.w	SPFturnr+1,4,SPFturnr+1,-4
.2	dc.w	SPFturnr+2,4,SPFturnr+2,-4
.3	dc.w	SPFturnr+3,4,SPFturnr+3,-4
.4	dc.w	SPFturnr+4,4,SPFturnr+4,-4
.5	dc.w	SPFturnr+5,4,SPFturnr+5,-4
.6	dc.w	SPFturnr+6,4,SPFturnr+6,-4
.7	dc.w	SPFturnr+7,4,SPFturnr+7,-4

SPAturnlwp	=	*-SPAlist	; SPAturnl + $A4 for the puck carrier (doplayeracc)
SPAturnlwp_table:	;Frames 427-434
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFturnlwp,4,SPFturnlwp,-4
.1	dc.w	SPFturnlwp+1,4,SPFturnlwp+1,-4
.2	dc.w	SPFturnlwp+2,4,SPFturnlwp+2,-4
.3	dc.w	SPFturnlwp+3,4,SPFturnlwp+3,-4
.4	dc.w	SPFturnlwp+4,4,SPFturnlwp+4,-4
.5	dc.w	SPFturnlwp+5,4,SPFturnlwp+5,-4
.6	dc.w	SPFturnlwp+6,4,SPFturnlwp+6,-4
.7	dc.w	SPFturnlwp+7,4,SPFturnlwp+7,-4

SPAturnrwp	=	*-SPAlist	; SPAturnr + $A4 for the puck carrier (doplayeracc)
SPAturnrwp_table:	;Frames 419-426
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFturnrwp,4,SPFturnrwp,-4
.1	dc.w	SPFturnrwp+1,4,SPFturnrwp+1,-4
.2	dc.w	SPFturnrwp+2,4,SPFturnrwp+2,-4
.3	dc.w	SPFturnrwp+3,4,SPFturnrwp+3,-4
.4	dc.w	SPFturnrwp+4,4,SPFturnrwp+4,-4
.5	dc.w	SPFturnrwp+5,4,SPFturnrwp+5,-4
.6	dc.w	SPFturnrwp+6,4,SPFturnrwp+6,-4
.7	dc.w	SPFturnrwp+7,4,SPFturnrwp+7,-4

SPAstop	=	*-SPAlist	; dostop
SPAstop_table:	;Frames 73-88
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	$103

.0	dc.w	SPFstop,4,SPFstop+1,-4
.1	dc.w	SPFstop+2,4,SPFstop+3,-4
.2	dc.w	SPFstop+4,4,SPFstop+5,-4
.3	dc.w	SPFstop+6,4,SPFstop+7,-4
.4	dc.w	SPFstop+8,4,SPFstop+9,-4
.5	dc.w	SPFstop+10,4,SPFstop+11,-4
.6	dc.w	SPFstop+12,4,SPFstop+13,-4
.7	dc.w	SPFstop+14,4,SPFstop+15,-4

SPAstopwp	=	*-SPAlist	; SPAstop for the puck carrier (dostop)
SPAstopwp_table:	;Frames 403-418
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	$103

.0	dc.w	SPFstopwp,4,SPFstopwp+1,-4
.1	dc.w	SPFstopwp+2,4,SPFstopwp+3,-4
.2	dc.w	SPFstopwp+4,4,SPFstopwp+5,-4
.3	dc.w	SPFstopwp+6,4,SPFstopwp+7,-4
.4	dc.w	SPFstopwp+8,4,SPFstopwp+9,-4
.5	dc.w	SPFstopwp+10,4,SPFstopwp+11,-4
.6	dc.w	SPFstopwp+12,4,SPFstopwp+13,-4
.7	dc.w	SPFstopwp+14,4,SPFstopwp+15,-4

SPAshoulderchkl	=	*-SPAlist	; checkinglist uses it for the 94 shoulderchkl and hipchkl slots
SPAshoulderchkl_table:	;Frames 123-130
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFshoulderl,-24
.1	dc.w	SPFshoulderl+1,-24
.2	dc.w	SPFshoulderl+2,-24
.3	dc.w	SPFshoulderl+3,-24
.4	dc.w	SPFshoulderl+4,-24
.5	dc.w	SPFshoulderl+5,-24
.6	dc.w	SPFshoulderl+6,-24
.7	dc.w	SPFshoulderl+7,-24

SPAshoulderchkr	=	*-SPAlist	; checkinglist uses it for the 94 shoulderchkr and hipchkr slots
SPAshoulderchkr_table:	;Frames 131-138
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFshoulderr,-24
.1	dc.w	SPFshoulderr+1,-24
.2	dc.w	SPFshoulderr+2,-24
.3	dc.w	SPFshoulderr+3,-24
.4	dc.w	SPFshoulderr+4,-24
.5	dc.w	SPFshoulderr+5,-24
.6	dc.w	SPFshoulderr+6,-24
.7	dc.w	SPFshoulderr+7,-24

SPAHold	=	*-SPAlist	; Acheck, holdcheck, CCStart
SPAHold_table:	;Frames 155-162
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhold,-30
.1	dc.w	SPFhold+1,-30
.2	dc.w	SPFhold+2,-30
.3	dc.w	SPFhold+3,-30
.4	dc.w	SPFhold+4,-30
.5	dc.w	SPFhold+5,-30
.6	dc.w	SPFhold+6,-30
.7	dc.w	SPFhold+7,-30

SPAHold2	=	*-SPAlist	; holdcheck
SPAHold2_table:	;Frames 155-162
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhold,-55
.1	dc.w	SPFhold+1,-55
.2	dc.w	SPFhold+2,-55
.3	dc.w	SPFhold+3,-55
.4	dc.w	SPFhold+4,-55
.5	dc.w	SPFhold+5,-55
.6	dc.w	SPFhold+6,-55
.7	dc.w	SPFhold+7,-55

SPAhook	=	*-SPAlist	; holdplayer, Acheck, CCStart
SPAhook_table:	;Frames 139-153
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhook,-30
.1	dc.w	SPFhook+2,-30
.2	dc.w	SPFhook+4,-30
.3	dc.w	SPFhook+6,-30
.4	dc.w	SPFhook+8,-30
.5	dc.w	SPFhook+10,-30
.6	dc.w	SPFhook+12,-30
.7	dc.w	SPFhook+14,-30

SPAhook2	=	*-SPAlist	; holdcheck
SPAhook2_table:	;Frames 139-154
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhook,12,SPFhook+1,12,SPFhook,12,SPFhook+1,-12
.1	dc.w	SPFhook+2,12,SPFhook+3,12,SPFhook+2,12,SPFhook+3,-12
.2	dc.w	SPFhook+4,12,SPFhook+5,12,SPFhook+4,12,SPFhook+5,-12
.3	dc.w	SPFhook+6,12,SPFhook+7,12,SPFhook+6,12,SPFhook+7,-12
.4	dc.w	SPFhook+8,12,SPFhook+9,12,SPFhook+8,12,SPFhook+9,-12
.5	dc.w	SPFhook+10,12,SPFhook+11,12,SPFhook+10,12,SPFhook+11,-12
.6	dc.w	SPFhook+12,12,SPFhook+13,12,SPFhook+12,12,SPFhook+13,-12
.7	dc.w	SPFhook+14,12,SPFhook+15,12,SPFhook+14,12,SPFhook+15,-12

SPAsweepchk	=	*-SPAlist	; CCStart, B check
SPAsweepchk_table:	;Frames 163-178
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFsweep,4,SPFsweep+1,8,SPFsweep,-4
.1	dc.w	SPFsweep+2,4,SPFsweep+3,8,SPFsweep+2,-4
.2	dc.w	SPFsweep+4,4,SPFsweep+5,8,SPFsweep+4,-4
.3	dc.w	SPFsweep+6,4,SPFsweep+7,8,SPFsweep+6,-4
.4	dc.w	SPFsweep+8,4,SPFsweep+9,8,SPFsweep+8,-4
.5	dc.w	SPFsweep+10,4,SPFsweep+11,8,SPFsweep+10,-4
.6	dc.w	SPFsweep+12,4,SPFsweep+13,8,SPFsweep+12,-4
.7	dc.w	SPFsweep+14,4,SPFsweep+15,8,SPFsweep+14,-4

SPAfallfwd	=	*-SPAlist	; FallDown
SPAfallfwd_table:	;Frames 65-226
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFfallfwd,6,SPFfallfwd+1,6,SPFfallfwd+2,8,SPFfallfwd+3,100,SPFfallfwd+4,8,SPFfallfwd+5,8,SPFglide,-8
.1	dc.w	SPFfallfwd+6,6,SPFfallfwd+7,6,SPFfallfwd+8,8,SPFfallfwd+9,100,SPFfallfwd+10,8,SPFfallfwd+11,8,SPFglide+1,-8
.2	dc.w	SPFfallfwd+12,6,SPFfallfwd+13,6,SPFfallfwd+14,8,SPFfallfwd+15,100,SPFfallfwd+16,8,SPFfallfwd+17,8,SPFglide+2,-8
.3	dc.w	SPFfallfwd+18,6,SPFfallfwd+19,6,SPFfallfwd+20,8,SPFfallfwd+21,100,SPFfallfwd+22,8,SPFfallfwd+23,8,SPFglide+3,-8
.4	dc.w	SPFfallfwd+24,6,SPFfallfwd+25,6,SPFfallfwd+26,8,SPFfallfwd+27,100,SPFfallfwd+28,8,SPFfallfwd+29,8,SPFglide+4,-8
.5	dc.w	SPFfallfwd+30,6,SPFfallfwd+31,6,SPFfallfwd+32,8,SPFfallfwd+33,100,SPFfallfwd+34,8,SPFfallfwd+35,8,SPFglide+5,-8
.6	dc.w	SPFfallfwd+36,6,SPFfallfwd+37,6,SPFfallfwd+38,8,SPFfallfwd+39,100,SPFfallfwd+40,8,SPFfallfwd+41,8,SPFglide+6,-8
.7	dc.w	SPFfallfwd+42,6,SPFfallfwd+43,6,SPFfallfwd+44,8,SPFfallfwd+45,100,SPFfallfwd+46,8,SPFfallfwd+47,8,SPFglide+7,-8

SPAfallback	=	*-SPAlist	; FallDown
SPAfallback_table:	;Frames 65-266
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFfallback,6,SPFfallback+1,6,SPFfallback+2,8,SPFfallback+3,100,SPFfallback+4,8,SPFfallfwd+28,8,SPFfallfwd+29,8,SPFglide+4,-8
.1	dc.w	SPFfallback+5,6,SPFfallback+6,6,SPFfallback+7,8,SPFfallback+8,100,SPFfallback+9,8,SPFfallfwd+34,8,SPFfallfwd+35,8,SPFglide+5,-8
.2	dc.w	SPFfallback+10,6,SPFfallback+11,6,SPFfallback+12,8,SPFfallback+13,100,SPFfallback+14,8,SPFfallfwd+40,8,SPFfallfwd+41,8,SPFglide+6,-8
.3	dc.w	SPFfallback+15,6,SPFfallback+16,6,SPFfallback+17,8,SPFfallback+18,100,SPFfallback+19,8,SPFfallfwd+46,8,SPFfallfwd+47,8,SPFglide+7,-8
.4	dc.w	SPFfallback+20,6,SPFfallback+21,6,SPFfallback+22,8,SPFfallback+23,100,SPFfallback+24,8,SPFfallfwd+4,8,SPFfallfwd+5,8,SPFglide,-8
.5	dc.w	SPFfallback+25,6,SPFfallback+26,6,SPFfallback+27,8,SPFfallback+28,100,SPFfallback+29,8,SPFfallfwd+10,8,SPFfallfwd+11,8,SPFglide+1,-8
.6	dc.w	SPFfallback+30,6,SPFfallback+31,6,SPFfallback+32,8,SPFfallback+33,100,SPFfallback+34,8,SPFfallfwd+16,8,SPFfallfwd+17,8,SPFglide+2,-8
.7	dc.w	SPFfallback+35,6,SPFfallback+36,6,SPFfallback+37,8,SPFfallback+38,100,SPFfallback+39,8,SPFfallfwd+22,8,SPFfallfwd+23,8,SPFglide+3,-8

SPAburst	=	*-SPAlist	; burst.skate, CCStart
SPAburst_table:	;Frames 267-330
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFburst,3,SPFburst+1,3,SPFburst+2,3,SPFburst+3,3,SPFburst+4,-3,SPFburst+5,3,SPFburst+6,3,SPFburst+7,-3
.1	dc.w	SPFburst+8,3,SPFburst+9,3,SPFburst+10,3,SPFburst+11,3,SPFburst+12,-3,SPFburst+13,3,SPFburst+14,3,SPFburst+15,-3
.2	dc.w	SPFburst+16,3,SPFburst+17,3,SPFburst+18,3,SPFburst+19,3,SPFburst+20,-3,SPFburst+21,3,SPFburst+22,3,SPFburst+23,-3
.3	dc.w	SPFburst+24,3,SPFburst+25,3,SPFburst+26,3,SPFburst+27,3,SPFburst+28,-3,SPFburst+29,3,SPFburst+30,3,SPFburst+31,-3
.4	dc.w	SPFburst+32,3,SPFburst+33,3,SPFburst+34,3,SPFburst+35,3,SPFburst+36,-3,SPFburst+37,3,SPFburst+38,3,SPFburst+39,-3
.5	dc.w	SPFburst+40,3,SPFburst+41,3,SPFburst+42,3,SPFburst+43,3,SPFburst+44,-3,SPFburst+45,3,SPFburst+46,3,SPFburst+47,-3
.6	dc.w	SPFburst+48,3,SPFburst+49,3,SPFburst+50,3,SPFburst+51,3,SPFburst+52,-3,SPFburst+53,3,SPFburst+54,3,SPFburst+55,-3
.7	dc.w	SPFburst+56,3,SPFburst+57,3,SPFburst+58,3,SPFburst+59,3,SPFburst+60,-3,SPFburst+61,3,SPFburst+62,3,SPFburst+63,-3

SPApflip	=	*-SPAlist	; puckflip
SPApflip_table:	;Frames 436-445
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	1

.0	dc.w	SPFpuck+2,4,SPFpuck+3,4,SPFpuck+4,4,SPFpuck+5,4,SPFpuck+6,4,SPFpuck+3,4,SPFpuck+7,4,SPFpuck+1,-4
.1	dc.w	SPFpuck+9,2,SPFpuck+1,2,SPFpuck+8,2,SPFpuck+5,2,SPFpuck+10,2,SPFpuck+5,2,SPFpuck+8,2,SPFpuck+1,-2
.2	dc.w	SPFpuck+4,2,SPFpuck+3,2,SPFpuck+2,2,SPFpuck+1,2,SPFpuck+7,2,SPFpuck+3,2,SPFpuck+6,2,SPFpuck+5,-2
.3	dc.w	SPFpuck+8,4,SPFpuck+1,4,SPFpuck+9,4,SPFpuck+1,4,SPFpuck+8,4,SPFpuck+5,4,SPFpuck+10,4,SPFpuck+5,-4
.4	dc.w	SPFpuck+1,-4096
.5	dc.w	SPFpuck+1,-4096
.6	dc.w	SPFpuck+5,-4096
.7	dc.w	SPFpuck+5,-4096

SPApassf	=	*-SPAlist	; dopass
SPApassf_table:	;Frames 451-495
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+3,4,SPFswing+4,4,SPFswing+5,-20
.1	dc.w	SPFswing+9,4,SPFswing+10,4,SPFswing+11,-20
.2	dc.w	SPFswing+15,4,SPFswing+16,4,SPFswing+17,-20
.3	dc.w	SPFswing+21,4,SPFswing+22,4,SPFswing+23,-20
.4	dc.w	SPFswing+27,4,SPFswing+28,4,SPFswing+29,-20
.5	dc.w	SPFswing+33,4,SPFswing+34,4,SPFswing+35,-20
.6	dc.w	SPFswing+39,4,SPFswing+40,4,SPFswing+41,-20
.7	dc.w	SPFswing+45,4,SPFswing+46,4,SPFswing+47,-20

SPApassf2	=	*-SPAlist	; The drop pass: dopass uses it in place of SPApassf when GameFlags bit 1 is set (A with the dpad back)
SPApassf2_table:	;Frames 450-493
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+2,4,SPFswing+3,-20
.1	dc.w	SPFswing+8,4,SPFswing+9,-20
.2	dc.w	SPFswing+14,4,SPFswing+15,-20
.3	dc.w	SPFswing+20,4,SPFswing+21,-20
.4	dc.w	SPFswing+26,4,SPFswing+27,-20
.5	dc.w	SPFswing+32,4,SPFswing+33,-20
.6	dc.w	SPFswing+38,4,SPFswing+39,-20
.7	dc.w	SPFswing+44,4,SPFswing+45,-20

SPApassb	=	*-SPAlist	; dopass after Findhittype
SPApassb_table:	;Frames 576-599
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswingb,4,SPFswingb+1,4,SPFswingb+2,-20
.1	dc.w	SPFswingb+3,4,SPFswingb+4,4,SPFswingb+5,-20
.2	dc.w	SPFswingb+6,4,SPFswingb+7,4,SPFswingb+8,-20
.3	dc.w	SPFswingb+9,4,SPFswingb+10,4,SPFswingb+11,-20
.4	dc.w	SPFswingb+12,4,SPFswingb+13,4,SPFswingb+14,-20
.5	dc.w	SPFswingb+15,4,SPFswingb+16,4,SPFswingb+17,-20
.6	dc.w	SPFswingb+18,4,SPFswingb+19,4,SPFswingb+20,-20
.7	dc.w	SPFswingb+21,4,SPFswingb+22,4,SPFswingb+23,-20

SPApassb2	=	*-SPAlist	; The backhand drop pass: see SPApassf2
SPApassb2_table:	;Frames 576-598
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswingb,4,SPFswingb+1,4,SPFswingb+1,-10
.1	dc.w	SPFswingb+3,4,SPFswingb+4,4,SPFswingb+4,-10
.2	dc.w	SPFswingb+6,4,SPFswingb+7,4,SPFswingb+7,-10
.3	dc.w	SPFswingb+9,4,SPFswingb+10,4,SPFswingb+10,-10
.4	dc.w	SPFswingb+12,4,SPFswingb+13,4,SPFswingb+13,-10
.5	dc.w	SPFswingb+15,4,SPFswingb+16,4,SPFswingb+16,-10
.6	dc.w	SPFswingb+18,4,SPFswingb+19,4,SPFswingb+19,-10
.7	dc.w	SPFswingb+21,4,SPFswingb+22,4,SPFswingb+22,-10

SPAshotf	=	*-SPAlist	; SetShotMode
SPAshotf_table:	;Frames 448-495
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+2,4,SPFswing+1,4,SPFswing,4,SPFswing,4,SPFswing+1,4,SPFswing+2,4,SPFswing+3,4,SPFswing+4,4
	dc.w	SPFswing+5,-20
.1	dc.w	SPFswing+8,4,SPFswing+7,4,SPFswing+6,4,SPFswing+6,4,SPFswing+7,4,SPFswing+8,4,SPFswing+9,4,SPFswing+10,4
	dc.w	SPFswing+11,-20
.2	dc.w	SPFswing+14,4,SPFswing+13,4,SPFswing+12,4,SPFswing+12,4,SPFswing+13,4,SPFswing+14,4,SPFswing+15,4,SPFswing+16,4
	dc.w	SPFswing+17,-20
.3	dc.w	SPFswing+20,4,SPFswing+19,4,SPFswing+18,4,SPFswing+18,4,SPFswing+19,4,SPFswing+20,4,SPFswing+21,4,SPFswing+22,4
	dc.w	SPFswing+23,-20
.4	dc.w	SPFswing+26,4,SPFswing+25,4,SPFswing+24,4,SPFswing+24,4,SPFswing+25,4,SPFswing+26,4,SPFswing+27,4,SPFswing+28,4
	dc.w	SPFswing+29,-20
.5	dc.w	SPFswing+32,4,SPFswing+31,4,SPFswing+30,4,SPFswing+30,4,SPFswing+31,4,SPFswing+32,4,SPFswing+33,4,SPFswing+34,4
	dc.w	SPFswing+35,-20
.6	dc.w	SPFswing+38,4,SPFswing+37,4,SPFswing+36,4,SPFswing+36,4,SPFswing+37,4,SPFswing+38,4,SPFswing+39,4,SPFswing+40,4
	dc.w	SPFswing+41,-20
.7	dc.w	SPFswing+44,4,SPFswing+43,4,SPFswing+42,4,SPFswing+42,4,SPFswing+43,4,SPFswing+44,4,SPFswing+45,4,SPFswing+46,4
	dc.w	SPFswing+47,-20

SPAfakeshotf	=	*-SPAlist	; The fake shot: SetShotMode uses it in place of SPAshotf when GameFlags bit 0 is set
SPAfakeshotf_table:	;Frames 448-495
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+2,3,SPFswing+1,3,SPFswing,3,SPFswing,3,SPFswing+1,3,SPFswing+2,3,SPFswing+3,3,SPFswing+4,3
	dc.w	SPFswing+5,-8
.1	dc.w	SPFswing+8,3,SPFswing+7,3,SPFswing+6,3,SPFswing+6,3,SPFswing+7,3,SPFswing+8,3,SPFswing+9,3,SPFswing+10,3
	dc.w	SPFswing+11,-8
.2	dc.w	SPFswing+14,3,SPFswing+13,3,SPFswing+12,3,SPFswing+12,3,SPFswing+13,3,SPFswing+14,3,SPFswing+15,3,SPFswing+16,3
	dc.w	SPFswing+17,-8
.3	dc.w	SPFswing+20,3,SPFswing+19,3,SPFswing+18,3,SPFswing+18,3,SPFswing+19,3,SPFswing+20,3,SPFswing+21,3,SPFswing+22,3
	dc.w	SPFswing+23,-8
.4	dc.w	SPFswing+26,3,SPFswing+25,3,SPFswing+24,3,SPFswing+24,3,SPFswing+25,3,SPFswing+26,3,SPFswing+27,3,SPFswing+28,3
	dc.w	SPFswing+29,-8
.5	dc.w	SPFswing+32,3,SPFswing+31,3,SPFswing+30,3,SPFswing+30,3,SPFswing+31,3,SPFswing+32,3,SPFswing+33,3,SPFswing+34,3
	dc.w	SPFswing+35,-8
.6	dc.w	SPFswing+38,3,SPFswing+37,3,SPFswing+36,3,SPFswing+36,3,SPFswing+37,3,SPFswing+38,3,SPFswing+39,3,SPFswing+40,3
	dc.w	SPFswing+41,-8
.7	dc.w	SPFswing+44,3,SPFswing+43,3,SPFswing+42,3,SPFswing+42,3,SPFswing+43,3,SPFswing+44,3,SPFswing+45,3,SPFswing+46,3
	dc.w	SPFswing+47,-8

SPAshotb	=	*-SPAlist	; SetShotMode, doshot
SPAshotb_table:	;Frames 576-599
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswingb,2,SPFswingb,2,SPFswingb,2,SPFswingb,2,SPFswingb,2,SPFswingb,2,SPFswingb+1,2,SPFswingb+2,2
	dc.w	SPFswingb+2,-10
.1	dc.w	SPFswingb+3,2,SPFswingb+3,2,SPFswingb+3,2,SPFswingb+3,2,SPFswingb+3,2,SPFswingb+3,2,SPFswingb+4,2,SPFswingb+5,2
	dc.w	SPFswingb+5,-10
.2	dc.w	SPFswingb+6,2,SPFswingb+6,2,SPFswingb+6,2,SPFswingb+6,2,SPFswingb+6,2,SPFswingb+6,2,SPFswingb+7,2,SPFswingb+8,2
	dc.w	SPFswingb+8,-10
.3	dc.w	SPFswingb+9,2,SPFswingb+9,2,SPFswingb+9,2,SPFswingb+9,2,SPFswingb+9,2,SPFswingb+9,2,SPFswingb+10,2,SPFswingb+11,2
	dc.w	SPFswingb+11,-10
.4	dc.w	SPFswingb+12,2,SPFswingb+12,2,SPFswingb+12,2,SPFswingb+12,2,SPFswingb+12,2,SPFswingb+12,2,SPFswingb+13,2,SPFswingb+14,2
	dc.w	SPFswingb+14,-10
.5	dc.w	SPFswingb+15,2,SPFswingb+15,2,SPFswingb+15,2,SPFswingb+15,2,SPFswingb+15,2,SPFswingb+15,2,SPFswingb+16,2,SPFswingb+17,2
	dc.w	SPFswingb+17,-10
.6	dc.w	SPFswingb+18,2,SPFswingb+18,2,SPFswingb+18,2,SPFswingb+18,2,SPFswingb+18,2,SPFswingb+18,2,SPFswingb+19,2,SPFswingb+20,2
	dc.w	SPFswingb+20,-10
.7	dc.w	SPFswingb+21,2,SPFswingb+21,2,SPFswingb+21,2,SPFswingb+21,2,SPFswingb+21,2,SPFswingb+21,2,SPFswingb+22,2,SPFswingb+23,2
	dc.w	SPFswingb+23,-10

SPAfakeshotb	=	*-SPAlist	; The backhand fake shot: see SPAfakeshotf
SPAfakeshotb_table:	;Frames 449-495
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+3,3,SPFswing+4,3,SPFswing+5,3,SPFswing+5,3,SPFswing+5,3,SPFswing+4,3,SPFswing+3,3,SPFswing+2,3
	dc.w	SPFswing+1,-8
.1	dc.w	SPFswing+9,3,SPFswing+10,3,SPFswing+11,3,SPFswing+11,3,SPFswing+11,3,SPFswing+10,3,SPFswing+9,3,SPFswing+8,3
	dc.w	SPFswing+7,-8
.2	dc.w	SPFswing+15,3,SPFswing+16,3,SPFswing+17,3,SPFswing+17,3,SPFswing+17,3,SPFswing+16,3,SPFswing+15,3,SPFswing+14,3
	dc.w	SPFswing+13,-8
.3	dc.w	SPFswing+21,3,SPFswing+22,3,SPFswing+23,3,SPFswing+23,3,SPFswing+23,3,SPFswing+22,3,SPFswing+21,3,SPFswing+20,3
	dc.w	SPFswing+19,-8
.4	dc.w	SPFswing+27,3,SPFswing+28,3,SPFswing+29,3,SPFswing+29,3,SPFswing+29,3,SPFswing+28,3,SPFswing+27,3,SPFswing+26,3
	dc.w	SPFswing+25,-8
.5	dc.w	SPFswing+33,3,SPFswing+34,3,SPFswing+35,3,SPFswing+35,3,SPFswing+35,3,SPFswing+34,3,SPFswing+33,3,SPFswing+32,3
	dc.w	SPFswing+31,-8
.6	dc.w	SPFswing+39,3,SPFswing+40,3,SPFswing+41,3,SPFswing+41,3,SPFswing+41,3,SPFswing+40,3,SPFswing+39,3,SPFswing+38,3
	dc.w	SPFswing+37,-8
.7	dc.w	SPFswing+45,3,SPFswing+46,3,SPFswing+47,3,SPFswing+47,3,SPFswing+47,3,SPFswing+46,3,SPFswing+45,3,SPFswing+44,3
	dc.w	SPFswing+43,-8

SPAskateback	=	*-SPAlist	; noturn0 when skating backwards
SPAskateback_table:	;Frames 496-543
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskateb,8,SPFskateb+1,8,SPFskateb+2,8,SPFskateb+3,8,SPFskateb+4,8,SPFskateb+5,-8
.1	dc.w	SPFskateb+6,8,SPFskateb+7,8,SPFskateb+8,8,SPFskateb+9,8,SPFskateb+10,8,SPFskateb+11,-8
.2	dc.w	SPFskateb+12,8,SPFskateb+13,8,SPFskateb+14,8,SPFskateb+15,8,SPFskateb+16,8,SPFskateb+17,-8
.3	dc.w	SPFskateb+18,8,SPFskateb+19,8,SPFskateb+20,8,SPFskateb+21,8,SPFskateb+22,8,SPFskateb+23,-8
.4	dc.w	SPFskateb+24,8,SPFskateb+25,8,SPFskateb+26,8,SPFskateb+27,8,SPFskateb+28,8,SPFskateb+29,-8
.5	dc.w	SPFskateb+30,8,SPFskateb+31,8,SPFskateb+32,8,SPFskateb+33,8,SPFskateb+34,8,SPFskateb+35,-8
.6	dc.w	SPFskateb+36,8,SPFskateb+37,8,SPFskateb+38,8,SPFskateb+39,8,SPFskateb+40,8,SPFskateb+41,-8
.7	dc.w	SPFskateb+42,8,SPFskateb+43,8,SPFskateb+44,8,SPFskateb+45,8,SPFskateb+46,8,SPFskateb+47,-8

SPAstumble	=	*-SPAlist	; FallDown
SPAstumble_table:	;Frames 544-575
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFstumble,8,SPFstumble+1,8,SPFstumble+2,8,SPFstumble+3,-6
.1	dc.w	SPFstumble+4,8,SPFstumble+5,8,SPFstumble+6,8,SPFstumble+7,-6
.2	dc.w	SPFstumble+8,8,SPFstumble+9,8,SPFstumble+10,8,SPFstumble+11,-6
.3	dc.w	SPFstumble+12,8,SPFstumble+13,8,SPFstumble+14,8,SPFstumble+15,-6
.4	dc.w	SPFstumble+16,8,SPFstumble+17,8,SPFstumble+18,8,SPFstumble+19,-6
.5	dc.w	SPFstumble+20,8,SPFstumble+21,8,SPFstumble+22,8,SPFstumble+23,-6
.6	dc.w	SPFstumble+24,8,SPFstumble+25,8,SPFstumble+26,8,SPFstumble+27,-6
.7	dc.w	SPFstumble+28,8,SPFstumble+29,8,SPFstumble+30,8,SPFstumble+31,-6

SPAfaceoff	=	*-SPAlist	; faceoffinput
SPAfaceoff_table:	;Frames 1050-1055
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFfaceoff,2,SPFfaceoff+1,10,SPFfaceoff+2,-6
.1
.2
.3
.4
.5
.6
.7	dc.w	SPFfaceoff+3,2,SPFfaceoff+4,10,SPFfaceoff+5,-6

SPAfaceoffr	=	*-SPAlist	; faceoffinput
SPAfaceoffr_table:	;Frames 334-366
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskatewp+3,-5
.1
.2
.3
.4
.5
.6
.7	dc.w	SPFskatewp+35,-5

SPAgready	=	*-SPAlist	; the goalie ready anim (GoalieReadySPA) near the puck or when gmode bit 0 is set
SPAgready_table:	;Frames 606-921
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	1

.0	dc.w	SPFGoalie,180,SPFgready,10,SPFgready+1,10,SPFgready+2,10,SPFGoalie,340,SPFgready+2,10,SPFgready+1,10,SPFgready,-10
.1	dc.w	SPFGoalie+1,180,SPFgready+3,10,SPFgready+4,10,SPFgready+5,10,SPFGoalie+1,340,SPFgready+5,10,SPFgready+4,10,SPFgready+3,-10
.2	dc.w	SPFGoalie+2,-700
.3	dc.w	SPFGoalie+3,180,SPFgready+6,10,SPFgready+7,10,SPFgready+8,10,SPFGoalie+3,340,SPFgready+8,10,SPFgready+7,10,SPFgready+6,-10
.4	dc.w	SPFGoalie+4,180,SPFgready+9,10,SPFgready+10,10,SPFgready+11,10,SPFGoalie+4,340,SPFgready+11,10,SPFgready+10,10,SPFgready+9,-10
.5	dc.w	SPFGoalie+5,180,SPFgready+12,10,SPFgready+13,10,SPFgready+14,10,SPFGoalie+5,340,SPFgready+14,10,SPFgready+13,10,SPFgready+12,-10
.6	dc.w	SPFGoalie+6,-700
.7	dc.w	SPFGoalie+7,180,SPFgready+15,10,SPFgready+16,10,SPFgready+17,10,SPFGoalie+7,340,SPFgready+17,10,SPFgready+16,10,SPFgready+15,-10

SPAgready2	=	*-SPAlist	; the goalie ready anim (GoalieReadySPA) otherwise
SPAgready2_table:	;Frames 606-613
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	1

.0	dc.w	SPFGoalie,-700
.1	dc.w	SPFGoalie+1,-700
.2	dc.w	SPFGoalie+2,-700
.3	dc.w	SPFGoalie+3,-700
.4	dc.w	SPFGoalie+4,-700
.5	dc.w	SPFGoalie+5,-700
.6	dc.w	SPFGoalie+6,-700
.7	dc.w	SPFGoalie+7,-700

SPAgglover	=	*-SPAlist	; saveanim entries 0 and 6
SPAgglover_table:	;Frames 622-629
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+16,-32
.1	dc.w	SPFGoalie+17,-32
.2	dc.w	SPFGoalie+18,-32
.3	dc.w	SPFGoalie+19,-32
.4	dc.w	SPFGoalie+20,-32
.5	dc.w	SPFGoalie+21,-32
.6	dc.w	SPFGoalie+22,-32
.7	dc.w	SPFGoalie+23,-32

SPAgglovel	=	*-SPAlist	; saveanim entries 1 and 7
SPAgglovel_table:	;Frames 614-621
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+8,-32
.1	dc.w	SPFGoalie+9,-32
.2	dc.w	SPFGoalie+10,-32
.3	dc.w	SPFGoalie+11,-32
.4	dc.w	SPFGoalie+12,-32
.5	dc.w	SPFGoalie+13,-32
.6	dc.w	SPFGoalie+14,-32
.7	dc.w	SPFGoalie+15,-32

SPAgstickr	=	*-SPAlist	; saveanim entries 4 and 8
SPAgstickr_table:	;Frames 638-645
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+32,-36
.1	dc.w	SPFGoalie+33,-36
.2	dc.w	SPFGoalie+34,-36
.3	dc.w	SPFGoalie+35,-36
.4	dc.w	SPFGoalie+36,-36
.5	dc.w	SPFGoalie+37,-36
.6	dc.w	SPFGoalie+38,-36
.7	dc.w	SPFGoalie+39,-36

SPAgstickl	=	*-SPAlist	; saveanim entries 5 and 9
SPAgstickl_table:	;Frames 630-637
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+24,-36
.1	dc.w	SPFGoalie+25,-36
.2	dc.w	SPFGoalie+26,-36
.3	dc.w	SPFGoalie+27,-36
.4	dc.w	SPFGoalie+28,-36
.5	dc.w	SPFGoalie+29,-36
.6	dc.w	SPFGoalie+30,-36
.7	dc.w	SPFGoalie+31,-36

SPAgdive	=	*-SPAlist	; doinput
SPAgdive_table:	;Frames 646-669
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFgdive,8,SPFgdive+1,8,SPFgdive+2,48,SPFgdive,-8
.1	dc.w	SPFgdive+3,8,SPFgdive+4,8,SPFgdive+5,48,SPFgdive+3,-8
.2	dc.w	SPFgdive+6,8,SPFgdive+7,8,SPFgdive+8,48,SPFgdive+6,-8
.3	dc.w	SPFgdive+9,8,SPFgdive+10,8,SPFgdive+11,48,SPFgdive+9,-8
.4	dc.w	SPFgdive+12,8,SPFgdive+13,8,SPFgdive+14,48,SPFgdive+12,-8
.5	dc.w	SPFgdive+15,8,SPFgdive+16,8,SPFgdive+17,48,SPFgdive+15,-8
.6	dc.w	SPFgdive+18,8,SPFgdive+19,8,SPFgdive+20,48,SPFgdive+18,-8
.7	dc.w	SPFgdive+21,8,SPFgdive+22,8,SPFgdive+23,48,SPFgdive+21,-8

SPAwallright	=	*-SPAlist	; asspenalty (penalty box door)
SPAwallright_table:	;Frames 1005-1011
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2	dc.w	SPFPen,8,SPFPen+1,8,SPFPen+2,8,SPFPen+3,8,SPFPen+4,8,SPFPen+5,8,SPFPen+6,-8
.3
.4
.5
.6
.7	dc.w	SPFPen+6,8,SPFPen+5,8,SPFPen+4,8,SPFPen+3,8,SPFPen+2,8,SPFPen+1,8,SPFPen,-8

SPAwallleft	=	*-SPAlist	; assbench, asseben, assepen (penalty box door)
SPAwallleft_table:	;Frames 1005-1008
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2	dc.w	SPFPen+3,8,SPFPen+2,8,SPFPen+1,8,SPFPen,-8
.3
.4
.5
.6	dc.w	SPFPen,8,SPFPen+1,8,SPFPen+2,8,SPFPen+3,-8
.7	dc.w	SPFPen,8,SPFPen+1,8,SPFPen+2,8,SPFPen+3,-8

SPAblock	=	*-SPAlist	; The shot block: check4check and
	;check4check2 for a joystick player (CanBlock), chkblock in place of SPAhook
SPAblock_table:	;Frames 183-697
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFblock,4,SPFblock+1,4,SPFblock+2,40,SPFfallfwd+46,8,SPFfallfwd+5,-8
.1	dc.w	SPFblock+3,4,SPFblock+4,4,SPFblock+5,40,SPFfallfwd+4,8,SPFfallfwd+11,-8
.2	dc.w	SPFblock+6,4,SPFblock+7,4,SPFblock+8,40,SPFfallfwd+10,8,SPFfallfwd+17,-8
.3	dc.w	SPFblock+9,4,SPFblock+10,4,SPFblock+11,40,SPFfallfwd+16,8,SPFfallfwd+23,-8
.4	dc.w	SPFblock+12,4,SPFblock+13,4,SPFblock+14,40,SPFfallfwd+22,8,SPFfallfwd+29,-8
.5	dc.w	SPFblock+15,4,SPFblock+16,4,SPFblock+17,40,SPFfallfwd+40,8,SPFfallfwd+35,-8
.6	dc.w	SPFblock+18,4,SPFblock+19,4,SPFblock+20,40,SPFfallfwd+46,8,SPFfallfwd+41,-8
.7	dc.w	SPFblock+21,4,SPFblock+22,4,SPFblock+23,40,SPFfallfwd+4,8,SPFfallfwd+47,-8

SPAsiren	=	*-SPAlist	; checkgoal, on the struct after the goal (Goal.27)
SPAsiren_table:	;Frames 698-711
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	1

.0
.1
.2
.3
.4
.5
.6
.7	dc.w	SPFSiren,3,SPFSiren+1,3,SPFSiren+2,3,SPFSiren+3,3,SPFSiren+4,3,SPFSiren+5,3,SPFSiren+6,3,SPFSiren+7,3
	dc.w	SPFSiren+8,3,SPFSiren+9,3,SPFSiren+10,3,SPFSiren+11,3,SPFSiren+12,3,SPFSiren+13,-3

SPAflail	=	*-SPAlist	; holdcheck
SPAflail_table:	;Frames 1-36
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskate,-40
.1	dc.w	SPFskate+5,-40
.2	dc.w	SPFskate+10,-40
.3	dc.w	SPFskate+15,-40
.4	dc.w	SPFskate+20,-40
.5	dc.w	SPFskate+25,-40
.6	dc.w	SPFskate+30,-40
.7	dc.w	SPFskate+35,-40

SPAgswing	=	*-SPAlist	; dopass for the goalie
SPAgswing_table:	;Frames 736-751
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFgstack+24,5,SPFgstack+25,8,SPFgstack+24,-16
.1	dc.w	SPFgstack+26,5,SPFgstack+27,8,SPFgstack+26,-16
.2	dc.w	SPFgstack+28,5,SPFgstack+29,8,SPFgstack+28,-16
.3	dc.w	SPFgstack+30,5,SPFgstack+31,8,SPFgstack+30,-16
.4	dc.w	SPFgstack+32,5,SPFgstack+33,8,SPFgstack+32,-16
.5	dc.w	SPFgstack+34,5,SPFgstack+35,8,SPFgstack+34,-16
.6	dc.w	SPFgstack+36,5,SPFgstack+37,8,SPFgstack+36,-16
.7	dc.w	SPFgstack+38,5,SPFgstack+39,8,SPFgstack+38,-16

SPAgstackl	=	*-SPAlist	; saveanim entries 3
SPAgstackl_table:	;Frames 724-735
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFgstack+12,8,SPFgstack+13,-32
.1	dc.w	SPFgstack+14,8,SPFgstack+15,-32
.2	dc.w	SPFgstack+14,8,SPFgstack+15,-32
.3	dc.w	SPFgstack+16,8,SPFgstack+17,-32
.4	dc.w	SPFgstack+18,8,SPFgstack+19,-32
.5	dc.w	SPFgstack+20,8,SPFgstack+21,-32
.6	dc.w	SPFgstack+20,8,SPFgstack+21,-32
.7	dc.w	SPFgstack+22,8,SPFgstack+23,-32

SPAgstackr	=	*-SPAlist	; saveanim entries 2
SPAgstackr_table:	;Frames 712-723
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFgstack,8,SPFgstack+1,-32
.1	dc.w	SPFgstack+2,8,SPFgstack+3,-32
.2	dc.w	SPFgstack+2,8,SPFgstack+3,-32
.3	dc.w	SPFgstack+4,8,SPFgstack+5,-32
.4	dc.w	SPFgstack+6,8,SPFgstack+7,-32
.5	dc.w	SPFgstack+8,8,SPFgstack+9,-32
.6	dc.w	SPFgstack+8,8,SPFgstack+9,-32
.7	dc.w	SPFgstack+10,8,SPFgstack+11,-32

SPAboardtop	=	*-SPAlist	; FallDown.FallList
SPAboardtop_table:	;Frames 183-766
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1	dc.w	SPFboard,6,SPFboard+1,6,SPFboard+2,6,SPFboard+3,60,SPFfallback+4,8,SPFfallfwd+28,32,SPFfallfwd+29,-32
.2
.3	dc.w	SPFboard+4,6,SPFboard+5,6,SPFboard+6,6,SPFfallfwd+16,68,SPFfallfwd+17,-8
.4
.5	dc.w	SPFboard+8,6,SPFboard+9,6,SPFboard+10,6,SPFboard+11,60,SPFfallback+24,6,SPFfallfwd+4,6,SPFfallfwd+5,-6
.6
.7	dc.w	SPFboard+12,6,SPFboard+13,6,SPFboard+14,6,SPFfallfwd+40,68,SPFfallfwd+41,-8

SPAboardright	=	*-SPAlist	; FallDown.FallList
SPAboardright_table:	;Frames 195-781
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1	dc.w	SPFboard+14,6,SPFboard+15,6,SPFboard+16,6,SPFboard+17,60,SPFfallfwd+46,8,SPFfallfwd+47,-8
.2
.3	dc.w	SPFboard+18,6,SPFboard+19,6,SPFboard+20,6,SPFboard+21,60,SPFfallback+14,6,SPFfallfwd+40,6,SPFfallfwd+41,-6
.4
.5	dc.w	SPFboard+22,6,SPFboard+23,6,SPFboard+24,6,SPFboard+25,60,SPFfallfwd+34,8,SPFfallfwd+35,-8
.6
.7	dc.w	SPFboard+26,6,SPFboard+27,6,SPFboard+28,6,SPFboard+29,60,SPFfallback+34,6,SPFfallfwd+16,6,SPFfallfwd+17,-6

SPAboardbot	=	*-SPAlist	; FallDown.FallList
SPAboardbot_table:	;Frames 183-793
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1	dc.w	SPFboard+30,6,SPFboard+31,6,SPFboard+32,6,SPFboard+3,60,SPFfallback+4,6,SPFfallfwd+28,6,SPFfallfwd+29,-6
.2
.3	dc.w	SPFboard+33,6,SPFboard+34,6,SPFboard+35,6,SPFfallfwd+16,60,SPFfallfwd+17,-8
.4
.5	dc.w	SPFboard+36,6,SPFboard+37,6,SPFboard+38,6,SPFboard+10,60,SPFfallback+24,6,SPFfallfwd+4,6,SPFfallfwd+5,-6
.6
.7	dc.w	SPFboard+39,6,SPFboard+40,6,SPFboard+41,6,SPFfallfwd+40,60,SPFfallfwd+41,-8

SPAboardleft	=	*-SPAlist	; FallDown.FallList
SPAboardleft_table:	;Frames 189-807
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1	dc.w	SPFboard+42,6,SPFboard+43,6,SPFboard+44,6,SPFboard+45,60,SPFfallfwd+10,8,SPFfallfwd+11,-8
.2
.3	dc.w	SPFboard+46,6,SPFboard+47,6,SPFboard+48,6,SPFboard+21,60,SPFfallback+14,8,SPFfallfwd+40,8,SPFfallfwd+41,-8
.4
.5	dc.w	SPFboard+49,6,SPFboard+50,6,SPFboard+51,6,SPFboard+52,60,SPFfallfwd+22,8,SPFfallfwd+23,-8
.6
.7	dc.w	SPFboard+53,6,SPFboard+54,6,SPFboard+55,6,SPFboard+29,60,SPFfallback+34,6,SPFfallfwd+16,6,SPFfallfwd+17,-6

SPAboardchk	=	*-SPAlist	; FallDown, on the hitter
SPAboardchk_table:	;Frames 808-815
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFboardchk,-24
.1	dc.w	SPFboardchk+1,-24
.2	dc.w	SPFboardchk+2,-24
.3	dc.w	SPFboardchk+3,-24
.4	dc.w	SPFboardchk+4,-24
.5	dc.w	SPFboardchk+5,-24
.6	dc.w	SPFboardchk+6,-24
.7	dc.w	SPFboardchk+7,-24

SPAgskate	=	*-SPAlist	; goalieacc
SPAgskate_table:	;Frames 852-875
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFgskate,12,SPFgskate+1,8,SPFgskate+2,12,SPFgskate+1,-8
.1	dc.w	SPFgskate+3,12,SPFgskate+4,8,SPFgskate+5,12,SPFgskate+4,-8
.2	dc.w	SPFgskate+6,12,SPFgskate+7,8,SPFgskate+8,12,SPFgskate+7,-8
.3	dc.w	SPFgskate+9,12,SPFgskate+10,8,SPFgskate+11,12,SPFgskate+10,-8
.4	dc.w	SPFgskate+12,12,SPFgskate+13,8,SPFgskate+14,12,SPFgskate+13,-8
.5	dc.w	SPFgskate+15,12,SPFgskate+16,8,SPFgskate+17,12,SPFgskate+16,-8
.6	dc.w	SPFgskate+18,12,SPFgskate+19,8,SPFgskate+20,12,SPFgskate+19,-8
.7	dc.w	SPFgskate+21,12,SPFgskate+22,8,SPFgskate+23,12,SPFgskate+22,-8

SPAcelebrate	=	*-SPAlist	; goal celebration
SPAcelebrate_table:	;Frames 836-851
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFcelebrate,12,SPFcelebrate+1,40,SPFcelebrate,-5
.1	dc.w	SPFcelebrate+2,12,SPFcelebrate+3,40,SPFcelebrate+2,-5
.2	dc.w	SPFcelebrate+4,12,SPFcelebrate+5,40,SPFcelebrate+4,-5
.3	dc.w	SPFcelebrate+6,12,SPFcelebrate+7,40,SPFcelebrate+6,-5
.4	dc.w	SPFcelebrate+8,12,SPFcelebrate+9,40,SPFcelebrate+8,-5
.5	dc.w	SPFcelebrate+10,12,SPFcelebrate+11,40,SPFcelebrate+10,-5
.6	dc.w	SPFcelebrate+12,12,SPFcelebrate+13,40,SPFcelebrate+12,-5
.7	dc.w	SPFcelebrate+14,12,SPFcelebrate+15,40,SPFcelebrate+14,-5

SPAgstackalt1	=	*-SPAlist	; goaliesave: a pad stack save becomes this or SPAgstackalt2 (random) when sflags bit 3 is set
SPAgstackalt1_table:	;Frames 880-883
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFgstackalt,20,SPFgstackalt+1,20,SPFgstackalt,-8
.3
.4
.5	dc.w	SPFgstackalt+2,20,SPFgstackalt+3,20,SPFgstackalt+2,-8

SPAgstackalt2	=	*-SPAlist	; goaliesave: see SPAgstackalt1
SPAgstackalt2_table:	;Frames 884-885
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFgstackalt+4,-40
.3
.4
.5	dc.w	SPFgstackalt+5,-40

SPAcatch	=	*-SPAlist	; puckbody
SPAcatch_table:	;Frames 816-831
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFcatch,6,SPFcatch+1,-6
.1	dc.w	SPFcatch+2,6,SPFcatch+3,-6
.2	dc.w	SPFcatch+4,6,SPFcatch+5,-6
.3	dc.w	SPFcatch+6,6,SPFcatch+7,-6
.4	dc.w	SPFcatch+8,6,SPFcatch+9,-6
.5	dc.w	SPFcatch+10,6,SPFcatch+11,-6
.6	dc.w	SPFcatch+12,6,SPFcatch+13,-6
.7	dc.w	SPFcatch+14,6,SPFcatch+15,-6

SPAinjuryfall	=	*-SPAlist	; FallDown
SPAinjuryfall_table:	;Frames 227-896
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	$303

.0
.1
.2
.7	dc.w	SPFfallback,6,SPFfallback+1,6,SPFfallback+2,8,SPFinjury1,6,SPFinjury1+1,6,SPFinjury1+2,-6
.3
.4
.5
.6	dc.w	SPFfallback+20,6,SPFfallback+21,6,SPFfallback+22,8,SPFinjury1+4,6,SPFinjury1+5,6,SPFinjury1+6,-6

SPAinjury1	=	*-SPAlist	; FallDown
SPAinjury1_table:	;Frames 227-896
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.7	dc.w	SPFfallback,6,SPFfallback+1,6,SPFfallback+2,8,SPFinjury1,6,SPFinjury1+1,6,SPFinjury1+2,-1000
.3
.4
.5
.6	dc.w	SPFfallback+20,6,SPFfallback+21,6,SPFfallback+22,8,SPFinjury1+4,6,SPFinjury1+5,6,SPFinjury1+6,-1000

SPAinjury2	=	*-SPAlist	; FallDown uses it in place of SPAinjury1 when sflags12 bit 1 is set
SPAinjury2_table:	;Frames 227-897
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.7	dc.w	SPFfallback,6,SPFfallback+1,6,SPFfallback+2,8,SPFinjury1+3,-1024
.3
.4
.5
.6	dc.w	SPFfallback+20,6,SPFfallback+21,6,SPFfallback+22,8,SPFinjury1+7,-1024

SPAbglass	=	*-SPAlist	; wallcollb
SPAbglass_table:	;Frames 1000-1004
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.3
.4
.5
.6
.7	dc.w	SPFbglass,8,SPFbglass+1,8,SPFbglass+2,8,SPFbglass+3,8,SPFbglass+4,-1000

SPAshoulderchkl2	=	*-SPAlist	; The second checking list left check; FallDown skips the flip after it
SPAshoulderchkl2_table:	;Frames 832-834
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFshoulder2,-24
.3
.4
.5	dc.w	SPFshoulder2+2,-24

SPAshoulderchkr2	=	*-SPAlist	; The second checking list right check; FallDown skips the flip after it
SPAshoulderchkr2_table:	;Frames 833-835
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFshoulder2+1,-24
.3
.4
.5	dc.w	SPFshoulder2+3,-24

SPAglideback	=	*-SPAlist	; doplayeracc when skating backwards
SPAglideback_table:	;Frames 496-538
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskateb,-8
.1	dc.w	SPFskateb+6,-8
.2	dc.w	SPFskateb+12,-8
.3	dc.w	SPFskateb+18,-8
.4	dc.w	SPFskateb+24,-8
.5	dc.w	SPFskateb+30,-8
.6	dc.w	SPFskateb+36,-8
.7	dc.w	SPFskateb+42,-8

SPAflip	=	*-SPAlist	; FallDown
SPAflip_table:	;Frames 183-605
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFfallback,6,SPFflip,6,SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFfallback+3,100,SPFfallback+4,8,SPFfallfwd+4,8
	dc.w	SPFfallfwd+5,-8
.1	dc.w	SPFfallback+5,6,SPFflip,6,SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFfallback+8,100,SPFfallback+9,8,SPFfallfwd+10,8
	dc.w	SPFfallfwd+11,-8
.2	dc.w	SPFfallback+10,6,SPFflip,6,SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFfallback+13,100,SPFfallback+14,8,SPFfallfwd+16,8
	dc.w	SPFfallfwd+17,-8
.3	dc.w	SPFfallback+15,6,SPFflip+3,6,SPFflip+3,6,SPFflip+4,6,SPFflip+5,6,SPFfallback+18,100,SPFfallback+19,8,SPFfallfwd+22,8
	dc.w	SPFfallfwd+23,-8
.4	dc.w	SPFfallback+20,6,SPFflip+3,6,SPFflip+3,6,SPFflip+4,6,SPFflip+5,6,SPFfallback+23,100,SPFfallback+24,8,SPFfallfwd+28,8
	dc.w	SPFfallfwd+29,-8
.5	dc.w	SPFfallback+25,6,SPFflip+3,6,SPFflip+3,6,SPFflip+4,6,SPFflip+5,6,SPFfallback+28,100,SPFfallback+29,8,SPFfallfwd+34,8
	dc.w	SPFfallfwd+35,-8
.6	dc.w	SPFfallback+30,6,SPFflip+3,6,SPFflip+3,6,SPFflip+4,6,SPFflip+5,6,SPFfallback+33,100,SPFfallback+34,8,SPFfallfwd+40,8
	dc.w	SPFfallfwd+41,-8
.7	dc.w	SPFfallback+35,6,SPFflip,6,SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFfallback+38,100,SPFfallback+39,8,SPFfallfwd+46,8
	dc.w	SPFfallfwd+47,-8

SPAboardmidl	=	*-SPAlist	; FallDown
SPAboardmidl_table:	;Frames 67-1025
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFboard+42,6,SPFboardmid,6,SPFboardmid+1,6,SPFboardmid+2,6,SPFboardmid+3,6,SPFboardmid+4,80,SPFboardmid+3,6,SPFboardmid+2,6
	dc.w	SPFboardmid+1,6,SPFglide+7,-8
.1
.2
.3	dc.w	SPFboardmid+5,6,SPFboardmid+6,6,SPFboardmid+7,6,SPFboardmid+8,80,SPFboardmid+7,6,SPFboardmid+5,6,SPFglide+2,-8
.4	dc.w	SPFboard+49,6,SPFboardmid+9,6,SPFboardmid+10,6,SPFboardmid+11,6,SPFboardmid+12,6,SPFboardmid+13,80,SPFboardmid+12,6,SPFboardmid+11,6
	dc.w	SPFboardmid+10,6,SPFglide+6,-8
.5
.6
.7	dc.w	SPFboard+53,6,SPFboardmid+10,6,SPFboardmid+11,6,SPFboardmid+12,6,SPFboardmid+13,80,SPFboardmid+12,6,SPFboardmid+11,6,SPFboardmid+10,6
	dc.w	SPFglide+6,-8

SPAboardmidr	=	*-SPAlist	; FallDown
SPAboardmidr_table:	;Frames 66-1039
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFboard+14,6,SPFboardmid+14,6,SPFboardmid+15,6,SPFboardmid+16,6,SPFboardmid+17,6,SPFboardmid+18,80,SPFboardmid+17,6,SPFboardmid+16,6
	dc.w	SPFboardmid+15,6,SPFglide+1,-8
.1
.2
.3	dc.w	SPFboard+18,6,SPFboardmid+19,6,SPFboardmid+20,6,SPFboardmid+21,6,SPFboardmid+22,80,SPFboardmid+21,6,SPFboardmid+20,6,SPFboardmid+19,6
	dc.w	SPFglide+2,-8
.4	dc.w	SPFboard+22,6,SPFboardmid+23,6,SPFboardmid+19,6,SPFboardmid+20,6,SPFboardmid+21,6,SPFboardmid+22,80,SPFboardmid+21,6,SPFboardmid+20,6
	dc.w	SPFboardmid+19,6,SPFglide+2,-8
.5
.6
.7	dc.w	SPFboardmid+24,6,SPFboardmid+25,6,SPFboardmid+26,6,SPFboardmid+27,80,SPFboardmid+26,6,SPFboardmid+24,6,SPFglide+6,-8

SPApump	=	*-SPAlist	; the word list after SPAcelebrate (label), with SPApump2
SPApump_table:	;Frames 922-937
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFpump,12,SPFpump+1,12,SPFpump,12,SPFpump+1,12,SPFpump,12,SPFpump+1,-12
.1	dc.w	SPFpump+2,12,SPFpump+3,12,SPFpump+2,12,SPFpump+3,12,SPFpump+2,12,SPFpump+3,-12
.2	dc.w	SPFpump+4,12,SPFpump+5,12,SPFpump+4,12,SPFpump+5,12,SPFpump+4,12,SPFpump+5,-12
.3	dc.w	SPFpump+6,12,SPFpump+7,12,SPFpump+6,12,SPFpump+7,12,SPFpump+6,12,SPFpump+7,-12
.4	dc.w	SPFpump+8,12,SPFpump+9,12,SPFpump+8,12,SPFpump+9,12,SPFpump+8,12,SPFpump+9,-12
.5	dc.w	SPFpump+10,12,SPFpump+11,12,SPFpump+10,12,SPFpump+11,12,SPFpump+10,12,SPFpump+11,-12
.6	dc.w	SPFpump+12,12,SPFpump+13,12,SPFpump+12,12,SPFpump+13,12,SPFpump+12,12,SPFpump+13,-12
.7	dc.w	SPFpump+14,12,SPFpump+15,12,SPFpump+14,12,SPFpump+15,12,SPFpump+14,12,SPFpump+15,-12

SPAstanley	=	*-SPAlist	; before the celebrate step
SPAstanley_table:	;Frames 938-953
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFcup,12,SPFcup+1,12,SPFcup,12,SPFcup+1,12,SPFcup,12,SPFcup+1,-12
.1	dc.w	SPFcup+2,12,SPFcup+3,12,SPFcup+2,12,SPFcup+3,12,SPFcup+2,12,SPFcup+3,-12
.2	dc.w	SPFcup+4,12,SPFcup+5,12,SPFcup+4,12,SPFcup+5,12,SPFcup+4,12,SPFcup+5,-12
.3	dc.w	SPFcup+6,12,SPFcup+7,12,SPFcup+6,12,SPFcup+7,12,SPFcup+6,12,SPFcup+7,-12
.4	dc.w	SPFcup+8,12,SPFcup+9,12,SPFcup+8,12,SPFcup+9,12,SPFcup+8,12,SPFcup+9,-12
.5	dc.w	SPFcup+10,12,SPFcup+11,12,SPFcup+10,12,SPFcup+11,12,SPFcup+10,12,SPFcup+11,-12
.6	dc.w	SPFcup+12,12,SPFcup+13,12,SPFcup+12,12,SPFcup+13,12,SPFcup+12,12,SPFcup+13,-12
.7	dc.w	SPFcup+14,12,SPFcup+15,12,SPFcup+14,12,SPFcup+15,12,SPFcup+14,12,SPFcup+15,-12

SPApump2	=	*-SPAlist	; the word list alternates it with SPApump
SPApump2_table:	;Frames 954-969
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFpump2,12,SPFpump2+1,12,SPFpump2,12,SPFpump2+1,12,SPFpump2,12,SPFpump2+1,-12
.1	dc.w	SPFpump2+2,12,SPFpump2+3,12,SPFpump2+2,12,SPFpump2+3,12,SPFpump2+2,12,SPFpump2+3,-12
.2	dc.w	SPFpump2+4,12,SPFpump2+5,12,SPFpump2+4,12,SPFpump2+5,12,SPFpump2+4,12,SPFpump2+5,-12
.3	dc.w	SPFpump2+6,12,SPFpump2+7,12,SPFpump2+6,12,SPFpump2+7,12,SPFpump2+6,12,SPFpump2+7,-12
.4	dc.w	SPFpump2+8,12,SPFpump2+9,12,SPFpump2+8,12,SPFpump2+9,12,SPFpump2+8,12,SPFpump2+9,-12
.5	dc.w	SPFpump2+10,12,SPFpump2+11,12,SPFpump2+10,12,SPFpump2+11,12,SPFpump2+10,12,SPFpump2+11,-12
.6	dc.w	SPFpump2+12,12,SPFpump2+13,12,SPFpump2+12,12,SPFpump2+13,12,SPFpump2+12,12,SPFpump2+13,-12
.7	dc.w	SPFpump2+14,12,SPFpump2+15,12,SPFpump2+14,12,SPFpump2+15,12,SPFpump2+14,12,SPFpump2+15,-12

SPAgslamtop	=	*-SPAlist	; checkanim
SPAgslamtop_table:	;Frames 898-903
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFgslamtop,8,SPFgslamtop+1,8,SPFgslamtop+2,8,SPFgslamtop+1,8,SPFgslamtop,8,SPFgslamtop,8,SPFgslamtop+1,8,SPFgslamtop+2,8
	dc.w	SPFgslamtop+1,8,SPFgslamtop,-8
.3
.4
.5	dc.w	SPFgslamtop+3,8,SPFgslamtop+4,8,SPFgslamtop+5,8,SPFgslamtop+4,8,SPFgslamtop+3,8,SPFgslamtop+3,8,SPFgslamtop+4,8,SPFgslamtop+5,8
	dc.w	SPFgslamtop+4,8,SPFgslamtop+3,-8

SPAgextra1	=	*-SPAlist	; goaliesave: with SPAgextra2, picked by the goalie side of the puck and the glove hand ($76 bit 0)
SPAgextra1_table:	;Frames 1040-1043
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFgextra1,4,SPFgextra1+1,-24,SPFgextra1,-4
.3
.4
.5	dc.w	SPFgextra1+2,4,SPFgextra1+3,-24,SPFgextra1+2,-4

SPAgextra2	=	*-SPAlist	; goaliesave: see SPAgextra1. puckgoalie compares SPAgextra1
SPAgextra2_table:	;Frames 876-879
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFgextra2,4,SPFgextra2+1,-24,SPFgextra2,-4
.3
.4
.5	dc.w	SPFgextra2+2,4,SPFgextra2+3,-24,SPFgextra2+2,-4

SPAgslambot	=	*-SPAlist	; checkanim
SPAgslambot_table:	;Frames 1044-1049
.t	;Offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0
.1
.2
.6
.7	dc.w	SPFgslambot,10,SPFgslambot+1,12,SPFgslambot+2,-8
.3
.4
.5	dc.w	SPFgslambot+3,10,SPFgslambot+4,12,SPFgslambot+5,-8

; End of animation list

revframetbl	;(94 kept it at the end). One word per sprite frame (1057, frame 0-1056)
	;the frame for a reverse angle replay. RestoreReplayFrame movea.l #revframetbl,a6
	incbin	..\Extracted\NHL95\Graphics\revframetbl.bin
	even
