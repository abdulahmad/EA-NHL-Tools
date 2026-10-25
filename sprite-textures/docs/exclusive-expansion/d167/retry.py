import sys,pickle,json;sys.path[:0]=['/workspace/preview_v2/exclusive_samples']
import expand as E
F=[('G93',353,0),('G93',356,0),('G93',370,6),('G94',741,4),('G94',744,2),('G94',745,2),('G94',747,0)]
S=F
R,err=E.run(S);print(err)
ok={k:len(v['tmap']) for k,v in R.items() if v['tmap']};print(ok)
pickle.dump(R,open('retry.pkl','wb'))
