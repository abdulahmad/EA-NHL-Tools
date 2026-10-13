;	Sprite frame tables. These tables tell the animation code where each group of frames starts
;	in the sprite graphics and where each animation's list begins.

; Sprite Frame (SPF) base indices
SPFskatewp	=	1
SPFskate	=	SPFskatewp+40; 41
SPFturnl	=	SPFskate+40; 81
SPFturnr	=	SPFturnl+8; 89
SPFswing	=	SPFturnr+8; 97
SPFstop	=	SPFswing+48; 145
SPFskateb	=	SPFstop+16; 161
SPFcelebrate	=	SPFskateb+24; 185
SPFpump	=	SPFcelebrate+16; 201
SPFcup	=	SPFpump+16; 217
SPFhipl	=	SPFcup+8; 225
SPFhipr	=	SPFhipl+8; 233
SPFshoulderl	=	SPFhipr+8; 241
SPFshoulderr	=	SPFshoulderl+8; 249
SPFsweep	=	SPFshoulderr+8; 257

SPFfallback	=	SPFsweep+16; 273
SPFfallfwd	=	SPFfallback+32; 305
SPFduck	=	SPFfallfwd+32; 337
SPFhold	=	SPFduck+8; 345
SPFgloves	=	SPFhold+8; 353
SPFfight	=	SPFgloves+1; 354
SPFfinjury	=	SPFfight+17; 371 - New
SPFPen	=	SPFfinjury+6; 377

SPFarrow	=	SPFPen+7; 384
SPFpad	=	SPFarrow+6; 390
SPFreplay	=	SPFpad+3; 393 - New
SPFpuck	=	SPFreplay+1; 394
SPFgoal	=	SPFpuck+11; 405
SPFGoalie	=	SPFgoal+2; 407
SPFgdive	=	SPFGoalie+112; 519 - New
SPFglovel2	=	SPFgdive+16; 535 - New
SPFgready	=	SPFglovel2+4; 539 - New
SPFSiren	=	SPFgready+16; 555

SPFcatch	=	SPFSiren+14; 569 - New
SPFhook	=	SPFcatch+16; 585 - New
SPFstumble	=	SPFhook+16; 601 - New
SPFflip	=	SPFstumble+24; 625 - New
SPFinjury1	=	SPFflip+8; 633 - New
SPFbglass	=	SPFinjury1+12; 645 - New

SPAlist
	dc.w	0

SPAgready	=	*-SPAlist
SPAgready_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0036
	dc.w	.2-.t ; 0x005a
	dc.w	.3-.t ; 0x007e
	dc.w	.4-.t ; 0x00a2
	dc.w	.5-.t ; 0x00c6
	dc.w	.6-.t ; 0x00ea
	dc.w	.7-.t ; 0x010e
	dc.w	1

.a	=	SPFGoalie
.aoff	=	3
.b	=	SPFgready
.boff	=	2

.0	dc.w	.a,180,.b,10,.b+1,10,.b,10,.b+1,10,.a,240,.b,10,.b+1,10,.b,-10
.a	set	.a+.aoff
.b	set	.b+.boff
.1	dc.w	.a,130,.b,10,.b+1,10,.b,10,.b+1,10,.a,300,.b,10,.b+1,10,.b,-10
.a	set	.a+.aoff
.b	set	.b+.boff
.2	dc.w	.a,210,.b,10,.b+1,10,.b,10,.b+1,10,.a,120,.b,10,.b+1,10,.b,-10
.a	set	.a+.aoff
.b	set	.b+.boff
.3	dc.w	.a,100,.b,10,.b+1,10,.b,10,.b+1,10,.a,200,.b,10,.b+1,10,.b,-10
.a	set	.a+.aoff
.b	set	.b+.boff
.4	dc.w	.a,240,.b,10,.b+1,10,.b,10,.b+1,10,.a,60,.b,10,.b+1,10,.b,-10
.a	set	.a+.aoff
.b	set	.b+.boff
.5	dc.w	.a,180,.b,10,.b+1,10,.b,10,.b+1,10,.a,240,.b,10,.b+1,10,.b,-10
.a	set	.a+.aoff
.b	set	.b+.boff
.6	dc.w	.a,120,.b,10,.b+1,10,.b,10,.b+1,10,.a,120,.b,10,.b+1,10,.b,-10
.a	set	.a+.aoff
.b	set	.b+.boff
.7	dc.w	.a,180,.b,10,.b+1,10,.b,10,.b+1,10,.a,180,.b,10,.b+1,10,.b,-10

SPAgready2	=	*-SPAlist
SPAgready2_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFGoalie
.aoff	=	3

.0	dc.w	.a,-30
.a	set	.a+.aoff
.1	dc.w	.a,-30
.a	set	.a+.aoff
.2	dc.w	.a,-30
.a	set	.a+.aoff
.3	dc.w	.a,-30
.a	set	.a+.aoff
.4	dc.w	.a,-30
.a	set	.a+.aoff
.5	dc.w	.a,-30
.a	set	.a+.aoff
.6	dc.w	.a,-30
.a	set	.a+.aoff
.7	dc.w	.a,-30

SPAgglover	=	*-SPAlist
SPAgglover_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFGoalie+1
.aoff	=	3

.0	dc.w	.a,-32
.a	set	.a+.aoff
.1	dc.w	.a,-32
.a	set	.a+.aoff
.2	dc.w	.a,-32
.a	set	.a+.aoff
.3	dc.w	.a,-32
.a	set	.a+.aoff
.4	dc.w	.a,-32
.a	set	.a+.aoff
.5	dc.w	.a,-32
.a	set	.a+.aoff
.6	dc.w	.a,-32
.a	set	.a+.aoff
.7	dc.w	.a,-32

SPAgglovel	=	*-SPAlist
SPAgglovel_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFGoalie+2
.aoff	=	3

.0	dc.w	.a,-32
.a	set	.a+.aoff
.1	dc.w	.a,-32
.a	set	.a+.aoff
.2	dc.w	.a,-32
.a	set	.a+.aoff
.3	dc.w	.a,-32
.a	set	.a+.aoff
.4	dc.w	.a,-32
.a	set	.a+.aoff
.5	dc.w	.a,-32
.a	set	.a+.aoff
.6	dc.w	.a,-32
.a	set	.a+.aoff
.7	dc.w	.a,-32

