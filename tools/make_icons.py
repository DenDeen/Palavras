"""Write the app icons (icons/icon-192.png, icons/icon-512.png) without third-party libraries.

A blue square with "PT" drawn in white blocks, inside the maskable safe zone.
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLUE = (13, 110, 253)
WHITE = (255, 255, 255)
# 5x7 pixel glyphs.
GLYPHS = {
    'P': ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'],
    'T': ['11111', '..1..', '..1..', '..1..', '..1..', '..1..', '..1..'],
}


def png(path, size):
    text = 'PT'
    cols = len(text) * 5 + (len(text) - 1)  # one blank column between letters
    cell = int(size * 0.5 / cols)  # text spans ~50% of the width
    x0 = (size - cols * cell) // 2
    y0 = (size - 7 * cell) // 2

    def on(x, y):
        gx, gy = (x - x0) // cell, (y - y0) // cell
        if x < x0 or y < y0 or gy >= 7 or gx >= cols:
            return False
        letter, col = divmod(gx, 6)
        return col < 5 and GLYPHS[text[letter]][gy][col] == '1'

    rows = b''.join(
        b'\x00' + bytes(c for x in range(size) for c in (WHITE if on(x, y) else BLUE))
        for y in range(size))

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(rows, 9)))
        f.write(chunk(b'IEND', b''))


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'icons'), exist_ok=True)
    for size in (192, 512):
        png(os.path.join(ROOT, 'icons', f'icon-{size}.png'), size)
