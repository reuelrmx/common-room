"""Dependency-free local static server with HTTP range support for media seeking.
Use --api http://localhost:8788 to forward discussion requests to local Wrangler.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
import argparse, os, re
parser=argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8087)
parser.add_argument('--api',default='')
args=parser.parse_args()
if args.api and urlsplit(args.api).hostname not in ('localhost','127.0.0.1'):
 parser.error('--api must be a local Wrangler URL')
os.chdir(Path(__file__).resolve().parent.parent)
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if self.path.startswith('/api/'):
   return self.proxy()
  super().do_GET()
 def do_POST(self):
  if self.path.startswith('/api/'):return self.proxy()
  self.send_error(405)
 def proxy(self):
  if not args.api:
   body=b'{"ok":false,"error":"Discussion is temporarily unavailable."}'
   self.send_response(503);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  length=int(self.headers.get('Content-Length','0'))
  if length>12000:self.send_error(413);return
  headers={'Content-Type':self.headers.get('Content-Type','application/json')}
  if self.headers.get('Origin')==f'http://{self.headers.get("Host")}':headers['Origin']=args.api
  request=Request(args.api+self.path,data=self.rfile.read(length) if self.command=='POST' else None,headers=headers,method=self.command)
  try:response=urlopen(request,timeout=15)
  except HTTPError as error:response=error
  except URLError:self.send_error(503);return
  body=response.read();self.send_response(response.status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
 def send_head(self):
  self.byte_range=None
  path=Path(self.translate_path(self.path))
  requested=self.headers.get('Range')
  if requested and path.is_file():
   size=path.stat().st_size;match=re.fullmatch(r'bytes=(\d*)-(\d*)',requested)
   if not match or not any(match.groups()):self.send_error(416);return None
   left,right=match.groups();start=int(left) if left else max(0,size-int(right));end=min(int(right),size-1) if right and left else size-1
   if start>=size or end<start:
    self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.end_headers();return None
   file=path.open('rb');file.seek(start);self.byte_range=(start,end)
   self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Content-Length',str(end-start+1));self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Accept-Ranges','bytes');self.end_headers();return file
  return super().send_head()
 def copyfile(self,source,output):
  if self.byte_range:
   remaining=self.byte_range[1]-self.byte_range[0]+1
   while remaining:
    chunk=source.read(min(65536,remaining))
    if not chunk:break
    output.write(chunk);remaining-=len(chunk)
  else:super().copyfile(source,output)
 def end_headers(self):
  self.send_header('Accept-Ranges','bytes')
  self.send_header('X-Content-Type-Options','nosniff')
  super().end_headers()
print(f'Common Room: http://localhost:{args.port}',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