SPAgglovel2	=	*-SPAlist
SPAgglovel2_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x0022
	dc.w	.3-.t ; 0x0026
	dc.w	.4-.t ; 0x002a
	dc.w	.5-.t ; 0x0036
	dc.w	.6-.t ; 0x003a
	dc.w	.7-.t ; 0x003e
	dc.w	0

.a	=	SPFglovel2
.b	=	SPFGoalie+5

.0	dc.w	.a,4,.a+1,8,.a,-4
.1	dc.w	.b,-32
.2	dc.w	.b+3,-32
.3	dc.w	.b+6,-32
.4	dc.w	.a+2,4,.a+3,8,.a+2,-4
.5	dc.w	.b+12,-32
.6	dc.w	.b+15,-32
.7	dc.w	.b+18,-32

SPAgstickr	=	*-SPAlist
SPAgstickr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFGoalie+64
.aoff	=	2

.0	dc.w	.a,-32
.a	set	.a+.aoff
.1	dc.w	.a,-32
.a	set	.a+.aoff
.2	dc.w	.a,-32
.a	set	.a+.aoff
.3	dc.w	.a,-32
.a	set	.a+.aoff
.4	dc.w	.a,-32
.a	set	.a+.aoff
.5	dc.w	.a,-32
.a	set	.a+.aoff
.6	dc.w	.a,-32
.a	set	.a+.aoff
.7	dc.w	.a,-32

SPAgstickl	=	*-SPAlist
SPAgstickl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFGoalie+65
.aoff	=	2

.0	dc.w	.a,-32
.a	set	.a+.aoff
.1	dc.w	.a,-32
.a	set	.a+.aoff
.2	dc.w	.a,-32
.a	set	.a+.aoff
.3	dc.w	.a,-32
.a	set	.a+.aoff
.4	dc.w	.a,-32
.a	set	.a+.aoff
.5	dc.w	.a,-32
.a	set	.a+.aoff
.6	dc.w	.a,-32
.a	set	.a+.aoff
.7	dc.w	.a,-32

SPAgstackr	=	*-SPAlist
SPAgstackr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001a
	dc.w	.2-.t ; 0x0022
	dc.w	.3-.t ; 0x002a
	dc.w	.4-.t ; 0x0032
	dc.w	.5-.t ; 0x003a
	dc.w	.6-.t ; 0x0042
	dc.w	.7-.t ; 0x004a
	dc.w	0

.a	=	SPFGoalie+40

.0	dc.w	.a,8,.a+1,-32
.1	dc.w	.a+2,8,.a+3,-32
.2	dc.w	.a+2,8,.a+3,-32
.3	dc.w	.a+4,8,.a+5,-32
.4	dc.w	.a+6,8,.a+7,-32
.5	dc.w	.a+8,8,.a+9,-32
.6	dc.w	.a+8,8,.a+9,-32
.7	dc.w	.a+10,8,.a+11,-32

SPAgstackl	=	*-SPAlist
SPAgstackl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001a
	dc.w	.2-.t ; 0x0022
	dc.w	.3-.t ; 0x002a
	dc.w	.4-.t ; 0x0032
	dc.w	.5-.t ; 0x003a
	dc.w	.6-.t ; 0x0042
	dc.w	.7-.t ; 0x004a
	dc.w	0

.a	=	SPFGoalie+52

.0	dc.w	.a,8,.a+1,-32
.1	dc.w	.a+2,8,.a+3,-32
.2	dc.w	.a+2,8,.a+3,-32
.3	dc.w	.a+4,8,.a+5,-32
.4	dc.w	.a+6,8,.a+7,-32
.5	dc.w	.a+8,8,.a+9,-32
.6	dc.w	.a+8,8,.a+9,-32
.7	dc.w	.a+10,8,.a+11,-32

SPAgdive	=	*-SPAlist
SPAgdive_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x002a
	dc.w	.3-.t ; 0x0036
	dc.w	.4-.t ; 0x0042
	dc.w	.5-.t ; 0x004e
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0066
	dc.w	0

.a	=	SPFgdive
.aoff	=	2

.0	dc.w	.a,8,.a+1,48,.a,-8
.a	set	.a+.aoff
.1	dc.w	.a,8,.a+1,48,.a,-8
.a	set	.a+.aoff
.2	dc.w	.a,8,.a+1,48,.a,-8
.a	set	.a+.aoff
.3	dc.w	.a,8,.a+1,48,.a,-8
.a	set	.a+.aoff
.4	dc.w	.a,8,.a+1,48,.a,-8
.a	set	.a+.aoff
.5	dc.w	.a,8,.a+1,48,.a,-8
.a	set	.a+.aoff
.6	dc.w	.a,8,.a+1,48,.a,-8
.a	set	.a+.aoff
.7	dc.w	.a,8,.a+1,48,.a,-8

SPAgswing	=	*-SPAlist
SPAgswing_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x002a
	dc.w	.3-.t ; 0x0036
	dc.w	.4-.t ; 0x0042
	dc.w	.5-.t ; 0x004e
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0066
	dc.w	0

.a	=	SPFGoalie+24
.aoff	=	2

.0	dc.w	.a,5,.a+1,8,.a,-16
.a	set	.a+.aoff
.1	dc.w	.a,5,.a+1,8,.a,-16
.a	set	.a+.aoff
.2	dc.w	.a,5,.a+1,8,.a,-16
.a	set	.a+.aoff
.3	dc.w	.a,5,.a+1,8,.a,-16
.a	set	.a+.aoff
.4	dc.w	.a,5,.a+1,8,.a,-16
.a	set	.a+.aoff
.5	dc.w	.a,5,.a+1,8,.a,-16
.a	set	.a+.aoff
.6	dc.w	.a,5,.a+1,8,.a,-16
.a	set	.a+.aoff
.7	dc.w	.a,5,.a+1,8,.a,-16

