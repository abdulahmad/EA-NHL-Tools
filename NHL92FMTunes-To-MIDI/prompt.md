Here is the sound code from NHL Hockey (aka NHL 92) for Sega Genesis.

There's 5 FM Tunes (index 0-4). Can you list all the data related to the FM Tunes?
- Data in SoundEffectTable in table format
- Data in Note frequency table in table format
- Data in Note Octave table in table format
- Data in Envelope Table in table format
- Data in FMTune Header Table in table format
- Data in FMTune Channel Data in table format

Also-- what data is at 0x1061A-0x11623? It seems like it can't be just a continuation of channel data? its so different form than the data that comes before it.

Also-- what determines note speed per channel? Please also include that data.


ROM:0000F4C8 ; =============== S U B R O U T I N E =======================================
ROM:0000F4C8
ROM:0000F4C8 ; Attributes: thunk
ROM:0000F4C8
ROM:0000F4C8 p_music_vblank:                         ; CODE XREF: ROM:00004652↑p
ROM:0000F4C8                                         ; DATA XREF: Sound_InitMusicTrack+C↓o ...
ROM:0000F4C8                 bra.w   p_music_vblank_fn
ROM:0000F4C8 ; End of function p_music_vblank
ROM:0000F4C8
ROM:0000F4CC
ROM:0000F4CC ; =============== S U B R O U T I N E =======================================
ROM:0000F4CC
ROM:0000F4CC ; Attributes: thunk
ROM:0000F4CC
ROM:0000F4CC p_initialZ80:                           ; CODE XREF: ROM:00004646↑p
ROM:0000F4CC                 bra.w   p_initialZ80_fn
ROM:0000F4CC ; End of function p_initialZ80
ROM:0000F4CC
ROM:0000F4D0
ROM:0000F4D0 ; =============== S U B R O U T I N E =======================================
ROM:0000F4D0
ROM:0000F4D0 ; Attributes: thunk
ROM:0000F4D0
ROM:0000F4D0 p_initune:                              ; CODE XREF: sub_8DA8+E↑p
ROM:0000F4D0                 bra.w   p_initune_fn
ROM:0000F4D0 ; End of function p_initune
ROM:0000F4D0
ROM:0000F4D4
ROM:0000F4D4 ; =============== S U B R O U T I N E =======================================
ROM:0000F4D4
ROM:0000F4D4 ; Attributes: thunk
ROM:0000F4D4
ROM:0000F4D4 p_turnoff:                              ; CODE XREF: ROM:0000464C↑p
ROM:0000F4D4                                         ; ROM:00004710↑p ...
ROM:0000F4D4                 bra.w   p_turnoff_fn
ROM:0000F4D4 ; End of function p_turnoff
ROM:0000F4D4
ROM:0000F4D8
ROM:0000F4D8 ; =============== S U B R O U T I N E =======================================
ROM:0000F4D8
ROM:0000F4D8 ; Attributes: thunk
ROM:0000F4D8
ROM:0000F4D8 p_initfx:                               ; CODE XREF: sub_8D84+12↑p
ROM:0000F4D8                 bra.w   p_initfx_fn
ROM:0000F4D8 ; End of function p_initfx
ROM:0000F4D8
ROM:0000F4DC ; ---------------------------------------------------------------------------
ROM:0000F4DC
ROM:0000F4DC p_initialZ80_fn:                        ; CODE XREF: p_initialZ80↑j
ROM:0000F4DC                 lea     (g_SoundWorkspace).l,a0
ROM:0000F4E2                 move.w  #$1FF,d0
ROM:0000F4E6                 moveq   #0,d1
ROM:0000F4E8
ROM:0000F4E8 clear_workspace_loop:                   ; CODE XREF: ROM:0000F4EA↓j
ROM:0000F4E8                 move.b  d1,(a0)+
ROM:0000F4EA                 dbf     d0,clear_workspace_loop
ROM:0000F4EE                 move.w  #$100,(IO_Z80RES).l
ROM:0000F4F6                 move.w  #$100,(IO_Z80BUS).l
ROM:0000F4FE                 bsr.w   Sound_LoadZ80Program
ROM:0000F502                 rts
ROM:0000F504
ROM:0000F504 ; =============== S U B R O U T I N E =======================================
ROM:0000F504
ROM:0000F504
ROM:0000F504 p_initune_fn:                           ; CODE XREF: p_initune↑j
ROM:0000F504                                         ; Sound_ProcessMusicTracks_music_process_channels+196↓p
ROM:0000F504                 move.l  d0,(g_CurrentTrackID).l
ROM:0000F50A                 move.b  #1,(g_MusicInitFlag).l
ROM:0000F512                 rts
ROM:0000F512 ; End of function p_initune_fn
ROM:0000F512
ROM:0000F514
ROM:0000F514 ; =============== S U B R O U T I N E =======================================
ROM:0000F514
ROM:0000F514
ROM:0000F514 Sound_InitMusicTrack:                   ; CODE XREF: Sound_UpdateMusicState+3C↓p
ROM:0000F514                 move.l  (g_CurrentTrackID).l,d0
ROM:0000F51A                 lea     (g_SoundWorkspace).l,a3
ROM:0000F520                 lea     p_music_vblank(pc),a4
ROM:0000F524                 lea     6(a3),a1
ROM:0000F528                 andi.w  #$FF,d0
ROM:0000F52C                 mulu.w  #$1A,d0
ROM:0000F530                 lea     FMTune_Table(pc),a0
ROM:0000F534                 move.b  (a0,d0.w),4(a3)
ROM:0000F53A                 move.b  1(a0,d0.w),2(a3)
ROM:0000F540                 moveq   #0,d7
ROM:0000F542
ROM:0000F542 init_channel_loop:                      ; CODE XREF: Sound_InitMusicTrack+7A↓j
ROM:0000F542                 move.w  #1,$10(a1)
ROM:0000F548                 clr.w   (a1)
ROM:0000F54A                 move.b  #0,$15(a1)
ROM:0000F550                 move.b  #0,3(a1)
ROM:0000F556                 move.l  #0,$44(a1)
ROM:0000F55E                 move.b  #$FF,$41(a1)
ROM:0000F564                 lea     FMTune_Table(pc),a0
ROM:0000F568                 movea.l 2(a0,d0.w),a0
ROM:0000F56C                 adda.l  a4,a0
ROM:0000F56E                 move.l  a0,8(a1)
ROM:0000F572                 move.l  a0,$C(a1)
ROM:0000F576                 addq.l  #2,$C(a1)
ROM:0000F57A                 movea.w (a0),a0
ROM:0000F57C                 adda.l  a4,a0
ROM:0000F57E                 move.l  a0,4(a1)
ROM:0000F582                 adda.w  #$48,a1 ; 'H'
ROM:0000F586                 addq.w  #4,d0
ROM:0000F588                 addq.w  #1,d7
ROM:0000F58A                 cmp.w   #6,d7
ROM:0000F58E                 bne.s   init_channel_loop
ROM:0000F590                 st      0.w(a3)
ROM:0000F594                 move.b  #1,$1F1(a3)
ROM:0000F59A                 rts
ROM:0000F59A ; End of function Sound_InitMusicTrack
ROM:0000F59A
ROM:0000F59C ; ---------------------------------------------------------------------------
ROM:0000F59C                 lea     (g_SoundWorkspace).l,a3
ROM:0000F5A2                 cmpi.b  #0,music_pause_check_flag-g_SoundWorkspace(a3)
ROM:0000F5A8                 beq.s   Sound_PauseMusic_Return
ROM:0000F5AA                 st      0.w(a3)
ROM:0000F5AE                 rts
ROM:0000F5B0
ROM:0000F5B0 ; =============== S U B R O U T I N E =======================================
ROM:0000F5B0
ROM:0000F5B0
ROM:0000F5B0 p_turnoff_fn:                           ; CODE XREF: p_turnoff↑j
ROM:0000F5B0                                         ; Sound_ProcessMusicTracks_music_process_channels:handle_stop↓p
ROM:0000F5B0                 move.b  #1,(g_AudioStopFlag).l
ROM:0000F5B8                 rts
ROM:0000F5B8 ; End of function p_turnoff_fn
ROM:0000F5B8
ROM:0000F5BA ; ---------------------------------------------------------------------------
ROM:0000F5BA                 move.b  #1,(g_MusicStopFlag).l
ROM:0000F5C2                 rts
ROM:0000F5C4
ROM:0000F5C4 ; =============== S U B R O U T I N E =======================================
ROM:0000F5C4
ROM:0000F5C4
ROM:0000F5C4 Sound_StopMusic:                        ; CODE XREF: Sound_UpdateMusicState+22↓p
ROM:0000F5C4                 lea     (g_SoundWorkspace).l,a3
ROM:0000F5CA                 sf      0.w(a3)
ROM:0000F5CE                 bsr.w   Sound_ResetAllChannels_reset_all_effects
ROM:0000F5D2                 bsr.w   configure_ym2612
ROM:0000F5D6                 bsr.w   Sound_ClearChannelOutputs_reset_channel_volumes
ROM:0000F5DA                 rts
ROM:0000F5DA ; End of function Sound_StopMusic
ROM:0000F5DA
ROM:0000F5DC
ROM:0000F5DC ; =============== S U B R O U T I N E =======================================
ROM:0000F5DC
ROM:0000F5DC
ROM:0000F5DC Sound_PauseMusic:                       ; CODE XREF: Sound_UpdateMusicState+A↓p
ROM:0000F5DC                                         ; Sound_UpdateMusicState+3A↓p
ROM:0000F5DC                 lea     (g_SoundWorkspace).l,a3
ROM:0000F5E2                 sf      0.w(a3)
ROM:0000F5E6                 move.b  #0,$1F1(a3)
ROM:0000F5EC                 bsr.w   Sound_ResetAllChannels_reset_all_effects
ROM:0000F5F0                 bsr.w   configure_ym2612
ROM:0000F5F4                 bsr.w   Sound_ClearChannelOutputs_reset_channel_volumes
ROM:0000F5F8
ROM:0000F5F8 Sound_PauseMusic_Return:                ; CODE XREF: ROM:0000F5A8↑j
ROM:0000F5F8                 rts
ROM:0000F5F8 ; End of function Sound_PauseMusic
ROM:0000F5F8
ROM:0000F5FA
ROM:0000F5FA ; =============== S U B R O U T I N E =======================================
ROM:0000F5FA
ROM:0000F5FA
ROM:0000F5FA Sound_UpdateMusicState:                 ; CODE XREF: ROM:0000F994↓p
ROM:0000F5FA                 cmpi.b  #1,(g_AudioStopFlag).l
ROM:0000F602                 bne.s   check_music_stop
ROM:0000F604                 bsr.s   Sound_PauseMusic
ROM:0000F606                 move.b  #0,(g_AudioStopFlag).l
ROM:0000F60E                 bra.w   update_state_done
ROM:0000F612 ; ---------------------------------------------------------------------------
ROM:0000F612
ROM:0000F612 check_music_stop:                       ; CODE XREF: Sound_UpdateMusicState+8↑j
ROM:0000F612                 cmpi.b  #1,(g_MusicStopFlag).l
ROM:0000F61A                 bne.s   check_music_init
ROM:0000F61C                 bsr.s   Sound_StopMusic
ROM:0000F61E                 move.b  #0,(g_MusicStopFlag).l
ROM:0000F626                 bra.w   update_state_done
ROM:0000F62A ; ---------------------------------------------------------------------------
ROM:0000F62A
ROM:0000F62A check_music_init:                       ; CODE XREF: Sound_UpdateMusicState+20↑j
ROM:0000F62A                 cmpi.b  #1,(g_MusicInitFlag).l
ROM:0000F632                 bne.s   process_music
ROM:0000F634                 bsr.s   Sound_PauseMusic
ROM:0000F636                 bsr.w   Sound_InitMusicTrack
ROM:0000F63A                 move.b  #0,(g_MusicInitFlag).l
ROM:0000F642                 bra.w   update_state_done
ROM:0000F646 ; ---------------------------------------------------------------------------
ROM:0000F646
ROM:0000F646 process_music:                          ; CODE XREF: Sound_UpdateMusicState+38↑j
ROM:0000F646                 bsr.w   Sound_ProcessMusicTracks_music_process_channels
ROM:0000F64A
ROM:0000F64A update_state_done:                      ; CODE XREF: Sound_UpdateMusicState+14↑j
ROM:0000F64A                                         ; Sound_UpdateMusicState+2C↑j ...
ROM:0000F64A                 rts
ROM:0000F64A ; End of function Sound_UpdateMusicState
ROM:0000F64A
ROM:0000F64C
ROM:0000F64C ; =============== S U B R O U T I N E =======================================
ROM:0000F64C
ROM:0000F64C
ROM:0000F64C Sound_ProcessMusicTracks_music_process_channels:
ROM:0000F64C                                         ; CODE XREF: Sound_UpdateMusicState:process_music↑p
ROM:0000F64C                 lea     (g_SoundWorkspace).l,a3
ROM:0000F652                 lea     p_music_vblank(pc),a4
ROM:0000F656                 tst.b   0.w(a3)
ROM:0000F65A                 beq.w   process_sound_effects
ROM:0000F65E                 moveq   #0,d7
ROM:0000F660                 move.b  4(a3),d7
ROM:0000F664
ROM:0000F664 process_channel:                        ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+26A↓j
ROM:0000F664                 moveq   #0,d0
ROM:0000F666                 move.w  #$48,d0 ; 'H'
ROM:0000F66A                 mulu.w  d7,d0
ROM:0000F66C                 lea     6(a3),a0
ROM:0000F670                 adda.l  d0,a0
ROM:0000F672                 movea.l 4(a0),a1
ROM:0000F676                 movea.l $18(a0),a5
ROM:0000F67A                 lea     $1BA(a3),a6
ROM:0000F67E                 move.w  d7,d0
ROM:0000F680                 lsl.w   #3,d0
ROM:0000F682                 adda.l  d0,a6
ROM:0000F684                 subq.w  #1,$10(a0)
ROM:0000F688                 beq.s   process_track_data
ROM:0000F68A                 cmpi.w  #1,$10(a0)
ROM:0000F690                 bne.w   update_channel_state
ROM:0000F694                 btst    #3,(a0)
ROM:0000F698                 bne.w   update_channel_state
ROM:0000F69C                 move.b  #0,3(a6)
ROM:0000F6A2                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000F6AA                 bra.w   update_channel_state
ROM:0000F6AE ; ---------------------------------------------------------------------------
ROM:0000F6AE
ROM:0000F6AE process_track_data:                     ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+3C↑j
ROM:0000F6AE                 clr.w   (a0)
ROM:0000F6B0
ROM:0000F6B0 parse_track_command:                    ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+D2↓j
ROM:0000F6B0                                         ; Sound_ProcessMusicTracks_music_process_channels+106↓j ...
ROM:0000F6B0                 moveq   #0,d0
ROM:0000F6B2                 move.b  (a1)+,d0
ROM:0000F6B4                 bpl.w   handle_note
ROM:0000F6B8                 cmp.b   #$84,d0
ROM:0000F6BC                 beq.w   handle_loop
ROM:0000F6C0                 cmp.b   #$80,d0
ROM:0000F6C4                 beq.s   handle_instrument
ROM:0000F6C6                 cmp.b   #$81,d0
ROM:0000F6CA                 beq.w   handle_modulation
ROM:0000F6CE                 cmp.b   #$83,d0
ROM:0000F6D2                 beq.w   set_channel_sustain_flag
ROM:0000F6D6                 cmp.b   #$85,d0
ROM:0000F6DA                 beq.w   handle_stop
ROM:0000F6DE                 cmp.b   #$86,d0
ROM:0000F6E2                 beq.w   handle_envelope
ROM:0000F6E6                 cmp.b   #$87,d0
ROM:0000F6EA                 beq.w   handle_clear_envelope
ROM:0000F6EE                 cmp.b   #$88,d0
ROM:0000F6F2                 beq.w   handle_pitch_adjust
ROM:0000F6F6                 cmp.b   #$89,d0
ROM:0000F6FA                 beq.w   handle_flag_set
ROM:0000F6FE                 cmp.b   #$8A,d0
ROM:0000F702                 beq.w   loc_F7A0
ROM:0000F706                 cmp.b   #$8B,d0
ROM:0000F70A                 beq.w   handle_sound_effect
ROM:0000F70E                 subi.b  #$A0,d0
ROM:0000F712                 moveq   #0,d1
ROM:0000F714                 move.b  2(a3),d1
ROM:0000F718                 mulu.w  d1,d0
ROM:0000F71A                 move.w  d0,$26(a0)
ROM:0000F71E                 bra.s   parse_track_command
ROM:0000F720 ; ---------------------------------------------------------------------------
ROM:0000F720
ROM:0000F720 handle_instrument:                      ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+78↑j
ROM:0000F720                 move.b  (a1)+,d0
ROM:0000F722                 move.l  #$2A5,d1
ROM:0000F728                 lea     Z80_Program_Code(pc),a5
ROM:0000F72C                 adda.l  d1,a5
ROM:0000F72E                 lsl.w   #5,d0
ROM:0000F730                 add.l   d0,d1
ROM:0000F732                 adda.l  d0,a5
ROM:0000F734                 move.w  d1,d0
ROM:0000F736                 move.b  d0,2(a6)
ROM:0000F73A                 lsr.w   #8,d1
ROM:0000F73C                 move.b  d1,1(a6)
ROM:0000F740                 move.b  #0,(a6)
ROM:0000F744                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000F74C                 move.b  $1A(a5),$24(a0)
ROM:0000F752                 bra.w   parse_track_command
ROM:0000F756 ; ---------------------------------------------------------------------------
ROM:0000F756
ROM:0000F756 set_channel_sustain_flag:               ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+86↑j
ROM:0000F756                 bset    #2,(a0)
ROM:0000F75A                 bra.w   parse_track_command
ROM:0000F75E ; ---------------------------------------------------------------------------
ROM:0000F75E
ROM:0000F75E handle_stop:                            ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+8E↑j
ROM:0000F75E                 bsr.w   p_turnoff_fn
ROM:0000F762                 rts
ROM:0000F764 ; ---------------------------------------------------------------------------
ROM:0000F764
ROM:0000F764 handle_modulation:                      ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+7E↑j
ROM:0000F764                 move.b  (a1)+,$42(a0)
ROM:0000F768                 move.b  (a1)+,$16(a0)
ROM:0000F76C                 bset    #1,(a0)
ROM:0000F770                 bra.w   parse_track_command
ROM:0000F774 ; ---------------------------------------------------------------------------
ROM:0000F774
ROM:0000F774 handle_envelope:                        ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+96↑j
ROM:0000F774                 move.b  (a1)+,d0
ROM:0000F776                 lea     envelope_table_1023A(pc),a2
ROM:0000F77A                 lsl.w   #2,d0
ROM:0000F77C                 move.l  (a2,d0.w),d0
ROM:0000F780                 add.l   a4,d0
ROM:0000F782                 move.l  d0,$20(a0)
ROM:0000F786                 move.b  (a1)+,$15(a0)
ROM:0000F78A                 bra.w   parse_track_command
ROM:0000F78E ; ---------------------------------------------------------------------------
ROM:0000F78E
ROM:0000F78E handle_clear_envelope:                  ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+9E↑j
ROM:0000F78E                 move.b  #0,$15(a0)
ROM:0000F794                 bra.w   parse_track_command
ROM:0000F798 ; ---------------------------------------------------------------------------
ROM:0000F798
ROM:0000F798 handle_pitch_adjust:                    ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+A6↑j
ROM:0000F798                 move.b  (a1)+,3(a0)
ROM:0000F79C                 bra.w   parse_track_command
ROM:0000F7A0 ; ---------------------------------------------------------------------------
ROM:0000F7A0
ROM:0000F7A0 loc_F7A0:                               ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+B6↑j
ROM:0000F7A0                 move.b  (a1)+,d0
ROM:0000F7A2                 bra.w   parse_track_command
ROM:0000F7A6 ; ---------------------------------------------------------------------------
ROM:0000F7A6
ROM:0000F7A6 handle_flag_set:                        ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+AE↑j
ROM:0000F7A6                 bset    #3,(a0)
ROM:0000F7AA                 bra.w   parse_track_command
ROM:0000F7AE ; ---------------------------------------------------------------------------
ROM:0000F7AE
ROM:0000F7AE handle_loop:                            ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+70↑j
ROM:0000F7AE                 movea.l $C(a0),a2
ROM:0000F7B2                 cmpi.w  #0,$44(a0)
ROM:0000F7B8                 bne.s   decrement_loop
ROM:0000F7BA
ROM:0000F7BA parse_loop_command:                     ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+1BE↓j
ROM:0000F7BA                 tst.w   (a2)
ROM:0000F7BC                 beq.s   loop_reset
ROM:0000F7BE                 cmpi.w  #1,(a2)
ROM:0000F7C2                 beq.s   loop_new_track
ROM:0000F7C4                 cmpi.w  #2,(a2)
ROM:0000F7C8                 beq.s   loop_setup
ROM:0000F7CA
ROM:0000F7CA advance_loop:                           ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+18E↓j
ROM:0000F7CA                 movea.w (a2)+,a1
ROM:0000F7CC                 adda.l  a4,a1
ROM:0000F7CE                 move.l  a2,$C(a0)
ROM:0000F7D2                 bra.w   parse_track_command
ROM:0000F7D6 ; ---------------------------------------------------------------------------
ROM:0000F7D6
ROM:0000F7D6 loop_reset:                             ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+170↑j
ROM:0000F7D6                 movea.l 8(a0),a2
ROM:0000F7DA                 bra.s   advance_loop
ROM:0000F7DC ; ---------------------------------------------------------------------------
ROM:0000F7DC
ROM:0000F7DC loop_new_track:                         ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+176↑j
ROM:0000F7DC                 move.w  2(a2),d0
ROM:0000F7E0                 ext.l   d0
ROM:0000F7E2                 bsr.w   p_initune_fn
ROM:0000F7E6                 rts
ROM:0000F7E8 ; ---------------------------------------------------------------------------
ROM:0000F7E8
ROM:0000F7E8 loop_setup:                             ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+17C↑j
ROM:0000F7E8                 move.w  2(a2),$44(a0)
ROM:0000F7EE                 movea.w -2(a2),a1
ROM:0000F7F2                 adda.l  a4,a1
ROM:0000F7F4                 bra.w   parse_track_command
ROM:0000F7F8 ; ---------------------------------------------------------------------------
ROM:0000F7F8
ROM:0000F7F8 decrement_loop:                         ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+16C↑j
ROM:0000F7F8                 subq.w  #1,$44(a0)
ROM:0000F7FC                 beq.s   advance_loop_data
ROM:0000F7FE                 movea.w -2(a2),a1
ROM:0000F802                 adda.l  a4,a1
ROM:0000F804                 bra.w   parse_track_command
ROM:0000F808 ; ---------------------------------------------------------------------------
ROM:0000F808
ROM:0000F808 advance_loop_data:                      ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+1B0↑j
ROM:0000F808                 addq.l  #4,a2
ROM:0000F80A                 bra.s   parse_loop_command
ROM:0000F80C ; ---------------------------------------------------------------------------
ROM:0000F80C
ROM:0000F80C handle_sound_effect:                    ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+BE↑j
ROM:0000F80C                 move.b  (a1)+,d0
ROM:0000F80E                 movem.l d0-d7/a0-a6,-(sp)
ROM:0000F812                 bsr.w   p_initfx_fn
ROM:0000F816                 movem.l (sp)+,d0-d7/a0-a6
ROM:0000F81A                 bra.w   parse_track_command
ROM:0000F81E ; ---------------------------------------------------------------------------
ROM:0000F81E
ROM:0000F81E handle_note:                            ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+68↑j
ROM:0000F81E                 cmp.b   #$60,d0 ; '`'
ROM:0000F822                 bne.s   process_note
ROM:0000F824                 move.w  $26(a0),$10(a0)
ROM:0000F82A                 move.l  a1,4(a0)
ROM:0000F82E                 move.b  #0,3(a6)
ROM:0000F834                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000F83C                 clr.b   $25(a0)
ROM:0000F840                 bra.w   finish_channel
ROM:0000F844 ; ---------------------------------------------------------------------------
ROM:0000F844
ROM:0000F844 process_note:                           ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+1D6↑j
ROM:0000F844                 add.b   $24(a0),d0
ROM:0000F848                 add.b   3(a0),d0
ROM:0000F84C                 move.b  d0,2(a0)
ROM:0000F850                 move.l  a1,4(a0)
ROM:0000F854                 move.w  $26(a0),$10(a0)
ROM:0000F85A                 clr.l   d0
ROM:0000F85C                 lea     note_frequency_table_1017A(pc),a2
ROM:0000F860                 move.b  2(a0),d0
ROM:0000F864                 adda.l  d0,a2
ROM:0000F866                 move.b  (a2),d2
ROM:0000F868                 move.b  d2,5(a6)
ROM:0000F86C                 move.b  d2,d3
ROM:0000F86E                 andi.b  #7,d2
ROM:0000F872                 move.b  d2,$12(a0)
ROM:0000F876                 andi.b  #$38,d3 ; '8'
ROM:0000F87A                 move.b  d3,$14(a0)
ROM:0000F87E                 lea     note_octave_table_101DA(pc),a2
ROM:0000F882                 adda.l  d0,a2
ROM:0000F884                 move.b  (a2),d2
ROM:0000F886                 move.b  d2,$13(a0)
ROM:0000F88A                 move.b  d2,6(a6)
ROM:0000F88E                 move.b  #0,4(a6)
ROM:0000F894                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000F89C                 btst    #2,(a0)
ROM:0000F8A0                 bne.s   finish_channel
ROM:0000F8A2                 move.l  $20(a0),$1C(a0)
ROM:0000F8A8                 clr.b   $25(a0)
ROM:0000F8AC                 move.b  #1,3(a6)
ROM:0000F8B2
ROM:0000F8B2 finish_channel:                         ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+1F4↑j
ROM:0000F8B2                                         ; Sound_ProcessMusicTracks_music_process_channels+254↑j ...
ROM:0000F8B2                 addq.b  #1,$25(a0)
ROM:0000F8B6                 dbf     d7,process_channel
ROM:0000F8BA
ROM:0000F8BA process_sound_effects:                  ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+E↑j
ROM:0000F8BA                 bsr.w   Sound_ProcessSoundEffects_sfx_process_channels
ROM:0000F8BE                 rts
ROM:0000F8C0 ; ---------------------------------------------------------------------------
ROM:0000F8C0
ROM:0000F8C0 update_channel_state:                   ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+44↑j
ROM:0000F8C0                                         ; Sound_ProcessMusicTracks_music_process_channels+4C↑j ...
ROM:0000F8C0                 clr.w   d1
ROM:0000F8C2                 btst    #1,(a0)
ROM:0000F8C6                 beq.s   check_envelope
ROM:0000F8C8                 subq.b  #1,$42(a0)
ROM:0000F8CC                 bne.s   apply_modulation
ROM:0000F8CE                 bclr    #1,(a0)
ROM:0000F8D2
ROM:0000F8D2 apply_modulation:                       ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+280↑j
ROM:0000F8D2                 move.b  $16(a0),d1
ROM:0000F8D6                 ext.w   d1
ROM:0000F8D8                 add.w   $12(a0),d1
ROM:0000F8DC                 move.w  d1,$12(a0)
ROM:0000F8E0                 tst.b   $15(a0)
ROM:0000F8E4                 beq.s   output_frequency
ROM:0000F8E6
ROM:0000F8E6 check_envelope:                         ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+27A↑j
ROM:0000F8E6                 clr.w   d1
ROM:0000F8E8                 move.b  $15(a0),d1
ROM:0000F8EC                 beq.w   output_frequency2
ROM:0000F8F0                 bpl.s   apply_envelope
ROM:0000F8F2                 move.b  $25(a0),d1
ROM:0000F8F6                 lsr.b   #1,d1
ROM:0000F8F8
ROM:0000F8F8 apply_envelope:                         ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+2A4↑j
ROM:0000F8F8                 movea.l $1C(a0),a2
ROM:0000F8FC                 move.b  (a2)+,d0
ROM:0000F8FE                 cmp.b   #$84,d0
ROM:0000F902                 bne.s   use_envelope
ROM:0000F904                 movea.l $20(a0),a2
ROM:0000F908                 move.b  (a2)+,d0
ROM:0000F90A
ROM:0000F90A use_envelope:                           ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+2B6↑j
ROM:0000F90A                 ext.w   d0
ROM:0000F90C                 muls.w  d0,d1
ROM:0000F90E                 add.w   $12(a0),d1
ROM:0000F912                 move.l  a2,$1C(a0)
ROM:0000F916
ROM:0000F916 output_frequency:                       ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+298↑j
ROM:0000F916                 move.w  d1,d3
ROM:0000F918                 lsr.w   #8,d3
ROM:0000F91A                 or.b    $14(a0),d3
ROM:0000F91E                 move.b  d3,5(a6)
ROM:0000F922                 move.b  d1,6(a6)
ROM:0000F926                 move.b  #0,4(a6)
ROM:0000F92C                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000F934
ROM:0000F934 output_frequency2:                      ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels+2A0↑j
ROM:0000F934                 bra.w   finish_channel
ROM:0000F934 ; End of function Sound_ProcessMusicTracks_music_process_channels
ROM:0000F934
ROM:0000F938
ROM:0000F938 ; =============== S U B R O U T I N E =======================================
ROM:0000F938
ROM:0000F938
ROM:0000F938 Sound_ClearChannelOutputs_reset_channel_volumes:
ROM:0000F938                                         ; CODE XREF: Sound_StopMusic+12↑p
ROM:0000F938                                         ; Sound_PauseMusic+18↑p ...
ROM:0000F938                 moveq   #0,d1
ROM:0000F93A                 move.b  d1,(channel0_volume_output).l
ROM:0000F940                 move.b  d1,(byte_FFFFC1).l
ROM:0000F946                 move.b  d1,(byte_FFFFC9).l
ROM:0000F94C                 move.b  d1,(byte_FFFFD1).l
ROM:0000F952                 move.b  d1,(byte_FFFFD9).l
ROM:0000F958                 move.b  d1,(byte_FFFFE1).l
ROM:0000F95E                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000F966                 rts
ROM:0000F966 ; End of function Sound_ClearChannelOutputs_reset_channel_volumes
ROM:0000F966
ROM:0000F968 ; ---------------------------------------------------------------------------
ROM:0000F968
ROM:0000F968 p_music_vblank_fn:                      ; CODE XREF: p_music_vblank↑j
ROM:0000F968                 movem.l d0-d7/a0-a6,-(sp)
ROM:0000F96C                 moveq   #5,d0
ROM:0000F96E                 movea.l #$FFFFFFB6,a1
ROM:0000F974                 move.b  #$FF,d1
ROM:0000F978
ROM:0000F978 mute_channels:                          ; CODE XREF: ROM:0000F988↓j
ROM:0000F978                 move.b  d1,(a1)
ROM:0000F97A                 move.b  d1,3(a1)
ROM:0000F97E                 move.b  d1,4(a1)
ROM:0000F982                 move.b  d1,7(a1)
ROM:0000F986                 addq.l  #8,a1
ROM:0000F988                 dbf     d0,mute_channels
ROM:0000F98C                 move.b  #1,(g_AudioUpdateFlag).l
ROM:0000F994                 bsr.w   Sound_UpdateMusicState
ROM:0000F998                 move.b  (g_AudioUpdateFlag).l,d7
ROM:0000F99E                 movea.l #$FFFFFFE6,a1
ROM:0000F9A4                 move.w  #$100,(IO_Z80BUS).l
ROM:0000F9AC                 cmp.b   #1,d7
ROM:0000F9B0                 beq.s   write_z80
ROM:0000F9B2                 move.w  #$2F,d0 ; '/'
ROM:0000F9B6                 movea.l #z80_channel_data_buffer_RAM,a0
ROM:0000F9BC                 movea.l #$FFFFFFB6,a1
ROM:0000F9C2
ROM:0000F9C2 copy_to_z80:                            ; CODE XREF: ROM:0000F9C4↓j
ROM:0000F9C2                 move.b  (a1)+,(a0)+
ROM:0000F9C4                 dbf     d0,copy_to_z80
ROM:0000F9C8
ROM:0000F9C8 write_z80:                              ; CODE XREF: ROM:0000F9B0↑j
ROM:0000F9C8                 cmpi.b  #0,(z80_write_pending).l
ROM:0000F9D0                 beq.s   release_z80
ROM:0000F9D2                 move.b  (a1)+,(z80_sfx_control_RAM).l
ROM:0000F9D8                 move.b  (a1)+,(byte_A000BE).l
ROM:0000F9DE                 move.b  (a1)+,(byte_A000C0).l
ROM:0000F9E4                 move.b  (a1)+,(byte_A000C1).l
ROM:0000F9EA                 move.b  (a1)+,(byte_A000C2).l
ROM:0000F9F0                 move.b  (a1)+,(byte_A000C3).l
ROM:0000F9F6                 move.b  #0,(z80_write_pending).l
ROM:0000F9FE                 move.b  #0,d7
ROM:0000FA02
ROM:0000FA02 release_z80:                            ; CODE XREF: ROM:0000F9D0↑j
ROM:0000FA02                 move.b  d7,(z80_audio_update_flag).l
ROM:0000FA08                 move.w  #0,(IO_Z80BUS).l
ROM:0000FA10                 movem.l (sp)+,d0-d7/a0-a6
ROM:0000FA14                 rts
ROM:0000FA16
ROM:0000FA16 ; =============== S U B R O U T I N E =======================================
ROM:0000FA16
ROM:0000FA16
ROM:0000FA16 initialize_sfx_channel:                 ; CODE XREF: handle_sfx_shotfh+8↓p
ROM:0000FA16                                         ; handle_sfx_shotwiff+8↓p ...
ROM:0000FA16                 lea     (g_SoundWorkspace).l,a3
ROM:0000FA1C                 lea     p_music_vblank(pc),a4
ROM:0000FA20                 moveq   #0,d0
ROM:0000FA22                 move.w  #$48,d0 ; 'H'
ROM:0000FA26                 mulu.w  d7,d0
ROM:0000FA28                 lea     6(a3),a0
ROM:0000FA2C                 adda.l  d0,a0
ROM:0000FA2E                 add.l   a4,d1
ROM:0000FA30                 move.l  d1,$2C(a0)
ROM:0000FA34                 move.l  d1,$28(a0)
ROM:0000FA38                 moveq   #0,d1
ROM:0000FA3A                 move.b  d1,$3C(a0)
ROM:0000FA3E                 move.b  d1,$3D(a0)
ROM:0000FA42                 move.b  #4,$3E(a0)
ROM:0000FA48                 rts
ROM:0000FA48 ; End of function initialize_sfx_channel
ROM:0000FA48
ROM:0000FA4A
ROM:0000FA4A ; =============== S U B R O U T I N E =======================================
ROM:0000FA4A
ROM:0000FA4A
ROM:0000FA4A Sound_ResetAllChannels_reset_all_effects:
ROM:0000FA4A                                         ; CODE XREF: Sound_StopMusic+A↑p
ROM:0000FA4A                                         ; Sound_PauseMusic+10↑p
ROM:0000FA4A                 move.b  #0,(sfx_channel0_active_flag).l
ROM:0000FA52                 move.b  #0,(byte_FFFE88).l
ROM:0000FA5A                 move.b  #0,(byte_FFFED0).l
ROM:0000FA62                 move.b  #0,(byte_FFFF18).l
ROM:0000FA6A                 move.b  #0,(byte_FFFF60).l
ROM:0000FA72                 move.b  #0,(byte_FFFFA8).l
ROM:0000FA7A                 bsr.w   Sound_ClearChannelOutputs_reset_channel_volumes
ROM:0000FA7E                 rts
ROM:0000FA7E ; End of function Sound_ResetAllChannels_reset_all_effects
ROM:0000FA7E
ROM:0000FA80
ROM:0000FA80 ; =============== S U B R O U T I N E =======================================
ROM:0000FA80
ROM:0000FA80
ROM:0000FA80 p_initfx_fn:                            ; CODE XREF: p_initfx↑j
ROM:0000FA80                                         ; Sound_ProcessMusicTracks_music_process_channels+1C6↑p
ROM:0000FA80                 lea     p_music_vblank(pc),a4
ROM:0000FA84                 lea     SoundEffectTable(pc),a0
ROM:0000FA88                 lsl.l   #2,d0
ROM:0000FA8A                 adda.l  d0,a0
ROM:0000FA8C                 movea.l (a0),a0
ROM:0000FA8E                 adda.l  a4,a0
ROM:0000FA90                 jmp     (a0)
ROM:0000FA90 ; End of function p_initfx_fn
ROM:0000FA90
ROM:0000FA90 ; ---------------------------------------------------------------------------

