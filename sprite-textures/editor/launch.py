# One-command sprite editor (Abdul pt1006u/pt1007u):  python3 sprite-textures/editor/launch.py
# Builds the local data bundle on first run (or with --rebuild), serves this folder on http://127.0.0.1:8765/ and opens
# the editor. "Save" POSTs edits to /save, which writes editor/edits/<kind>_edits.json (same {frames:{...}} format the
# old skater_import.py / g28import.py read). Ctrl+C to stop.
import os,sys,json,subprocess,webbrowser,http.server,functools
E=os.path.dirname(os.path.abspath(__file__));PORT=int(os.environ.get('PORT',8765))
if '--rebuild' in sys.argv or not os.path.exists(E+'/data/bundle.js'):
  subprocess.run([sys.executable,E+'/build_bundle.py'],check=True)
if '--sample' in sys.argv:   # fixed ~5% sample with D180b skeleton checks (t1020u)
  subprocess.run([sys.executable,E+'/skc_sample.py'],check=True)
class H(http.server.SimpleHTTPRequestHandler):
  def do_POST(s):
    if s.path!='/save':s.send_error(404);return
    d=json.loads(s.rfile.read(int(s.headers['Content-Length'])));os.makedirs(E+'/edits',exist_ok=True);out=[]
    for kind,fr in d.items():
      if kind not in('skater','goalie','exclusive'):continue
      p=f'{E}/edits/{kind}_edits.json';old=json.load(open(p))['frames'] if os.path.exists(p) else {}
      old.update(fr);json.dump({'frames':old},open(p,'w'),separators=(',',':'));out.append(f'{kind}: {len(fr)} frame(s) -> {p}')
    b=json.dumps({'saved':out}).encode();s.send_response(200);s.send_header('Content-Type','application/json');s.end_headers();s.wfile.write(b)
  def end_headers(s):s.send_header('Cache-Control','no-store');super().end_headers()
  def log_message(s,*a):pass
for PORT in range(PORT,PORT+20):   # first free port
  try:srv=http.server.ThreadingHTTPServer(('127.0.0.1',PORT),functools.partial(H,directory=E));break
  except OSError:continue
url=f'http://127.0.0.1:{PORT}/sprite_editor.html';print('Sprite editor:',url,flush=True)
if '--sample' in sys.argv:url+='?sample=1'
if '--no-browser' not in sys.argv:webbrowser.open(url)
try:srv.serve_forever()
except KeyboardInterrupt:pass
