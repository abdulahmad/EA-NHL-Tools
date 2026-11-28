import sys;sys.path.insert(0,'/workspace/snes-to-pc')
from s2g import *
from pal import *
import pickle
from PIL import Image
P=pickle.load(open('pairs.pkl','rb'))
ok=[p for p in P if p['iou']>=0.7]
rf=train([(p['S'],p['G'],p['cat']=='goalie') for p in ok])
pickle.dump(rf,open('rf_all.pkl','wb'))
CHK_GRP={'turnl','shoulderl','fallfwd','hook','gdive','skateb'}
rf2=train([(p['S'],p['G'],p['cat']=='goalie') for p in ok if p['grp'] not in CHK_GRP])
pickle.dump(rf2,open('rf_chk.pkl','wb'))
print(sum(p['grp'] not in CHK_GRP for p in ok),len(ok))
