"""Extract only local model resources with bounded sizes and no path traversal."""
import pathlib, stat, sys, zipfile
source, target = map(pathlib.Path, sys.argv[1:3])
with zipfile.ZipFile(source) as archive:
    files = archive.infolist()
    if len(files) > 100 or sum(f.file_size for f in files) > 25 * 1024 * 1024:
        raise ValueError('Archive exceeds the model preview size limits.')
    for item in files:
        path = pathlib.PurePosixPath(item.filename)
        if path.is_absolute() or '..' in path.parts or '\\' in item.filename or ':' in item.filename or stat.S_ISLNK(item.external_attr >> 16):
            raise ValueError('Unsafe archive path or link.')
        if item.is_dir(): continue
        if path.suffix.lower() not in {'.glb','.gltf','.bin','.png','.jpg','.jpeg','.webp','.txt'}: continue
        output = target.joinpath(*path.parts)
        output.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(item) as reader, output.open('wb') as writer:
            remaining = 25 * 1024 * 1024
            while chunk := reader.read(min(65536, remaining + 1)):
                remaining -= len(chunk)
                if remaining < 0: raise ValueError('Expanded resource is too large.')
                writer.write(chunk)
