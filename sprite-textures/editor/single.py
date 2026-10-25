"""D187 (Abdul pt1039u): write the editor as ONE self-contained HTML file (CSS, JS and the data bundle inline).
It opens from file:// with no server; Save then downloads sprite_edits.json (launch.py serves it to save into edits/).
The output holds game data, so it lives in the gitignored editor/data/ folder."""
import os,json
E=os.path.dirname(os.path.abspath(__file__))
LOADER="""<script>document.write('<script src="data/'+(location.search.includes('sample')?'bundle_sample.js':'bundle.js')+'"><\\/script>')</script>"""
def write_html(B,name):
  src=open(os.path.join(E,'sprite_editor.html'),encoding='utf-8').read();assert LOADER in src,'loader line changed in sprite_editor.html'
  data=json.dumps(B,separators=(',',':')).replace('</','<\\/')
  out=os.path.join(E,'data',name);os.makedirs(os.path.dirname(out),exist_ok=True)
  open(out,'w',encoding='utf-8').write(src.replace(LOADER,'<script>window.BUNDLE='+data+';</script>'));return out
