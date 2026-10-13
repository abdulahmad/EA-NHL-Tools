;	Sprite animation tables. For every animation there is a table that gives the frames to show
;	in each direction and how long to show each one. The code refers to an animation by the
;	offset of its table in the list.

; Sprite Frame (SPF) base indices. gready has 3 frames per direction (93 had 2),
; so every base from SPFSiren up is 8 higher than in 93. SPFghighr is frame 658 and frames after it have no name.
SPFskatewp	=	1
SPFskate	=	SPFskatewp+40	; 41
SPFturnl	=	SPFskate+40	; 81
SPFturnr	=	SPFturnl+8	; 89
SPFswing	=	SPFturnr+8	; 97
SPFstop	=	SPFswing+48	; 145
SPFskateb	=	SPFstop+16	; 161
SPFcelebrate	=	SPFskateb+24	; 185
SPFpump	=	SPFcelebrate+16	; 201
SPFcup	=	SPFpump+16	; 217
SPFhipl	=	SPFcup+8	; 225
SPFhipr	=	SPFhipl+8	; 233
SPFshoulderl	=	SPFhipr+8	; 241
SPFshoulderr	=	SPFshoulderl+8	; 249
SPFsweep	=	SPFshoulderr+8	; 257

SPFfallback	=	SPFsweep+16	; 273
SPFfallfwd	=	SPFfallback+32	; 305
SPFduck	=	SPFfallfwd+32	; 337
SPFhold	=	SPFduck+8	; 345

SPFgloves	=	SPFhold+8	; 353 not used by any table
SPFfight	=	SPFgloves+1	; 354 not used by any table
SPFfinjury	=	SPFfight+17	; 371 not used by any table
SPFPen	=	SPFfinjury+6	; 377

SPFarrow	=	SPFPen+7	; 384 not used by any table
SPFpad	=	SPFarrow+6	; 390 not used by any table
SPFreplay	=	SPFpad+3	; 393 not used by any table
SPFpuck	=	SPFreplay+1	; 394
SPFgoal	=	SPFpuck+11	; 405 not used by any table
SPFGoalie	=	SPFgoal+2	; 407
SPFgdive	=	SPFGoalie+112	; 519
SPFglovel2	=	SPFgdive+16	; 535
SPFgready	=	SPFglovel2+4	; 539
SPFSiren	=	SPFgready+24	; 563

SPFcatch	=	SPFSiren+14	; 577
SPFhook	=	SPFcatch+16	; 593
SPFstumble	=	SPFhook+16	; 609
SPFflip	=	SPFstumble+24	; 633
SPFinjury1	=	SPFflip+8	; 641
SPFbglass	=	SPFinjury1+12	; 653
SPFslamtop	=	708
SPFslambot	=	712
SPFghighr	=	658

SPAlist	;animation table list
	dc.w	0

SPAgready	=	*-SPAlist	; $0002
SPAgready_table:	;3 gready frames per direction (93 used 2) and new times
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	1

.0	dc.w	SPFGoalie,180,SPFgready,10,SPFGoalie,10,SPFgready+1,10,SPFGoalie,240,SPFgready+2,10,SPFGoalie,10,SPFgready,-10
.1	dc.w	SPFGoalie+3,180,SPFgready+3,10,SPFGoalie+3,10,SPFgready+4,10,SPFGoalie+3,240,SPFgready+5,10,SPFGoalie+3,10,SPFgready+3,-10
.2	dc.w	SPFGoalie+6,180,SPFgready+6,10,SPFGoalie+6,10,SPFgready+7,10,SPFGoalie+6,240,SPFgready+8,10,SPFGoalie+6,10,SPFgready+6,-10
.3	dc.w	SPFGoalie+9,180,SPFgready+9,10,SPFGoalie+9,10,SPFgready+10,10,SPFGoalie+9,240,SPFgready+11,10,SPFGoalie+9,10,SPFgready+9,-10
.4	dc.w	SPFGoalie+12,180,SPFgready+12,10,SPFGoalie+12,10,SPFgready+13,10,SPFGoalie+12,240,SPFgready+14,10,SPFGoalie+12,10,SPFgready+12,-10
.5	dc.w	SPFGoalie+15,180,SPFgready+15,10,SPFGoalie+15,10,SPFgready+16,10,SPFGoalie+15,240,SPFgready+17,10,SPFGoalie+15,10,SPFgready+15,-10
.6	dc.w	SPFGoalie+18,180,SPFgready+18,10,SPFGoalie+18,10,SPFgready+19,10,SPFGoalie+18,240,SPFgready+20,10,SPFGoalie+18,10,SPFgready+18,-10
.7	dc.w	SPFGoalie+21,180,SPFgready+21,10,SPFGoalie+21,10,SPFgready+22,10,SPFGoalie+21,240,SPFgready+23,10,SPFGoalie+21,10,SPFgready+21,-10

SPAgready2	=	*-SPAlist	; $0114
SPAgready2_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie,-30
.1	dc.w	SPFGoalie+3,-30
.2	dc.w	SPFGoalie+6,-30
.3	dc.w	SPFGoalie+9,-30
.4	dc.w	SPFGoalie+12,-30
.5	dc.w	SPFGoalie+15,-30
.6	dc.w	SPFGoalie+18,-30
.7	dc.w	SPFGoalie+21,-30

SPAgglover	=	*-SPAlist	; $0146
SPAgglover_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+1,-32
.1	dc.w	SPFGoalie+4,-32
.2	dc.w	SPFGoalie+7,-32
.3	dc.w	SPFGoalie+10,-32
.4	dc.w	SPFGoalie+13,-32
.5	dc.w	SPFGoalie+16,-32
.6	dc.w	SPFGoalie+19,-32
.7	dc.w	SPFGoalie+22,-32

SPAgglovel	=	*-SPAlist	; $0178
SPAgglovel_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+2,-32
.1	dc.w	SPFGoalie+5,-32
.2	dc.w	SPFGoalie+8,-32
.3	dc.w	SPFGoalie+11,-32
.4	dc.w	SPFGoalie+14,-32
.5	dc.w	SPFGoalie+17,-32
.6	dc.w	SPFGoalie+20,-32
.7	dc.w	SPFGoalie+23,-32

