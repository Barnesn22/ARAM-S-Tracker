import json, pathlib, collections

def main():
    raw_dir = pathlib.Path('raw_matches')
    counts = collections.Counter()
    for file in raw_dir.glob('*.json'):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            map_id = data.get('mapId')
            if map_id is not None:
                counts[map_id] += 1
        except Exception as e:
            print(f'Error reading {file}: {e}')
    print('Matches per mapId in raw_matches:')
    for map_id, cnt in sorted(counts.items()):
        print(f' mapId {map_id}: {cnt} matches')

if __name__ == '__main__':
    main()