SoundEffectTable: 0xFA90-FB1D
4E D0 00 00 0A 92 00 00 0A 76 00 00 0A 84 00 00 08 6A 00 00 08 8E 00 00 09 DE 00 00 09 EC 00 00 09 FA 00 00 09 C2 00 00 09 D0 00 00 0A 68 00 00 09 0E 00 00 09 22 00 00 09 36 00 00 0A 40 00 00 08 54 00 00 08 A2 00 00 08 BA 00 00 08 D2 00 00 08 E6 00 00 08 FA 00 00 09 4A 00 00 09 72 00 00 09 5E 00 00 0A 4E 00 00 09 86 00 00 09 9A 00 00 0A 08 00 00 0A 24 00 00 0A 16 00 00 0A 32 00 00 09 AE 00 00 0A 32 00 00 0A 32 00 00 0A 32

ROM:0000FB1E ; =============== S U B R O U T I N E =======================================
ROM:0000FB1E
ROM:0000FB1E
ROM:0000FB1E Sound_ProcessSoundEffects_sfx_process_channels:
ROM:0000FB1E                                         ; CODE XREF: Sound_ProcessMusicTracks_music_process_channels:process_sound_effects↑p
ROM:0000FB1E                 lea     (g_SoundWorkspace).l,a3
ROM:0000FB24                 moveq   #5,d7
ROM:0000FB26
ROM:0000FB26 process_effect_channel:                 ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels:next_effect_channel↓j
ROM:0000FB26                 moveq   #0,d0
ROM:0000FB28                 move.w  #$48,d0 ; 'H'
ROM:0000FB2C                 mulu.w  d7,d0
ROM:0000FB2E                 lea     6(a3),a0
ROM:0000FB32                 adda.l  d0,a0
ROM:0000FB34                 movea.l $28(a0),a1
ROM:0000FB38                 lea     $1BA(a3),a6
ROM:0000FB3C                 move.w  d7,d0
ROM:0000FB3E                 lsl.w   #3,d0
ROM:0000FB40                 adda.l  d0,a6
ROM:0000FB42                 move.b  $3E(a0),d0
ROM:0000FB46                 cmp.b   #0,d0
ROM:0000FB4A                 beq.w   next_effect_channel
ROM:0000FB4E                 cmp.b   #1,d0
ROM:0000FB52                 beq.w   process_effect
ROM:0000FB56                 cmp.b   #3,d0
ROM:0000FB5A                 bne.s   stop_effect
ROM:0000FB5C                 move.b  #0,3(a6)
ROM:0000FB62                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000FB6A                 move.b  #0,$3E(a0)
ROM:0000FB70                 bra.w   next_effect_channel
ROM:0000FB74 ; ---------------------------------------------------------------------------
ROM:0000FB74
ROM:0000FB74 stop_effect:                            ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+3C↑j
ROM:0000FB74                 move.b  #0,3(a6)
ROM:0000FB7A                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000FB82                 move.b  #1,$3E(a0)
ROM:0000FB88
ROM:0000FB88 process_effect:                         ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+34↑j
ROM:0000FB88                 cmpi.b  #0,$3C(a0)
ROM:0000FB8E                 bne.w   update_frequency
ROM:0000FB92                 cmpi.b  #0,$3D(a0)
ROM:0000FB98                 bne.w   update_delay
ROM:0000FB9C                 move.b  #0,$3F(a0)
ROM:0000FBA2
ROM:0000FBA2 parse_effect_command:                   ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+B8↓j
ROM:0000FBA2                                         ; Sound_ProcessSoundEffects_sfx_process_channels+106↓j ...
ROM:0000FBA2                 moveq   #0,d0
ROM:0000FBA4                 move.b  (a1)+,d0
ROM:0000FBA6                 cmp.b   #$80,d0
ROM:0000FBAA                 beq.w   effect_instrument
ROM:0000FBAE                 cmp.b   #$84,d0
ROM:0000FBB2                 beq.w   effect_stop
ROM:0000FBB6                 cmp.b   #$83,d0
ROM:0000FBBA                 beq.w   effect_frequency
ROM:0000FBBE                 cmp.b   #$81,d0
ROM:0000FBC2                 beq.w   effect_delay
ROM:0000FBC6                 cmp.b   #$82,d0
ROM:0000FBCA                 beq.w   effect_alt_delay
ROM:0000FBCE                 cmp.b   #$85,d0
ROM:0000FBD2                 beq.w   effect_loop
ROM:0000FBD6                 bra.s   parse_effect_command
ROM:0000FBD8 ; ---------------------------------------------------------------------------
ROM:0000FBD8
ROM:0000FBD8 effect_stop:                            ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+94↑j
ROM:0000FBD8                 move.b  #0,3(a6)
ROM:0000FBDE                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000FBE6                 move.b  #0,$3E(a0)
ROM:0000FBEC                 bra.w   next_effect_channel
ROM:0000FBF0 ; ---------------------------------------------------------------------------
ROM:0000FBF0
ROM:0000FBF0 effect_instrument:                      ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+8C↑j
ROM:0000FBF0                 move.b  (a1)+,d0
ROM:0000FBF2                 cmp.b   $41(a0),d0
ROM:0000FBF6                 beq.s   effect_output
ROM:0000FBF8                 move.b  d0,$41(a0)
ROM:0000FBFC                 move.l  #$2A5,d1
ROM:0000FC02                 lsl.w   #5,d0
ROM:0000FC04                 add.l   d0,d1
ROM:0000FC06                 move.w  d1,d0
ROM:0000FC08                 move.b  d0,2(a6)
ROM:0000FC0C                 lsr.w   #8,d1
ROM:0000FC0E                 move.b  d1,1(a6)
ROM:0000FC12                 move.b  #0,(a6)
ROM:0000FC16
ROM:0000FC16 effect_output:                          ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+D8↑j
ROM:0000FC16                 move.b  #1,3(a6)
ROM:0000FC1C                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000FC24                 bra.w   parse_effect_command
ROM:0000FC28 ; ---------------------------------------------------------------------------
ROM:0000FC28
ROM:0000FC28 effect_frequency:                       ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+9C↑j
ROM:0000FC28                 move.b  (a1)+,d0
ROM:0000FC2A                 move.b  d0,$3C(a0)
ROM:0000FC2E                 move.b  d0,$40(a0)
ROM:0000FC32                 move.l  (a1)+,d0
ROM:0000FC34                 move.l  d0,$30(a0)
ROM:0000FC38                 move.l  d0,$34(a0)
ROM:0000FC3C                 move.l  (a1)+,$38(a0)
ROM:0000FC40                 move.l  a1,$28(a0)
ROM:0000FC44                 bra.s   output_effect_frequency
ROM:0000FC46 ; ---------------------------------------------------------------------------
ROM:0000FC46
ROM:0000FC46 effect_delay:                           ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+A4↑j
ROM:0000FC46                 move.b  (a1)+,$3D(a0)
ROM:0000FC4A                 move.b  #0,$3F(a0)
ROM:0000FC50                 bra.w   parse_effect_command
ROM:0000FC54 ; ---------------------------------------------------------------------------
ROM:0000FC54
ROM:0000FC54 effect_alt_delay:                       ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+AC↑j
ROM:0000FC54                 move.b  (a1)+,$3D(a0)
ROM:0000FC58                 move.b  #1,$3F(a0)
ROM:0000FC5E                 bra.w   parse_effect_command
ROM:0000FC62 ; ---------------------------------------------------------------------------
ROM:0000FC62
ROM:0000FC62 effect_loop:                            ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+B4↑j
ROM:0000FC62                 movea.l $2C(a0),a1
ROM:0000FC66                 bra.w   parse_effect_command
ROM:0000FC6A ; ---------------------------------------------------------------------------
ROM:0000FC6A
ROM:0000FC6A update_delay:                           ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+7A↑j
ROM:0000FC6A                 subq.b  #1,$3D(a0)
ROM:0000FC6E                 move.l  $30(a0),$34(a0)
ROM:0000FC74                 move.b  $40(a0),$3C(a0)
ROM:0000FC7A                 cmpi.b  #0,$3F(a0)
ROM:0000FC80                 beq.w   output_effect_frequency
ROM:0000FC84                 move.b  #1,(a6)
ROM:0000FC88                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000FC90                 bra.w   output_effect_frequency
ROM:0000FC94 ; ---------------------------------------------------------------------------
ROM:0000FC94
ROM:0000FC94 update_frequency:                       ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+70↑j
ROM:0000FC94                 move.l  $38(a0),d0
ROM:0000FC98                 add.l   d0,$34(a0)
ROM:0000FC9C                 subq.b  #1,$3C(a0)
ROM:0000FCA0
ROM:0000FCA0 output_effect_frequency:                ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+126↑j
ROM:0000FCA0                                         ; Sound_ProcessSoundEffects_sfx_process_channels+162↑j ...
ROM:0000FCA0                 move.l  $34(a0),d0
ROM:0000FCA4                 moveq   #0,d1
ROM:0000FCA6
ROM:0000FCA6 normalize_frequency:                    ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+19A↓j
ROM:0000FCA6                 cmp.l   #$7FF,d0
ROM:0000FCAC                 bls.w   apply_frequency
ROM:0000FCB0                 addi.l  #$800,d1
ROM:0000FCB6                 lsr.l   #1,d0
ROM:0000FCB8                 bra.s   normalize_frequency
ROM:0000FCBA ; ---------------------------------------------------------------------------
ROM:0000FCBA
ROM:0000FCBA apply_frequency:                        ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+18E↑j
ROM:0000FCBA                 or.l    d0,d1
ROM:0000FCBC                 move.l  d1,d0
ROM:0000FCBE                 lsr.w   #8,d1
ROM:0000FCC0                 move.b  d1,5(a6)
ROM:0000FCC4                 move.b  d0,6(a6)
ROM:0000FCC8                 move.b  #0,4(a6)
ROM:0000FCCE                 move.b  #0,(g_AudioUpdateFlag).l
ROM:0000FCD6
ROM:0000FCD6 next_effect_channel:                    ; CODE XREF: Sound_ProcessSoundEffects_sfx_process_channels+2C↑j
ROM:0000FCD6                                         ; Sound_ProcessSoundEffects_sfx_process_channels+52↑j ...
ROM:0000FCD6                 dbf     d7,process_effect_channel
ROM:0000FCDA                 rts
ROM:0000FCDA ; End of function Sound_ProcessSoundEffects_sfx_process_channels
ROM:0000FCDA
ROM:0000FCDC
ROM:0000FCDC ; =============== S U B R O U T I N E =======================================
ROM:0000FCDC
ROM:0000FCDC
ROM:0000FCDC Sound_WriteYM2612:                      ; CODE XREF: handle_sfx_puckwall3+E↓p
ROM:0000FCDC                                         ; handle_sfx_id_3+E↓p ...
ROM:0000FCDC                 lea     p_music_vblank(pc),a4
ROM:0000FCE0                 add.l   a4,d1
ROM:0000FCE2                 move.l  d1,d0
ROM:0000FCE4                 ori.w   #$8000,d0
ROM:0000FCE8                 move.w  d0,(z80_write_buffer).l
ROM:0000FCEE                 lsr.l   #8,d1
ROM:0000FCF0                 lsr.l   #7,d1
ROM:0000FCF2                 move.b  d1,(ym2612_reg_part).l
ROM:0000FCF8                 move.b  d1,(ym2612_reg_part).l
ROM:0000FCFE                 move.b  d2,(ym2612_data_low).l
ROM:0000FD04                 move.b  d3,(ym2612_data_high).l
ROM:0000FD0A                 move.b  #0,(z80_update_flag).l
ROM:0000FD12                 move.b  #1,(z80_write_pending).l
ROM:0000FD1A                 rts
ROM:0000FD1A ; End of function Sound_WriteYM2612
ROM:0000FD1A
ROM:0000FD1C
ROM:0000FD1C ; =============== S U B R O U T I N E =======================================
ROM:0000FD1C
ROM:0000FD1C
ROM:0000FD1C handle_sfx_puckwall3:
ROM:0000FD1C                 move.l  #$53BE,d1
ROM:0000FD22                 move.b  #$13,d2
ROM:0000FD26                 move.b  #1,d3
ROM:0000FD2A                 bsr.s   Sound_WriteYM2612
ROM:0000FD2C                 bsr.w   handle_sfx_pass
ROM:0000FD30                 rts
ROM:0000FD30 ; End of function handle_sfx_puckwall3
ROM:0000FD30
ROM:0000FD32
ROM:0000FD32 ; =============== S U B R O U T I N E =======================================
ROM:0000FD32
ROM:0000FD32
ROM:0000FD32 handle_sfx_id_3:
ROM:0000FD32                 move.l  #fm_instrument_patch_sfx_id_3,d1
ROM:0000FD38                 move.b  #8,d2
ROM:0000FD3C                 move.b  #1,d3
ROM:0000FD40                 bsr.s   Sound_WriteYM2612
ROM:0000FD42                 rts
ROM:0000FD42 ; End of function handle_sfx_id_3
ROM:0000FD42
ROM:0000FD44
ROM:0000FD44 ; =============== S U B R O U T I N E =======================================
ROM:0000FD44
ROM:0000FD44
ROM:0000FD44 configure_ym2612:                       ; CODE XREF: Sound_StopMusic+E↑p
ROM:0000FD44                                         ; Sound_PauseMusic+14↑p
ROM:0000FD44                 move.l  #$53BA,d1
ROM:0000FD4A                 move.b  #$B,d2
ROM:0000FD4E                 move.b  #0,d3
ROM:0000FD52                 bsr.s   Sound_WriteYM2612
ROM:0000FD54                 rts
ROM:0000FD54 ; End of function configure_ym2612
ROM:0000FD54
ROM:0000FD56 ; ---------------------------------------------------------------------------
ROM:0000FD56
ROM:0000FD56 handle_sfx_whistle:
ROM:0000FD56                 move.l  #fm_instrument_patch_sfx_id_3,d1
ROM:0000FD5C                 move.b  #$B,d2
ROM:0000FD60                 move.b  #1,d3
ROM:0000FD64                 bsr.w   Sound_WriteYM2612
ROM:0000FD68                 rts
ROM:0000FD6A ; ---------------------------------------------------------------------------
ROM:0000FD6A
ROM:0000FD6A handle_sfx_puckpost:
ROM:0000FD6A                 move.l  #$53BE,d1
ROM:0000FD70                 move.b  #$18,d2
ROM:0000FD74                 move.b  #1,d3
ROM:0000FD78                 bsr.w   Sound_WriteYM2612
ROM:0000FD7C                 bsr.w   handle_sfx_pass
ROM:0000FD80                 rts
ROM:0000FD82 ; ---------------------------------------------------------------------------
ROM:0000FD82
ROM:0000FD82 handle_sfx_puckice:
ROM:0000FD82                 move.l  #$53BE,d1
ROM:0000FD88                 move.b  #$10,d2
ROM:0000FD8C                 move.b  #1,d3
ROM:0000FD90                 bsr.w   Sound_WriteYM2612
ROM:0000FD94                 bsr.w   handle_sfx_pass
ROM:0000FD98                 rts
ROM:0000FD9A ; ---------------------------------------------------------------------------
ROM:0000FD9A
ROM:0000FD9A handle_sfx_playerwall:
ROM:0000FD9A                 move.l  #$62A0,d1
ROM:0000FDA0                 move.b  #$10,d2
ROM:0000FDA4                 move.b  #1,d3
ROM:0000FDA8                 bsr.w   Sound_WriteYM2612
ROM:0000FDAC                 rts
ROM:0000FDAE
ROM:0000FDAE ; =============== S U B R O U T I N E =======================================
ROM:0000FDAE
ROM:0000FDAE
ROM:0000FDAE handle_sfx_check:
ROM:0000FDAE                 move.l  #$62A0,d1
ROM:0000FDB4                 move.b  #$13,d2
ROM:0000FDB8                 move.b  #1,d3
ROM:0000FDBC                 bsr.w   Sound_WriteYM2612
ROM:0000FDC0                 rts
ROM:0000FDC0 ; End of function handle_sfx_check
ROM:0000FDC0
ROM:0000FDC2 ; ---------------------------------------------------------------------------
ROM:0000FDC2
ROM:0000FDC2 handle_sfx_check2:
ROM:0000FDC2                 move.l  #$62A0,d1
ROM:0000FDC8                 move.b  #$18,d2
ROM:0000FDCC                 move.b  #1,d3
ROM:0000FDD0                 bsr.w   Sound_WriteYM2612
ROM:0000FDD4                 rts
ROM:0000FDD6
ROM:0000FDD6 ; =============== S U B R O U T I N E =======================================
ROM:0000FDD6
ROM:0000FDD6
ROM:0000FDD6 handle_sfx_puckget:
ROM:0000FDD6                 move.l  #$4498,d1
ROM:0000FDDC                 move.b  #$C,d2
ROM:0000FDE0                 move.b  #2,d3
ROM:0000FDE4                 bsr.w   Sound_WriteYM2612
ROM:0000FDE8                 rts
ROM:0000FDE8 ; End of function handle_sfx_puckget
ROM:0000FDE8
ROM:0000FDEA
ROM:0000FDEA ; =============== S U B R O U T I N E =======================================
ROM:0000FDEA
ROM:0000FDEA
ROM:0000FDEA handle_sfx_puckbody:
ROM:0000FDEA                 move.l  #$3590,d1
ROM:0000FDF0                 move.b  #$C,d2
ROM:0000FDF4                 move.b  #2,d3
ROM:0000FDF8                 bsr.w   Sound_WriteYM2612
ROM:0000FDFC                 rts
ROM:0000FDFC ; End of function handle_sfx_puckbody
ROM:0000FDFC
ROM:0000FDFE
ROM:0000FDFE ; =============== S U B R O U T I N E =======================================
ROM:0000FDFE
ROM:0000FDFE
ROM:0000FDFE handle_sfx_puckwall1:
ROM:0000FDFE                 move.l  #$2776,d1
ROM:0000FE04                 move.b  #$B,d2
ROM:0000FE08                 move.b  #2,d3
ROM:0000FE0C                 bsr.w   Sound_WriteYM2612
ROM:0000FE10                 rts
ROM:0000FE10 ; End of function handle_sfx_puckwall1
ROM:0000FE10
ROM:0000FE12
ROM:0000FE12 ; =============== S U B R O U T I N E =======================================
ROM:0000FE12
ROM:0000FE12
ROM:0000FE12 handle_sfx_hithigh:
ROM:0000FE12                 move.l  #$73E2,d1
ROM:0000FE18                 move.b  #$15,d2
ROM:0000FE1C                 move.b  #2,d3
ROM:0000FE20                 bsr.w   Sound_WriteYM2612
ROM:0000FE24                 rts
ROM:0000FE24 ; End of function handle_sfx_hithigh
ROM:0000FE24
ROM:0000FE26
ROM:0000FE26 ; =============== S U B R O U T I N E =======================================
ROM:0000FE26
ROM:0000FE26
ROM:0000FE26 handle_sfx_id_23:
ROM:0000FE26                 move.l  #$73E2,d1
ROM:0000FE2C                 move.b  #$1F,d2
ROM:0000FE30                 move.b  #2,d3
ROM:0000FE34                 bsr.w   Sound_WriteYM2612
ROM:0000FE38                 rts
ROM:0000FE38 ; End of function handle_sfx_id_23
ROM:0000FE38
ROM:0000FE3A
ROM:0000FE3A ; =============== S U B R O U T I N E =======================================
ROM:0000FE3A
ROM:0000FE3A
ROM:0000FE3A handle_sfx_hitlow:
ROM:0000FE3A                 move.l  #$73E2,d1
ROM:0000FE40                 move.b  #$19,d2
ROM:0000FE44                 move.b  #2,d3
ROM:0000FE48                 bsr.w   Sound_WriteYM2612
ROM:0000FE4C                 rts
ROM:0000FE4C ; End of function handle_sfx_hitlow
ROM:0000FE4C
ROM:0000FE4E
ROM:0000FE4E ; =============== S U B R O U T I N E =======================================
ROM:0000FE4E
ROM:0000FE4E
ROM:0000FE4E handle_sfx_crowdboo:
ROM:0000FE4E                 move.l  #$793C,d1
ROM:0000FE54                 move.b  #$13,d2
ROM:0000FE58                 move.b  #0,d3
ROM:0000FE5C                 bsr.w   Sound_WriteYM2612
ROM:0000FE60                 rts
ROM:0000FE60 ; End of function handle_sfx_crowdboo
ROM:0000FE60
ROM:0000FE62 ; ---------------------------------------------------------------------------
ROM:0000FE62
ROM:0000FE62 handle_sfx_oooh:
ROM:0000FE62                 move.l  #$E2BE,d1
ROM:0000FE68                 move.b  #$18,d2
ROM:0000FE6C                 move.b  #0,d3
ROM:0000FE70                 bsr.w   Sound_WriteYM2612
ROM:0000FE74                 rts
ROM:0000FE76 ; ---------------------------------------------------------------------------
ROM:0000FE76
ROM:0000FE76 handle_sfx_id_31:
ROM:0000FE76                 move.l  #fm_instrument_patch_sfx_31,d1
ROM:0000FE7C                 move.b  #$1B,d2
ROM:0000FE80                 move.b  #0,d3
ROM:0000FE84                 bsr.w   Sound_WriteYM2612
ROM:0000FE88                 rts
ROM:0000FE8A
ROM:0000FE8A ; =============== S U B R O U T I N E =======================================
ROM:0000FE8A
ROM:0000FE8A
ROM:0000FE8A handle_sfx_shotfh:
ROM:0000FE8A                 move.l  #$AF0,d1
ROM:0000FE90                 moveq   #1,d7
ROM:0000FE92                 bsr.w   initialize_sfx_channel
ROM:0000FE96                 rts
ROM:0000FE96 ; End of function handle_sfx_shotfh
ROM:0000FE96
ROM:0000FE98
ROM:0000FE98 ; =============== S U B R O U T I N E =======================================
ROM:0000FE98
ROM:0000FE98
ROM:0000FE98 handle_sfx_shotwiff:
ROM:0000FE98                 move.l  #$B46,d1
ROM:0000FE9E                 moveq   #2,d7
ROM:0000FEA0                 bsr.w   initialize_sfx_channel
ROM:0000FEA4                 rts
ROM:0000FEA4 ; End of function handle_sfx_shotwiff
ROM:0000FEA4
ROM:0000FEA6
ROM:0000FEA6 ; =============== S U B R O U T I N E =======================================
ROM:0000FEA6
ROM:0000FEA6
ROM:0000FEA6 handle_sfx_horn:
ROM:0000FEA6                 move.l  #$B28,d1
ROM:0000FEAC                 moveq   #1,d7
ROM:0000FEAE                 bsr.w   initialize_sfx_channel
ROM:0000FEB2                 rts
ROM:0000FEB2 ; End of function handle_sfx_horn
ROM:0000FEB2
ROM:0000FEB4
ROM:0000FEB4 ; =============== S U B R O U T I N E =======================================
ROM:0000FEB4
ROM:0000FEB4
ROM:0000FEB4 handle_sfx_pass:                        ; CODE XREF: handle_sfx_puckwall3+10↑p
ROM:0000FEB4                                         ; ROM:0000FD7C↑p ...
ROM:0000FEB4                 move.l  #$BDE,d1
ROM:0000FEBA                 moveq   #2,d7
ROM:0000FEBC                 bsr.w   initialize_sfx_channel
ROM:0000FEC0                 rts
ROM:0000FEC0 ; End of function handle_sfx_pass
ROM:0000FEC0
ROM:0000FEC2
ROM:0000FEC2 ; =============== S U B R O U T I N E =======================================
ROM:0000FEC2
ROM:0000FEC2
ROM:0000FEC2 handle_sfx_shotbh:
ROM:0000FEC2                 move.l  #$C38,d1
ROM:0000FEC8                 moveq   #2,d7
ROM:0000FECA                 bsr.w   initialize_sfx_channel
ROM:0000FECE                 rts
ROM:0000FECE ; End of function handle_sfx_shotbh
ROM:0000FECE
ROM:0000FED0 ; ---------------------------------------------------------------------------
ROM:0000FED0
ROM:0000FED0 handle_sfx_id_27:
ROM:0000FED0                 move.l  #$BFC,d1
ROM:0000FED6                 moveq   #2,d7
ROM:0000FED8                 bsr.w   initialize_sfx_channel
ROM:0000FEDC                 rts
ROM:0000FEDE
ROM:0000FEDE ; =============== S U B R O U T I N E =======================================
ROM:0000FEDE
ROM:0000FEDE
ROM:0000FEDE handle_sfx_id_29:
ROM:0000FEDE                 move.l  #$C56,d1
ROM:0000FEE4                 moveq   #2,d7
ROM:0000FEE6                 bsr.w   initialize_sfx_channel
ROM:0000FEEA                 rts
ROM:0000FEEA ; End of function handle_sfx_id_29
ROM:0000FEEA
ROM:0000FEEC
ROM:0000FEEC ; =============== S U B R O U T I N E =======================================
ROM:0000FEEC
ROM:0000FEEC
ROM:0000FEEC handle_sfx_id_28:
ROM:0000FEEC                 move.l  #$C1A,d1
ROM:0000FEF2                 moveq   #2,d7
ROM:0000FEF4                 bsr.w   initialize_sfx_channel
ROM:0000FEF8                 rts
ROM:0000FEF8 ; End of function handle_sfx_id_28
ROM:0000FEF8
ROM:0000FEFA
ROM:0000FEFA ; =============== S U B R O U T I N E =======================================
ROM:0000FEFA
ROM:0000FEFA
ROM:0000FEFA handle_sfx_id_30:
ROM:0000FEFA                 move.l  #$C74,d1
ROM:0000FF00                 moveq   #2,d7
ROM:0000FF02                 bsr.w   initialize_sfx_channel
ROM:0000FF06                 rts
ROM:0000FF06 ; End of function handle_sfx_id_30
ROM:0000FF06
ROM:0000FF08
ROM:0000FF08 ; =============== S U B R O U T I N E =======================================
ROM:0000FF08
ROM:0000FF08
ROM:0000FF08 handle_sfx_puckwall2:
ROM:0000FF08                 move.l  #$BC0,d1
ROM:0000FF0E                 moveq   #1,d7
ROM:0000FF10                 bsr.w   initialize_sfx_channel
ROM:0000FF14                 rts
ROM:0000FF14 ; End of function handle_sfx_puckwall2
ROM:0000FF14
ROM:0000FF16
ROM:0000FF16 ; =============== S U B R O U T I N E =======================================
ROM:0000FF16
ROM:0000FF16
ROM:0000FF16 handle_sfx_crowdcheer:
ROM:0000FF16                 move.l  #$B64,d1
ROM:0000FF1C                 moveq   #0,d7
ROM:0000FF1E                 bsr.w   initialize_sfx_channel
ROM:0000FF22                 move.l  #$B8C,d1
ROM:0000FF28                 moveq   #1,d7
ROM:0000FF2A                 bsr.w   initialize_sfx_channel
ROM:0000FF2E                 rts
ROM:0000FF2E ; End of function handle_sfx_crowdcheer
ROM:0000FF2E
ROM:0000FF30
ROM:0000FF30 ; =============== S U B R O U T I N E =======================================
ROM:0000FF30
ROM:0000FF30
ROM:0000FF30 handle_sfx_stdef:
ROM:0000FF30                 move.l  #$B00,d1
ROM:0000FF36                 moveq   #4,d7
ROM:0000FF38                 bsr.w   initialize_sfx_channel
ROM:0000FF3C                 rts
ROM:0000FF3C ; End of function handle_sfx_stdef
ROM:0000FF3C
ROM:0000FF3E
ROM:0000FF3E ; =============== S U B R O U T I N E =======================================
ROM:0000FF3E
ROM:0000FF3E
ROM:0000FF3E handle_sfx_beep1:
ROM:0000FF3E                 move.l  #$CA2,d1
ROM:0000FF44                 moveq   #3,d7
ROM:0000FF46                 bsr.w   initialize_sfx_channel
ROM:0000FF4A                 rts
ROM:0000FF4A ; End of function handle_sfx_beep1
ROM:0000FF4A
ROM:0000FF4C
ROM:0000FF4C ; =============== S U B R O U T I N E =======================================
ROM:0000FF4C
ROM:0000FF4C
ROM:0000FF4C handle_sfx_beep2:
ROM:0000FF4C                 move.l  #$C92,d1
ROM:0000FF52                 moveq   #3,d7
ROM:0000FF54                 bsr.w   initialize_sfx_channel
ROM:0000FF58                 rts
ROM:0000FF58 ; End of function handle_sfx_beep2
ROM:0000FF58
ROM:0000FF5A
ROM:0000FF5A ; =============== S U B R O U T I N E =======================================
ROM:0000FF5A
ROM:0000FF5A
ROM:0000FF5A handle_sfx_siren:
ROM:0000FF5A                 move.l  #$AAC,d1
ROM:0000FF60                 moveq   #0,d7
ROM:0000FF62                 bsr.w   initialize_sfx_channel
ROM:0000FF66                 move.l  #$AC8,d1
ROM:0000FF6C                 moveq   #1,d7
ROM:0000FF6E                 bsr.w   initialize_sfx_channel
ROM:0000FF72                 rts
ROM:0000FF72 ; End of function handle_sfx_siren
ROM:0000FF72
ROM:0000FF72 ; ---------------------------------------------------------------------------