SPAgglovel2	=	*-SPAlist	; $01AA
SPAgglovel2_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFglovel2,4,SPFglovel2+1,8,SPFglovel2,-4
.1	dc.w	SPFGoalie+5,-32
.2	dc.w	SPFGoalie+8,-32
.3	dc.w	SPFGoalie+11,-32
.4	dc.w	SPFglovel2+2,4,SPFglovel2+3,8,SPFglovel2+2,-4
.5	dc.w	SPFGoalie+17,-32
.6	dc.w	SPFGoalie+20,-32
.7	dc.w	SPFGoalie+23,-32

SPAgstickr	=	*-SPAlist	; $01EC
SPAgstickr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+64,-32
.1	dc.w	SPFGoalie+66,-32
.2	dc.w	SPFGoalie+68,-32
.3	dc.w	SPFGoalie+70,-32
.4	dc.w	SPFGoalie+72,-32
.5	dc.w	SPFGoalie+74,-32
.6	dc.w	SPFGoalie+76,-32
.7	dc.w	SPFGoalie+78,-32

SPAgstickl	=	*-SPAlist	; $021E
SPAgstickl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+65,-32
.1	dc.w	SPFGoalie+67,-32
.2	dc.w	SPFGoalie+69,-32
.3	dc.w	SPFGoalie+71,-32
.4	dc.w	SPFGoalie+73,-32
.5	dc.w	SPFGoalie+75,-32
.6	dc.w	SPFGoalie+77,-32
.7	dc.w	SPFGoalie+79,-32

SPAgstackr	=	*-SPAlist	; $0250
SPAgstackr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+40,8,SPFGoalie+41,-32
.1	dc.w	SPFGoalie+42,8,SPFGoalie+43,-32
.2	dc.w	SPFGoalie+42,8,SPFGoalie+43,-32
.3	dc.w	SPFGoalie+44,8,SPFGoalie+45,-32
.4	dc.w	SPFGoalie+46,8,SPFGoalie+47,-32
.5	dc.w	SPFGoalie+48,8,SPFGoalie+49,-32
.6	dc.w	SPFGoalie+48,8,SPFGoalie+49,-32
.7	dc.w	SPFGoalie+50,8,SPFGoalie+51,-32

SPAgstackl	=	*-SPAlist	; $02A2
SPAgstackl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+52,8,SPFGoalie+53,-32
.1	dc.w	SPFGoalie+54,8,SPFGoalie+55,-32
.2	dc.w	SPFGoalie+54,8,SPFGoalie+55,-32
.3	dc.w	SPFGoalie+56,8,SPFGoalie+57,-32
.4	dc.w	SPFGoalie+58,8,SPFGoalie+59,-32
.5	dc.w	SPFGoalie+60,8,SPFGoalie+61,-32
.6	dc.w	SPFGoalie+60,8,SPFGoalie+61,-32
.7	dc.w	SPFGoalie+62,8,SPFGoalie+63,-32

SPAgdive	=	*-SPAlist	; $02F4
SPAgdive_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFgdive,8,SPFgdive+1,48,SPFgdive,-8
.1	dc.w	SPFgdive+2,8,SPFgdive+3,48,SPFgdive+2,-8
.2	dc.w	SPFgdive+4,8,SPFgdive+5,48,SPFgdive+4,-8
.3	dc.w	SPFgdive+6,8,SPFgdive+7,48,SPFgdive+6,-8
.4	dc.w	SPFgdive+8,8,SPFgdive+9,48,SPFgdive+8,-8
.5	dc.w	SPFgdive+10,8,SPFgdive+11,48,SPFgdive+10,-8
.6	dc.w	SPFgdive+12,8,SPFgdive+13,48,SPFgdive+12,-8
.7	dc.w	SPFgdive+14,8,SPFgdive+15,48,SPFgdive+14,-8

SPAgswing	=	*-SPAlist	; $0366
SPAgswing_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+24,5,SPFGoalie+25,8,SPFGoalie+24,-16
.1	dc.w	SPFGoalie+26,5,SPFGoalie+27,8,SPFGoalie+26,-16
.2	dc.w	SPFGoalie+28,5,SPFGoalie+29,8,SPFGoalie+28,-16
.3	dc.w	SPFGoalie+30,5,SPFGoalie+31,8,SPFGoalie+30,-16
.4	dc.w	SPFGoalie+32,5,SPFGoalie+33,8,SPFGoalie+32,-16
.5	dc.w	SPFGoalie+34,5,SPFGoalie+35,8,SPFGoalie+34,-16
.6	dc.w	SPFGoalie+36,5,SPFGoalie+37,8,SPFGoalie+36,-16
.7	dc.w	SPFGoalie+38,5,SPFGoalie+39,8,SPFGoalie+38,-16

SPAgskate	=	*-SPAlist	; $03D8
SPAgskate_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie+80,10,SPFGoalie+81,10,SPFGoalie+82,10,SPFGoalie+83,-15
.1	dc.w	SPFGoalie+84,10,SPFGoalie+85,10,SPFGoalie+86,10,SPFGoalie+87,-15
.2	dc.w	SPFGoalie+88,10,SPFGoalie+89,10,SPFGoalie+90,10,SPFGoalie+91,-15
.3	dc.w	SPFGoalie+92,10,SPFGoalie+93,10,SPFGoalie+94,10,SPFGoalie+95,-15
.4	dc.w	SPFGoalie+96,10,SPFGoalie+97,10,SPFGoalie+98,10,SPFGoalie+99,-15
.5	dc.w	SPFGoalie+100,10,SPFGoalie+101,10,SPFGoalie+102,10,SPFGoalie+103,-15
.6	dc.w	SPFGoalie+104,10,SPFGoalie+105,10,SPFGoalie+106,10,SPFGoalie+107,-15
.7	dc.w	SPFGoalie+108,10,SPFGoalie+109,10,SPFGoalie+110,10,SPFGoalie+111,-15

SPApflip	=	*-SPAlist	; $046A
SPApflip_table:
.t	;offset to each direction of animation (0-7)
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

SPAglide	=	*-SPAlist	; $050C
SPAglide_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskatewp,-8
.1	dc.w	SPFskatewp+5,-8
.2	dc.w	SPFskatewp+10,-8
.3	dc.w	SPFskatewp+15,-8
.4	dc.w	SPFskatewp+20,-8
.5	dc.w	SPFskatewp+25,-8
.6	dc.w	SPFskatewp+30,-8
.7	dc.w	SPFskatewp+35,-8

