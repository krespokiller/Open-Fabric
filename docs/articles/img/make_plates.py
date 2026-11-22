"""Render the plates of docs/img/de-taller-a-fabrica.svg for a LinkedIn article.

Run from the repository root:  python docs/articles/img/make_plates.py

Needs headless Microsoft Edge (found via ProgramFiles env vars) and Pillow.
Outputs, next to this script:
  lamina-{1-vapor,2-ia,3-openfabric}.png   static, 1600 px wide
  lamina-{1-vapor,2-ia,3-openfabric}.{webp,gif}   seamless animated loops, 1200 px wide
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path.cwd()
SVG = ROOT / "docs" / "img" / "de-taller-a-fabrica.svg"
OUT = ROOT / "docs" / "articles" / "img"
BG = "#12171d"
PAD = 10  # margin around a plate, in SVG units
STATIC_W = 1600
ANIM_W = 1200

# name: viewBox region (x0, y0, x1, y1) without padding, in SVG units.
# Plate III includes its 6-unit yellow block behind it.
PLATES = {
    "lamina-1-vapor": (2, 2, 362, 260),
    "lamina-2-ia": (382, 2, 742, 260),
    "lamina-3-openfabric": (762, 2, 1128, 266),
}
# Loop: (frames, frame duration ms). Plate I: wheel 6 s/turn, symmetric every
# quarter turn = 1.5 s; belt pattern 8 units, 16 units in 1.2 s -> 0.6 s; lcm = 3.0 s.
# Plate II: wheel 1.6 s/turn -> 0.4 s; belt 0.6 s; lcm = 1.2 s.
# Plate III: 8 s (pieces, stack layers: 8 s; arm and gauge light: 2 s; rollers: 2 s/turn,
# symmetric every quarter turn = 0.5 s); 160 frames x 50 ms = 20 fps.
LOOPS = {
    "lamina-1-vapor": (30, 100),
    "lamina-2-ia": (24, 50),
    "lamina-3-openfabric": (160, 50),
}
# Time of the loop at which the static PNG is taken. Default 0. Plate III: the stack is complete
# and the next piece (orange) sits in the gauge with "pasa" lit.
STATIC_T = {"lamina-3-openfabric": 0.8}
# Plates whose GIF palette is built from several frames instead of the first one only.
WIDE_PALETTE = {"lamina-3-openfabric"}
WORKERS = 4


def find_edge():
    for var in ("ProgramFiles(x86)", "ProgramFiles"):
        base = os.environ.get(var)
        if base:
            p = Path(base) / "Microsoft" / "Edge" / "Application" / "msedge.exe"
            if p.exists():
                return str(p)
    sys.exit("msedge.exe not found")


def box(name):
    x0, y0, x1, y1 = PLATES[name]
    return x0 - PAD, y0 - PAD, x1 + PAD, y1 + PAD


def build_html(svg_text, name, w_px, h_px, t):
    x0, y0, x1, y1 = box(name)
    # Drop the full-page background rect (body supplies the colour instead).
    svg = re.sub(r'<rect width="100%" height="100%" fill="#12171d"/>', "", svg_text, count=1)
    # Drop the plate number label ("LÁMINA I"): it reads oddly outside the three-plate drawing.
    svg = re.sub(r'<text x="12" y="18" class="head-b">[^<]*</text>', "", svg)
    # Rewrite the root element: viewBox of the plate, size equal to the window.
    svg = re.sub(
        r'<svg\b[^>]*?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w_px}" height="{h_px}" '
        f'viewBox="{x0} {y0} {x1 - x0} {y1 - y0}">',
        svg, count=1)
    freeze = ""
    if t is not None:
        freeze = f"*{{animation-play-state:paused !important;animation-delay:-{t:.4f}s !important}}"
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>'
            f'html,body{{margin:0;padding:0;background:{BG};overflow:hidden}}'
            f'svg{{display:block}}{freeze}</style></head><body>{svg}</body></html>')


class Renderer:
    def __init__(self, edge, tmp, svg_text):
        self.edge, self.tmp, self.svg = edge, Path(tmp), svg_text
        self.n = 0
        self.tmp.mkdir(parents=True, exist_ok=True)

    def render(self, name, width, t=None):
        x0, y0, x1, y1 = box(name)
        w_px = width
        h_px = round(width * (y1 - y0) / (x1 - x0))
        self.n += 1
        html = self.tmp / f"f{self.n}.html"
        png = self.tmp / f"f{self.n}.png"
        html.write_text(build_html(self.svg, name, w_px, h_px, t), encoding="utf-8")
        cmd = [self.edge, "--headless=new", "--disable-gpu", "--hide-scrollbars",
               "--force-device-scale-factor=1", f"--window-size={w_px},{h_px}",
               f"--user-data-dir={self.tmp / 'profile'}",
               f"--screenshot={png}", html.as_uri()]
        for attempt in range(3):
            subprocess.run(cmd, capture_output=True, timeout=120)
            if png.exists():
                break
            time.sleep(1)
        else:
            raise RuntimeError(f"Edge produced no screenshot for {name} t={t}")
        im = Image.open(png).convert("RGB")
        im.load()
        png.unlink()
        if im.size != (w_px, h_px):
            if im.width >= w_px and im.height >= h_px:
                im = im.crop((0, 0, w_px, h_px))
            else:
                raise RuntimeError(f"unexpected size {im.size}, wanted {(w_px, h_px)}")
        return im


def diff_pixels(a, b):
    # Pixels differing by more than 24/255; smaller deltas are anti-aliasing noise.
    d = ImageChops.difference(a, b).convert("L")
    return sum(d.histogram()[25:])


def render_many(edge, tmp, svg_text, name, width, times):
    """Render several times in parallel, one Edge profile per worker; keeps the order of `times`."""
    renderers = [Renderer(edge, Path(tmp) / f"w{i}", svg_text) for i in range(WORKERS)]
    chunks = [list(enumerate(times))[i::WORKERS] for i in range(WORKERS)]

    def work(i):
        return [(j, renderers[i].render(name, width, t)) for j, t in chunks[i]]

    with ThreadPoolExecutor(WORKERS) as ex:
        out = dict(x for part in ex.map(work, range(WORKERS)) for x in part)
    return [out[j] for j in range(len(times))]


def save_anim(frames, name, dur):
    webp = OUT / f"{name}.webp"
    frames[0].save(webp, save_all=True, append_images=frames[1:], loop=0,
                   duration=dur, quality=80, method=6)
    if name in WIDE_PALETTE:
        # Fades and glows create intermediate colours: sample the whole loop for the palette.
        step = max(1, len(frames) // 8)
        sample = frames[::step]
        sheet = Image.new("RGB", (frames[0].width, frames[0].height * len(sample)))
        for i, f in enumerate(sample):
            sheet.paste(f, (0, i * f.height))
        pal = sheet.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    else:
        pal = frames[0].quantize(colors=64, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    gif = OUT / f"{name}.gif"
    q[0].save(gif, save_all=True, append_images=q[1:], loop=0, duration=dur,
              disposal=1, optimize=False)
    return webp, gif


def main():
    t0 = time.time()
    svg_text = SVG.read_text(encoding="utf-8")
    edge = find_edge()
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="plates-")
    try:
        r = Renderer(edge, tmp, svg_text)

        # 0. Prove the animation method: two times of plate II must differ.
        a = r.render("lamina-2-ia", ANIM_W, 0.0)
        b = r.render("lamina-2-ia", ANIM_W, 0.1)
        n = diff_pixels(a, b)
        print(f"method check: plate II t=0 vs t=0.1 differ in {n} px")
        if n < 100:
            raise RuntimeError("animation not applied by Edge")

        # 1. Static PNGs (frozen at t=0, or at STATIC_T).
        for name in PLATES:
            im = r.render(name, STATIC_W, STATIC_T.get(name, 0.0))
            im.save(OUT / f"{name}.png", optimize=True)
            print(f"{name}.png {im.size}")

        # 2. Loops.
        for name, (count, dur) in LOOPS.items():
            times = [i * dur / 1000.0 for i in range(count)] + [count * dur / 1000.0]
            frames = render_many(edge, tmp, svg_text, name, ANIM_W, times)
            seam = frames.pop()
            mid = diff_pixels(frames[0], frames[1])
            print(f"{name}: {count} frames x {dur} ms = {count * dur / 1000:.1f} s; "
                  f"seam diff (t=end vs frame 0): {diff_pixels(seam, frames[0])} px; "
                  f"consecutive frames 0/1 differ: {mid} px")
            webp, gif = save_anim(frames, name, dur)
            for p in (webp, gif):
                with Image.open(p) as im:
                    print(f"  {p.name}: {im.format} {im.size} {im.n_frames} frames "
                          f"{p.stat().st_size / 1024:.0f} KB")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"total {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()
