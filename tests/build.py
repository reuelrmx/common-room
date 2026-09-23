"""Regression: generated catalogue edits must never be silently overwritten."""
import tempfile, shutil, subprocess, json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as temp:
 test=Path(temp)
 shutil.copytree(root/'scripts',test/'scripts')
 for name in ['assets','media','data','docs']:(test/name).mkdir()
 for name in ['movies','games','books','music','collections','picks']:(test/f'data/{name}.json').write_text('[]')
 for name in ['_headers','_routes.json','robots.txt','sitemap.xml','index.html','docs/artwork.md']:(test/name).write_text('')
 def build():return subprocess.run(['python3',str(test/'scripts/build.py')],capture_output=True,text=True)
 assert build().returncode==0
 generated=test/'public/data/music.json'
 generated.write_text('[{"id":"my-edit","title":"Preserve me"}]')
 result=build();assert result.returncode!=0 and 'Build stopped' in result.stderr
 assert 'Preserve me' in generated.read_text()
 generated.write_text('[]')
 stale=test/'public/media/removed-demo.mp4';stale.write_text('stale')
 assert build().returncode==0 and not stale.exists()
 print('Build tests passed: edited public data protected; stale generated media removed.')