SPAskatewp	=	*-SPAlist	; $053E
SPAskatewp_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskatewp+1,10,SPFskatewp+2,10,SPFskatewp+3,10,SPFskatewp+4,-10
.1	dc.w	SPFskatewp+6,10,SPFskatewp+7,10,SPFskatewp+8,10,SPFskatewp+9,-10
.2	dc.w	SPFskatewp+11,10,SPFskatewp+12,10,SPFskatewp+13,10,SPFskatewp+14,-10
.3	dc.w	SPFskatewp+16,10,SPFskatewp+17,10,SPFskatewp+18,10,SPFskatewp+19,-10
.4	dc.w	SPFskatewp+21,10,SPFskatewp+22,10,SPFskatewp+23,10,SPFskatewp+24,-10
.5	dc.w	SPFskatewp+26,10,SPFskatewp+27,10,SPFskatewp+28,10,SPFskatewp+29,-10
.6	dc.w	SPFskatewp+31,10,SPFskatewp+32,10,SPFskatewp+33,10,SPFskatewp+34,-10
.7	dc.w	SPFskatewp+36,10,SPFskatewp+37,10,SPFskatewp+38,10,SPFskatewp+39,-10

SPAskate	=	*-SPAlist	; $05D0
SPAskate_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskate+1,10,SPFskate+2,10,SPFskate+3,10,SPFskate+4,-10
.1	dc.w	SPFskate+6,10,SPFskate+7,10,SPFskate+8,10,SPFskate+9,-10
.2	dc.w	SPFskate+11,10,SPFskate+12,10,SPFskate+13,10,SPFskate+14,-10
.3	dc.w	SPFskate+16,10,SPFskate+17,10,SPFskate+18,10,SPFskate+19,-10
.4	dc.w	SPFskate+21,10,SPFskate+22,10,SPFskate+23,10,SPFskate+24,-10
.5	dc.w	SPFskate+26,10,SPFskate+27,10,SPFskate+28,10,SPFskate+29,-10
.6	dc.w	SPFskate+31,10,SPFskate+32,10,SPFskate+33,10,SPFskate+34,-10
.7	dc.w	SPFskate+36,10,SPFskate+37,10,SPFskate+38,10,SPFskate+39,-10

SPAturnl	=	*-SPAlist	; $0662
SPAturnl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFturnl,-8
.1	dc.w	SPFturnl+1,-8
.2	dc.w	SPFturnl+2,-8
.3	dc.w	SPFturnl+3,-8
.4	dc.w	SPFturnl+4,-8
.5	dc.w	SPFturnl+5,-8
.6	dc.w	SPFturnl+6,-8
.7	dc.w	SPFturnl+7,-8

SPAturnr	=	*-SPAlist	; $0694
SPAturnr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFturnr,-8
.1	dc.w	SPFturnr+1,-8
.2	dc.w	SPFturnr+2,-8
.3	dc.w	SPFturnr+3,-8
.4	dc.w	SPFturnr+4,-8
.5	dc.w	SPFturnr+5,-8
.6	dc.w	SPFturnr+6,-8
.7	dc.w	SPFturnr+7,-8

SPAstop	=	*-SPAlist	; $06C6
SPAstop_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	1

.0	dc.w	SPFstop,4,SPFstop+1,-4
.1	dc.w	SPFstop+2,4,SPFstop+3,-4
.2	dc.w	SPFstop+4,4,SPFstop+5,-4
.3	dc.w	SPFstop+6,4,SPFstop+7,-4
.4	dc.w	SPFstop+8,4,SPFstop+9,-4
.5	dc.w	SPFstop+10,4,SPFstop+11,-4
.6	dc.w	SPFstop+12,4,SPFstop+13,-4
.7	dc.w	SPFstop+14,4,SPFstop+15,-4

SPApassf	=	*-SPAlist	; $0718
SPApassf_table:
.t	;offset to each direction of animation (0-7)
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

SPApassb	=	*-SPAlist	; $078A
SPApassb_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+3,4,SPFswing+2,4,SPFswing+1,-20
.1	dc.w	SPFswing+9,4,SPFswing+8,4,SPFswing+7,-20
.2	dc.w	SPFswing+15,4,SPFswing+14,4,SPFswing+13,-20
.3	dc.w	SPFswing+21,4,SPFswing+20,4,SPFswing+19,-20
.4	dc.w	SPFswing+27,4,SPFswing+26,4,SPFswing+25,-20
.5	dc.w	SPFswing+33,4,SPFswing+32,4,SPFswing+31,-20
.6	dc.w	SPFswing+39,4,SPFswing+38,4,SPFswing+37,-20
.7	dc.w	SPFswing+45,4,SPFswing+44,4,SPFswing+43,-20

SPAshotf	=	*-SPAlist	; $07FC
SPAshotf_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+3,4,SPFswing+2,4,SPFswing+1,4,SPFswing,4,SPFswing+1,4,SPFswing+2,4,SPFswing+3,4,SPFswing+4,4
	dc.w	SPFswing+5,-20
.1	dc.w	SPFswing+9,4,SPFswing+8,4,SPFswing+7,4,SPFswing+6,4,SPFswing+7,4,SPFswing+8,4,SPFswing+9,4,SPFswing+10,4
	dc.w	SPFswing+11,-20
.2	dc.w	SPFswing+15,4,SPFswing+14,4,SPFswing+13,4,SPFswing+12,4,SPFswing+13,4,SPFswing+14,4,SPFswing+15,4,SPFswing+16,4
	dc.w	SPFswing+17,-20
.3	dc.w	SPFswing+21,4,SPFswing+20,4,SPFswing+19,4,SPFswing+18,4,SPFswing+19,4,SPFswing+20,4,SPFswing+21,4,SPFswing+22,4
	dc.w	SPFswing+23,-20
.4	dc.w	SPFswing+27,4,SPFswing+26,4,SPFswing+25,4,SPFswing+24,4,SPFswing+25,4,SPFswing+26,4,SPFswing+27,4,SPFswing+28,4
	dc.w	SPFswing+29,-20
