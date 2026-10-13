; SPF bases and SPA sequences for NHLPA Hockey 93 on the SNES.
; Converted from NHLPA93SNES src/data/frames93s.asm and src/ram93snes.asm.
; A direction word of $8000 runs off the end of that animation (the source
; points at the next table). SPF symbols are sorted by frame number.

SPFskatewp	= 1
SPFskate	= 41
SPFturnl	= 81
SPFturnr	= 89
SPFswing	= 97
SPFstop	= 145
SPFskateb	= 161
SPFcelebrate	= 185
SPFpump	= 201
SPFcup	= 217
SPFhipl	= 225
SPFhipr	= 233
SPFshoulderl	= 241
SPFshoulderr	= 249
SPFsweep	= 257
SPFfallback	= 273
SPFfallfwd	= 305
SPFduck	= 337
SPFhold	= 345
SPFgloves	= 353
SPFfight	= 354
SPFfinjury	= 371
SPFPen	= 377
SPFarrow	= 384
SPFpad	= 390
SPFpuck	= 393
SPFgoal	= 404
SPFGoalie	= 406
SPFSiren	= 518
SPFfaceoff	= 532
SPFsmallfont	= 542
SPFzamboni	= 557
SPFflip	= 558
SPFstumble	= 566
SPFhook	= 590
SPFcatch	= 606
SPFbglass	= 622
SPFgready	= 627
SPFgdive	= 643
SPFcrowd	= 659

SPAList:
	dc.w	0

SPAgready	= *-SPAList	; SPAgready frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	1
.0	dc.w	406,180,627,10,628,10,627,10,628,10,406,240,627,10,628,10,627,-10
.1	dc.w	409,130,629,10,630,10,629,10,630,10,409,300,629,10,630,10,629,-10
.2	dc.w	412,210,631,10,632,10,631,10,632,10,412,120,631,10,632,10,631,-10
.3	dc.w	415,100,633,10,634,10,633,10,634,10,415,200,633,10,634,10,633,-10
.4	dc.w	418,240,635,10,636,10,635,10,636,10,418,60,635,10,636,10,635,-10
.5	dc.w	421,180,637,10,638,10,637,10,638,10,421,240,637,10,638,10,637,-10
.6	dc.w	424,120,639,10,640,10,639,10,640,10,424,120,639,10,640,10,639,-10
.7	dc.w	427,180,641,10,642,10,641,10,642,10,427,180,641,10,642,10,641,-10

SPAgready2	= *-SPAList	; SPAgready2 frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	406,-30
.1	dc.w	409,-30
.2	dc.w	412,-30
.3	dc.w	415,-30
.4	dc.w	418,-30
.5	dc.w	421,-30
.6	dc.w	424,-30
.7	dc.w	427,-30

SPAgglover	= *-SPAList	; SPAgglover frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	407,-32
.1	dc.w	410,-32
.2	dc.w	413,-32
.3	dc.w	416,-32
.4	dc.w	419,-32
.5	dc.w	422,-32
.6	dc.w	425,-32
.7	dc.w	428,-32

SPAgglovel	= *-SPAList	; SPAgglovel frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	408,-32
.1	dc.w	411,-32
.2	dc.w	414,-32
.3	dc.w	417,-32
.4	dc.w	420,-32
.5	dc.w	423,-32
.6	dc.w	426,-32
.7	dc.w	429,-32

SPAgstickr	= *-SPAList	; SPAgstickr frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	470,-32
.1	dc.w	472,-32
.2	dc.w	474,-32
.3	dc.w	476,-32
.4	dc.w	478,-32
.5	dc.w	480,-32
.6	dc.w	482,-32
.7	dc.w	484,-32

SPAgstickl	= *-SPAList	; SPAgstickl frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	471,-32
.1	dc.w	473,-32
.2	dc.w	475,-32
.3	dc.w	477,-32
.4	dc.w	479,-32
.5	dc.w	481,-32
.6	dc.w	483,-32
.7	dc.w	485,-32