SFX Data: 0xFF74-0x10179
{ name: 'sfx_siren_cmdstream_ch0.bin', folder: 'Sound', start: 0xFF74, end: 0xFF90 },
{ name: 'sfx_siren_cmdstream_ch1.bin', folder: 'Sound', start: 0xFF90, end: 0xFFB8 },
{ name: 'sfx_shotfh_cmdstream.bin', folder: 'Sound', start: 0xFFB8, end: 0xFFC8 },
{ name: 'sfx_stdef_cmdstream.bin', folder: 'Sound', start: 0xFFC8, end: 0xFFF0 },
{ name: 'sfx_horn_cmdstream.bin', folder: 'Sound', start: 0xFFF0, end: 0x1000E },
{ name: 'sfx_shotwiff_cmdstream.bin', folder: 'Sound', start: 0x1000E, end: 0x1002C },
{ name: 'sfx_crowdcheer_cmdstream_ch0.bin', folder: 'Sound', start: 0x1002C, end: 0x10054 },
{ name: 'sfx_crowdcheer_cmdstream_ch1.bin', folder: 'Sound', start: 0x10054, end: 0x10088 },
{ name: 'sfx_puckwall2_cmdstream.bin', folder: 'Sound', start: 0x10088, end: 0x100A6 }, // there is a stop at 100A0?
{ name: 'sfx_pass_cmdstream.bin', folder: 'Sound', start: 0x100A6, end: 0x100C4 }, //puckwall3-2, puckpost-2, puckice-2
{ name: 'sfx_id_27_cmdstream.bin', folder: 'Sound', start: 0x100C4, end: 0x100E2 },
{ name: 'sfx_id_28_cmdstream.bin', folder: 'Sound', start: 0x100E2, end: 0x10100 },
{ name: 'sfx_shotbh_cmdstream.bin', folder: 'Sound', start: 0x10100, end: 0x1011E },
{ name: 'sfx_id_29_cmdstream.bin', folder: 'Sound', start: 0x1011E, end: 0x1013C },
{ name: 'sfx_id_30_cmdstream.bin', folder: 'Sound', start: 0x1013C, end: 0x1015A },
{ name: 'sfx_beep2_cmdstream.bin', folder: 'Sound', start: 0x1015A, end: 0x1016A },
{ name: 'sfx_beep1_cmdstream.bin', folder: 'Sound', start: 0x1016A, end: 0x1017A },