SPAgskate	=	*-SPAlist
SPAgskate_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0022
	dc.w	.2-.t ; 0x0032
	dc.w	.3-.t ; 0x0042
	dc.w	.4-.t ; 0x0052
	dc.w	.5-.t ; 0x0062
	dc.w	.6-.t ; 0x0072
	dc.w	.7-.t ; 0x0082
	dc.w	0

.a	=	SPFGoalie+80
.aoff	=	4

.0	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15
.a	set	.a+.aoff
.1	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15
.a	set	.a+.aoff
.2	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15
.a	set	.a+.aoff
.3	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15
.a	set	.a+.aoff
.4	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15
.a	set	.a+.aoff
.5	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15
.a	set	.a+.aoff
.6	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15
.a	set	.a+.aoff
.7	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-15

SPApflip	=	*-SPAlist
SPApflip_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0032
	dc.w	.2-.t ; 0x0052
	dc.w	.3-.t ; 0x0072
	dc.w	.4-.t ; 0x0092
	dc.w	.5-.t ; 0x0096
	dc.w	.6-.t ; 0x009a
	dc.w	.7-.t ; 0x009e
	dc.w	1

.a	=	SPFpuck+1

.0	dc.w	.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,4,.a+2,4,.a+6,4,.a,-4
.1	dc.w	.a+8,2,.a,2,.a+7,2,.a+4,2,.a+9,2,.a+4,2,.a+7,2,.a,-2
.2	dc.w	.a+3,2,.a+2,2,.a+1,2,.a,2,.a+6,2,.a+2,2,.a+5,2,.a+4,-2
.3	dc.w	.a+7,4,.a,4,.a+8,4,.a,4,.a+7,4,.a+4,4,.a+9,4,.a+4,-4
.4	dc.w	.a,-4096
.5	dc.w	.a,-4096
.6	dc.w	.a+4,-4096
.7	dc.w	.a+4,-4096

SPAglide	=	*-SPAlist
SPAglide_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFskatewp
.aoff	=	5

.0	dc.w	.a,-8
.a	set	.a+.aoff
.1	dc.w	.a,-8
.a	set	.a+.aoff
.2	dc.w	.a,-8
.a	set	.a+.aoff
.3	dc.w	.a,-8
.a	set	.a+.aoff
.4	dc.w	.a,-8
.a	set	.a+.aoff
.5	dc.w	.a,-8
.a	set	.a+.aoff
.6	dc.w	.a,-8
.a	set	.a+.aoff
.7	dc.w	.a,-8

SPAskatewp	=	*-SPAlist
SPAskatewp_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0022
	dc.w	.2-.t ; 0x0032
	dc.w	.3-.t ; 0x0042
	dc.w	.4-.t ; 0x0052
	dc.w	.5-.t ; 0x0062
	dc.w	.6-.t ; 0x0072
	dc.w	.7-.t ; 0x0082
	dc.w	0

.a	=	SPFskatewp+1
.aoff	=	5

.0	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.1	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.2	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.3	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.4	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.5	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.6	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.7	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10

SPAskate	=	*-SPAlist
SPAskate_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0022
	dc.w	.2-.t ; 0x0032
	dc.w	.3-.t ; 0x0042
	dc.w	.4-.t ; 0x0052
	dc.w	.5-.t ; 0x0062
	dc.w	.6-.t ; 0x0072
	dc.w	.7-.t ; 0x0082
	dc.w	0

.a	=	SPFskate+1
.aoff	=	5

.0	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.1	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.2	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.3	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.4	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.5	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.6	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10
.a	set	.a+.aoff
.7	dc.w	.a,10,.a+1,10,.a+2,10,.a+3,-10

SPAturnl	=	*-SPAlist
SPAturnl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFturnl
.aoff	=	1

.0	dc.w	.a,-8
.a	set	.a+.aoff
.1	dc.w	.a,-8
.a	set	.a+.aoff
.2	dc.w	.a,-8
.a	set	.a+.aoff
.3	dc.w	.a,-8
.a	set	.a+.aoff
.4	dc.w	.a,-8
.a	set	.a+.aoff
.5	dc.w	.a,-8
.a	set	.a+.aoff
.6	dc.w	.a,-8
.a	set	.a+.aoff
.7	dc.w	.a,-8

SPAturnr	=	*-SPAlist
SPAturnr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFturnr
.aoff	=	1

.0	dc.w	.a,-8
.a	set	.a+.aoff
.1	dc.w	.a,-8
.a	set	.a+.aoff
.2	dc.w	.a,-8
.a	set	.a+.aoff
.3	dc.w	.a,-8
.a	set	.a+.aoff
.4	dc.w	.a,-8
.a	set	.a+.aoff
.5	dc.w	.a,-8
.a	set	.a+.aoff
.6	dc.w	.a,-8
.a	set	.a+.aoff
.7	dc.w	.a,-8

SPAstop	=	*-SPAlist
SPAstop_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001a
	dc.w	.2-.t ; 0x0022
	dc.w	.3-.t ; 0x002a
	dc.w	.4-.t ; 0x0032
	dc.w	.5-.t ; 0x003a
	dc.w	.6-.t ; 0x0042
	dc.w	.7-.t ; 0x004a
	dc.w	1

.a	=	SPFstop
.aoff	=	2

.0	dc.w	.a,4,.a+1,-4
.a	set	.a+.aoff
.1	dc.w	.a,4,.a+1,-4
.a	set	.a+.aoff
.2	dc.w	.a,4,.a+1,-4
.a	set	.a+.aoff
.3	dc.w	.a,4,.a+1,-4
.a	set	.a+.aoff
.4	dc.w	.a,4,.a+1,-4
.a	set	.a+.aoff
.5	dc.w	.a,4,.a+1,-4
.a	set	.a+.aoff
.6	dc.w	.a,4,.a+1,-4
.a	set	.a+.aoff
.7	dc.w	.a,4,.a+1,-4

SPApassf	=	*-SPAlist
SPApassf_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x002a
	dc.w	.3-.t ; 0x0036
	dc.w	.4-.t ; 0x0042
	dc.w	.5-.t ; 0x004e
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0066
	dc.w	0

.a	=	SPFswing+3
.aoff	=	6