SPAgstackr	= *-SPAList	; SPAgstackr frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	446,8,447,-20
.1	dc.w	448,8,449,-20
.2	dc.w	448,8,449,-20
.3	dc.w	450,8,451,-20
.4	dc.w	452,8,453,-20
.5	dc.w	454,8,455,-20
.6	dc.w	454,8,455,-20
.7	dc.w	456,8,457,-20

SPAgstackl	= *-SPAList	; SPAgstackl frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	458,8,459,-20
.1	dc.w	460,8,461,-20
.2	dc.w	460,8,461,-20
.3	dc.w	462,8,463,-20
.4	dc.w	464,8,465,-20
.5	dc.w	466,8,467,-20
.6	dc.w	466,8,467,-20
.7	dc.w	468,8,469,-20

SPAgswing	= *-SPAList	; SPAgswing frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	430,5,431,8,430,-16
.1	dc.w	432,5,433,8,432,-16
.2	dc.w	434,5,435,8,434,-16
.3	dc.w	436,5,437,8,436,-16
.4	dc.w	438,5,439,8,438,-16
.5	dc.w	440,5,441,8,440,-16
.6	dc.w	442,5,443,8,442,-16
.7	dc.w	444,5,445,8,444,-16

SPAgskate	= *-SPAList	; SPAgskate frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	1
.0	dc.w	486,10,487,10,488,10,489,-15
.1	dc.w	490,10,491,10,492,10,493,-15
.2	dc.w	494,10,495,10,496,10,497,-15
.3	dc.w	498,10,499,10,500,10,501,-15
.4	dc.w	502,10,503,10,504,10,505,-15
.5	dc.w	506,10,507,10,508,10,509,-15
.6	dc.w	510,10,511,10,512,10,513,-15
.7	dc.w	514,10,515,10,516,10,517,-15

SPApflip	= *-SPAList	; SPApflip frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	1
.0	dc.w	395,4,396,4,397,4,398,4,399,4,396,4,400,4,394,-4
.1	dc.w	402,2,394,2,401,2,398,2,403,2,398,2,401,2,394,-2
.2	dc.w	397,2,396,2,395,2,394,2,400,2,396,2,399,2,398,-2
.3	dc.w	401,4,394,4,402,4,394,4,401,4,398,4,403,4,398,-4
.4	dc.w	394,-4096
.5	dc.w	394,-4096
.6	dc.w	398,-4096
.7	dc.w	398,-4096

SPAglide	= *-SPAList	; SPAglide frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	1,-8
.1	dc.w	6,-8
.2	dc.w	11,-8
.3	dc.w	16,-8
.4	dc.w	21,-8
.5	dc.w	26,-8
.6	dc.w	31,-8
.7	dc.w	36,-8

SPAskatewp	= *-SPAList	; SPAskatewp frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	2,10,3,10,4,10,5,10,1,-15
.1	dc.w	7,10,8,10,9,10,10,10,6,-15
.2	dc.w	12,10,13,10,14,10,15,10,11,-15
.3	dc.w	17,10,18,10,19,10,20,10,16,-15
.4	dc.w	22,10,23,10,24,10,25,10,21,-15
.5	dc.w	27,10,28,10,29,10,30,10,26,-15
.6	dc.w	32,10,33,10,34,10,35,10,31,-15
.7	dc.w	37,10,38,10,39,10,40,10,36,-15

SPAskate	= *-SPAList	; SPAskate frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	42,10,43,10,44,10,45,10,41,-15
.1	dc.w	47,10,48,10,49,10,50,10,46,-15
.2	dc.w	52,10,53,10,54,10,55,10,51,-15
.3	dc.w	57,10,58,10,59,10,60,10,56,-15
.4	dc.w	62,10,63,10,64,10,65,10,61,-15
.5	dc.w	67,10,68,10,69,10,70,10,66,-15
.6	dc.w	72,10,73,10,74,10,75,10,71,-15
.7	dc.w	77,10,78,10,79,10,80,10,76,-15

SPAturnl	= *-SPAList	; SPAturnl frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	81,-18
.1	dc.w	82,-18
.2	dc.w	83,-18
.3	dc.w	84,-18
.4	dc.w	85,-18
.5	dc.w	86,-18
.6	dc.w	87,-18
.7	dc.w	88,-18