Note Frequency Table: 0x1017A-0x101D9
02 02 02 02 03 03 03 03 03 04 04 04 0A 0A 0A 0A 0B 0B 0B 0B 0B 0C 0C 0C 12 12 12 12 13 13 13 13 13 14 14 14 1A 1A 1A 1A 1B 1B 1B 1B 1B 1C 1C 1C 22 22 22 22 23 23 23 23 23 24 24 24 2A 2A 2A 2A 2B 2B 2B 2B 2B 2C 2C 2C 32 32 32 32 33 33 33 33 33 34 34 34 3A 3A 3A 3A 3B 3B 3B 3B 3B 3C 3C 3C

Note Octave Table: 0x101DA-0x10239
84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0 84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0 84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0 84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0 84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0 84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0 84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0 84 AA D3 FE 2B 5C 8F C5 FE 3B 7B C0

Envelope Table: 0x1023A-0x10293
00 00 0D 82 00 00 0D 8B 00 00 0D 96 00 00 0D A3 00 01 01 00 FF FE FF 00 84 00 01 02 02 02 01 FF FE FE FE 84 00 00 01 01 01 00 00 FF FF FF 00 00 84 00 FF FE FD FC FB FA F9 F8 F7 F6 F5 F4 F3 F2 F1 F0 EF EE ED EC EB EA E9 E8 E7 E6 E5 E4 E3 E2 E1 E0 DF DE DD DC DB DA 84 06

