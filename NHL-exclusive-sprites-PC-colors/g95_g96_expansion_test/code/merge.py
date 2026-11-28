import json,glob,os,sys
def merge(game):
  d=f'/workspace/g94-to-pc-zones/v5/x95/out/{game}/';R={}
  for fn in sorted(glob.glob(d+f'results_{game}_*.json'),key=os.path.getmtime):
    for r in json.load(open(fn)):R[r['frame']]=r
  sys.path.insert(0,'/workspace/g94-to-pc-zones/v5/x95');import specs
  sel=specs.SEL95 if game=='95' else specs.SEL96
  out=[R[f] for _,f,_ in sel if f in R]
  json.dump(out,open(d+f'results_{game}.json','w'),indent=1);return out
if __name__=='__main__':
  for g in ('95','96'):
    o=merge(g);print(g,len(o))