.5	dc.w	SPFswing+33,4,SPFswing+32,4,SPFswing+31,4,SPFswing+30,4,SPFswing+31,4,SPFswing+32,4,SPFswing+33,4,SPFswing+34,4
	dc.w	SPFswing+35,-20
.6	dc.w	SPFswing+39,4,SPFswing+38,4,SPFswing+37,4,SPFswing+36,4,SPFswing+37,4,SPFswing+38,4,SPFswing+39,4,SPFswing+40,4
	dc.w	SPFswing+41,-20
.7	dc.w	SPFswing+45,4,SPFswing+44,4,SPFswing+43,4,SPFswing+42,4,SPFswing+43,4,SPFswing+44,4,SPFswing+45,4,SPFswing+46,4
	dc.w	SPFswing+47,-20

SPAshotb	=	*-SPAlist	; $092E
SPAshotb_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFswing+3,4,SPFswing+4,4,SPFswing+5,4,SPFswing+5,4,SPFswing+5,4,SPFswing+4,4,SPFswing+3,4,SPFswing+2,4
	dc.w	SPFswing+1,-20
.1	dc.w	SPFswing+9,4,SPFswing+10,4,SPFswing+11,4,SPFswing+11,4,SPFswing+11,4,SPFswing+10,4,SPFswing+9,4,SPFswing+8,4
	dc.w	SPFswing+7,-20
.2	dc.w	SPFswing+15,4,SPFswing+16,4,SPFswing+17,4,SPFswing+17,4,SPFswing+17,4,SPFswing+16,4,SPFswing+15,4,SPFswing+14,4
	dc.w	SPFswing+13,-20
.3	dc.w	SPFswing+21,4,SPFswing+22,4,SPFswing+23,4,SPFswing+23,4,SPFswing+23,4,SPFswing+22,4,SPFswing+21,4,SPFswing+20,4
	dc.w	SPFswing+19,-20
.4	dc.w	SPFswing+27,4,SPFswing+28,4,SPFswing+29,4,SPFswing+29,4,SPFswing+29,4,SPFswing+28,4,SPFswing+27,4,SPFswing+26,4
	dc.w	SPFswing+25,-20
.5	dc.w	SPFswing+33,4,SPFswing+34,4,SPFswing+35,4,SPFswing+35,4,SPFswing+35,4,SPFswing+34,4,SPFswing+33,4,SPFswing+32,4
	dc.w	SPFswing+31,-20
.6	dc.w	SPFswing+39,4,SPFswing+40,4,SPFswing+41,4,SPFswing+41,4,SPFswing+41,4,SPFswing+40,4,SPFswing+39,4,SPFswing+38,4
	dc.w	SPFswing+37,-20
.7	dc.w	SPFswing+45,4,SPFswing+46,4,SPFswing+47,4,SPFswing+47,4,SPFswing+47,4,SPFswing+46,4,SPFswing+45,4,SPFswing+44,4
	dc.w	SPFswing+43,-20

SPAglideback	=	*-SPAlist	; $0A60
SPAglideback_table:
.t	;offset to each direction of animation (0-7)
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
.1	dc.w	SPFskateb+3,-8
.2	dc.w	SPFskateb+6,-8
.3	dc.w	SPFskateb+9,-8
.4	dc.w	SPFskateb+12,-8
.5	dc.w	SPFskateb+15,-8
.6	dc.w	SPFskateb+18,-8
.7	dc.w	SPFskateb+21,-8

SPAskateback	=	*-SPAlist	; $0A92
SPAskateback_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskateb,10,SPFskateb+1,10,SPFskateb,10,SPFskateb+2,-10
.1	dc.w	SPFskateb+3,10,SPFskateb+4,10,SPFskateb+3,10,SPFskateb+5,-10
.2	dc.w	SPFskateb+6,10,SPFskateb+7,10,SPFskateb+6,10,SPFskateb+8,-10
.3	dc.w	SPFskateb+9,10,SPFskateb+10,10,SPFskateb+9,10,SPFskateb+11,-10
.4	dc.w	SPFskateb+12,10,SPFskateb+13,10,SPFskateb+12,10,SPFskateb+14,-10
.5	dc.w	SPFskateb+15,10,SPFskateb+16,10,SPFskateb+15,10,SPFskateb+17,-10
.6	dc.w	SPFskateb+18,10,SPFskateb+19,10,SPFskateb+18,10,SPFskateb+20,-10
.7	dc.w	SPFskateb+21,10,SPFskateb+22,10,SPFskateb+21,10,SPFskateb+23,-10

SPAsweepchk	=	*-SPAlist	; $0B24
SPAsweepchk_table:
.t	;offset to each direction of animation (0-7)
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

SPAshoulderchkl	=	*-SPAlist	; $0B96
SPAshoulderchkl_table:
.t	;offset to each direction of animation (0-7)
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

SPAshoulderchkr	=	*-SPAlist	; $0BC8
SPAshoulderchkr_table:
.t	;offset to each direction of animation (0-7)
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

SPAhipchkl	=	*-SPAlist	; $0BFA
SPAhipchkl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhipl,-24
.1	dc.w	SPFhipl+1,-24
.2	dc.w	SPFhipl+2,-24
.3	dc.w	SPFhipl+3,-24
.4	dc.w	SPFhipl+4,-24
.5	dc.w	SPFhipl+5,-24
.6	dc.w	SPFhipl+6,-24
.7	dc.w	SPFhipl+7,-24

SPAhipchkr	=	*-SPAlist	; $0C2C
SPAhipchkr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhipr,-24
.1	dc.w	SPFhipr+1,-24
.2	dc.w	SPFhipr+2,-24
.3	dc.w	SPFhipr+3,-24
.4	dc.w	SPFhipr+4,-24
.5	dc.w	SPFhipr+5,-24
.6	dc.w	SPFhipr+6,-24
.7	dc.w	SPFhipr+7,-24

SPAburst	=	*-SPAlist	; $0C5E
SPAburst_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskate,-24
.1	dc.w	SPFskate+5,-24
.2	dc.w	SPFskate+10,-24
.3	dc.w	SPFskate+15,-24
.4	dc.w	SPFskate+20,-24
.5	dc.w	SPFskate+25,-24
.6	dc.w	SPFskate+30,-24
.7	dc.w	SPFskate+35,-24

