"""Read what the browser sees when it opens each hero clip: container layout
(does playback need the whole file first?), codec, resolution, frame rate and
keyframe spacing."""

import glob
import os
import struct

CONTAINERS = {"moov", "trak", "mdia", "minf", "stbl"}


def atoms(f, end):
    out = []
    while f.tell() < end - 8:
        start = f.tell()
        header = f.read(8)
        if len(header) < 8:
            break
        size, kind = struct.unpack(">I4s", header)
        kind = kind.decode("latin1", "replace")
        head = 8
        if size == 1:
            size = struct.unpack(">Q", f.read(8))[0]
            head = 16
        elif size == 0:
            size = end - start
        if size < head:
            break
        out.append((kind, start, size, head))
        f.seek(start + size)
    return out


def read_version_flags(f, start, head):
    f.seek(start + head)
    version = f.read(1)[0]
    f.read(3)
    return version


for path in sorted(glob.glob("public/media/hero/*.mp4")):
    total = os.path.getsize(path)
    print("=" * 72)
    print("%s  %.2f MB" % (os.path.basename(path), total / 1e6))

    with open(path, "rb") as f:
        top = atoms(f, total)
        print(
            "  top-level: "
            + ", ".join("%s %.2fMB" % (k, z / 1e6) for k, _, z, _ in top)
        )

        moov = [a for a in top if a[0] == "moov"]
        mdat = [a for a in top if a[0] == "mdat"]
        if moov and mdat:
            fast = moov[0][1] < mdat[0][1]
            print("  faststart: %s" % ("yes" if fast else "NO - moov after mdat"))

        info = {"duration": None}

        def walk(start, size, head, depth):
            f.seek(start + head)
            for kind, off, length, hd in atoms(f, start + size):
                pad = "   " + "  " * depth
                try:
                    if kind == "mvhd":
                        version = read_version_flags(f, off, hd)
                        if version == 0:
                            _, _, scale, dur = struct.unpack(">IIII", f.read(16))
                        else:
                            f.read(16)
                            scale, dur = struct.unpack(">IQ", f.read(12))
                        info["duration"] = dur / scale
                        print("%sduration %.2fs" % (pad, dur / scale))
                    elif kind == "hdlr":
                        f.seek(off + hd + 8)
                        print("%strack type: %s" % (pad, f.read(4).decode("latin1")))
                    elif kind == "stsd":
                        f.seek(off + hd + 4)
                        count = struct.unpack(">I", f.read(4))[0]
                        for _ in range(count):
                            entry = f.tell()
                            esize, fmt = struct.unpack(">I4s", f.read(8))
                            fmt = fmt.decode("latin1", "replace")
                            f.seek(entry + 8 + 24)
                            w, h = struct.unpack(">HH", f.read(4))
                            print("%scodec %s  %dx%d" % (pad, fmt, w, h))
                            f.seek(entry + esize)
                    elif kind == "stts":
                        f.seek(off + hd + 4)
                        count = struct.unpack(">I", f.read(4))[0]
                        entries = [
                            struct.unpack(">II", f.read(8))
                            for _ in range(min(count, 4))
                        ]
                        print("%stime-to-sample entries=%d %s" % (pad, count, entries))
                    elif kind == "stss":
                        f.seek(off + hd + 4)
                        count = struct.unpack(">I", f.read(4))[0]
                        keys = [
                            struct.unpack(">I", f.read(4))[0]
                            for _ in range(min(count, 12))
                        ]
                        print("%skeyframes=%d first=%s" % (pad, count, keys))
                    elif kind == "stsz":
                        f.seek(off + hd + 4)
                        uniform, count = struct.unpack(">II", f.read(8))
                        print("%ssamples=%d uniform=%d" % (pad, count, uniform))
                    elif kind == "mdhd":
                        version = read_version_flags(f, off, hd)
                        if version == 0:
                            f.read(8)
                            scale, dur = struct.unpack(">II", f.read(8))
                        else:
                            f.read(16)
                            scale, dur = struct.unpack(">IQ", f.read(12))
                        print("%strack %.2fs timescale=%d" % (pad, dur / scale, scale))
                except Exception as exc:
                    print("%s(%s unreadable: %s)" % (pad, kind, exc))

                if kind in CONTAINERS:
                    print("%s[%s]" % (pad, kind))
                    walk(off, length, hd, depth + 1)

        for kind, off, length, hd in moov:
            walk(off, length, hd, 0)

        if info["duration"]:
            print("  average bitrate ~%.1f Mbps" % (total * 8 / info["duration"] / 1e6))