FMTune Header Table: 0x10294-0x10315
05 07 00 00 10 A0 00 00 10 B8 00 00 10 EE 00 00 10 D4 00 00 11 02 00 00 11 18 05 06 00 00 0F 46 00 00 0F 66 00 00 0F AA 00 00 0F 86 00 00 0F DC 00 00 10 0A 05 06 00 00 0F 5E 00 00 0F 7E 00 00 0F D0 00 00 0F A0 00 00 0F FE 00 00 10 70 05 06 00 00 0E 98 00 00 0E A0 00 00 0E B4 00 00 0E AA 00 00 0E E2 00 00 0F 16 05 07 00 00 0E 4E 00 00 0E 58 00 00 0E 66 00 00 0E 74 00 00 0E 84 00 00 0E 94

FMTune Channel Data: 0x10316-0x11624 (data changes around 0x1061A?)
11 A3 00 02 00 03 1A 41 00 00 11 8B 11 C7 00 02 00 03 11 6D 1C A5 00 00 11 8B 11 F0 00 02 00 03 11 6D 1D 00 00 00 11 6D 12 19 12 75 11 8E 12 19 12 75 12 DE 00 00 11 6D 12 47 12 A8 11 8E 12 47 12 A8 13 3F 00 00 1C 35 00 00 1A 41 00 02 00 03 00 00 11 6D 1C A5 00 02 00 03 00 00 11 6D 1D 00 00 02 00 03 00 00 11 6D 13 A0 11 8E 13 A0 15 47 15 47 13 D5 14 0E 00 02 00 03 13 D5 11 6D 14 1E 11 8E 13 EF 14 1E 13 EF 11 6D 18 D5 18 D5 16 49 16 49 00 00 11 8E 14 CD 14 CD 15 6C 15 6C 15 02 11 9A 15 37 00 02 00 03 11 8E 15 02 11 8E 14 77 11 8E 15 18 11 8E 14 77 11 9A 15 18 11 6D 19 8B 19 8B 18 55 18 55 00 00 1C 35 00 02 00 06 1D 98 1C 35 1C 4E 1C 35 1C 35 1C 35 1C 4E 1C 35 1D 98 1C 35 00 02 00 05 1C 65 1C 35 1C 4E 1C 8D 1C 35 1C 8D 1D 98 1C 65 00 00 11 8B 1E D6 1E F0 1A 87 1A CB 1A 87 1A 41 00 02 00 05 15 91 00 01 00 02 1A 41 00 02 00 03 00 00 11 6D 1E E3 1E E3 1B F1 1C A5 1B F1 11 6D 1C A5 00 02 00 05 11 6D 16 0A 1C A5 00 02 00 03 00 00 11 8B 1E E3 1E E3 11 6D 1B AD 1D 00 1B AD 11 6D 1D 00 00 02 00 05 11 8B 16 0A 11 6D 1D 00 00 02 00 03 00 00 11 8E 1F 42 1F 42 11 6D 1B 1D 11 8B 16 49 11 8E 1B 1D 11 8B 16 49 11 6D 16 49 16 49 16 49 16 BD 16 BD 11 6D 15 B0 11 6D 18 D5 18 D5 16 49 16 49 00 00 11 A0 1F 42 1F 42 11 6D 11 56 11 56 1B 6A 11 6D 17 EF 11 6D 17 EF 17 EF 18 55 17 56 17 56 11 6D 15 DE 11 6D 19 8B 19 8B 18 55 18 55 00 00 1D C4 00 02 00 06 1D D2 1B 0D 00 02 00 07 1B 0D 00 02 00 06 1D 98 1B 0D 00 02 00 06 1D 98 1B 0D 00 02 00 06 1D 98 1C 35 1C 4E 1C 35 1C 35 1C 35 1C 4E 1C 35 1D 98 1C 35 00 02 00 06 1D 98 1C 35 1C 4E 1C 35 1C 35 1C 35 1C 4E 1C 35 1D 98 1C 35 00 02 00 05 1C 65 1C 35 1C 4E 1C 8D 1C 35 1C 8D 1D 98 1C 65 16 24 1C 35 00 02 00 06 1D 98 1C 35 1C 4E 1C 35 1C 35 1C 35 1C 4E 1C 35 1D 98 1C 35 00 02 00 05 1C 65 1C 35 1C 4E 1C 8D 1C 35 1C 8D 1D 98 1C 65 00 00 1E D6 1E F0 1D 5B 1D 5B 1D 5B 1D 5B 1D 5B 1D 5B 1D 5B 1D 5B 1F 83 00 00 11 6D 1E E3 1E E3 11 8B 1D E7 1D E7 1D E7 1D E7 1D E7 1D E7 1D E7 1D E7 1F C9 00 00 11 8B 1E E3 1E E3 1D FA 1D FA 1D FA 1D FA 1D FA 1D FA 1D FA 1D FA 20 0C 00 00 11 8E 1F 42 11 9A 1F 42 11 6D 1E 0D 1E 0D 11 6D 20 4F 00 00 11 A0 1F 42 11 9D 1F 42 11 6D 1E 73 11 8E 1E 73 11 6D 20 D5 00 00 1D C4 00 02 00 06 1D D2 1D 6D 00 02 00 07 1D 6D 1D 6D 1D 6D 1D A9 1D 6D 1D 6D 1D 6D 1D A9 1D 6D 1D 6D 1D 6D 1D 83 1D 6D 1D 6D 1D 6D 1D 98 00 00 C0 60 84 80 00 B0 60 84 80 00 C0 60 60 84 80 00 C0 60 60 60 60 84 88 FF 84 88 FE 84 88 03 84 88 FB 84 88 05 84 88 0C 84 88 07 84 88 06 84 88 01 84 88 08 84 88 0A 84 88 FB 84 88 F4 84 88 0E 84 88 02 84 88 00 84 88 18 84 88 E8 84 88 DC 84 88 11 84 88 24 84 88 1F 84 88 13 84 80 01 A2 1F 1F 1F 1F 1F 1F 26 29 22 22 25 26 22 22 1A 1C 1D 1D 1D 1D 1D 1D 21 22 24 24 24 24 26 26 1D 1E 84 80 11 A4 37 A2 60 37 A4 37 60 A2 60 A4 35 A2 35 A2 35 60 35 60 A4 35 A2 60 35 A4 35 60 A2 60 A4 37 A2 37 A2 37 60 37 60 84 80 11 A4 32 A2 60 32 A4 32 60 A2 60 A4 2E A2 2E A2 2E 60 2E 60 A4 30 A2 60 30 A4 30 60 A2 60 A4 30 A2 30 A2 32 60 32 60 84 80 15 86 01 80 A2 60 32 35 A8 37 A2 81 09 0B 35 60 81 09 0B 35 AC 35 A2 60 30 32 A8 35 A2 81 08 0E 37 60 81 08 0E 37 37 60 37 60 37 60 84 80 15 86 00 80 A2 60 2F 30 A8 32 A2 81 09 0B 30 60 81 09 0B 30 AC 32 A2 60 2D 2E A8 30 A2 81 08 06 34 60 81 08 06 34 34 60 34 60 34 60 84 A2 60 32 35 37 60 37 3A 81 09 04 3E 60 81 09 04 3E A8 3E A2 60 81 09 08 3C 60 81 09 08 3C 3C 60 81 09 07 39 60 39 3C 60 3C 3C 60 3C 60 A4 81 09 0E 39 84 A2 60 2F 30 32 60 32 35 81 09 0B 35 60 81 09 0B 35 A8 35 A2 60 81 09 07 39 60 81 09 07 39 39 60 81 09 0B 35 60 35 39 60 81 09 0B 37 81 09 0B 37 60 37 60 A4 37 84 80 12 A2 60 34 37 A6 39 A2 60 A4 81 09 06 36 A2 36 32 AA 2D A2 60 34 37 A6 39 A2 60 A4 81 09 06 36 A2 39 39 60 81 0A 0B 37 60 A2 81 0A 0B 37 39 A2 60 34 37 A6 39 A2 60 A4 81 09 06 36 A2 36 32 AA 2D A2 60 32 32 60 32 32 60 81 08 0B 32 60 81 08 0B 32 81 08 0B 32 32 A2 81 08 05 33 33 32 30 84 80 12 A2 60 30 32 A6 34 A2 60 A4 81 09 09 32 A2 32 2D AA 2A A2 60 30 32 A6 34 A2 60 A4 81 09 09 32 A2 34 34 60 81 0A 0B 32 60 A2 81 0A 0B 32 34 A2 60 30 32 A6 34 A2 60 A4 81 09 09 32 A2 32 2D AA 2A A2 60 2F 2F 60 2F 2F 60 81 08 0B 2D 60 81 08 0B 2D 81 08 0B 2D 2F A2 81 08 04 30 30 2F 2D 84 80 12 86 00 80 A2 60 A2 37 37 60 37 37 60 A4 81 09 06 36 A2 36 32 AA 2D A2 60 A2 37 37 60 37 37 60 A4 81 09 06 36 A2 39 39 60 81 0A 0B 37 60 A2 81 0A 0B 37 39 A2 60 A2 37 37 60 37 37 60 A4 81 09 06 36 A2 36 32 A4 2D A2 2D A1 30 32 30 2D A2 60 32 32 60 32 32 60 81 08 0B 32 60 81 08 0B 32 81 08 0B 32 32 A2 81 08 05 33 33 32 30 84 A2 81 0C 04 36 36 34 30 81 08 05 33 33 32 30 84 86 00 80 A2 34 AE 81 0A 0F 37 A2 60 37 A4 81 08 0B 32 A2 81 08 05 32 A1 32 30 A2 32 A1 30 A3 2D A2 2D 34 A8 81 0E 0B 37 A4 81 0A 08 32 A2 34 39 60 A4 81 0A 09 37 A2 37 36 A4 60 A2 34 AA 81 0A 0F 37 A2 81 08 0B 32 81 08 0B 32 A2 81 08 05 32 A1 32 30 A4 32 A2 30 2D 84 A2 30 AE 81 0A 10 30 A2 60 34 A4 81 08 09 2F A2 81 08 09 2F A1 2F 2D A2 2F A1 2D A3 28 A2 28 30 A8 81 0A 10 30 A4 81 0A 07 2F A2 30 34 60 A4 81 0A 09 32 A2 34 32 A4 60 A2 30 AA 81 0A 10 30 A2 81 08 09 2F 81 08 09 2F A2 81 08 09 2F A1 2F 2D A4 2F A2 2D 28 84 80 12 86 01 80 A2 60 A2 34 34 60 34 34 60 A4 81 09 09 32 A2 32 2D AA 2A A2 60 A2 34 34 60 34 34 60 A4 81 09 09 32 A2 34 34 60 81 0A 0B 32 60 A2 81 0A 0B 32 34 A2 60 A2 34 34 60 34 34 60 A4 81 09 09 32 A2 32 2D AA 81 12 09 30 A2 60 2F 2F 60 2F 2F 60 81 08 0B 2D 60 81 08 0B 2D 81 08 0B 2D 2F A2 81 08 04 30 30 2F 2D 84 A2 81 0C 03 32 32 30 2D 81 08 04 30 30 2F 2D 84 A2 60 81 0A 07 3B 81 0A 07 3B 60 81 0A 07 3B 81 0A 07 3B 60 A4 81 0A 07 3B A2 3B 39 36 81 0A 0B 37 60 39 39 84 A2 60 81 0A 0B 37 81 0A 0B 37 60 81 0A 0B 37 81 0A 0B 37 60 A4 81 0A 0B 37 A2 37 36 32 81 0A 08 32 60 34 34 84 80 01 A4 21 A2 60 A4 21 A2 60 A4 21 A2 60 A4 21 A2 60 A4 21 60 E0 21 B4 60 AC 81 48 FD 28 84 86 00 80 80 12 A4 81 0C 09 43 A2 60 A4 81 0C 09 43 A2 60 A4 81 0C 09 43 A2 60 A4 81 0C 09 43 A2 60 A4 81 0C 09 43 60 80 05 C0 15 60 60 84 80 12 86 00 80 A4 81 0C 07 3E A2 60 A4 81 0C 07 3E A2 60 A4 81 0C 07 3E A2 60 A4 81 0C 07 3E A2 60 A4 81 0C 07 3E 60 E0 60 C0 60 84 80 05 A4 2D A2 60 A4 2D A2 60 A4 2D A2 60 A4 2D A2 60 A4 2D 60 E0 2D C0 60 84 80 04 A4 15 A2 60 A4 15 A2 60 A4 15 A2 60 A4 15 A2 60 A4 15 60 C0 15 C0 60 B8 60 A2 80 04 15 15 15 A1 15 15 84 80 12 86 00 80 A6 81 0A 0A 40 AA 81 0A 08 3E A4 60 A2 3E 60 3E A4 81 0A 08 3E A2 60 A6 81 0A 0A 40 AA 81 0A 08 3E A2 60 81 0C 04 42 42 40 81 0C 04 42 42 40 3C A6 81 0B 09 40 AA 81 0C 07 3E A4 60 A2 3E 60 3E A4 81 0A 08 3E A2 60 A2 60 81 0B 08 3E 3E 3B 3E A4 81 09 09 3E A2 81 09 09 3E 60 81 09 09 3E 3E 3B 81 09 07 39 A1 39 37 A2 81 09 0D 37 37 84 80 12 86 00 80 A2 81 0A 0A 40 A4 81 0E 07 40 A3 81 0A 08 3E A1 43 42 40 42 43 42 40 A4 81 0A 0A 40 A2 3E 60 3E A4 81 0A 08 3E A2 40 A2 81 0A 0A 40 A4 81 0E 07 40 A3 81 0A 08 3E A1 39 3C 3E 3F 40 43 45 A6 81 12 0B 45 81 12 04 48 A4 81 12 04 48 A2 81 0A 0A 40 A4 81 0E 07 40 A3 81 0A 08 3E A1 43 42 40 42 43 42 40 A4 81 0A 0A 40 A2 3E 60 3E A4 81 0A 08 3E A2 40 A2 60 A6 81 12 07 3D 81 12 07 3D A4 81 12 04 3E A2 40 A4 81 12 0B 3D A1 3E 40 3E 3B 3E 40 3E 3B 84 80 12 86 01 80 A2 81 0A 07 3C A4 81 0E 05 3C A3 81 0A 0E 3B A1 3F 3E 3C 3E 3F 3E 3C A4 81 0A 07 3C A2 39 60 39 A4 81 0A 0D 39 A2 3B A2 81 0A 07 3C A4 81 0E 05 3C A3 81 0A 0E 3B A1 34 39 3B 3C 3D 40 42 A6 81 12 09 42 81 12 06 43 A4 81 12 06 43 A2 81 0A 07 3C A4 81 0E 05 3C A3 81 0A 0E 3B A1 3F 3E 3C 3E 3F 3E 3C A4 81 0A 07 3C A2 39 60 39 A4 81 0A 0D 39 A2 3B A2 60 A6 81 12 07 39 81 12 07 39 A4 81 12 07 39 A2 3B A4 81 12 07 39 A1 42 43 42 40 42 43 42 40 84 80 12 86 00 80 A6 81 0E 05 3C AA 81 0E 0A 3B A4 60 A2 39 60 39 A4 81 0A 0D 39 A2 60 A6 81 0E 05 3C AA 81 0E 0A 3B A2 60 81 0C 03 3E 3E 3C 81 0C 03 3E 3E 3C 39 A6 81 0E 05 3C AA 81 0E 0A 3B A4 60 A2 39 60 39 A4 81 0A 0D 39 A2 60 A2 60 A6 81 14 06 39 81 14 06 39 AA 81 0C 0D 3C A4 81 0C 0A 3D 81 0C 07 3E 84 80 12 86 00 80 A6 81 0E 08 43 A6 81 0E 08 43 A1 43 45 43 40 A4 81 0E 08 43 A2 42 60 42 A4 81 0A 05 42 A2 60 A6 81 0E 08 43 A6 81 0E 08 43 A1 43 45 43 40 A2 81 0E 08 43 A6 81 0E 08 43 A4 81 0E 08 43 81 0E 08 43 A6 81 0E 08 43 A6 81 0E 08 43 A8 81 17 07 42 A2 45 60 45 A4 81 0A 0B 43 A2 60 A4 60 A1 40 43 40 43 40 43 40 43 40 43 40 43 40 43 40 43 40 43 40 43 3F 42 3E 41 3D 40 3C 3F 84 80 12 86 00 80 A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 45 43 45 47 A2 81 06 0C 47 81 06 0C 47 A4 81 08 10 45 81 08 0E 43 81 08 06 42 A2 81 06 09 42 81 06 09 42 A4 42 A2 81 06 07 3F 3F 3E 3C A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 A2 81 08 0E 43 A1 40 43 45 43 45 43 45 47 A2 81 0A 0D 45 A4 4A A2 81 0A 0D 45 A4 4A A2 81 0A 0D 45 A4 4A A2 81 0A 0D 45 A4 4A A4 81 0A 08 4A 81 0A 08 4A 84 80 12 86 00 80 A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E 40 3E 42 43 A2 81 06 13 43 81 06 13 43 A4 81 0A 05 42 81 0A 0A 40 81 0A 08 3E A2 81 06 07 3E 81 06 07 3E A4 3E A2 81 06 06 3C 3C 3B 39 A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E A2 81 08 0B 3E A1 3C 3E 40 3E 40 3E 42 43 A2 81 0A 0D 40 A4 45 A2 81 0A 0D 40 A4 45 A2 81 0A 0D 40 A4 45 A2 81 0A 0D 40 A4 45 A4 81 0A 08 45 81 0A 08 45 84 80 01 A2 21 21 21 21 21 1C 1F 21 1A 1A 1A 1A 1A 1A 1A 1A A2 21 21 21 21 21 1C 1F 21 26 26 26 26 26 1E 1F 20 A2 21 21 2D 2D 2D 1C 2F 2D 1A 26 1D 1E 26 26 25 23 1C 1C 1C 1C 20 21 22 23 28 28 28 28 28 28 1F 20 84 80 01 A6 1F A2 1F A4 1F A2 26 24 A6 1D A2 1D A4 1D A4 1F A6 24 A2 24 A4 24 A2 26 28 A6 26 A2 26 A4 26 A4 26 A6 1F A2 1F A4 1F A2 26 24 A6 1D A2 1D A4 1D A4 1F A6 24 A2 24 A4 24 A2 26 24 A6 1D 1F A4 1F 84 A6 21 A2 21 A4 21 A2 2A 28 A6 26 A2 26 A4 26 A4 1C A6 21 A2 21 A4 21 A2 2A 28 A6 26 A2 26 A4 26 A4 1C A6 21 A2 21 A4 21 A2 2A 28 A6 26 A2 26 A4 26 A4 23 A6 1C A2 1C A4 1C A2 26 1C A6 1C 1C A4 1F 84 80 03 A2 09 A4 09 A2 09 80 04 A4 15 80 03 09 84 80 12 86 00 80 AA 37 A2 32 37 81 0A 0B 37 A6 81 0A 0B 37 A6 37 A4 81 0A 0A 35 B0 81 14 05 35 A6 81 0E 06 32 81 0E 05 30 A4 30 AA 32 A2 32 37 81 0A 0B 37 A6 81 0A 0B 37 A6 37 A4 81 0C 06 3B B0 81 10 0C 39 A6 81 0A 0B 37 37 A4 35 84 80 06 86 00 80 AC 81 0E 09 39 A4 60 AC 81 0E 0A 3A A4 60 AC 81 0E 0E 39 A4 60 A6 81 0A 0A 3A 3B A4 39 AC 81 0E 07 41 A4 60 A6 81 0A 04 40 A6 40 A4 81 0C 08 41 B0 81 10 08 35 A6 81 0A 04 40 40 A4 3E 84 80 11 A4 2B A2 60 AA 2B A2 60 A2 2B 60 2B A4 29 2B A4 2B A2 60 AA 2B A2 60 A2 2B 60 2B A4 29 2B A4 2B A2 60 AA 2B A2 60 A2 2B 60 2B A4 29 2B A4 2B A2 60 A4 2B A2 60 A4 2B A4 29 A2 60 A4 2B A2 60 A4 2B 84 80 11 A4 26 A2 60 AA 26 A2 60 A2 26 60 26 A4 24 26 A4 26 A2 60 AA 26 A2 60 A2 26 60 26 A4 24 26 A4 26 A2 60 AA 26 A2 60 A2 26 60 26 A4 24 26 A4 24 A2 60 A4 26 A2 60 A4 24 A4 24 A2 60 A4 26 A2 60 A4 26 84 80 03 A2 09 09 80 04 15 80 03 A2 09 80 03 A2 09 09 80 04 15 80 03 A2 09 84 80 03 A2 09 09 80 04 15 80 03 A2 09 80 03 09 80 04 15 15 80 03 09 84 80 03 A2 09 80 04 15 80 03 09 09 80 04 15 80 03 09 09 80 04 15 80 03 09 80 04 15 15 80 03 09 80 04 15 15 15 A1 15 15 84 A2 80 04 15 80 03 09 09 80 04 15 80 03 09 80 03 09 80 04 15 A1 15 15 84 80 11 A2 60 A2 2D 2D 60 2D 2D 60 2D 60 2D A3 2D A1 60 A3 2D A1 60 A4 2D A2 60 A2 2D 2D 60 2D 2D 60 2D 60 2D A3 2D A1 60 A3 2D A1 60 A4 2D A2 60 A2 2D 2D 60 2D 2D 60 2D 60 2D A3 2D A1 60 A3 2D A1 60 A4 2D A2 60 A2 28 28 60 26 28 60 28 60 28 A3 28 A1 60 A3 28 A1 60 A4 28 84 80 11 A2 60 A2 28 28 60 26 28 60 26 60 24 A3 26 A1 60 A3 28 A1 60 A4 26 A2 60 A2 28 28 60 26 28 60 26 60 24 A3 26 A1 60 A3 28 A1 60 A4 26 A2 60 A2 28 28 60 26 28 60 26 60 24 A3 26 A1 60 A3 28 A1 60 A4 26 A2 60 A2 23 23 60 21 23 60 23 60 23 A3 23 A1 60 A3 21 A1 60 A4 23 84 80 01 A6 21 A2 1E A2 1F 60 60 21 60 21 A4 1E 1F 1C 84 80 03 A4 09 A2 80 04 15 80 03 09 A4 09 80 04 A2 15 80 03 A2 09 84 80 03 A2 09 09 A4 80 04 15 80 03 A2 09 80 04 A4 15 A1 15 15 84 80 03 A2 09 09 A2 80 04 15 15 15 15 15 A1 15 15 84 80 03 A4 09 A2 80 04 15 80 03 A1 09 09 A2 80 04 15 80 03 09 80 04 15 A1 15 15 84 80 03 A2 09 A4 09 A2 09 A4 09 80 04 15 84 80 03 A6 09 A1 09 09 A2 80 04 15 80 03 09 80 04 15 80 03 09 84 80 05 A6 2D A2 2A A4 2B A2 60 2D 60 2D 2B 60 A4 32 31 84 80 05 A6 28 A2 26 A4 26 A2 60 28 60 28 26 60 A4 2D 2D 84 80 06 86 00 80 A2 60 A4 81 0C 09 37 A2 37 A2 81 09 0D 37 34 37 AE 81 16 05 37 A2 31 32 A2 34 60 60 36 37 60 60 34 60 34 A4 32 A2 81 0C 03 30 30 A4 2B A2 60 A4 81 0C 09 37 A2 37 A2 81 09 0D 37 34 37 AE 81 16 05 37 A2 36 37 A2 39 60 60 3E 3D 60 60 81 0A 08 3E 60 81 0A 08 3E A4 3E A2 3E 81 0C 03 3C 3C 39 84 80 06 86 00 80 A2 60 A4 81 0C 07 32 A2 32 A2 81 09 09 32 31 32 AE 81 16 04 32 A2 34 36 A2 37 60 60 39 3B 60 60 37 60 37 A4 36 A2 60 60 A4 60 A2 60 A4 81 0C 07 32 A2 32 A2 81 09 09 32 31 32 AE 81 16 04 32 A2 39 3B A2 3D 60 60 42 40 60 60 81 0A 05 42 60 81 0A 05 42 A4 42 A2 42 81 0C 03 3F 3F 3D 84 80 01 B0 21 B0 1F AE 28 AE 28 A4 1F 84 80 05 B0 21 B0 1F AE 1C AE 1C A4 1F 84 80 01 A2 21 A4 2D A2 2D 2D 28 2B 2D AC 2B A2 24 26 A2 28 A4 28 A2 28 A4 28 A2 60 28 60 28 A4 26 A2 81 0C 03 24 24 A4 1F 84 80 05 A2 21 A4 2D A2 2D 2D 28 2B 2D AC 2B A2 24 26 A2 28 A4 28 A2 28 A4 28 A2 60 28 60 28 A4 26 A2 81 0C 03 24 24 A4 1F 84 80 06 86 00 80 A2 21 A4 81 0C 09 2B A2 2D 81 0C 09 2B 28 2B 81 0C 09 2B AC 2B A2 24 26 A2 28 A4 81 0C 07 26 A2 28 A4 81 0C 07 26 A2 60 81 0C 07 26 60 81 0C 07 26 A4 26 A2 81 0C 03 24 24 A4 1F 84 80 01 A6 1F A2 23 A2 24 60 60 1F 60 A4 1F 21 A2 1A A4 24 A6 1F A2 23 A2 24 60 60 1F 60 1F 1F A4 60 A6 24 A6 1F A2 23 A2 24 60 60 1F 60 A4 1F 21 A2 1A A4 24 A6 1F A2 23 A2 24 60 60 1F 60 1F 1F 24 24 24 24 24 84 80 05 A6 32 A2 2F A4 30 A2 60 32 60 A4 32 30 A2 32 A4 34 A6 32 A2 2F A4 30 A2 60 32 60 32 2F A4 60 A6 32 A6 32 A2 2F A4 30 A2 60 32 60 A4 32 30 A2 32 A4 34 A6 32 A2 2F A4 30 A2 60 32 60 32 2F AA 34 84 80 05 A6 2B A2 2B A4 2B A2 60 2B 60 A4 2B 2D A2 2B A4 2B A6 2B A2 2B A4 2B A2 60 2B 60 2B 2B A4 60 A6 2B A6 2B A2 2B A4 2B A2 60 2B 60 A4 2B 2D A2 2B A4 2B A6 2B A2 2B A4 2B A2 60 2B 60 2B 2B AA 2B 84 80 06 86 00 80 A2 60 37 3E 81 0A 08 3E A8 81 10 05 3E A2 60 81 0A 04 40 40 43 60 81 0A 04 40 A4 81 0D 06 3E A2 60 37 3E 81 0A 08 3E A8 81 10 05 3E A2 60 41 81 0A 0A 41 A4 60 A8 81 14 0A 45 A2 37 3E 81 0A 08 3E A8 81 10 05 3E A2 60 81 0A 04 40 40 43 60 81 0A 04 40 A4 81 0D 06 3E A2 60 37 3E 81 0A 08 3E A8 81 10 05 3E A2 60 81 0A 04 40 40 81 0A 0A 41 81 0A 0A 41 81 0A 0A 41 81 0A 0A 41 81 0A 0A 41 84 80 06 86 00 80 A2 60 37 3B 81 0A 07 3B A8 81 10 08 3A A2 60 81 0A 07 3C 3C 3E 60 81 0A 07 3C A4 81 0D 05 3B A2 60 37 3B 81 0A 07 3B A8 81 10 08 3A A2 60 3E 81 0A 07 3C A4 60 A8 81 12 04 3E A2 37 3B 81 0A 07 3B A8 81 10 08 3A A2 60 81 0A 07 3C 3C 3E 60 81 0A 07 3C A4 81 0D 05 3B A2 60 37 3B 81 0A 07 3B A8 81 10 08 3A A2 60 81 0A 07 3C 3C 81 0A 07 3C 81 0A 07 3C 81 0A 07 3C 81 0A 07 3C 81 0A 07 3C 84 00