SPAHold	=	*-SPAlist	; $0C90
SPAHold_table:
.t	;offset to each direction of animation (0-7)
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

SPAHold2	=	*-SPAlist	; $0CC2
SPAHold2_table:	;last time -40 in every direction (93 used -30)
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhold,-40
.1	dc.w	SPFhold+1,-40
.2	dc.w	SPFhold+2,-40
.3	dc.w	SPFhold+3,-40
.4	dc.w	SPFhold+4,-40
.5	dc.w	SPFhold+5,-40
.6	dc.w	SPFhold+6,-40
.7	dc.w	SPFhold+7,-40

SPAflail	=	*-SPAlist	; $0CF4
SPAflail_table:	;last time -40 in every direction (93 used -30)
.t	;offset to each direction of animation (0-7)
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

SPAfallfwd	=	*-SPAlist	; $0D26
SPAfallfwd_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFfallfwd,6,SPFfallfwd+1,6,SPFfallfwd+2,100,SPFfallfwd+3,8,SPFduck,-8
.1	dc.w	SPFfallfwd+4,6,SPFfallfwd+5,6,SPFfallfwd+6,100,SPFfallfwd+7,8,SPFduck+1,-8
.2	dc.w	SPFfallfwd+8,6,SPFfallfwd+9,6,SPFfallfwd+10,100,SPFfallfwd+11,8,SPFduck+2,-8
.3	dc.w	SPFfallfwd+12,6,SPFfallfwd+13,6,SPFfallfwd+14,100,SPFfallfwd+15,8,SPFduck+3,-8
.4	dc.w	SPFfallfwd+16,6,SPFfallfwd+17,6,SPFfallfwd+18,100,SPFfallfwd+19,8,SPFduck+4,-8
.5	dc.w	SPFfallfwd+20,6,SPFfallfwd+21,6,SPFfallfwd+22,100,SPFfallfwd+23,8,SPFduck+5,-8
.6	dc.w	SPFfallfwd+24,6,SPFfallfwd+25,6,SPFfallfwd+26,100,SPFfallfwd+27,8,SPFduck+6,-8
.7	dc.w	SPFfallfwd+28,6,SPFfallfwd+29,6,SPFfallfwd+30,100,SPFfallfwd+31,8,SPFduck+7,-8

SPAfallback	=	*-SPAlist	; $0DD8
SPAfallback_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFfallback,6,SPFfallback+1,6,SPFfallback+2,100,SPFfallback+3,8,SPFduck,-8
.1	dc.w	SPFfallback+4,6,SPFfallback+5,6,SPFfallback+6,100,SPFfallback+7,8,SPFduck+1,-8
.2	dc.w	SPFfallback+8,6,SPFfallback+9,6,SPFfallback+10,100,SPFfallback+11,8,SPFduck+2,-8
.3	dc.w	SPFfallback+12,6,SPFfallback+13,6,SPFfallback+14,100,SPFfallback+15,8,SPFduck+3,-8
.4	dc.w	SPFfallback+16,6,SPFfallback+17,6,SPFfallback+18,100,SPFfallback+19,8,SPFduck+4,-8
.5	dc.w	SPFfallback+20,6,SPFfallback+21,6,SPFfallback+22,100,SPFfallback+23,8,SPFduck+5,-8
.6	dc.w	SPFfallback+24,6,SPFfallback+25,6,SPFfallback+26,100,SPFfallback+27,8,SPFduck+6,-8
.7	dc.w	SPFfallback+28,6,SPFfallback+29,6,SPFfallback+30,100,SPFfallback+31,8,SPFduck+7,-8

SPAcelebrate	=	*-SPAlist	; $0E8A
SPAcelebrate_table:
.t	;offset to each direction of animation (0-7)
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

SPApump	=	*-SPAlist	; $0EFC
SPApump_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFpump,8,SPFpump+1,8,SPFpump,-8
.1	dc.w	SPFpump+2,8,SPFpump+3,8,SPFpump+2,-8
.2	dc.w	SPFpump+4,8,SPFpump+5,8,SPFpump+4,-8
.3	dc.w	SPFpump+6,8,SPFpump+7,8,SPFpump+6,-8
.4	dc.w	SPFpump+8,8,SPFpump+9,8,SPFpump+8,-8
.5	dc.w	SPFpump+10,8,SPFpump+11,8,SPFpump+10,-8
.6	dc.w	SPFpump+12,8,SPFpump+13,8,SPFpump+12,-8
.7	dc.w	SPFpump+14,8,SPFpump+15,8,SPFpump+14,-8

SPAwallright	=	*-SPAlist	; $0F6E
SPAwallright_table:	;first table after pump: there are no fight tables
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFPen+4,8,SPFPen+5,8,SPFPen+6,-8
.1
.2	dc.w	SPFPen,8,SPFPen+1,8,SPFPen+2,8,SPFPen+3,-8
.3
.4
.5
.6	dc.w	SPFPen+3,8,SPFPen+2,8,SPFPen+1,8,SPFPen,-8
.7	;invalid direction: points at the next table

SPAwallleft	=	*-SPAlist	; $0FAC
SPAwallleft_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFPen+6,8,SPFPen+5,8,SPFPen+4,-8
.1
.2	dc.w	SPFPen+3,8,SPFPen+2,8,SPFPen+1,8,SPFPen,-8
.3
.4
.5
.6	dc.w	SPFPen,8,SPFPen+1,8,SPFPen+2,8,SPFPen+3,-8
.7	;invalid direction: points at the next table

SPAfaceoff	=	*-SPAlist	; $0FEA
SPAfaceoff_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskatewp,2,SPFsweep+1,10,SPFsweep,-6
.1
.2
.3
.4
.5
.6
.7	dc.w	SPFskatewp+20,2,SPFsweep+9,10,SPFsweep+8,-6

SPAfaceoffr	=	*-SPAlist	; $1014
SPAfaceoffr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFskatewp,-5
.1
.2
.3
.4
.5
.6
.7	dc.w	SPFskatewp+20,-5

SPAsiren	=	*-SPAlist	; $102E
SPAsiren_table:
.t	;offset to each direction of animation (0-7)
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

SPAbglass	=	*-SPAlist	; $1078
SPAbglass_table:
.t	;offset to each direction of animation (0-7)
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