SPAturnr	= *-SPAList	; SPAturnr frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	89,-18
.1	dc.w	90,-18
.2	dc.w	91,-18
.3	dc.w	92,-18
.4	dc.w	93,-18
.5	dc.w	94,-18
.6	dc.w	95,-18
.7	dc.w	96,-18

SPAstop	= *-SPAList	; SPAstop frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	1
.0	dc.w	145,4,146,-4
.1	dc.w	147,4,148,-4
.2	dc.w	149,4,150,-4
.3	dc.w	151,4,152,-4
.4	dc.w	153,4,154,-4
.5	dc.w	155,4,156,-4
.6	dc.w	157,4,158,-4
.7	dc.w	159,4,160,-4

SPApassf	= *-SPAList	; SPApassf frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	100,4,101,4,102,-20
.1	dc.w	106,4,107,4,108,-20
.2	dc.w	112,4,113,4,114,-20
.3	dc.w	118,4,119,4,120,-20
.4	dc.w	124,4,125,4,126,-20
.5	dc.w	130,4,131,4,132,-20
.6	dc.w	136,4,137,4,138,-20
.7	dc.w	142,4,143,4,144,-20

SPApassb	= *-SPAList	; SPApassb frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	100,4,99,4,98,-20
.1	dc.w	106,4,105,4,104,-20
.2	dc.w	112,4,111,4,110,-20
.3	dc.w	118,4,117,4,116,-20
.4	dc.w	124,4,123,4,122,-20
.5	dc.w	130,4,129,4,128,-20
.6	dc.w	136,4,135,4,134,-20
.7	dc.w	142,4,141,4,140,-20

SPAshotf	= *-SPAList	; SPAshotf frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	100,4,99,4,98,4,97,4,99,0,100,0,101,0,102,-20
.1	dc.w	106,4,105,4,104,4,103,4,105,0,106,0,107,0,108,-20
.2	dc.w	112,4,111,4,110,4,109,4,111,0,112,0,113,0,114,-20
.3	dc.w	118,4,117,4,116,4,115,4,117,0,118,0,119,0,120,-20
.4	dc.w	124,4,123,4,122,4,121,4,123,0,124,0,125,0,126,-20
.5	dc.w	130,4,129,4,128,4,127,4,129,0,130,0,131,0,132,-20
.6	dc.w	136,4,135,4,134,4,133,4,135,0,136,0,137,0,138,-20
.7	dc.w	142,4,141,4,140,4,139,4,141,0,142,0,143,0,144,-20

SPAshotb	= *-SPAList	; SPAshotb frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	100,4,101,4,102,4,102,4,101,0,100,0,99,0,98,-20
.1	dc.w	106,4,107,4,108,4,108,4,107,0,106,0,105,0,104,-20
.2	dc.w	112,4,113,4,114,4,114,4,113,0,112,0,111,0,110,-20
.3	dc.w	118,4,119,4,120,4,120,4,119,0,118,0,117,0,116,-20
.4	dc.w	124,4,125,4,126,4,126,4,125,0,124,0,123,0,122,-20
.5	dc.w	130,4,131,4,132,4,132,4,131,0,130,0,129,0,128,-20
.6	dc.w	136,4,137,4,138,4,138,4,137,0,136,0,135,0,134,-20
.7	dc.w	142,4,143,4,144,4,144,4,143,0,142,0,141,0,140,-20

SPAglideback	= *-SPAList	; SPAglideback frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	161,-8
.1	dc.w	164,-8
.2	dc.w	167,-8
.3	dc.w	170,-8
.4	dc.w	173,-8
.5	dc.w	176,-8
.6	dc.w	179,-8
.7	dc.w	182,-8

SPAskateback	= *-SPAList	; SPAskateback frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	161,10,162,10,161,10,163,-10
.1	dc.w	164,10,165,10,164,10,166,-10
.2	dc.w	167,10,168,10,167,10,169,-10
.3	dc.w	170,10,171,10,170,10,172,-10
.4	dc.w	173,10,174,10,173,10,175,-10
.5	dc.w	176,10,177,10,176,10,178,-10
.6	dc.w	179,10,180,10,179,10,181,-10
.7	dc.w	182,10,183,10,182,10,184,-10