.0	dc.w	.a,4,.a+1,4,.a+2,-20
.a	set	.a+.aoff
.1	dc.w	.a,4,.a+1,4,.a+2,-20
.a	set	.a+.aoff
.2	dc.w	.a,4,.a+1,4,.a+2,-20
.a	set	.a+.aoff
.3	dc.w	.a,4,.a+1,4,.a+2,-20
.a	set	.a+.aoff
.4	dc.w	.a,4,.a+1,4,.a+2,-20
.a	set	.a+.aoff
.5	dc.w	.a,4,.a+1,4,.a+2,-20
.a	set	.a+.aoff
.6	dc.w	.a,4,.a+1,4,.a+2,-20
.a	set	.a+.aoff
.7	dc.w	.a,4,.a+1,4,.a+2,-20

SPApassb	=	*-SPAlist
SPApassb_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x002a
	dc.w	.3-.t ; 0x0036
	dc.w	.4-.t ; 0x0042
	dc.w	.5-.t ; 0x004e
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0066
	dc.w	0

.a	=	SPFswing+1
.aoff	=	6

.0	dc.w	.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.1	dc.w	.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.2	dc.w	.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.3	dc.w	.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.4	dc.w	.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.5	dc.w	.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.6	dc.w	.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.7	dc.w	.a+2,4,.a+1,4,.a,-20

SPAshotf	=	*-SPAlist
SPAshotf_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0036
	dc.w	.2-.t ; 0x005a
	dc.w	.3-.t ; 0x007e
	dc.w	.4-.t ; 0x00a2
	dc.w	.5-.t ; 0x00c6
	dc.w	.6-.t ; 0x00ea
	dc.w	.7-.t ; 0x010e
	dc.w	0

.a	=	SPFswing
.aoff	=	6

.0	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20
.a	set	.a+.aoff
.1	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20
.a	set	.a+.aoff
.2	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20
.a	set	.a+.aoff
.3	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20
.a	set	.a+.aoff
.4	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20
.a	set	.a+.aoff
.5	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20
.a	set	.a+.aoff
.6	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20
.a	set	.a+.aoff
.7	dc.w	.a+3,4,.a+2,4,.a+1,4,.a,4,.a+1,4,.a+2,4,.a+3,4,.a+4,4,.a+5,-20

SPAshotb	=	*-SPAlist
SPAshotb_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0036
	dc.w	.2-.t ; 0x005a
	dc.w	.3-.t ; 0x007e
	dc.w	.4-.t ; 0x00a2
	dc.w	.5-.t ; 0x00c6
	dc.w	.6-.t ; 0x00ea
	dc.w	.7-.t ; 0x010e
	dc.w	0

.a	=	SPFswing+1
.aoff	=	6

.0	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.1	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.2	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.3	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.4	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.5	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.6	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20
.a	set	.a+.aoff
.7	dc.w	.a+2,4,.a+3,4,.a+4,4,.a+4,4,.a+4,4,.a+3,4,.a+2,4,.a+1,4,.a,-20

SPAglideback	=	*-SPAlist
SPAglideback_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFskateb
.aoff	=	3

.0	dc.w	.a,-8
.a	set	.a+.aoff
.1	dc.w	.a,-8
.a	set	.a+.aoff
.2	dc.w	.a,-8
.a	set	.a+.aoff
.3	dc.w	.a,-8
.a	set	.a+.aoff
.4	dc.w	.a,-8
.a	set	.a+.aoff
.5	dc.w	.a,-8
.a	set	.a+.aoff
.6	dc.w	.a,-8
.a	set	.a+.aoff
.7	dc.w	.a,-8

SPAskateback	=	*-SPAlist
SPAskateback_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0022
	dc.w	.2-.t ; 0x0032
	dc.w	.3-.t ; 0x0042
	dc.w	.4-.t ; 0x0052
	dc.w	.5-.t ; 0x0062
	dc.w	.6-.t ; 0x0072
	dc.w	.7-.t ; 0x0082
	dc.w	0

.a	=	SPFskateb
.aoff	=	3

.0	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10
.a	set	.a+.aoff
.1	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10
.a	set	.a+.aoff
.2	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10
.a	set	.a+.aoff
.3	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10
.a	set	.a+.aoff
.4	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10
.a	set	.a+.aoff
.5	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10
.a	set	.a+.aoff
.6	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10
.a	set	.a+.aoff
.7	dc.w	.a,10,.a+1,10,.a,10,.a+2,-10

SPAsweepchk	=	*-SPAlist
SPAsweepchk_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x002a
	dc.w	.3-.t ; 0x0036
	dc.w	.4-.t ; 0x0042
	dc.w	.5-.t ; 0x004e
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0066
	dc.w	0

.a	=	SPFsweep
.aoff	=	2

.0	dc.w	.a,4,.a+1,8,.a,-4
.a	set	.a+.aoff
.1	dc.w	.a,4,.a+1,8,.a,-4
.a	set	.a+.aoff
.2	dc.w	.a,4,.a+1,8,.a,-4
.a	set	.a+.aoff
.3	dc.w	.a,4,.a+1,8,.a,-4
.a	set	.a+.aoff
.4	dc.w	.a,4,.a+1,8,.a,-4
.a	set	.a+.aoff
.5	dc.w	.a,4,.a+1,8,.a,-4
.a	set	.a+.aoff
.6	dc.w	.a,4,.a+1,8,.a,-4
.a	set	.a+.aoff
.7	dc.w	.a,4,.a+1,8,.a,-4

SPAshoulderchkl	=	*-SPAlist
SPAshoulderchkl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFshoulderl
.aoff	=	1

.0	dc.w	.a,-24
.a	set	.a+.aoff
.1	dc.w	.a,-24
.a	set	.a+.aoff
.2	dc.w	.a,-24
.a	set	.a+.aoff
.3	dc.w	.a,-24
.a	set	.a+.aoff
.4	dc.w	.a,-24
.a	set	.a+.aoff
.5	dc.w	.a,-24
.a	set	.a+.aoff
.6	dc.w	.a,-24
.a	set	.a+.aoff
.7	dc.w	.a,-24

