"""Validate catalogue references without any installed dependencies."""
from pathlib import Path
import json, hashlib
root=Path(__file__).resolve().parent.parent
seen=set();count=0
required={'id','slug','title','description','year','genres','cover','dateAdded','license','licenseUrl','sourceName','sourceUrl','attribution','demo','available'}
def check_url(url):
 if url.startswith('/'):
  path=root/url.split('#')[0].split('?')[0].lstrip('/')
  assert path.exists(),f'Missing asset: {url}'
 else:assert url.startswith('https://'),f'Unsafe URL: {url}'
for category in ('movies','games','books','music'):
 items=json.loads((root/f'data/{category}.json').read_text())
 for item in items:
  assert required<=item.keys(),f'Missing fields in {item.get("id")}'
  assert item['id'] not in seen,'Duplicate ID'
  seen.add(item['id']);count+=1
  assert isinstance(item['genres'],list)
  for key in ('cover','backdrop','sourceUrl','licenseUrl','streamUrl','downloadUrl','browserUrl'):
   if item.get(key):check_url(item[key])
  for src in item.get('screenshots',[]):check_url(src)
  for field in ('formats','tracks','subtitles'):
   for asset in item.get(field,[]):check_url(asset.get('url') or asset.get('src'))
  if item.get('sha256') and item.get('downloadUrl','').startswith('/'):
   assert hashlib.sha256((root/item['downloadUrl'].lstrip('/')).read_bytes()).hexdigest()==item['sha256']
  if item['available']:assert any(item.get(key) for key in ('streamUrl','browserUrl','tracks','formats','downloadUrl'))
for pick in json.loads((root/'data/picks.json').read_text()):assert pick['id'] in seen
print(f'Validated {count} catalogue entries, media references, checksums, and curator picks.')