SPAsweepchk	= *-SPAList	; SPAsweepchk frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	257,4,258,8,257,-4
.1	dc.w	259,4,260,8,259,-4
.2	dc.w	261,4,262,8,261,-4
.3	dc.w	263,4,264,8,263,-4
.4	dc.w	265,4,266,8,265,-4
.5	dc.w	267,4,268,8,267,-4
.6	dc.w	269,4,270,8,269,-4
.7	dc.w	271,4,272,8,271,-4

SPAshoulderchkl	= *-SPAList	; SPAshoulderchkl frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	241,-24
.1	dc.w	242,-24
.2	dc.w	243,-24
.3	dc.w	244,-24
.4	dc.w	245,-24
.5	dc.w	246,-24
.6	dc.w	247,-24
.7	dc.w	248,-24

SPAshoulderchkr	= *-SPAList	; SPAshoulderchkr frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	249,-24
.1	dc.w	250,-24
.2	dc.w	251,-24
.3	dc.w	252,-24
.4	dc.w	253,-24
.5	dc.w	254,-24
.6	dc.w	255,-24
.7	dc.w	256,-24

SPAhipchkl	= *-SPAList	; SPAhipchkl frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	225,-24
.1	dc.w	226,-24
.2	dc.w	227,-24
.3	dc.w	228,-24
.4	dc.w	229,-24
.5	dc.w	230,-24
.6	dc.w	231,-24
.7	dc.w	232,-24

SPAhipchkr	= *-SPAList	; SPAhipchkr frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	233,-24
.1	dc.w	234,-24
.2	dc.w	235,-24
.3	dc.w	236,-24
.4	dc.w	237,-24
.5	dc.w	238,-24
.6	dc.w	239,-24
.7	dc.w	240,-24

SPAburst	= *-SPAList	; SPAburst frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	41,-24
.1	dc.w	46,-24
.2	dc.w	51,-24
.3	dc.w	56,-24
.4	dc.w	61,-24
.5	dc.w	66,-24
.6	dc.w	71,-24
.7	dc.w	76,-24

SPAHold	= *-SPAList	; SPAHold frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	345,-30
.1	dc.w	346,-30
.2	dc.w	347,-30
.3	dc.w	348,-30
.4	dc.w	349,-30
.5	dc.w	350,-30
.6	dc.w	351,-30
.7	dc.w	352,-30

SPAHold2	= *-SPAList	; SPAHold2 frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	345,-30
.1	dc.w	346,-30
.2	dc.w	347,-30
.3	dc.w	348,-30
.4	dc.w	349,-30
.5	dc.w	350,-30
.6	dc.w	351,-30
.7	dc.w	352,-30

SPAflail	= *-SPAList	; SPAflail frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	41,-30
.1	dc.w	46,-30
.2	dc.w	51,-30
.3	dc.w	56,-30
.4	dc.w	61,-30
.5	dc.w	66,-30
.6	dc.w	71,-30
.7	dc.w	76,-30

SPAfallfwd	= *-SPAList	; SPAfallfwd frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	305,6,306,6,307,100,308,8,337,-8
.1	dc.w	309,6,310,6,311,100,312,8,338,-8
.2	dc.w	313,6,314,6,315,100,316,8,339,-8
.3	dc.w	317,6,318,6,319,100,320,8,340,-8
.4	dc.w	321,6,322,6,323,100,324,8,341,-8
.5	dc.w	325,6,326,6,327,100,328,8,342,-8
.6	dc.w	329,6,330,6,331,100,332,8,343,-8
.7	dc.w	333,6,334,6,335,100,336,8,344,-8

SPAfallback	= *-SPAList	; SPAfallback frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	273,6,274,6,275,100,276,8,337,-8
.1	dc.w	277,6,278,6,279,100,280,8,338,-8
.2	dc.w	281,6,282,6,283,100,284,8,339,-8
.3	dc.w	285,6,286,6,287,100,288,8,340,-8
.4	dc.w	289,6,290,6,291,100,292,8,341,-8
.5	dc.w	293,6,294,6,295,100,296,8,342,-8
.6	dc.w	297,6,298,6,299,100,300,8,343,-8
.7	dc.w	301,6,302,6,303,100,304,8,344,-8

