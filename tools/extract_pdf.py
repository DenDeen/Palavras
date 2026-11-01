"""Extract text from '1000 Palavras Mais Comuns.pdf' without third-party libraries.

The PDF stores text as literal strings in Flate-compressed content streams, so
zlib + a small TJ/Tj/Tm parser is enough. Output: one block per page, one line
per text baseline, cells separated by ' | '.

Usage: python3 tools/extract_pdf.py "resources/1000 Palavras Mais Comuns.pdf" > data/source/raw.txt
"""
import re
import sys
import zlib

TOKEN = re.compile(
    rb'\[((?:\\.|[^\]\\])*)\]\s*TJ'
    rb'|\(((?:\\.|[^)\\])*)\)\s*Tj'
    rb'|([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) Tm'
)
ESCAPES = {110: 10, 114: 13, 116: 9, 98: 8, 102: 12}


def unescape(b):
    out = bytearray()
    i = 0
    while i < len(b):
        c = b[i]
        if c == 92:  # backslash
            n = b[i + 1]
            if 48 <= n <= 55:  # octal escape
                j = i + 1
                octal = b''
                while j < len(b) and len(octal) < 3 and 48 <= b[j] <= 55:
                    octal += bytes([b[j]])
                    j += 1
                out.append(int(octal, 8))
                i = j
                continue
            out.append(ESCAPES.get(n, n))
            i += 2
            continue
        out.append(c)
        i += 1
    return bytes(out).decode('cp1252', errors='replace')


def text_streams(data):
    for m in re.finditer(rb'stream\r?\n(.*?)\r?\nendstream', data, re.S):
        try:
            decoded = zlib.decompress(m.group(1))
        except zlib.error:
            continue
        if b'BT' in decoded:
            yield decoded


def page_lines(stream):
    lines = {}
    x = y = 0
    for m in TOKEN.finditer(stream):
        if m.group(3) is not None:
            x, y = float(m.group(7)), round(float(m.group(8)))
            continue
        if m.group(1) is not None:
            text = ''
            for p in re.finditer(rb'\(((?:\\.|[^)\\])*)\)|(-?[\d.]+)', m.group(1)):
                if p.group(1) is not None:
                    text += unescape(p.group(1))
                elif float(p.group(2)) < -250:  # large kerning gap = word space
                    text += ' '
        else:
            text = unescape(m.group(2))
        lines.setdefault(y, []).append((x, text))
    for yy in sorted(lines, reverse=True):
        yield ' | '.join(t for _, t in sorted(lines[yy]))


def main(path):
    data = open(path, 'rb').read()
    for i, stream in enumerate(text_streams(data), 1):
        print(f'\n===== PAGE {i} =====')
        for line in page_lines(stream):
            print(line)


if __name__ == '__main__':
    main(sys.argv[1])