SPAstanley	=	*-SPAlist	; $109E
SPAstanley_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	1

.0	dc.w	SPFcup,-30
.1	dc.w	SPFcup+1,-30
.2	dc.w	SPFcup+2,-30
.3	dc.w	SPFcup+3,-30
.4	dc.w	SPFcup+4,-30
.5	dc.w	SPFcup+5,-30
.6	dc.w	SPFcup+6,-30
.7	dc.w	SPFcup+7,-30

SPAcatch	=	*-SPAlist	; $10D0
SPAcatch_table:
.t	;offset to each direction of animation (0-7)
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

SPAhook	=	*-SPAlist	; $1122
SPAhook_table:
.t	;offset to each direction of animation (0-7)
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

SPAhook2	=	*-SPAlist	; $1154
SPAhook2_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFhook,9,SPFhook+1,9,SPFhook,9,SPFhook+1,-9
.1	dc.w	SPFhook+2,9,SPFhook+3,9,SPFhook+2,9,SPFhook+3,-9
.2	dc.w	SPFhook+4,9,SPFhook+5,9,SPFhook+4,9,SPFhook+5,-9
.3	dc.w	SPFhook+6,9,SPFhook+7,9,SPFhook+6,9,SPFhook+7,-9
.4	dc.w	SPFhook+8,9,SPFhook+9,9,SPFhook+8,9,SPFhook+9,-9
.5	dc.w	SPFhook+10,9,SPFhook+11,9,SPFhook+10,9,SPFhook+11,-9
.6	dc.w	SPFhook+12,9,SPFhook+13,9,SPFhook+12,9,SPFhook+13,-9
.7	dc.w	SPFhook+14,9,SPFhook+15,9,SPFhook+14,9,SPFhook+15,-9

SPAstumble	=	*-SPAlist	; $11E6
SPAstumble_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFstumble,6,SPFstumble+1,6,SPFstumble+2,8,SPFstumble+1,6,SPFstumble,-6
.1	dc.w	SPFstumble+3,6,SPFstumble+4,6,SPFstumble+5,8,SPFstumble+4,6,SPFstumble+3,-6
.2	dc.w	SPFstumble+6,6,SPFstumble+7,6,SPFstumble+8,8,SPFstumble+7,6,SPFstumble+6,-6
.3	dc.w	SPFstumble+9,6,SPFstumble+10,6,SPFstumble+11,8,SPFstumble+10,6,SPFstumble+9,-6
.4	dc.w	SPFstumble+12,6,SPFstumble+13,6,SPFstumble+14,8,SPFstumble+13,6,SPFstumble+12,-6
.5	dc.w	SPFstumble+15,6,SPFstumble+16,6,SPFstumble+17,8,SPFstumble+16,6,SPFstumble+15,-6
.6	dc.w	SPFstumble+18,6,SPFstumble+19,6,SPFstumble+20,8,SPFstumble+19,6,SPFstumble+18,-6
.7	dc.w	SPFstumble+21,6,SPFstumble+22,6,SPFstumble+23,8,SPFstumble+22,6,SPFstumble+21,-6

SPAfake	=	*-SPAlist	; $1298
SPAfake_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFturnl,4,SPFturnl+7,4,SPFsweep+12,20,SPFturnr+7,4,SPFturnr,4,SPFturnr+1,-4
.1	dc.w	SPFturnl+1,4,SPFturnl,4,SPFsweep+14,20,SPFturnr,4,SPFturnr+1,4,SPFturnr+2,-4
.2	dc.w	SPFturnl+2,4,SPFturnl+1,4,SPFsweep,20,SPFturnr+1,4,SPFturnr+2,4,SPFturnr+3,-4
.3	dc.w	SPFturnl+3,4,SPFturnl+2,4,SPFsweep+2,20,SPFturnr+2,4,SPFturnr+3,4,SPFturnr+4,-4
.4	dc.w	SPFturnl+4,4,SPFturnl+3,4,SPFsweep+4,20,SPFturnr+3,4,SPFturnr+4,4,SPFturnr+5,-4
.5	dc.w	SPFturnl+5,4,SPFturnl+4,4,SPFsweep+6,20,SPFturnr+4,4,SPFturnr+5,4,SPFturnr+6,-4
.6	dc.w	SPFturnl+6,4,SPFturnl+5,4,SPFsweep+8,20,SPFturnr+5,4,SPFturnr+6,4,SPFturnr+7,-4
.7	dc.w	SPFturnl+7,4,SPFturnl+6,4,SPFsweep+10,20,SPFturnr+6,4,SPFturnr+7,4,SPFturnr,-4

SPAflip	=	*-SPAlist	; $136A
SPAflip_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFflip+3,6,SPFfallback+2,100,SPFfallback+3,8,SPFduck,-8
.1	dc.w	SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFflip+3,6,SPFfallback+6,100,SPFfallback+7,8,SPFduck+1,-8
.2	dc.w	SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFflip+3,6,SPFfallback+10,100,SPFfallback+11,8,SPFduck+2,-8
.3	dc.w	SPFflip+4,6,SPFflip+5,6,SPFflip+6,6,SPFflip+7,6,SPFfallback+14,100,SPFfallback+15,8,SPFduck+3,-8
.4	dc.w	SPFflip+4,6,SPFflip+5,6,SPFflip+6,6,SPFflip+7,6,SPFfallback+18,100,SPFfallback+19,8,SPFduck+4,-8
.5	dc.w	SPFflip+4,6,SPFflip+5,6,SPFflip+6,6,SPFflip+7,6,SPFfallback+22,100,SPFfallback+23,8,SPFduck+5,-8
.6	dc.w	SPFflip+4,6,SPFflip+5,6,SPFflip+6,6,SPFflip+7,6,SPFfallback+26,100,SPFfallback+27,8,SPFduck+6,-8
.7	dc.w	SPFflip,6,SPFflip+1,6,SPFflip+2,6,SPFflip+3,6,SPFfallback+30,100,SPFfallback+31,8,SPFduck+7,-8

