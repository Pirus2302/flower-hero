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
from PIL import Image

SRC = r"D:\MYDEV\flowwow-hero\assets\src\vid\f2"
OUT = r"D:\MYDEV\flowwow-hero\assets\bloom"
CROP = (326, 0, 1845, 1350)   # union bbox of the take, at the 2400 px extraction
WIDTH = 1000
PEDESTAL = 13 / 255           # everything below this is background, not flower
MATTE_LO, MATTE_HI = 0.05, 0.30   # luminance ramp that becomes the coverage matte


def main():
    os.makedirs(OUT, exist_ok=True)
    for old in glob.glob(os.path.join(OUT, "*.webp")):
        os.remove(old)

    files = sorted(glob.glob(os.path.join(SRC, "*.jpg")))
    for i, path in enumerate(files):
        im = Image.open(path).convert("RGB").crop(CROP)
        rgb = np.clip((np.asarray(im).astype(np.float32) / 255 - PEDESTAL) / (1 - PEDESTAL), 0, 1)
        height = round(WIDTH * im.height / im.width)

        colour = Image.fromarray((rgb * 255).astype(np.uint8), "RGB")
        colour = colour.resize((WIDTH, height), Image.LANCZOS)
        colour.save(os.path.join(OUT, f"{i:02d}.webp"), quality=78, method=4)

        cover = np.clip((rgb.max(axis=2) - MATTE_LO) / (MATTE_HI - MATTE_LO), 0, 1)
        matte = np.dstack([np.zeros_like(rgb), cover])
        matte = Image.fromarray((matte * 255).astype(np.uint8), "RGBA")
        matte = matte.resize((WIDTH, height), Image.LANCZOS)
        matte.save(os.path.join(OUT, f"m{i:02d}.webp"), quality=70, method=4)

    total = sum(os.path.getsize(f) for f in glob.glob(os.path.join(OUT, "*.webp")))
    print(f"{len(files)} frames + mattes, {total/1024/1024:.2f} MB, {colour.size}")


main()