SPAcelebrate	= *-SPAList	; SPAcelebrate frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	185,12,186,40,185,-5
.1	dc.w	187,12,188,40,187,-5
.2	dc.w	189,12,190,40,189,-5
.3	dc.w	191,12,192,40,191,-5
.4	dc.w	193,12,194,40,193,-5
.5	dc.w	195,12,196,40,195,-5
.6	dc.w	197,12,198,40,197,-5
.7	dc.w	199,12,200,40,199,-5

SPApump	= *-SPAList	; SPApump frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	201,8,202,8,201,-8
.1	dc.w	203,8,204,8,203,-8
.2	dc.w	205,8,206,8,205,-8
.3	dc.w	207,8,208,8,207,-8
.4	dc.w	209,8,210,8,209,-8
.5	dc.w	211,8,212,8,211,-8
.6	dc.w	213,8,214,8,213,-8
.7	dc.w	215,8,216,8,215,-8

SPAfight	= *-SPAList	; SPAfight frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	354,8,355,8,356,8,357,-6
.3	dc.w	354,8,355,8,356,8,362,-6

SPAfgrab	= *-SPAList	; SPAfgrab frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	358,28,357,-4
.3	dc.w	363,28,362,-4

SPAfheld	= *-SPAList	; SPAfheld frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	358,30,357,-4
.3	dc.w	363,30,362,-4

SPAfhigh	= *-SPAList	; SPAfhigh frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	359,6,360,16,359,4,357,-16
.3	dc.w	364,6,365,16,364,4,362,-16

SPAflow	= *-SPAList	; SPAflow frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	359,6,361,16,359,4,357,-16
.3	dc.w	364,6,366,16,364,4,362,-16

SPAfhith	= *-SPAList	; SPAfhith frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	368,16,357,-8
.3	dc.w	368,16,362,-8

SPAfhitl	= *-SPAList	; SPAfhitl frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	367,16,357,-8
.3	dc.w	367,16,362,-8

SPAffall	= *-SPAList	; SPAffall frames by direction
.t
	dc.w	.0-.t,$8000,$8000,$8000,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	368,8,369,8,370,200,370,-2

SPAwallright	= *-SPAList	; SPAwallright frames by direction
.t
	dc.w	.0-.t,.1-.t,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	381,8,382,8,383,-8
.1	dc.w	377,8,378,8,379,8,380,-8
.3	dc.w	380,8,379,8,378,8,377,-8

SPAwallleft	= *-SPAList	; SPAwallleft frames by direction
.t
	dc.w	.0-.t,.1-.t,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	383,8,382,8,381,-8
.1	dc.w	380,8,379,8,378,8,377,-8
.3	dc.w	377,8,378,8,379,8,380,-8

SPAfaceoff	= *-SPAList	; SPAfaceoff frames by direction
.t
	dc.w	.0-.t,.1-.t,$8000,$8000,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	1,2,258,10,257,-6
.1	dc.w	21,2,266,10,265,-6

SPAfaceoffr	= *-SPAList	; SPAfaceoffr frames by direction
.t
	dc.w	.0-.t,.1-.t,$8000,$8000,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	1,-5
.1	dc.w	21,-5

SPAsiren	= *-SPAList	; SPAsiren frames by direction
.t
	dc.w	.0-.t,$8000,$8000,$8000,$8000,$8000,$8000,$8000
	dc.w	1
.0	dc.w	518,3,519,3,520,3,521,3,522,3,523,3,524,3,525,3,526,3,527,3,528,3,529,3,530,3,531,-3

SPAstanley	= *-SPAList	; SPAstanley frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	1
.0	dc.w	217,-30
.1	dc.w	218,-30
.2	dc.w	219,-30
.3	dc.w	220,-30
.4	dc.w	221,-30
.5	dc.w	222,-30
.6	dc.w	223,-30
.7	dc.w	224,-30

