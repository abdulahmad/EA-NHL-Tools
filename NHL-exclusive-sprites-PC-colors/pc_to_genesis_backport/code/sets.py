import sys;sys.path.insert(0,'/workspace/g94-to-pc-zones/work')
from common import *
import pandas as pd
M=pd.read_csv('/workspace/preview_v2/platform_unique/v2/frames_matrix.csv')
P=M[M['set']=='PC'].set_index('frame')
def tier(k):
    r=P.loc[k]
    if r['empty']:return 'empty'
    c=r.G94_class
    if c=='none':return 'none'
    if c=='ambiguous':return 'ambiguous'
    return 'match'
EXC=set(P[P.exclusive==True].index)
import re
_ex=pd.read_csv('/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/exclusive_frames.csv')
RES_PC=set()   # PC frames (shown, 0-based) that the earlier visual review resolved as redraws of a 94G frame (slot counterpart exists)
for r in _ex[_ex.section.str.contains('resolved')].itertuples():
    m=re.search(r'PC (\d+)',str(r.note))
    if m:RES_PC.add(int(m.group(1)))
def shown(k):return k-1
KF=pd.read_pickle('/workspace/g94-to-pc-zones/v5/backport/kind_final.pkl').set_index('k')
def kind_basis(k):return KF.loc[k].why if k in KF.index else ''
def kindof(k):
    cat=str(P.loc[k].category)
    a=A['PC'][k];m=a!=255
    team=np.isin(a[m],list(range(144,192))+[133,134,135,136,140,0,88]).mean()
    tz=((a>=144)&(a<=244))[m].mean()
    if tz<0.05:return 'fixed'     # no team-zone pixels at all: referees, arrows, cup presenter, pucks (fixed colours)
    if k in KF.index:return KF.loc[k].kind     # content rule: 164 mask -> goalie, 190/191 helmet -> skater, else RF on zone histogram (not the census 'player?/goalie?' label)
    if cat.startswith('goalie'):return 'goalie'
    if team<0.8 and cat.startswith('nonplayer'):return 'fixed'
    return 'skater'
def final_tier(k):
    t=tier(k)
    if t in('none','ambiguous') and shown(k) in RES_PC:return 'resolved'
    return t
