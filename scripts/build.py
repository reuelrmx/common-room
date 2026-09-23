"""Copy the public website only; no frontend compilation or dependencies."""
from pathlib import Path
import shutil, os, json, re
from xml.sax.saxutils import escape
root=Path(__file__).resolve().parent.parent
out=root/'public'
out.mkdir(exist_ok=True)
for folder in ('assets','data','media'):
 shutil.copytree(root/folder,out/folder,dirs_exist_ok=True)
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
 (out/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{escape(url)}</loc></url>' for url in urls)+'</urlset>')
 (out/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+site+'/sitemap.xml\n')
 config=out/'assets/js/config.js'
 config.write_text(re.sub(r"siteUrl:\s*[\"\'][\"\']", lambda match: "siteUrl: " + json.dumps(site), config.read_text()))
else:
 shutil.copy2(root/'sitemap.xml',out/'sitemap.xml')
print('Static website prepared in public/. Pages Functions are deployed from functions/.')