ROM:00011624 ; ---------------------------------------------------------------------------
ROM:00011624                 movem.l d0/a0,-(sp)
ROM:00011628                 move.w  #$100,(IO_Z80BUS).l
ROM:00011630                 move.w  #0,(IO_Z80RES).l
ROM:00011638                 move.w  #0,(IO_Z80BUS).l
ROM:00011640                 move.w  #$1F4,d0
ROM:00011644
ROM:00011644 Z80_Sync_Wait:                          ; CODE XREF: ROM:Z80_Sync_Wait↓j
ROM:00011644                 dbf     d0,Z80_Sync_Wait
ROM:00011648                 move.w  #$100,(IO_Z80RES).l
ROM:00011650                 movem.l (sp)+,d0/a0
ROM:00011654                 rts
ROM:00011656
ROM:00011656 ; =============== S U B R O U T I N E =======================================
ROM:00011656
ROM:00011656
ROM:00011656 Sound_LoadZ80Program:                   ; CODE XREF: ROM:0000F4FE↑p
ROM:00011656                 movem.l d0-d2/a0-a2,-(sp)
ROM:0001165A                 move.w  #$100,(IO_Z80RES).l
ROM:00011662                 move.w  #$100,(IO_Z80BUS).l
ROM:0001166A                 lea     Z80_Program_Code(pc),a1
ROM:0001166E                 movea.l #Z80_RAM,a2
ROM:00011674                 move.w  #$597,d0
ROM:00011678                 bra.s   loc_1167C
ROM:0001167A ; ---------------------------------------------------------------------------
ROM:0001167A
ROM:0001167A loc_1167A:                              ; CODE XREF: Sound_LoadZ80Program:loc_1167C↓j
ROM:0001167A                 move.b  (a1)+,(a2)+
ROM:0001167C
ROM:0001167C loc_1167C:                              ; CODE XREF: Sound_LoadZ80Program+22↑j
ROM:0001167C                 dbf     d0,loc_1167A
ROM:00011680                 move.w  #0,(IO_Z80RES).l
ROM:00011688                 move.w  #0,(IO_Z80BUS).l
ROM:00011690                 move.w  #$1F4,d0
ROM:00011694
ROM:00011694 loc_11694:                              ; CODE XREF: Sound_LoadZ80Program:loc_11694↓j
ROM:00011694                 dbf     d0,loc_11694
ROM:00011698                 move.w  #$100,(IO_Z80RES).l
ROM:000116A0                 movem.l (sp)+,d0-d2/a0-a2
ROM:000116A4                 rts
ROM:000116A4 ; End of function Sound_LoadZ80Program
ROM:000116A4
ROM:000116A4 ; ---------------------------------------------------------------------------