SPAshoulderchkr	=	*-SPAlist
SPAshoulderchkr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFshoulderr
.aoff	=	1

.0	dc.w	.a,-24
.a	set	.a+.aoff
.1	dc.w	.a,-24
.a	set	.a+.aoff
.2	dc.w	.a,-24
.a	set	.a+.aoff
.3	dc.w	.a,-24
.a	set	.a+.aoff
.4	dc.w	.a,-24
.a	set	.a+.aoff
.5	dc.w	.a,-24
.a	set	.a+.aoff
.6	dc.w	.a,-24
.a	set	.a+.aoff
.7	dc.w	.a,-24

SPAhipchkl	=	*-SPAlist
SPAhipchkl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFhipl
.aoff	=	1

.0	dc.w	.a,-24
.a	set	.a+.aoff
.1	dc.w	.a,-24
.a	set	.a+.aoff
.2	dc.w	.a,-24
.a	set	.a+.aoff
.3	dc.w	.a,-24
.a	set	.a+.aoff
.4	dc.w	.a,-24
.a	set	.a+.aoff
.5	dc.w	.a,-24
.a	set	.a+.aoff
.6	dc.w	.a,-24
.a	set	.a+.aoff
.7	dc.w	.a,-24

SPAhipchkr	=	*-SPAlist
SPAhipchkr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFhipr
.aoff	=	1

.0	dc.w	.a,-24
.a	set	.a+.aoff
.1	dc.w	.a,-24
.a	set	.a+.aoff
.2	dc.w	.a,-24
.a	set	.a+.aoff
.3	dc.w	.a,-24
.a	set	.a+.aoff
.4	dc.w	.a,-24
.a	set	.a+.aoff
.5	dc.w	.a,-24
.a	set	.a+.aoff
.6	dc.w	.a,-24
.a	set	.a+.aoff
.7	dc.w	.a,-24

SPAburst	=	*-SPAlist
SPAburst_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFskate
.aoff	=	5

.0	dc.w	.a,-24
.a	set	.a+.aoff
.1	dc.w	.a,-24
.a	set	.a+.aoff
.2	dc.w	.a,-24
.a	set	.a+.aoff
.3	dc.w	.a,-24
.a	set	.a+.aoff
.4	dc.w	.a,-24
.a	set	.a+.aoff
.5	dc.w	.a,-24
.a	set	.a+.aoff
.6	dc.w	.a,-24
.a	set	.a+.aoff
.7	dc.w	.a,-24

SPAHold	=	*-SPAlist
SPAHold_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFhold
.aoff	=	1

.0	dc.w	.a,-30
.a	set	.a+.aoff
.1	dc.w	.a,-30
.a	set	.a+.aoff
.2	dc.w	.a,-30
.a	set	.a+.aoff
.3	dc.w	.a,-30
.a	set	.a+.aoff
.4	dc.w	.a,-30
.a	set	.a+.aoff
.5	dc.w	.a,-30
.a	set	.a+.aoff
.6	dc.w	.a,-30
.a	set	.a+.aoff
.7	dc.w	.a,-30

SPAHold2	=	*-SPAlist
SPAHold2_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFhold
.aoff	=	1

.0	dc.w	.a,-30
.a	set	.a+.aoff
.1	dc.w	.a,-30
.a	set	.a+.aoff
.2	dc.w	.a,-30
.a	set	.a+.aoff
.3	dc.w	.a,-30
.a	set	.a+.aoff
.4	dc.w	.a,-30
.a	set	.a+.aoff
.5	dc.w	.a,-30
.a	set	.a+.aoff
.6	dc.w	.a,-30
.a	set	.a+.aoff
.7	dc.w	.a,-30

SPAflail	=	*-SPAlist
SPAflail_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFskate
.aoff	=	5

.0	dc.w	.a,-30
.a	set	.a+.aoff
.1	dc.w	.a,-30
.a	set	.a+.aoff
.2	dc.w	.a,-30
.a	set	.a+.aoff
.3	dc.w	.a,-30
.a	set	.a+.aoff
.4	dc.w	.a,-30
.a	set	.a+.aoff
.5	dc.w	.a,-30
.a	set	.a+.aoff
.6	dc.w	.a,-30
.a	set	.a+.aoff
.7	dc.w	.a,-30

SPAfallfwd	=	*-SPAlist
SPAfallfwd_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0026
	dc.w	.2-.t ; 0x003a
	dc.w	.3-.t ; 0x004e
	dc.w	.4-.t ; 0x0062
	dc.w	.5-.t ; 0x0076
	dc.w	.6-.t ; 0x008a
	dc.w	.7-.t ; 0x009e
	dc.w	0

.a	=	SPFfallfwd
.aoff	=	4
.b	=	SPFduck
.boff	=	1

.0	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.1	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.2	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.3	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.4	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.5	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.6	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.7	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8

SPAfallback	=	*-SPAlist
SPAfallback_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0026
	dc.w	.2-.t ; 0x003a
	dc.w	.3-.t ; 0x004e
	dc.w	.4-.t ; 0x0062
	dc.w	.5-.t ; 0x0076
	dc.w	.6-.t ; 0x008a
	dc.w	.7-.t ; 0x009e
	dc.w	0

.a	=	SPFfallback
.aoff	=	4
.b	=	SPFduck
.boff	=	1

.0	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.1	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.2	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.3	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.4	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.5	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.6	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8
.a	set	.a+.aoff
.b	set	.b+.boff
.7	dc.w	.a,6,.a+1,6,.a+2,100,.a+3,8,.b,-8

SPAcelebrate	=	*-SPAlist
SPAcelebrate_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x002a
	dc.w	.3-.t ; 0x0036
	dc.w	.4-.t ; 0x0042
	dc.w	.5-.t ; 0x004e
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0066
	dc.w	0

.a	=	SPFcelebrate
.aoff	=	2

