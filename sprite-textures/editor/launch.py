# One-command sprite editor (Abdul pt1006u/pt1007u):  python3 sprite-textures/editor/launch.py
# Builds the local data bundle on first run (or with --rebuild), serves this folder on http://127.0.0.1:8765/ and opens
# the editor. "Save" POSTs edits to /save, which writes editor/edits/<kind>_edits.json (same {frames:{...}} format the
# old skater_import.py / g28import.py read). Ctrl+C to stop.
import os,sys,json,subprocess,webbrowser,http.server,functools
E=os.path.dirname(os.path.abspath(__file__));PORT=int(os.environ.get('PORT',8765))
if '--rebuild' in sys.argv or not os.path.exists(os.path.join(E,'data','bundle.js')) or not os.path.exists(os.path.join(E,'data','sprite_editor.html')):
  r=subprocess.run([sys.executable,os.path.join(E,'build_bundle.py')])
  if r.returncode:sys.exit('Rebuild failed (see the message above).')
if '--sample' in sys.argv:   # fixed ~5% sample with D180b skeleton checks (t1020u)
  r=subprocess.run([sys.executable,os.path.join(E,'skc_sample.py')])
  if r.returncode:sys.exit('Sample build failed (see the message above).')
class H(http.server.SimpleHTTPRequestHandler):
  def do_POST(s):
    if s.path!='/save':s.send_error(404);return
    d=json.loads(s.rfile.read(int(s.headers['Content-Length'])));os.makedirs(os.path.join(E,'edits'),exist_ok=True);out=[]
    for kind,fr in d.items():
      if kind not in('skater','goalie','exclusive'):continue
      p=os.path.join(E,'edits',f'{kind}_edits.json');old=json.load(open(p))['frames'] if os.path.exists(p) else {}
      old.update(fr);json.dump({'frames':old},open(p,'w'),separators=(',',':'));out.append(f'{kind}: {len(fr)} frame(s) -> {p}')
    b=json.dumps({'saved':out}).encode();s.send_response(200);s.send_header('Content-Type','application/json');s.end_headers();s.wfile.write(b)
  def end_headers(s):s.send_header('Cache-Control','no-store');super().end_headers()
  def log_message(s,*a):pass
for PORT in range(PORT,PORT+20):   # first free port
  try:srv=http.server.ThreadingHTTPServer(('127.0.0.1',PORT),functools.partial(H,directory=E));break
  except OSError:continue
# D187: one self-contained file (data/sprite_editor.html, or data/sprite_editor_sample.html with --sample); it also opens from file:// without this server
url=f'http://127.0.0.1:{PORT}/data/'+('sprite_editor_sample.html' if '--sample' in sys.argv else 'sprite_editor.html');print('Sprite editor:',url,flush=True)
if '--no-browser' not in sys.argv:webbrowser.open(url)
try:srv.serve_forever()
except KeyboardInterrupt:pass
