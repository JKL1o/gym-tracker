# Erzeugt die App-Symbole (icons/icon-192.png, icons/icon-512.png) ohne Zusatzpakete.
# Motiv: weiße Hantel auf blauem Grund. Die Hantel liegt im inneren Bereich, damit Android
# sie beim Zuschneiden (rund, abgerundet) nicht abschneidet.
# Ausführen im Ordner Gym-Tracker:  python tools/make_icons.py
import os
import struct
import zlib

BLUE = (37, 99, 235)
WHITE = (255, 255, 255)


def dumbbell_rects(size):
    """Rechtecke (x0, y0, x1, y1) der Hantel, relativ zur Bildgröße."""
    s = size / 100
    return [
        (30 * s, 47 * s, 70 * s, 53 * s),   # Stange
        (24 * s, 32 * s, 32 * s, 68 * s),   # innere Scheibe links
        (68 * s, 32 * s, 76 * s, 68 * s),   # innere Scheibe rechts
        (17 * s, 39 * s, 23 * s, 61 * s),   # äußere Scheibe links
        (77 * s, 39 * s, 83 * s, 61 * s),   # äußere Scheibe rechts
    ]


def render(size):
    rects = dumbbell_rects(size)
    rows = []
    for y in range(size):
        row = bytearray([0])  # Filtertyp 0 pro Zeile
        for x in range(size):
            inside = any(x0 <= x < x1 and y0 <= y < y1 for x0, y0, x1, y1 in rects)
            row.extend(WHITE if inside else BLUE)
        rows.append(bytes(row))
    return b"".join(rows)


def png(size, pixels):
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8 Bit, RGB
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(pixels, 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out, exist_ok=True)
    for size in (192, 512):
        with open(os.path.join(out, f"icon-{size}.png"), "wb") as f:
            f.write(png(size, render(size)))
    print("Icons erstellt")