.0	dc.w	.a,12,.a+1,40,.a,-5
.a	set	.a+.aoff
.1	dc.w	.a,12,.a+1,40,.a,-5
.a	set	.a+.aoff
.2	dc.w	.a,12,.a+1,40,.a,-5
.a	set	.a+.aoff
.3	dc.w	.a,12,.a+1,40,.a,-5
.a	set	.a+.aoff
.4	dc.w	.a,12,.a+1,40,.a,-5
.a	set	.a+.aoff
.5	dc.w	.a,12,.a+1,40,.a,-5
.a	set	.a+.aoff
.6	dc.w	.a,12,.a+1,40,.a,-5
.a	set	.a+.aoff
.7	dc.w	.a,12,.a+1,40,.a,-5

SPApump	=	*-SPAlist
SPApump_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x002a
	dc.w	.3-.t ; 0x0036
	dc.w	.4-.t ; 0x0042
	dc.w	.5-.t ; 0x004e
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0066
	dc.w	0

.a	=	SPFpump
.aoff	=	2

.0	dc.w	.a,8,.a+1,8,.a,-8
.a	set	.a+.aoff
.1	dc.w	.a,8,.a+1,8,.a,-8
.a	set	.a+.aoff
.2	dc.w	.a,8,.a+1,8,.a,-8
.a	set	.a+.aoff
.3	dc.w	.a,8,.a+1,8,.a,-8
.a	set	.a+.aoff
.4	dc.w	.a,8,.a+1,8,.a,-8
.a	set	.a+.aoff
.5	dc.w	.a,8,.a+1,8,.a,-8
.a	set	.a+.aoff
.6	dc.w	.a,8,.a+1,8,.a,-8
.a	set	.a+.aoff
.7	dc.w	.a,8,.a+1,8,.a,-8

SPAfight	=	*-SPAlist
SPAfight_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x0022
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0022
	dc.w	.6-.t ; 0x0022
	dc.w	.7-.t ; 0x0022
	dc.w	0

.a	=	SPFfight

.0
.1
.2	dc.w	.a,8,.a+1,8,.a+2,8,.a+3,-6
.3
.4
.5
.6
.7	dc.w	.a,8,.a+1,8,.a+2,8,.a+8,-6

SPAfgrab	=	*-SPAlist
SPAfgrab_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x001a
	dc.w	.4-.t ; 0x001a
	dc.w	.5-.t ; 0x001a
	dc.w	.6-.t ; 0x001a
	dc.w	.7-.t ; 0x001a
	dc.w	0

.a	=	SPFfight+3

.0
.1
.2	dc.w	.a+1,28,.a,-4
.3
.4
.5
.6
.7	dc.w	.a+6,28,.a+5,-4

SPAfheld	=	*-SPAlist
SPAfheld_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x001a
	dc.w	.4-.t ; 0x001a
	dc.w	.5-.t ; 0x001a
	dc.w	.6-.t ; 0x001a
	dc.w	.7-.t ; 0x001a
	dc.w	0

.a	=	SPFfight+3

.0
.1
.2	dc.w	.a+1,30,.a,-4
.3
.4
.5
.6
.7	dc.w	.a+6,30,.a+5,-4

SPAfhigh	=	*-SPAlist
SPAfhigh_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x0022
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0022
	dc.w	.6-.t ; 0x0022
	dc.w	.7-.t ; 0x0022
	dc.w	0

.a	=	SPFfight+3

.0
.1
.2	dc.w	.a+2,6,.a+3,16,.a+2,4,.a,-16
.3
.4
.5
.6
.7	dc.w	.a+7,6,.a+8,16,.a+7,4,.a+5,-16

SPAflow	=	*-SPAlist
SPAflow_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x0022
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0022
	dc.w	.6-.t ; 0x0022
	dc.w	.7-.t ; 0x0022
	dc.w	0

.a	=	SPFfight+3

.0
.1
.2	dc.w	.a+2,6,.a+4,16,.a+2,4,.a,-16
.3
.4
.5
.6
.7	dc.w	.a+7,6,.a+9,16,.a+7,4,.a+5,-16

SPAfhith	=	*-SPAlist
SPAfhith_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x001a
	dc.w	.4-.t ; 0x001a
	dc.w	.5-.t ; 0x001a
	dc.w	.6-.t ; 0x001a
	dc.w	.7-.t ; 0x001a
	dc.w	0

.a	=	SPFfight+3

.0
.1
.2	dc.w	.a+11,16,.a,-8
.3
.4
.5
.6
.7	dc.w	.a+11,16,.a+5,-8

SPAfhitl	=	*-SPAlist
SPAfhitl_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x001a
	dc.w	.4-.t ; 0x001a
	dc.w	.5-.t ; 0x001a
	dc.w	.6-.t ; 0x001a
	dc.w	.7-.t ; 0x001a
	dc.w	0

.a	=	SPFfight+3

.0
.1
.2	dc.w	.a+10,16,.a,-8
.3
.4
.5
.6
.7	dc.w	.a+10,16,.a+5,-8

SPAffall	=	*-SPAlist
SPAffall_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x0012
	dc.w	.4-.t ; 0x0012
	dc.w	.5-.t ; 0x0012
	dc.w	.6-.t ; 0x0012
	dc.w	.7-.t ; 0x0012
	dc.w	0

.a	=	SPFfight+14

.0
.1
.2
.3
.4
.5
.6
.7	dc.w	.a,8,.a+1,8,.a+2,200,.a+2,-2

SPAfinjury	=	*-SPAlist
SPAfinjury_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x0012
	dc.w	.4-.t ; 0x0012
	dc.w	.5-.t ; 0x0012
	dc.w	.6-.t ; 0x0012
	dc.w	.7-.t ; 0x0012
	dc.w	0

.a	=	SPFfight+14
.b	=	SPFfinjury

.0
.1
.2
.3
.4
.5
.6
.7	dc.w	.a,8,.a+1,8,.a+2,20,.b,8,.b+1,8,.b+2,8,.b+3,10,.b+4,10,.b+5,10,.b+3,10,.b+4,10,.b+5,10,.b+3,10,.b+4,10,.b+5,10,.b+3,10,.b+4,10,.b+5,-400

SPAwallright	=	*-SPAlist
SPAwallright_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x001e
	dc.w	.3-.t ; 0x002e
	dc.w	.4-.t ; 0x002e
	dc.w	.5-.t ; 0x002e
	dc.w	.6-.t ; 0x002e
	dc.w	.7-.t ; 0x003e
	dc.w	0

