# -*- coding: utf-8 -*-
"""Turn the black-background bloom timelapse into transparent WebP frames.

The footage sits on pure black, so the alpha channel is just luminance with a soft
ramp: solid inside the petal, feathered at the edge. Colour is divided back out of
the black it was shot against, clamped so the feathered edge does not blow up.
"""
import glob
import os

import numpy as np
from PIL import Image

SRC = r"D:\MYDEV\flowwow-hero\assets\src\vid\f1"
OUT = r"D:\MYDEV\flowwow-hero\assets\bloom"
CROP = (190, 0, 1090, 788)   # union bbox of the whole take, with a little air
WIDTH = 760
LO, HI = 9 / 255, 40 / 255   # alpha ramp on luminance
FLOOR = 0.30                 # never divide colour by less than this
BITE = 0.20                  # the faintest edge is dropped, or it reads as a dark rim


def main():
    os.makedirs(OUT, exist_ok=True)
    files = sorted(glob.glob(os.path.join(SRC, "*.jpg")))
    for i, path in enumerate(files):
        im = Image.open(path).convert("RGB").crop(CROP)
        rgb = np.asarray(im).astype(np.float32) / 255
        lum = rgb.max(axis=2)
        alpha = np.clip((lum - LO) / (HI - LO), 0, 1)
        alpha = np.clip((alpha - BITE) / (1 - BITE), 0, 1)
        colour = np.clip(rgb / np.maximum(alpha, FLOOR)[..., None], 0, 1)
        out = np.dstack([colour, alpha])
        frame = Image.fromarray((out * 255).astype(np.uint8), "RGBA")
        frame = frame.resize((WIDTH, round(WIDTH * frame.height / frame.width)), Image.LANCZOS)
        frame.save(os.path.join(OUT, f"{i:02d}.webp"), quality=76, method=4)
    total = sum(os.path.getsize(f) for f in glob.glob(os.path.join(OUT, "*.webp")))
    print(f"{len(files)} frames, {total/1024/1024:.2f} MB")


main()
