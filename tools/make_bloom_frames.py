# -*- coding: utf-8 -*-
"""Turn the black-background bloom timelapse into frames for a dark hero.

Two files per frame, and the petals are never cut out:

  NN.webp   the untouched photograph, still sitting on its black
  mNN.webp  a matte, black with the flower's coverage in the alpha channel

The page lays a stem down in two passes — the matte punches a hole in whatever is
already there, then the photograph is added into that hole. Because the footage is
already multiplied by its own black, adding it back is exact: flowers occlude each
other properly and no edge is ever recoloured, so there is nothing to leave a rim.
"""
import glob
import os

import numpy as np
from PIL import Image, ImageFilter

SRC = r"D:\MYDEV\flowwow-hero\assets\src\vid\f2"
OUT = r"D:\MYDEV\flowwow-hero\assets\bloom"
CROP = (218, 0, 1856, 1350)   # the whole take: nothing of the flower is cut away
WIDTH = 1000
PEDESTAL = 13 / 255           # everything below this is background, not flower
MATTE_LO = 0.05               # below this a pixel is background, not flower
ERODE = 6                     # how far inside the outline the "solid" reading starts
SOFT = 3                      # and how gently it fades back out to the outline reading
FEATHER = 90                  # the camera clipped the tallest petal; fade it out instead


def ramp(height):
    """The take runs out of frame at the top, so the last rows are faded to nothing
    - a petal that softens away reads as depth, a straight cut reads as a mistake."""
    r = np.clip(np.arange(height, dtype=np.float32) / FEATHER, 0, 1)
    return r[:, None, None]


def main():
    os.makedirs(OUT, exist_ok=True)
    for old in glob.glob(os.path.join(OUT, "*.webp")):
        os.remove(old)

    files = sorted(glob.glob(os.path.join(SRC, "*.jpg")))
    for i, path in enumerate(files):
        im = Image.open(path).convert("RGB").crop(CROP)
        rgb = np.clip((np.asarray(im).astype(np.float32) / 255 - PEDESTAL) / (1 - PEDESTAL), 0, 1)
        height = round(WIDTH * im.height / im.width)

        # A black-shot frame is already its own premultiplied alpha, so the page can add
        # it straight onto any background — the only thing missing is how much flower
        # each pixel holds. Brightness alone can't tell a half-covered white petal from
        # a fully covered dark leaf, so the edge and the inside are answered separately:
        # the outline keeps the cautious brightness reading (nothing is ever removed that
        # the photograph doesn't put back, which is what used to leave a rim), while
        # anything a few pixels inside the silhouette is simply called solid.
        lum = rgb.max(axis=2)
        edge = lum            # never claim more coverage than the frame paid for
        inside = Image.fromarray(((lum > MATTE_LO) * 255).astype(np.uint8), "L")
        inside = inside.filter(ImageFilter.MinFilter(2 * ERODE + 1)).filter(ImageFilter.GaussianBlur(SOFT))
        cover = np.maximum(edge, np.asarray(inside).astype(np.float32) / 255)[..., None]

        fade = ramp(im.height)   # both halves fade together, or the tips go black
        rgb = rgb * fade
        cover = cover * fade

        colour = Image.fromarray((rgb * 255).astype(np.uint8), "RGB")
        colour = colour.resize((WIDTH, height), Image.LANCZOS)
        colour.save(os.path.join(OUT, f"{i:02d}.webp"), quality=78, method=4)


        matte = np.dstack([np.zeros_like(rgb), cover])
        matte = Image.fromarray((matte * 255).astype(np.uint8), "RGBA")
        matte = matte.resize((WIDTH, height), Image.LANCZOS)
        matte.save(os.path.join(OUT, f"m{i:02d}.webp"), quality=90, method=4)

    total = sum(os.path.getsize(f) for f in glob.glob(os.path.join(OUT, "*.webp")))
    print(f"{len(files)} frames + mattes, {total/1024/1024:.2f} MB, {colour.size}")


main()