Z80 Program Code: 0x116A6-0x11C3D
C3 38 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 F3 31 FF 1F ED 46 3A A4 02 B7 28 57 FA 68 00 3E 2A 32 00 40 46 23 7C B5 20 0F 3A 6A 05 3C 32 6A 05 CD 69 05 21 00 80 46 23 78 B7 28 1B 32 01 40 3A A3 02 FE 01 28 0A E5 CD E0 00 E1 3E 01 32 A3 02 06 19 00 10 FD 18 BE 7E FE 01 28 16 3E 2B 32 00 40 E5 E1 3E 00 32 01 40 3E FF 32 A4 02 32 C4 00 18 A3 3E 2B 32 00 40 E5 E1 3E 80 32 01 40 3E 00 32 6A 05 CD 69 05 26 00 2E 00 23 3E 01 32 A4 02 C3 3E 00 00 00 00 00 FF 00 00 00 FF 30 38 34 3C 40 48 44 4C 50 58 54 5C 60 68 64 6C 70 78 74 7C 80 88 84 8C B0 B4 00 DD 21 73 02 0E 00 CD 55 01 DD 21 7B 02 0E 01 CD 55 01 DD 21 83 02 0E 02 CD 55 01 DD 21 8B 02 0E 04 CD 55 01 DD 21 93 02 0E 05 CD 55 01 DD 21 9B 02 0E 06 CD 55 01 3A C0 00 B7 20 32 3A C4 00 47 3A C3 00 B8 28 02 30 27 32 C4 00 3A C0 00 32 A4 02 3E FF 32 C0 00 3A C2 00 32 A8 00 3A BE 00 32 B2 00 3A BF 00 32 B0 00 3A C1 00 32 7A 00 C9 3E FF 32 C0 00 C9 DD CB 00 7E CC 83 01 DD CB 03 7E 20 0E DD CB 03 46 28 05 CD BC 01 18 03 CD D2 01 DD CB 04 7E 20 03 CD DD 01 DD CB 07 7E 20 03 CD 1E 02 C9 41 DD 66 01 DD 6E 02 11 C5 00 CB 51 20 17 1A FE 00 28 0B 81 C5 4E CD 42 02 C1 23 13 18 F0 3E FF DD 77 00 48 C9 79 E6 03 4F 1A FE 00 28 F0 81 C5 4E CD 50 02 C1 23 13 18 F0 41 3E 28 CD 42 02 78 C6 F0 4F 3E 28 CD 42 02 3E FF DD 77 03 48 C9 3E 28 CD 42 02 3E FF DD 77 03 C9 59 CB 51 20 1C 41 DD 56 05 3E A4 81 4A CD 42 02 DD 56 06 3E A0 80 4A CD 42 02 3E FF DD 77 04 4B C9 79 E6 03 4F 41 DD 56 05 3E A4 81 4A CD 50 02 DD 56 06 3E A0 80 4A CD 50 02 3E FF DD 77 04 4B C9 CB 51 20 0F 3E 4C 81 DD 4E 07 CD 42 02 3E FF DD 77 07 C9 79 E6 03 C6 4C DD 4E 07 CD 50 02 3E FF DD 77 07 C9 32 00 40 E5 E1 E5 E1 E5 E1 79 32 01 40 C9 32 02 40 E5 E1 E5 E1 E5 E1 79 32 03 40 C9 3E 2A 32 00 40 00 00 00 FD 7E 00 FE 00 28 05 FD 23 32 01 40 C9 FF 82 C5 FF FF 12 00 FF FF 02 C5 FF FF 00 00 FF FF 02 C5 FF FF 00 00 FF FF 02 C5 FF FF 12 00 FF FF 02 C5 FF FF 00 00 FF FF 02 C5 FF FF 00 00 FF 00 FF 00 20 62 10 17 0C 12 0A 1F 1F 1F 07 04 04 04 04 00 00 00 00 F9 F9 F9 F9 0A C0 00 00 00 00 00 00 36 43 00 01 19 20 20 0E 5F 5C 5D 5F 06 09 02 05 06 04 01 00 23 33 13 08 28 C0 00 00 00 00 00 00 22 72 72 32 13 1A 10 1A 10 11 0D 10 08 00 06 02 00 00 00 00 37 09 27 09 2C C0 00 00 00 00 00 00 00 04 70 00 00 00 10 08 1F 1F 1F 1F 0D 00 16 0F 00 0F 07 14 F5 FA 68 FC 02 C0 00 00 00 00 00 00 0F 03 01 01 00 00 00 00 1F 1F 1F 1F 00 03 14 18 00 0E 08 0E 05 08 75 08 3C C0 FD 00 00 00 00 00 3C 39 00 14 19 28 00 10 DF 1F 1F DF 04 05 04 01 04 04 04 02 F7 07 17 AC 38 C0 00 00 00 00 00 00 56 15 10 72 2C 2C 17 0E 1F 1F 1F 1F 02 03 07 00 07 07 07 06 F0 F5 F6 F8 28 C0 00 00 00 00 00 00 31 01 10 21 39 1A 0E 16 1F 1F 5F 1F 03 04 1F 1F 07 00 0A 00 0F 0F 0F 0F 2C C0 00 00 00 00 00 00 5F 52 07 02 00 28 1C 0C 1F 1F 1F 9F 15 15 15 1F 13 0C 0D 10 26 26 36 09 3B C0 00 00 00 00 00 00 00 04 7F 00 09 12 13 0A 1F 1F 1F 1F 0F 00 12 11 00 0F 07 00 FF FA 68 F9 28 C0 00 00 00 00 00 00 00 02 70 00 00 00 13 05 1F 1F 1F 1F 08 00 12 0C 00 0F 07 00 F5 FA 68 FC 02 C0 00 00 00 00 00 00 30 20 40 77 0D 00 60 07 1F 1F 1F 08 00 1F 1F 1F 00 00 00 00 09 9F 09 09 3A C0 00 00 00 00 00 00 31 20 40 77 05 7F 7F 0A 11 00 00 0E 00 1F 1F 0C 00 00 00 00 09 9F 9F 9A 32 C0 00 00 00 00 00 00 00 02 70 00 12 00 12 05 1F 1F 1F 1F 00 00 12 0D 00 0F 07 00 F5 FA 68 FC 1A C0 00 00 00 00 00 00 02 02 01 01 20 30 10 07 1F 1F 1F 12 1F 1F 1F 00 03 00 00 00 15 05 D5 FA 33 C0 00 00 00 00 00 00 00 F5 F0 FF 00 00 00 03 D8 88 88 88 00 1D 1D 1D 07 06 06 06 D9 99 99 F9 3B C0 00 00 00 00 00 00 01 01 31 31 12 00 0A 0A 4D 10 0F 0F 04 1F 03 03 00 00 04 04 07 A9 E8 E7 2D C0 00 00 00 00 00 00 35 30 00 14 2C 50 00 0C DF 1F 1F DF 04 05 04 01 04 04 04 02 F5 05 15 85 21 C0 00 00 00 00 00 00 56 15 10 72 23 2F 18 0C 1F 1F 1F 1F 02 03 02 03 07 07 06 05 F0 F5 F6 F8 28 C0 00 00 00 00 00 00 00 02 70 00 00 00 13 09 1F 1F 1F 1F 08 00 12 0C 00 0F 07 00 F5 FA 68 FC 02 C0 00 00 00 00 00 00 00 02 70 00 00 00 13 0D 1F 1F 1F 1F 08 00 12 0C 00 0F 07 00 F5 FA 68 FC 02 C0 00 00 00 00 00 00 56 15 10 72 28 43 16 0D 1F 1F 1F 1F 03 03 08 08 07 07 06 05 F0 F5 F6 F8 28 C0 00 00 00 00 00 00 00 00 00 00 3E 00 32 00 60 CB 3F 32 00 60 CB 3F 32 00 60 CB 3F 32 00 60 CB 3F 32 00 60 CB 3F 32 00 60 CB 3F 32 00 60 CB 3F 32 00 60 3E 00 32 00 60 C9 6E