.a	=	SPFPen

.0	dc.w	.a+4,8,.a+5,8,.a+6,-8
.1
.2	dc.w	.a,8,.a+1,8,.a+2,8,.a+3,-8
.3
.4
.5
.6	dc.w	.a+3,8,.a+2,8,.a+1,8,.a,-8
.7	; (skipped)

SPAwallleft	=	*-SPAlist
SPAwallleft_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x001e
	dc.w	.3-.t ; 0x002e
	dc.w	.4-.t ; 0x002e
	dc.w	.5-.t ; 0x002e
	dc.w	.6-.t ; 0x002e
	dc.w	.7-.t ; 0x003e
	dc.w	0

.a	=	SPFPen

.0	dc.w	.a+6,8,.a+5,8,.a+4,-8
.1
.2	dc.w	.a+3,8,.a+2,8,.a+1,8,.a,-8
.3
.4
.5
.6	dc.w	.a,8,.a+1,8,.a+2,8,.a+3,-8
.7	; (skipped)

SPAfaceoff	=	*-SPAlist
SPAfaceoff_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001e
	dc.w	.2-.t ; 0x001e
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x001e
	dc.w	.5-.t ; 0x001e
	dc.w	.6-.t ; 0x001e
	dc.w	.7-.t ; 0x001e
	dc.w	0

.a	=	SPFskatewp
.b	=	SPFsweep

.0	dc.w	.a,2,.b+1,10,.b,-6
.1
.2
.3
.4
.5
.6
.7	dc.w	.a+20,2,.b+9,10,.b+8,-6

SPAfaceoffr	=	*-SPAlist
SPAfaceoffr_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x0016
	dc.w	.3-.t ; 0x0016
	dc.w	.4-.t ; 0x0016
	dc.w	.5-.t ; 0x0016
	dc.w	.6-.t ; 0x0016
	dc.w	.7-.t ; 0x0016
	dc.w	0

.a	=	SPFskatewp

.0	dc.w	.a,-5
.1
.2
.3
.4
.5
.6
.7	dc.w	.a+20,-5

SPAsiren	=	*-SPAlist
SPAsiren_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x0012
	dc.w	.4-.t ; 0x0012
	dc.w	.5-.t ; 0x0012
	dc.w	.6-.t ; 0x0012
	dc.w	.7-.t ; 0x0012
	dc.w	1

.a	=	SPFSiren

.0
.1
.2
.3
.4
.5
.6
.7	dc.w	.a,3,.a+1,3,.a+2,3,.a+3,3,.a+4,3,.a+5,3,.a+6,3,.a+7,3,.a+8,3,.a+9,3,.a+10,3,.a+11,3,.a+12,3,.a+13,-3

SPAbglass	=	*-SPAlist
SPAbglass_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x0012
	dc.w	.4-.t ; 0x0012
	dc.w	.5-.t ; 0x0012
	dc.w	.6-.t ; 0x0012
	dc.w	.7-.t ; 0x0012
	dc.w	0

.a	=	SPFbglass

.0
.1
.2
.3
.4
.5
.6
.7	dc.w	.a,8,.a+1,8,.a+2,8,.a+3,8,.a+4,-1000

SPAstanley	=	*-SPAlist
SPAstanley_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	1

.a	=	SPFcup
.aoff	=	1

.0	dc.w	.a,-30
.a	set	.a+.aoff
.1	dc.w	.a,-30
.a	set	.a+.aoff
.2	dc.w	.a,-30
.a	set	.a+.aoff
.3	dc.w	.a,-30
.a	set	.a+.aoff
.4	dc.w	.a,-30
.a	set	.a+.aoff
.5	dc.w	.a,-30
.a	set	.a+.aoff
.6	dc.w	.a,-30
.a	set	.a+.aoff
.7	dc.w	.a,-30

SPAcatch	=	*-SPAlist
SPAcatch_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x001a
	dc.w	.2-.t ; 0x0022
	dc.w	.3-.t ; 0x002a
	dc.w	.4-.t ; 0x0032
	dc.w	.5-.t ; 0x003a
	dc.w	.6-.t ; 0x0042
	dc.w	.7-.t ; 0x004a
	dc.w	0

.a	=	SPFcatch
.aoff	=	2

.0	dc.w	.a,6,.a+1,-6
.a	set	.a+.aoff
.1	dc.w	.a,6,.a+1,-6
.a	set	.a+.aoff
.2	dc.w	.a,6,.a+1,-6
.a	set	.a+.aoff
.3	dc.w	.a,6,.a+1,-6
.a	set	.a+.aoff
.4	dc.w	.a,6,.a+1,-6
.a	set	.a+.aoff
.5	dc.w	.a,6,.a+1,-6
.a	set	.a+.aoff
.6	dc.w	.a,6,.a+1,-6
.a	set	.a+.aoff
.7	dc.w	.a,6,.a+1,-6

SPAhook	=	*-SPAlist
SPAhook_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0016
	dc.w	.2-.t ; 0x001a
	dc.w	.3-.t ; 0x001e
	dc.w	.4-.t ; 0x0022
	dc.w	.5-.t ; 0x0026
	dc.w	.6-.t ; 0x002a
	dc.w	.7-.t ; 0x002e
	dc.w	0

.a	=	SPFhook
.aoff	=	2

.0	dc.w	.a,-30
.a	set	.a+.aoff
.1	dc.w	.a,-30
.a	set	.a+.aoff
.2	dc.w	.a,-30
.a	set	.a+.aoff
.3	dc.w	.a,-30
.a	set	.a+.aoff
.4	dc.w	.a,-30
.a	set	.a+.aoff
.5	dc.w	.a,-30
.a	set	.a+.aoff
.6	dc.w	.a,-30
.a	set	.a+.aoff
.7	dc.w	.a,-30

SPAhook2	=	*-SPAlist
SPAhook2_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0022
	dc.w	.2-.t ; 0x0032
	dc.w	.3-.t ; 0x0042
	dc.w	.4-.t ; 0x0052
	dc.w	.5-.t ; 0x0062
	dc.w	.6-.t ; 0x0072
	dc.w	.7-.t ; 0x0082
	dc.w	0

