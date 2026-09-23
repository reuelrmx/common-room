"""Copy the public website only; no frontend compilation or dependencies."""
from pathlib import Path
import shutil, os, json, re
from xml.sax.saxutils import escape
from validate import validate
import hashlib
root=Path(__file__).resolve().parent.parent
out=root/'public'
out.mkdir(exist_ok=True)
# Refuse to overwrite catalogue edits made to a previously generated public copy.
manifest_path = out / '.catalogue-build.json'
if manifest_path.exists():
 manifest = json.loads(manifest_path.read_text())
 for name, digest in manifest.items():
  generated = out / 'data' / name
  source = root / 'data' / name
  if generated.exists() and hashlib.sha256(generated.read_bytes()).hexdigest() != digest and generated.read_bytes() != source.read_bytes():
   raise SystemExit(f'Build stopped: public/data/{name} was edited. Copy your intended changes to data/{name}, then make both copies match and rebuild. Public data is generated; no changes were overwritten.')
validate(root)
for folder in ('assets','data','media'):
 target = out/folder
 if target.exists(): shutil.rmtree(target)
 shutil.copytree(root/folder,target)
for file in [*root.glob('*.html'),root/'_headers',root/'_routes.json',root/'robots.txt']:
 shutil.copy2(file,out/file.name)
(out/'docs').mkdir(exist_ok=True)
shutil.copy2(root/'docs/artwork.md',out/'docs/artwork.md')
site=os.environ.get('SITE_URL','').rstrip('/')
if site:
 if not site.startswith('https://'):raise SystemExit('SITE_URL must start with https://')
 urls=[site+'/'+x.name for x in root.glob('*.html') if x.stem not in ('404','movie','game','book','album','search','library')]
 for kind,page in [('movies','movie'),('games','game'),('books','book'),('music','album')]:
  urls += [f'{site}/{page}.html?id={item["id"]}' for item in json.loads((root/f'data/{kind}.json').read_text())]
 for group in json.loads((root/'data/collections.json').read_text()):
  urls.append(f'{site}/{group["category"]}.html?collection={group["id"]}')
 (out/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{escape(url)}</loc></url>' for url in urls)+'</urlset>')
 (out/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+site+'/sitemap.xml\n')
 config=out/'assets/js/config.js'
 config.write_text(re.sub(r"siteUrl:\s*[\"\'][\"\']", lambda match: "siteUrl: " + json.dumps(site), config.read_text()))
else:
 shutil.copy2(root/'sitemap.xml',out/'sitemap.xml')
manifest_path.write_text(json.dumps({p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (out/'data').glob('*.json')}, indent=2))
print('Static website prepared in public/. Pages Functions are deployed from functions/.')
