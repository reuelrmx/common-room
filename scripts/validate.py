"""Validate editable catalogue files and ordered collections before deployment."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json, hashlib

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = ('movies', 'games', 'books', 'music')

def validate(root=ROOT, verbose=True):
    records = {}
    warnings = []
    def check_url(url, context):
        if not url:
            return
        assert isinstance(url, str), f'{context}: URL must be text'
        if url.startswith('/') and not url.startswith('//'):
            path = root / unquote(urlsplit(url).path).lstrip('/')
            assert path.is_file(), f'{context}: missing local asset {url}'
        else:
            assert url.startswith('https://'), f'{context}: use a local path or HTTPS URL'
    for category in CATEGORIES:
        path = root / f'data/{category}.json'
        try:
            items = json.loads(path.read_text())
        except json.JSONDecodeError as error:
            raise ValueError(f'{path}: invalid JSON at line {error.lineno}: {error.msg}') from error
        assert isinstance(items, list), f'{path}: expected an array'
        for item in items:
            assert isinstance(item, dict), f'{path}: each entry must be an object'
            assert item.get('id') and item.get('title'), f'{path}: id and title are required'
            key = item['id']
            assert key not in records, f'Duplicate id: {key}'
            records[key] = (category, item)
            assert isinstance(item.get('genres', []), list), f'{key}: genres must be an array'
            if category == 'music':
                assert item.get('releaseType') in ('album','single'), f'{key}: set releaseType to album or single'
                tracks = item.get('tracks', [])
                assert isinstance(tracks, list), f'{key}: tracks must be an array'
                assert tracks or item.get('releaseType')=='single' and item.get('streamUrl'), f'{key}: provide tracks, or a single streamUrl'
                if item['releaseType']=='single':
                    assert len(tracks)<=1, f'{key}: singles contain one track; use album for a multi-track release'
                for track in tracks:
                    assert track.get('streamUrl') or track.get('url'), f'{key}: each track needs streamUrl (legacy url also supported)'
            if category in ('movies','books'):
                kinds = ('standalone','film','episode') if category=='movies' else ('standalone','volume')
                assert item.get('kind') in kinds, f'{key}: kind must be one of {kinds}'
            for field in ('cover','thumbnail','backdrop','backdropSmall','sourceUrl','licenseUrl','streamUrl','downloadUrl','browserUrl'):
                check_url(item.get(field), key)
            for src in item.get('screenshots', []): check_url(src, key)
            for field in ('formats','tracks','subtitles'):
                for asset in item.get(field, []):
                    for url in ('url','streamUrl','downloadUrl','src'): check_url(asset.get(url), key)
            if item.get('sha256') and item.get('downloadUrl','').startswith('/'):
                assert hashlib.sha256((root/item['downloadUrl'].lstrip('/')).read_bytes()).hexdigest()==item['sha256'], f'{key}: checksum mismatch'
            if not all(item.get(field) for field in ('license','licenseUrl','sourceName','sourceUrl')):
                warnings.append(f'{key}: source/licence metadata is incomplete; no permission is inferred and download links are hidden.')
    groups = json.loads((root/'data/collections.json').read_text())
    assert isinstance(groups,list), 'collections.json must be an array'
    group_ids = set()
    grouped_ids = set()
    for group in groups:
        assert group.get('id') and group.get('title'), 'Collections need id and title'
        assert group['id'] not in group_ids, f'Duplicate collection: {group["id"]}'
        group_ids.add(group['id'])
        assert group.get('category') in ('movies','books'), 'Collections belong to movies or books'
        assert group.get('type') in ('trilogy','franchise','series'), 'Collection type must be trilogy, franchise, or series'
        members = group.get('members',[])
        assert isinstance(members,list) and members, f'{group["id"]}: add at least one member'
        assert group['type']!='trilogy' or len(members)<=3, f'{group["id"]}: a trilogy has at most three listed parts'
        member_ids=set(); positions=set(); episodes=set()
        for member in members:
            key=member.get('id'); assert key in records, f'{group["id"]}: unknown member {key}'
            assert key not in member_ids, f'{group["id"]}: duplicate member {key}'
            member_ids.add(key); grouped_ids.add(key)
            category,item=records[key]
            assert category==group['category'], f'{key}: category does not match collection'
            assert item.get('kind')!='standalone', f'{key}: grouped titles cannot have kind standalone'
            position=member.get('position')
            assert type(position) is int and position>0 and position not in positions, f'{group["id"]}: use unique positive integer positions'
            positions.add(position)
            if item.get('kind')=='episode':
                assert group['type']=='series', f'{key}: episodes belong to a series'
                pair=(member.get('season'),member.get('episode'))
                assert all(type(n) is int and n>0 for n in pair), f'{key}: season and episode must be positive integers'
                assert pair not in episodes, f'{group["id"]}: duplicate season/episode'
                episodes.add(pair)
    for key,(category,item) in records.items():
        if category in ('movies','books') and item.get('kind')!='standalone':
            assert key in grouped_ids, f'{key}: add this title to collections.json or use kind standalone'
    for pick in json.loads((root/'data/picks.json').read_text()): assert pick['id'] in records
    if verbose:
        print(f'Validated {len(records)} titles and {len(groups)} ordered collections.')
        for warning in warnings: print('NOTE:',warning)
    return records

if __name__=='__main__':
    try: validate()
    except (AssertionError,ValueError) as error: raise SystemExit(f'Catalogue error: {error}')