.a	=	SPFhook
.aoff	=	2

.0	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9
.a	set	.a+.aoff
.1	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9
.a	set	.a+.aoff
.2	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9
.a	set	.a+.aoff
.3	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9
.a	set	.a+.aoff
.4	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9
.a	set	.a+.aoff
.5	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9
.a	set	.a+.aoff
.6	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9
.a	set	.a+.aoff
.7	dc.w	.a,9,.a+1,9,.a,9,.a+1,-9

SPAstumble	=	*-SPAlist
SPAstumble_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0026
	dc.w	.2-.t ; 0x003a
	dc.w	.3-.t ; 0x004e
	dc.w	.4-.t ; 0x0062
	dc.w	.5-.t ; 0x0076
	dc.w	.6-.t ; 0x008a
	dc.w	.7-.t ; 0x009e
	dc.w	0

.a	=	SPFstumble
.aoff	=	3

.0	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6
.a	set	.a+.aoff
.1	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6
.a	set	.a+.aoff
.2	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6
.a	set	.a+.aoff
.3	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6
.a	set	.a+.aoff
.4	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6
.a	set	.a+.aoff
.5	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6
.a	set	.a+.aoff
.6	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6
.a	set	.a+.aoff
.7	dc.w	.a,6,.a+1,6,.a+2,8,.a+1,6,.a,-6

SPAfake	=	*-SPAlist
SPAfake_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x002a
	dc.w	.2-.t ; 0x0042
	dc.w	.3-.t ; 0x005a
	dc.w	.4-.t ; 0x0072
	dc.w	.5-.t ; 0x008a
	dc.w	.6-.t ; 0x00a2
	dc.w	.7-.t ; 0x00ba
	dc.w	0

.a	=	SPFturnl
.b	=	SPFsweep
.c	=	SPFturnr

.0	dc.w	.a,4,.a+7,4,.b+12,20,.c+7,4,.c,4,.c+1,-4
.1	dc.w	.a+1,4,.a,4,.b+14,20,.c,4,.c+1,4,.c+2,-4
.2	dc.w	.a+2,4,.a+1,4,.b,20,.c+1,4,.c+2,4,.c+3,-4
.3	dc.w	.a+3,4,.a+2,4,.b+2,20,.c+2,4,.c+3,4,.c+4,-4
.4	dc.w	.a+4,4,.a+3,4,.b+4,20,.c+3,4,.c+4,4,.c+5,-4
.5	dc.w	.a+5,4,.a+4,4,.b+6,20,.c+4,4,.c+5,4,.c+6,-4
.6	dc.w	.a+6,4,.a+5,4,.b+8,20,.c+5,4,.c+6,4,.c+7,-4
.7	dc.w	.a+7,4,.a+6,4,.b+10,20,.c+6,4,.c+7,4,.c,-4

SPAflip	=	*-SPAlist
SPAflip_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x002e
	dc.w	.2-.t ; 0x004a
	dc.w	.3-.t ; 0x0066
	dc.w	.4-.t ; 0x0082
	dc.w	.5-.t ; 0x009e
	dc.w	.6-.t ; 0x00ba
	dc.w	.7-.t ; 0x00d6
	dc.w	0

.a	=	SPFflip
.b	=	SPFfallback+2
.boff	=	4
.c	=	SPFduck
.coff	=	1

.0	dc.w	.a,6,.a+1,6,.a+2,6,.a+3,6,.b,100,.b+1,8,.c,-8
.b	set	.b+.boff
.c	set	.c+.coff
.1	dc.w	.a,6,.a+1,6,.a+2,6,.a+3,6,.b,100,.b+1,8,.c,-8
.b	set	.b+.boff
.c	set	.c+.coff
.2	dc.w	.a,6,.a+1,6,.a+2,6,.a+3,6,.b,100,.b+1,8,.c,-8
.b	set	.b+.boff
.c	set	.c+.coff
.3	dc.w	.a+4,6,.a+5,6,.a+6,6,.a+7,6,.b,100,.b+1,8,.c,-8
.b	set	.b+.boff
.c	set	.c+.coff
.4	dc.w	.a+4,6,.a+5,6,.a+6,6,.a+7,6,.b,100,.b+1,8,.c,-8
.b	set	.b+.boff
.c	set	.c+.coff
.5	dc.w	.a+4,6,.a+5,6,.a+6,6,.a+7,6,.b,100,.b+1,8,.c,-8
.b	set	.b+.boff
.c	set	.c+.coff
.6	dc.w	.a+4,6,.a+5,6,.a+6,6,.a+7,6,.b,100,.b+1,8,.c,-8
.b	set	.b+.boff
.c	set	.c+.coff
.7	dc.w	.a,6,.a+1,6,.a+2,6,.a+3,6,.b,100,.b+1,8,.c,-8

SPAinjury1	=	*-SPAlist
SPAinjury1_table:
.t	;offset to each direction of animation (0-7)
	dc.w	.0-.t ; 0x0012
	dc.w	.1-.t ; 0x0012
	dc.w	.2-.t ; 0x0012
	dc.w	.3-.t ; 0x005a
	dc.w	.4-.t ; 0x005a
	dc.w	.5-.t ; 0x005a
	dc.w	.6-.t ; 0x005a
	dc.w	.7-.t ; 0x0012
	dc.w	0

.a	=	SPFfallback
.b	=	SPFinjury1

.7
.0
.1
.2	dc.w	.a,6,.a+1,6,.a+2,30,.b,10,.b+1,10,.b+2,10,.b+3,8,.b+4,8,.b+5,8,.b+3,8,.b+4,8,.b+5,8,.b+3,8,.b+4,8,.b+5,8,.b+3,8,.b+4,8,.b+5,-900
.3
.4
.5
.6	dc.w	.a+16,6,.a+17,6,.a+18,30,.b+6,10,.b+7,10,.b+8,10,.b+9,8,.b+10,8,.b+11,8,.b+9,8,.b+10,8,.b+11,8,.b+9,8,.b+10,8,.b+11,8,.b+9,8,.b+10,8,.b+11,-900

; End of animation list