SPAinjuryfall	=	*-SPAlist	; $145C. Fall back and stay down: the injured player (FallDown, before setInjuryType)
SPAinjuryfall_table:	;Frames 273-291
.t	;offset to each direction of animation (0-7)
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
.7	dc.w	SPFfallback,6,SPFfallback+1,6,SPFfallback+2,30,SPFfallback+2,-1024
.3
.4
.5
.6	dc.w	SPFfallback+16,6,SPFfallback+17,6,SPFfallback+18,30,SPFfallback+18,-1024

SPAghighr	=	*-SPAlist	; $148E. Goalie high shoulder save right (goaliesave.saveanim 6)
SPAghighr_table:	;Frames 658-672
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	658,-32
.1	dc.w	660,-32
.2	dc.w	662,-32
.3	dc.w	664,-32
.4	dc.w	666,-32
.5	dc.w	668,-32
.6	dc.w	670,-32
.7	dc.w	672,-32

SPAghighl	=	*-SPAlist	; $14C0. Goalie high shoulder save left (goaliesave.saveanim 7)
SPAghighl_table:	;Frames 659-673
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	659,-32
.1	dc.w	661,-32
.2	dc.w	663,-32
.3	dc.w	665,-32
.4	dc.w	667,-32
.5	dc.w	669,-32
.6	dc.w	671,-32
.7	dc.w	673,-32

SPAgstick2r	=	*-SPAlist	; $14F2. Goalie stick save right, 2 frames (goaliesave.saveanim 8)
SPAgstick2r_table:	;Frames 674-703
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	674,4,675,-32
.1	dc.w	678,4,679,-32
.2	dc.w	682,4,683,-32
.3	dc.w	686,4,687,-32
.4	dc.w	690,4,691,-32
.5	dc.w	694,4,695,-32
.6	dc.w	698,4,699,-32
.7	dc.w	702,4,703,-32

SPAgstick2l	=	*-SPAlist	; $1544. Goalie stick save left, 2 frames (goaliesave.saveanim 9)
SPAgstick2l_table:	;Frames 676-705
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	676,4,677,-32
.1	dc.w	680,4,681,-32
.2	dc.w	684,4,685,-32
.3	dc.w	688,4,689,-32
.4	dc.w	692,4,693,-32
.5	dc.w	696,4,697,-32
.6	dc.w	700,4,701,-32
.7	dc.w	704,4,705,-32

SPAgslamtop	=	*-SPAlist	; $1596. Goalie in the top net (pfgoal 0) turns and slams his stick after a goal: sfx $1C on frame SPFslamtop (assgoaliecpu)
SPAgslamtop_table:	;Frames 407-709
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	706,5,707,5,SPFslamtop,10,SPFslamtop+1,-5
.1	dc.w	SPFGoalie+3,8,SPFGoalie,8,706,5,707,5,SPFslamtop,10,SPFslamtop+1,-5
.2	dc.w	SPFGoalie+6,8,SPFGoalie+3,8,SPFGoalie+3,8,706,5,707,5,SPFslamtop,10,SPFslamtop+1,-5
.3	dc.w	SPFGoalie+9,8,SPFGoalie+6,8,SPFGoalie+6,8,SPFGoalie+6,8,706,5,707,5,SPFslamtop,10,SPFslamtop+1,-5
.4	dc.w	SPFGoalie+12,8,SPFGoalie+9,8,SPFGoalie+9,8,SPFGoalie+9,8,SPFGoalie+9,8,706,5,707,5,SPFslamtop,10
	dc.w	SPFslamtop+1,-5
.5	dc.w	SPFGoalie+15,8,SPFGoalie+18,8,SPFGoalie+18,8,SPFGoalie+18,8,706,5,707,5,SPFslamtop,10,SPFslamtop+1,-5
.6	dc.w	SPFGoalie+18,8,SPFGoalie+21,8,SPFGoalie+21,8,706,5,707,5,SPFslamtop,10,SPFslamtop+1,-5
.7	dc.w	SPFGoalie+21,8,SPFGoalie+24,8,706,5,707,5,SPFslamtop,10,SPFslamtop+1,-5

SPAgslambot	=	*-SPAlist	; $1684. Goalie in the bottom net (pfgoal 1) turns and slams his stick after a goal: sfx $1C on frame SPFslambot (assgoaliecpu)
SPAgslambot_table:	;Frames 407-713
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	SPFGoalie,8,SPFGoalie+3,8,SPFGoalie+3,8,SPFGoalie+3,8,SPFGoalie+3,8,710,5,711,5,SPFslambot,10
	dc.w	SPFslambot+1,-5
.1	dc.w	SPFGoalie+3,8,SPFGoalie+6,8,SPFGoalie+6,8,SPFGoalie+6,8,710,5,711,5,SPFslambot,10,SPFslambot+1,-5
.2	dc.w	SPFGoalie+6,8,SPFGoalie+9,8,SPFGoalie+9,8,710,5,711,5,SPFslambot,10,SPFslambot+1,-5
.3	dc.w	SPFGoalie+9,8,SPFGoalie+12,8,710,5,711,5,SPFslambot,10,SPFslambot+1,-5
.4	dc.w	SPFGoalie+12,8,710,5,711,5,SPFslambot,10,SPFslambot+1,-5
.5	dc.w	SPFGoalie+15,8,SPFGoalie+12,8,710,5,711,5,SPFslambot,10,SPFslambot+1,-5
.6	dc.w	SPFGoalie+18,8,SPFGoalie+15,8,SPFGoalie+15,8,710,5,711,5,SPFslambot,10,SPFslambot+1,-5
.7	dc.w	SPFGoalie+21,8,SPFGoalie+18,8,SPFGoalie+18,8,SPFGoalie+18,8,710,5,711,5,SPFslambot,10,SPFslambot+1,-5

SPAboardfront	=	*-SPAlist	; $1776. Checked into the end boards behind the top goal line (FallDown.FallList 0)
SPAboardfront_table:	;Frames 276-753
.t	;offset to each direction of animation (0-7)
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
.1	dc.w	738,6,739,6,740,6,741,60,SPFfallback+3,8,SPFduck,-8
.2
.3	dc.w	742,6,743,6,744,6,745,60,SPFfallfwd+11,8,SPFduck+2,-8
.4
.5	dc.w	746,6,747,6,748,6,749,60,SPFfallfwd+19,8,SPFduck+4,-8
.6
.7	dc.w	750,6,751,6,752,6,753,60,SPFfallfwd+27,8,SPFduck+6,-8