{ name: 'sfx_puckwall1_pcm.bin', folder: 'Sound', start: 0x11C3E, end: 0x12A58 },
{ name: 'sfx_puckbody_pcm.bin', folder: 'Sound', start: 0x12A58, end: 0x13960 }, // also partially used for fm_instrument_patch_sfx_id_3
{ name: 'sfx_puckget_pcm.bin', folder: 'Sound', start: 0x13960, end: 0x14886 },
{ name: 'sfx_puckpost-1_pcm.bin', folder: 'Sound', start: 0x14886, end: 0x15768 }, // puckwall3-1, puckice-1
{ name: 'sfx_check_pcm.bin', folder: 'Sound', start: 0x15768, end: 0x168AA }, // check2, playerwall
{ name: 'sfx_highhigh_pcm.bin', folder: 'Sound', start: 0x168AA, end: 0x16E04 }, // offset in code is 168B0; hitlow, sfx_id_23
{ name: 'sfx_crowdboo_pcm.bin', folder: 'Sound', start: 0x16E04, end: 0x1D786 },
{ name: 'sfx_oooh_pcm.bin', folder: 'Sound', start: 0x1D786, end: 0x1FCE8 },
{ name: 'sfx_id_31_pcm.bin', folder: 'Sound', start: 0x1FCE8, end: 0x222AA }, // offset in code is 1FD88
// is there a break at 0x1FFA3?
{ name: 'sfx_check3_pcm.bin', folder: 'Sound', start: 0x222AA, end: 0x00024214 }, // sfx_id_4