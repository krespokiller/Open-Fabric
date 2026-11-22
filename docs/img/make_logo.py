"""Render the OpenFabric logo and the e04 cover from their SVG sources.

Run from the repository root:  python docs/img/make_logo.py

Needs headless Microsoft Edge (found through the ProgramFiles environment
variables) and Pillow. Outputs:
  docs/img/logo.png                    1024 x 1024, transparent corners, time 0
  docs/img/logo.gif                    480 x 480, 4 s loop, 50 frames of 80 ms
  docs/articles/img/e04-portada.png    1920 x 1080 cover
The SVGs are the source of truth. To freeze an animation at time t, the page
gets `animation-play-state:paused; animation-delay:-t s`. The SVG is embedded in
an HTML page sized to the window, because Edge crops instead of scaling an SVG
with fixed width and height.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path.cwd()
LOGO_SVG = ROOT / "docs" / "img" / "logo.svg"
COVER_SVG = ROOT / "docs" / "articles" / "img" / "e04-portada.svg"
BG = "#12171d"
LOOP_S = 4.0
FRAMES = 50          # 50 x 80 ms = 4 s
FRAME_MS = 80
GIF_PX = 480
PNG_PX = 1024


def find_edge():
    for var in ("ProgramFiles(x86)", "ProgramFiles"):
        base = os.environ.get(var)
        if base:
            p = Path(base) / "Microsoft" / "Edge" / "Application" / "msedge.exe"
            if p.exists():
                return str(p)
    sys.exit("msedge.exe not found")


class Renderer:
    def __init__(self, edge, tmp):
        self.edge, self.tmp, self.n = edge, Path(tmp), 0

    def render(self, svg_text, w, h, vb_w, vb_h, t=0.0, scale=1):
        """Screenshot the SVG at w x h CSS px (times `scale` device px), frozen at t seconds."""
        svg = re.sub(
            r'<svg\b[^>]*?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {vb_w} {vb_h}">', svg_text, count=1)
        freeze = f"*{{animation-play-state:paused !important;animation-delay:-{t:.4f}s !important}}"
        self.n += 1
        html = self.tmp / f"f{self.n}.html"
        png = self.tmp / f"f{self.n}.png"
        html.write_text(
            f'<!doctype html><html><head><meta charset="utf-8"><style>'
            f'html,body{{margin:0;padding:0;background:{BG};overflow:hidden}}'
            f'svg{{display:block}}{freeze}</style></head><body>{svg}</body></html>',
            encoding="utf-8")
        cmd = [self.edge, "--headless=new", "--disable-gpu", "--hide-scrollbars",
               f"--force-device-scale-factor={scale}", f"--window-size={w},{h}",
               f"--user-data-dir={self.tmp / 'profile'}",
               f"--screenshot={png}", html.as_uri()]
        for _ in range(3):
            subprocess.run(cmd, capture_output=True, timeout=120)
            if png.exists():
                break
            time.sleep(1)
        else:
            raise RuntimeError(f"Edge produced no screenshot (t={t})")
        im = Image.open(png).convert("RGB")
        im.load()
        png.unlink()
        want = (w * scale, h * scale)
        if im.size != want:
            if im.width >= want[0] and im.height >= want[1]:
                im = im.crop((0, 0) + want)
            else:
                raise RuntimeError(f"unexpected size {im.size}, wanted {want}")
        return im


def plate_mask(px):
    """Alpha mask of the logo plate: rect x=5..507 with a 6-unit stroke, radius 96 (512 units)."""
    k = 4
    big = Image.new("L", (px * k, px * k), 0)
    u = px * k / 512
    ImageDraw.Draw(big).rounded_rectangle(
        (2 * u, 2 * u, 510 * u - 1, 510 * u - 1), radius=99 * u, fill=255)
    return big.resize((px, px), Image.LANCZOS)


def diff_pixels(a, b):
    d = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L")
    return sum(d.histogram()[25:])


def main():
    t0 = time.time()
    logo = LOGO_SVG.read_text(encoding="utf-8")
    cover = COVER_SVG.read_text(encoding="utf-8")
    edge = find_edge()
    tmp = tempfile.mkdtemp(prefix="logo-")
    try:
        r = Renderer(edge, tmp)

        # 0. Prove that the freeze method moves the animation.
        a = r.render(logo, 256, 256, 512, 512, 0.0)
        b = r.render(logo, 256, 256, 512, 512, 2.0)
        n = diff_pixels(a, b)
        print(f"method check: logo t=0 vs t=2 s differ in {n} px")
        if n < 100:
            raise RuntimeError("animation not applied by Edge")

        # 1. Static PNG: 512 CSS px at scale 2, then alpha mask for the rounded corners.
        im = r.render(logo, 512, 512, 512, 512, 0.0, scale=2)
        assert im.size == (PNG_PX, PNG_PX)
        out = im.convert("RGBA")
        out.putalpha(plate_mask(PNG_PX))
        out.save(ROOT / "docs" / "img" / "logo.png", optimize=True)
        print(f"logo.png {out.size}")

        # 2. GIF: 50 frames over 4 s on the page background (GIF has no partial alpha).
        frames = [r.render(logo, GIF_PX, GIF_PX, 512, 512, i * FRAME_MS / 1000.0)
                  for i in range(FRAMES)]
        seam = r.render(logo, GIF_PX, GIF_PX, 512, 512, LOOP_S)
        print(f"seam: frame at {LOOP_S:.1f} s vs frame 0 differ in {diff_pixels(seam, frames[0])} px")
        # One palette for all frames, built from a mosaic of samples, no dithering.
        sample = Image.new("RGB", (GIF_PX * 5, GIF_PX * 2))
        for k, i in enumerate(range(0, FRAMES, 5)):
            sample.paste(frames[i], ((k % 5) * GIF_PX, (k // 5) * GIF_PX))
        pal = sample.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
        gif = ROOT / "docs" / "img" / "logo.gif"
        q[0].save(gif, save_all=True, append_images=q[1:], loop=0, duration=FRAME_MS,
                  disposal=1, optimize=False)
        with Image.open(gif) as g:
            print(f"logo.gif {g.size} {g.n_frames} frames x {FRAME_MS} ms = "
                  f"{g.n_frames * FRAME_MS / 1000:.1f} s, {gif.stat().st_size / 1024:.0f} KB")

        # 3. Cover.
        cv = r.render(cover, 1920, 1080, 1920, 1080, 0.0)
        cpath = ROOT / "docs" / "articles" / "img" / "e04-portada.png"
        cv.save(cpath, optimize=True)
        print(f"e04-portada.png {cv.size} {cpath.stat().st_size / 1024:.0f} KB")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"total {time.time() - t0:.1f} s")


if __name__ == "__main__":
    main()