SPAboardright	=	*-SPAlist	; $17E8. Checked into the right side boards (FallDown.FallList 1; flipped sprites swap it with SPAboardleft)
SPAboardright_table:	;Frames 284-769
.t	;offset to each direction of animation (0-7)
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
.1	dc.w	754,6,755,6,756,6,757,60,SPFfallfwd+3,8,SPFduck,-8
.2
.3	dc.w	758,6,759,6,760,6,761,60,SPFfallback+11,8,SPFduck+2,-8
.4
.5	dc.w	762,6,763,6,764,6,765,60,SPFfallfwd+19,8,SPFduck+4,-8
.6
.7	dc.w	766,6,767,6,768,6,769,60,SPFfallback+27,8,SPFduck+6,-8

SPAboardback	=	*-SPAlist	; $185A. Checked into the end boards behind the bottom goal line (FallDown.FallList 2)
SPAboardback_table:	;Frames 292-785
.t	;offset to each direction of animation (0-7)
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
.1	dc.w	770,6,771,6,772,6,773,60,SPFfallfwd+3,8,SPFduck,-8
.2
;RAM xref
.3	dc.w	774,6,775,6,776,6,777,60,SPFfallfwd+11,8,SPFduck+2,-8
.4
.5	dc.w	778,6,779,6,780,6,781,60,SPFfallback+19,8,SPFduck+4,-8
.6
.7	dc.w	782,6,783,6,784,6,785,60,SPFfallfwd+27,8,SPFduck+6,-8

SPAboardleft	=	*-SPAlist	; $18CC. Checked into the left side boards (FallDown.FallList 3; flipped sprites swap it with SPAboardright)
SPAboardleft_table:	;Frames 284-801
.t	;offset to each direction of animation (0-7)
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
.1	dc.w	786,6,787,6,788,6,789,60,SPFfallfwd+3,8,SPFduck,-8
.2
.3	dc.w	790,6,791,6,792,6,793,60,SPFfallback+11,8,SPFduck+2,-8
.4
.5	dc.w	794,6,795,6,796,6,797,60,SPFfallfwd+19,8,SPFduck+4,-8
.6
.7	dc.w	798,6,799,6,800,6,801,60,SPFfallback+27,8,SPFduck+6,-8

SPAbenchcheckl	=	*-SPAlist	; $193E. Checked into the left boards near center ice (FallDown, from SPAboardleft / SPAboardright by Ypos and flip)
SPAbenchcheckl_table:	;Frames 284-815
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	802,6,803,6,804,6,805,6,806,6,807,6,808,6,800,6
	dc.w	769,6,SPFfallback+27,80,SPFduck+6,-8
.1
.2
.3	dc.w	790,6,809,6,810,6,811,6,812,6,813,6,809,6,792,6
	dc.w	761,6,SPFfallback+11,80,SPFduck+2,-8
.4	dc.w	814,6,815,6,804,6,805,6,806,6,807,6,808,6,800,6
	dc.w	769,6,SPFfallback+27,80,SPFduck+6,-8
.5
.6
.7	dc.w	798,6,815,6,804,6,805,6,806,6,807,6,808,6,800,6
	dc.w	769,6,SPFfallback+27,80,SPFduck+6,-8

SPAbenchcheckr	=	*-SPAlist	; $1A00. Checked into the right boards near center ice (FallDown, from SPAboardleft / SPAboardright by Ypos and flip)
SPAbenchcheckr_table:	;Frames 284-829
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	816,6,817,6,818,6,819,6,820,6,821,6,822,6,792,6
	dc.w	761,6,SPFfallback+11,80,SPFduck+2,-8
.1
.2
.3	dc.w	758,6,823,6,818,6,819,6,820,6,821,6,822,6,792,6
	dc.w	761,6,SPFfallback+11,80,SPFduck+2,-8
.4	dc.w	824,6,823,6,818,6,819,6,820,6,821,6,822,6,792,6
	dc.w	761,6,SPFfallback+11,80,SPFduck+2,-8
.5
.6
.7	dc.w	766,6,825,6,826,6,827,6,828,6,829,6,825,6,800,6
	dc.w	769,6,SPFfallback+27,80,SPFduck+6,-8

SPAcrosscheck	=	*-SPAlist	; $1AC2. The checker stops after a hit into the boards away from the crease (FallDown sets it on a3)
SPAcrosscheck_table:	;Frames 830-837
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t
	dc.w	.1-.t
	dc.w	.2-.t
	dc.w	.3-.t
	dc.w	.4-.t
	dc.w	.5-.t
	dc.w	.6-.t
	dc.w	.7-.t
	dc.w	0

.0	dc.w	830,-24
.1	dc.w	831,-24
.2	dc.w	832,-24
.3	dc.w	833,-24
.4	dc.w	834,-24
.5	dc.w	835,-24
.6	dc.w	836,-24
.7	dc.w	837,-24

SPAinjury1	=	*-SPAlist	; $1AF4
SPAinjury1_table:	;last table (93 had it right after flip)
.t	;offset to each direction of animation (0-7)
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
.7	dc.w	SPFfallback,6,SPFfallback+1,6,SPFfallback+2,30,SPFinjury1,10,SPFinjury1+1,10,SPFinjury1+2,10,SPFinjury1+3,8,SPFinjury1+4,8
	dc.w	SPFinjury1+5,8,SPFinjury1+3,8,SPFinjury1+4,8,SPFinjury1+5,8,SPFinjury1+3,8,SPFinjury1+4,8,SPFinjury1+5,8,SPFinjury1+3,8
	dc.w	SPFinjury1+4,8,SPFinjury1+5,-900
.3
.4
.5
.6	dc.w	SPFfallback+16,6,SPFfallback+17,6,SPFfallback+18,30,SPFinjury1+6,10,SPFinjury1+7,10,SPFinjury1+8,10,SPFinjury1+9,8,SPFinjury1+10,8
	dc.w	SPFinjury1+11,8,SPFinjury1+9,8,SPFinjury1+10,8,SPFinjury1+11,8,SPFinjury1+9,8,SPFinjury1+10,8,SPFinjury1+11,8,SPFinjury1+9,8
	dc.w	SPFinjury1+10,8,SPFinjury1+11,-900

; End of animation list