SPAfinjury	= *-SPAList	; SPAfinjury frames by direction
.t
	dc.w	.0-.t,$8000,$8000,$8000,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	368,8,369,8,370,20,371,8,372,8,373,8,374,10,375,10,376,10,374,10,375,10,376,10,374,10,375,10,376,10,374,10,375,10,376,-400

SPAflip	= *-SPAList	; SPAflip frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	558,6,559,6,560,6,561,6,275,100,276,8,337,-8
.1	dc.w	558,6,559,6,560,6,561,6,279,100,280,8,338,-8
.2	dc.w	558,6,559,6,560,6,561,6,283,100,284,8,339,-8
.3	dc.w	562,6,563,6,564,6,565,6,287,100,288,8,340,-8
.4	dc.w	562,6,563,6,564,6,565,6,291,100,292,8,341,-8
.5	dc.w	562,6,563,6,564,6,565,6,295,100,296,8,342,-8
.6	dc.w	562,6,563,6,564,6,565,6,299,100,300,8,343,-8
.7	dc.w	558,6,559,6,560,6,561,6,303,100,304,8,344,-8

SPAstumble	= *-SPAList	; SPAstumble frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	566,6,567,6,568,8,567,6,566,-6
.1	dc.w	569,6,570,6,571,8,570,6,569,-6
.2	dc.w	572,6,573,6,574,8,573,6,572,-6
.3	dc.w	575,6,576,6,577,8,576,6,575,-6
.4	dc.w	578,6,579,6,580,8,579,6,578,-6
.5	dc.w	581,6,582,6,583,8,582,6,581,-6
.6	dc.w	584,6,585,6,586,8,585,6,584,-6
.7	dc.w	587,6,588,6,589,8,588,6,587,-6

SPAhook	= *-SPAList	; SPAhook frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	590,-30
.1	dc.w	592,-30
.2	dc.w	594,-30
.3	dc.w	596,-30
.4	dc.w	598,-30
.5	dc.w	600,-30
.6	dc.w	602,-30
.7	dc.w	604,-30

SPAhook2	= *-SPAList	; SPAhook2 frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	590,9,591,9,590,9,591,-9
.1	dc.w	592,9,593,9,592,9,593,-9
.2	dc.w	594,9,595,9,594,9,595,-9
.3	dc.w	596,9,597,9,596,9,597,-9
.4	dc.w	598,9,599,9,598,9,599,-9
.5	dc.w	600,9,601,9,600,9,601,-9
.6	dc.w	602,9,603,9,602,9,603,-9
.7	dc.w	604,9,605,9,604,9,605,-9

SPAcatch	= *-SPAList	; SPAcatch frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	606,6,607,-6
.1	dc.w	608,6,609,-6
.2	dc.w	610,6,611,-6
.3	dc.w	612,6,613,-6
.4	dc.w	614,6,615,-6
.5	dc.w	616,6,617,-6
.6	dc.w	618,6,619,-6
.7	dc.w	620,6,621,-6

SPAbglass	= *-SPAList	; SPAbglass frames by direction
.t
	dc.w	.0-.t,$8000,$8000,$8000,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	622,8,623,8,624,8,625,8,626,-1000

SPAgdive	= *-SPAList	; SPAgdive frames by direction
.t
	dc.w	.0-.t,.1-.t,.2-.t,.3-.t,.4-.t,.5-.t,.6-.t,.7-.t
	dc.w	0
.0	dc.w	643,8,644,48,643,-8
.1	dc.w	645,8,646,48,645,-8
.2	dc.w	647,8,648,48,647,-8
.3	dc.w	649,8,650,48,649,-8
.4	dc.w	651,8,652,48,651,-8
.5	dc.w	653,8,654,48,653,-8
.6	dc.w	655,8,656,48,655,-8
.7	dc.w	657,8,658,48,657,-8

SPAinjury1	= *-SPAList	; SPAinjury1 frames by direction
.t
	dc.w	.0-.t,$8000,$8000,.3-.t,$8000,$8000,$8000,$8000
	dc.w	0
.0	dc.w	273,20,274,20,275,1000,275,-1000
.3	dc.w	289,20,290,20,291,1000,291,-1000
