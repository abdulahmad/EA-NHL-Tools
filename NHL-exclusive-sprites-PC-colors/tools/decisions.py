"""Abdul's approved colour decisions (../decisions/abdul_decisions.csv), applied on top of his PSD pixels.
A row with x,y set changes one pixel (retail 93 frame coordinates, the frame's own facing) and only if the PSD colour
there is from_rgb. A row without x,y maps every pixel of from_rgb in the listed layers."""
import os,csv
_D=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'decisions','abdul_decisions.csv')
PIX={};RGB={};ROWS=[]
for r in csv.DictReader(open(_D)):
  rgb=tuple(int(t) for t in r['from_rgb'].split());i=int(r['to_index']);ROWS.append(r)
  for layer in r['layer'].split(';'):
    if r['x']:PIX[(layer,int(r['x']),int(r['y']))]=(rgb,i)
    else:RGB.setdefault(layer,{})[rgb]=i
APPLIED=[]
def index_for(layer,gy,gx,mir,w,rgb):
  """95 PC index for this pixel if a decision covers it, else None. gy,gx: the tools' (possibly mirrored) coordinates."""
  x=w-1-gx if mir else gx
  p=PIX.get((layer,x,gy))
  if p and p[0]==tuple(rgb):return p[1]
  return RGB.get(layer,{}).get(tuple(rgb))
