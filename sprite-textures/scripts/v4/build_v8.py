# v8: blocker re-measured (tight board crop, no mirror, coverage-based white design). Everything else = v7 (Montreal untouched).
import build_v7 as B7,blocker_v8 as BL,measure_ref as M
def build_gear():
    G,P=B7.build_gear();c0=G['blocker'][0,0].copy()        # v7 navy corner (rounded corner shows background)
    b,_=BL.blocker();b[0,0]=b[0,-1]=b[-1,0]=b[-1,-1]=c0;G['blocker']=b
    f,_,*r=M.GEAR['blocker'];M.GEAR['blocker']=(f,BL.BOARD,*r)  # compare sheets show the same board crop
    return G,P
